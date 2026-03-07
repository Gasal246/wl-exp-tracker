"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function BillUploader({
  transactionId,
  hasImage,
  onUploaded,
  onRemoved,
}: {
  transactionId: string;
  hasImage: boolean;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Image size must be below 1 MB");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/uploads/bill", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadPayload.error || "Failed to upload image");
      }

      const patchResponse = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billImageUrl: uploadPayload.url,
          billStoragePath: uploadPayload.storagePath,
        }),
      });
      const patchPayload = await patchResponse.json();

      if (!patchResponse.ok) {
        throw new Error(patchPayload.error || "Failed to attach image");
      }

      toast.success("Bill image uploaded");
      onUploaded(uploadPayload.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    setLoading(true);

    try {
      const patchResponse = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billImageUrl: null,
          billStoragePath: null,
        }),
      });
      const patchPayload = await patchResponse.json();

      if (!patchResponse.ok) {
        throw new Error(patchPayload.error || "Failed to remove image");
      }

      toast.success("Bill image removed");
      onRemoved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remove failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        disabled={loading}
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />} Upload Bill
      </Button>
      <Button
        disabled={loading || !hasImage}
        type="button"
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => void handleRemove()}
      >
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />} Remove Bill
      </Button>
    </div>
  );
}
