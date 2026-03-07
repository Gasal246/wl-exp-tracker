"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/shared/logout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getInitials(name: string, email: string) {
  const fallback = email.slice(0, 2);
  if (!name.trim()) return fallback.toUpperCase();
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || fallback.toUpperCase();
}

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to initialize image editor");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to process image"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

type EmployeeProfileProps = {
  defaultName: string;
  defaultEmail: string;
  defaultCurrency: string;
  defaultAvatarUrl?: string | null;
};

async function parseResponsePayload(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function EmployeeProfile({
  defaultName,
  defaultEmail,
  defaultCurrency,
  defaultAvatarUrl,
}: EmployeeProfileProps) {
  const { update } = useSession();

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl ?? null);

  const [profileLoading, setProfileLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/employee/profile", { cache: "no-store" });
        const payload = await parseResponsePayload(response);
        if (!response.ok) return;

        const profile = (payload.profile ?? {}) as {
          name?: string;
          email?: string;
          currency?: string;
          avatarUrl?: string | null;
        };

        setName(profile.name ?? defaultName);
        setEmail(profile.email ?? defaultEmail);
        setCurrency(profile.currency ?? defaultCurrency);
        setAvatarUrl(profile.avatarUrl ?? null);
      } catch {
        // keep defaults from session
      }
    }

    void loadProfile();
  }, [defaultCurrency, defaultEmail, defaultName]);

  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  function onSelectAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (imageSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(imageSrc);
    }

    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setAvatarDialogOpen(true);
    event.target.value = "";
  }

  async function saveProfile() {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currency,
        }),
      });
      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        throw new Error((payload.error as string) || "Failed to update profile");
      }

      const profile = (payload.profile ?? {}) as { name?: string; email?: string; currency?: string };

      const nextName = profile.name ?? name;
      const nextEmail = profile.email ?? email;
      const nextCurrency = profile.currency ?? currency;

      setName(nextName);
      setEmail(nextEmail);
      setCurrency(nextCurrency);

      try {
        await update({
          name: nextName,
          currency: nextCurrency,
        });
      } catch {
        // Keep success UI state even if session refresh fails.
      }

      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function uploadCroppedAvatar() {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Please crop the image first");
      return;
    }

    setAvatarUploading(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/employee/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        throw new Error((payload.error as string) || "Failed to upload avatar");
      }

      const nextAvatarUrl = (payload.avatarUrl as string) ?? null;
      setAvatarUrl(nextAvatarUrl);
      try {
        await update({ avatarUrl: nextAvatarUrl });
      } catch {
        // Keep success UI state even if session refresh fails.
      }
      setAvatarDialogOpen(false);
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function changePassword() {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill both password fields");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch("/api/employee/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const payload = await parseResponsePayload(response);
      if (!response.ok) throw new Error((payload.error as string) || "Failed to change password");

      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="grid max-w-4xl gap-6">
      <div className="flex items-center justify-end gap-2">
        <LogoutButton />
      </div>

      <Card className="border-white/70 bg-white/90">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="size-28 border-2 border-white shadow-md">
                <AvatarImage src={avatarUrl ?? undefined} alt={name || email} />
                {!avatarUrl ? (
                  <AvatarFallback className="text-2xl font-semibold">
                    {getInitials(name, email)}
                  </AvatarFallback>
                ) : null}
              </Avatar>
              <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-primary-foreground shadow">
                <Upload className="size-4" />
              </span>
            </button>

            <div>
              <p className="text-2xl font-semibold leading-tight">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="mt-2 text-xs text-muted-foreground">Click avatar to upload and crop a new profile picture.</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSelectAvatarFile}
          />
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Base Currency</Label>
            <Input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          </div>
          <Button disabled={profileLoading} onClick={() => void saveProfile()}>
            {profileLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <Button disabled={passwordLoading} onClick={() => void changePassword()}>
            {passwordLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={avatarDialogOpen}
        onOpenChange={(open) => {
          setAvatarDialogOpen(open);
          if (!open) {
            setZoom(1);
            setCrop({ x: 0, y: 0 });
            setCroppedAreaPixels(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Avatar</DialogTitle>
            <DialogDescription>Adjust and save the image to fit your profile avatar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-black/70">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Zoom</Label>
              <Input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAvatarDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={avatarUploading} onClick={() => void uploadCroppedAvatar()}>
              {avatarUploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save Avatar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
