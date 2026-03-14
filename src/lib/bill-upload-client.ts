"use client";

import { BILL_UPLOAD_MAX_BYTES, BILL_UPLOAD_TARGET_BYTES } from "@/lib/bill-upload";

type BillUploadResponse = {
  url?: string;
  storagePath?: string;
  error?: string;
};

function renameToJpeg(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "bill-image";
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read image"));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to compress image"));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function compressBillImage(file: File) {
  if (file.size <= BILL_UPLOAD_TARGET_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image compression is not supported in this browser");
  }

  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  let bestBlob: Blob | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
      const blob = await canvasToBlob(canvas, quality);

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= BILL_UPLOAD_TARGET_BYTES) {
        return new File([blob], `${renameToJpeg(file.name)}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }

    width *= 0.85;
    height *= 0.85;
  }

  if (bestBlob && bestBlob.size <= BILL_UPLOAD_TARGET_BYTES) {
    return new File([bestBlob], `${renameToJpeg(file.name)}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  throw new Error("Unable to compress this image below 1 MB. Please choose a smaller image.");
}

export async function uploadBillImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }

  if (file.size > BILL_UPLOAD_MAX_BYTES) {
    throw new Error("Bill image must be 6 MB or smaller");
  }

  const uploadableFile = await compressBillImage(file);
  const formData = new FormData();
  formData.append("file", uploadableFile);

  const uploadResponse = await fetch("/api/uploads/bill", {
    method: "POST",
    body: formData,
  });
  const uploadPayload = (await uploadResponse.json()) as BillUploadResponse;

  if (!uploadResponse.ok || !uploadPayload.url || !uploadPayload.storagePath) {
    throw new Error(uploadPayload.error || "Failed to upload bill image");
  }

  return {
    url: uploadPayload.url,
    storagePath: uploadPayload.storagePath,
    uploadedFile: uploadableFile,
  };
}
