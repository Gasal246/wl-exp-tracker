import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Notification } from "@/models/Notification";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(30),
});

export async function GET(request: Request) {
  const sessionResult = await requireSession(["ADMIN", "EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  await connectToDatabase();

  const recipientId = sessionResult.session!.user.id;

  const [items, unseenCount] = await Promise.all([
    Notification.find({ recipientId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(parsed.data.limit)
      .lean(),
    Notification.countDocuments({ recipientId, isSeen: false }),
  ]);

  return Response.json({
    items: items.map((item) => ({
      id: item._id.toString(),
      eventType: item.eventType,
      description: item.description,
      transactionType: item.transactionType,
      amountAdmin: item.amountAdmin,
      amountEmployee: item.amountEmployee,
      adminCurrency: item.adminCurrency,
      employeeCurrency: item.employeeCurrency,
      isSeen: item.isSeen,
      actor: {
        id: item.actorId.toString(),
        role: item.actorRole,
        name: item.actorName,
        email: item.actorEmail,
        avatarUrl: item.actorAvatarUrl ?? null,
      },
      link:
        sessionResult.session!.user.role === "ADMIN"
          ? `/admin/transactions/${item.refId.toString()}`
          : `/employee/transactions/${item.refId.toString()}`,
      createdAt: item.createdAt,
    })),
    unseenCount,
  });
}
