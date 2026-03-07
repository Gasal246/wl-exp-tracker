"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function BillUploader({
  transactionId,
  onUploaded,
}: {
  transactionId: string;
  onUploaded: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
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
    }
  }

  return (
    <label className="block">
      <input
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button disabled={loading} type="button" variant="outline" className="w-full">
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />} Upload Bill
      </Button>
    </label>
  );
}
