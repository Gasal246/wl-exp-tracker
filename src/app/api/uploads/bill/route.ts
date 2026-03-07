import crypto from "node:crypto";

import { requireSession } from "@/lib/session";
import { firebaseBucket } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessionResult = await requireSession(["ADMIN", "EMPLOYEE", "SUPER_ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }

  if (file.size > 1024 * 1024) {
    return Response.json({ error: "Image size must be below 1 MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const extension = file.name.split(".").pop() || file.type.split("/")[1] || "jpg";
  const sanitized = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const storagePath = `bills/${sessionResult.session!.user.id}/${Date.now()}-${crypto.randomUUID()}.${sanitized}`;

  const uploaded = firebaseBucket().file(storagePath);
  const downloadToken = crypto.randomUUID();
  await uploaded.save(buffer, {
    metadata: {
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  return Response.json({
    url: `https://firebasestorage.googleapis.com/v0/b/${uploaded.bucket.name}/o/${encodeURIComponent(
      storagePath,
    )}?alt=media&token=${downloadToken}`,
    storagePath,
  });
}
