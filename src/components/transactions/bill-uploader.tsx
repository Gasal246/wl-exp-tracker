"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadBillImage } from "@/lib/bill-upload-client";

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
    setLoading(true);

    try {
      const uploadPayload = await uploadBillImage(file);

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
    <div className="space-y-2">
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
      <p className="text-xs text-muted-foreground">
        Image only, max size 6 MB. Files above 1 MB are compressed before upload.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
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
    </div>
  );
}
