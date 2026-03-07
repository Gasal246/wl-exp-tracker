import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { requireSession } from "@/lib/session";
import { User } from "@/models/User";

const createAdminSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  currency: z.string().trim().min(3).max(3).default("AED"),
});

export async function GET() {
  const { error } = await requireSession(["SUPER_ADMIN"]);
  if (error) return error;

  await connectToDatabase();

  const admins = await User.find({ isAdmin: true, isActive: true })
    .sort({ createdAt: -1 })
    .select("name email currency createdAt")
    .lean();

  return Response.json({
    admins: admins.map((admin) => ({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      currency: admin.currency,
      createdAt: admin.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const { error } = await requireSession(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const parsed = createAdminSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  const email = parsed.data.email.toLowerCase();
  const existing = await User.findOne({ email }).lean();

  if (existing) {
    return Response.json({ error: "Email already exists" }, { status: 409 });
  }

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  const admin = await User.create({
    name: parsed.data.name,
    email,
    passwordHash,
    isAdmin: true,
    adminId: null,
    currency: parsed.data.currency.toUpperCase(),
  });

  return Response.json(
    {
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        currency: admin.currency,
      },
      temporaryPassword: tempPassword,
    },
    { status: 201 },
  );
}
