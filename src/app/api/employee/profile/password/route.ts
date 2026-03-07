import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireSession } from "@/lib/session";
import { User } from "@/models/User";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const sessionResult = await requireSession(["EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await User.updateOne(
    { _id: sessionResult.session!.user.id, isAdmin: false },
    { $set: { passwordHash } },
  );

  return Response.json({ success: true });
}
