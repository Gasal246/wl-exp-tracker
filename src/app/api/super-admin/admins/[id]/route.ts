import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { requireSession } from "@/lib/session";
import { User } from "@/models/User";

const updateAdminSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
  currency: z.string().trim().length(3).optional(),
  resetPassword: z.boolean().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireSession(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid admin id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateAdminSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.email) update.email = parsed.data.email.toLowerCase();
  if (parsed.data.currency) update.currency = parsed.data.currency.toUpperCase();

  let temporaryPassword: string | null = null;
  if (parsed.data.resetPassword) {
    temporaryPassword = generateTemporaryPassword();
    update.passwordHash = await hashPassword(temporaryPassword);
  }

  const admin = await User.findOneAndUpdate(
    { _id: id, isAdmin: true },
    { $set: update },
    { new: true },
  )
    .select("name email currency")
    .lean();

  if (!admin) {
    return Response.json({ error: "Admin not found" }, { status: 404 });
  }

  return Response.json({
    admin: {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      currency: admin.currency,
    },
    temporaryPassword,
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireSession(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid admin id" }, { status: 400 });
  }

  await connectToDatabase();

  const admin = await User.findOneAndUpdate(
    { _id: id, isAdmin: true },
    { $set: { isActive: false } },
    { new: true },
  ).lean();

  if (!admin) {
    return Response.json({ error: "Admin not found" }, { status: 404 });
  }

  await User.updateMany({ adminId: admin._id }, { $set: { isActive: false } });

  return Response.json({ success: true });
}
