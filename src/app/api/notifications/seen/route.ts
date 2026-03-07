import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Notification } from "@/models/Notification";

const schema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid notification id"))
    .min(1)
    .max(200),
});

export async function PATCH(request: Request) {
  const sessionResult = await requireSession(["ADMIN", "EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  await Notification.updateMany(
    {
      _id: { $in: parsed.data.ids },
      recipientId: sessionResult.session!.user.id,
      isSeen: false,
    },
    {
      $set: { isSeen: true },
    },
  );

  const unseenCount = await Notification.countDocuments({
    recipientId: sessionResult.session!.user.id,
    isSeen: false,
  });

  return Response.json({ success: true, unseenCount });
}
