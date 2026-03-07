import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { SuperAdmin } from "@/models/SuperAdmin";
import { User } from "@/models/User";

const schema = z.object({
  avatarUrl: z.string().url(),
});

export async function PATCH(request: Request) {
  const sessionResult = await requireSession(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  await connectToDatabase();

  if (sessionResult.session!.user.role === "SUPER_ADMIN") {
    await SuperAdmin.updateOne({ _id: sessionResult.session!.user.id }, { $set: { avatarUrl: parsed.data.avatarUrl } });
  } else {
    await User.updateOne({ _id: sessionResult.session!.user.id }, { $set: { avatarUrl: parsed.data.avatarUrl } });
  }

  return Response.json({ success: true });
}
