import crypto from "node:crypto";

import { connectToDatabase } from "@/lib/db";
import { firebaseBucket } from "@/lib/firebase-admin";
import { requireSession } from "@/lib/session";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const sessionResult = await requireSession(["ADMIN"]);
    if (sessionResult.error) return sessionResult.error;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    await connectToDatabase();

    const admin = await User.findOne({ _id: sessionResult.session!.user.id, isAdmin: true })
      .select("avatarStoragePath")
      .lean();

    if (!admin) {
      return Response.json({ error: "Admin not found" }, { status: 404 });
    }

    const extension = file.name.split(".").pop() || "jpg";
    const sanitizedExtension = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
    const storagePath = `avatars/${sessionResult.session!.user.id}/${Date.now()}-${crypto.randomUUID()}.${sanitizedExtension}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = firebaseBucket();
    const uploaded = bucket.file(storagePath);
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

    const avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${uploaded.bucket.name}/o/${encodeURIComponent(
      storagePath,
    )}?alt=media&token=${downloadToken}`;

    await User.updateOne(
      { _id: sessionResult.session!.user.id, isAdmin: true },
      {
        $set: {
          avatarUrl,
          avatarStoragePath: storagePath,
        },
      },
    );

    if (admin.avatarStoragePath) {
      try {
        await bucket.file(admin.avatarStoragePath).delete({ ignoreNotFound: true });
      } catch {
        // Ignore deletion failures for old avatars.
      }
    }

    return Response.json({ success: true, avatarUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Avatar upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
