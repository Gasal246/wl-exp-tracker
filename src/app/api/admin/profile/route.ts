import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { User } from "@/models/User";

const updateSchema = z.object({
  currency: z.string().trim().length(3).optional(),
  name: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
});

export async function GET() {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  await connectToDatabase();

  const admin = await User.findOne({ _id: sessionResult.session!.user.id, isAdmin: true })
    .select("name email currency avatarUrl")
    .lean();

  if (!admin) {
    return Response.json({ error: "Admin not found" }, { status: 404 });
  }

  return Response.json({
    profile: {
      name: admin.name,
      email: admin.email,
      currency: admin.currency,
      avatarUrl: admin.avatarUrl ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!parsed.data.name && !parsed.data.email && !parsed.data.currency) {
    return Response.json({ error: "No changes provided" }, { status: 400 });
  }

  await connectToDatabase();

  if (parsed.data.email) {
    const existing = await User.findOne({
      email: parsed.data.email.toLowerCase(),
      _id: { $ne: sessionResult.session!.user.id },
    }).lean();

    if (existing) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const update: Record<string, string> = {};
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.email) update.email = parsed.data.email.toLowerCase();
  if (parsed.data.currency) update.currency = parsed.data.currency.toUpperCase();

  const admin = await User.findOneAndUpdate(
    { _id: sessionResult.session!.user.id, isAdmin: true },
    { $set: update },
    { new: true },
  )
    .select("name email currency avatarUrl")
    .lean();

  if (!admin) {
    return Response.json({ error: "Admin not found" }, { status: 404 });
  }

  return Response.json({
    success: true,
    profile: {
      name: admin.name,
      email: admin.email,
      currency: admin.currency,
      avatarUrl: admin.avatarUrl ?? null,
    },
  });
}
