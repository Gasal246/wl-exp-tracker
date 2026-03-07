import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { User } from "@/models/User";

const schema = z.object({
  token: z.string().min(20),
});

export async function POST(request: Request) {
  const sessionResult = await requireSession(["ADMIN", "EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid token" }, { status: 400 });
  }

  await connectToDatabase();

  await User.updateOne(
    { _id: sessionResult.session!.user.id },
    { $addToSet: { fcmTokens: parsed.data.token } },
  );

  return Response.json({ success: true });
}
