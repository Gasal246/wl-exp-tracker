import { z } from "zod";
import { Types } from "mongoose";

import { buildCursorFilter, encodeCursor } from "@/lib/pagination";
import { connectToDatabase } from "@/lib/db";
import { createNotificationAndSendFcm } from "@/lib/notification";
import { requireSession } from "@/lib/session";
import { mapTransactionResponse, resolveTransactionAmounts } from "@/lib/transaction";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

const createTransactionSchema = z.object({
  description: z.string().trim().min(2).max(500),
  amount: z.coerce.number().positive(),
  type: z.enum(["credit", "debit"]).default("debit"),
  billImageUrl: z.string().url().optional(),
  billStoragePath: z.string().optional(),
  transactionAt: z.string().optional(),
});

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  month: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function resolveDateFilter(input: { month?: string; from?: string; to?: string }) {
  if (input.month) {
    const from = new Date(`${input.month}-01T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);
    return { $gte: from, $lt: to };
  }

  const filter: Record<string, Date> = {};

  if (input.from) {
    filter.$gte = new Date(input.from);
  }

  if (input.to) {
    filter.$lte = new Date(input.to);
  }

  return Object.keys(filter).length ? filter : undefined;
}

export async function GET(request: Request) {
  const sessionResult = await requireSession(["EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  await connectToDatabase();

  const dateFilter = resolveDateFilter(parsed.data);

  const filter: Record<string, unknown> = {
    employeeId: sessionResult.session!.user.id,
    ...buildCursorFilter(parsed.data.cursor ?? null),
    ...(dateFilter ? { transactionAt: dateFilter } : {}),
  };

  const transactions = await Transaction.find(filter)
    .sort({ transactionAt: -1, _id: -1 })
    .limit(parsed.data.limit + 1)
    .lean();

  const hasMore = transactions.length > parsed.data.limit;
  const items = hasMore ? transactions.slice(0, parsed.data.limit) : transactions;

  const nextCursor =
    hasMore && items.length
      ? encodeCursor({
          time: items[items.length - 1].transactionAt.toISOString(),
          id: items[items.length - 1]._id.toString(),
        })
      : null;

  const totalsAgg = await Transaction.aggregate([
    {
      $match: {
        employeeId: new Types.ObjectId(sessionResult.session!.user.id),
        ...(dateFilter ? { transactionAt: dateFilter } : {}),
      },
    },
    {
      $group: {
        _id: null,
        pettyCash: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "credit"] },
                  { $eq: ["$creditSource", "PETTY_CASH"] },
                ],
              },
              "$amountEmployee",
              0,
            ],
          },
        },
        cashInHand: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "credit"] },
                  { $eq: ["$creditSource", "CASH_IN_HAND"] },
                ],
              },
              "$amountEmployee",
              0,
            ],
          },
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ["$type", "debit"] }, "$amountEmployee", 0],
          },
        },
      },
    },
  ]);

  return Response.json({
    items: items.map(mapTransactionResponse),
    hasMore,
    nextCursor,
    totals: totalsAgg[0] ?? { pettyCash: 0, cashInHand: 0, expense: 0 },
  });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession(["EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const body = await request.json();
  const parsed = createTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  const employee = await User.findOne({
    _id: sessionResult.session!.user.id,
    isAdmin: false,
    isActive: true,
  }).lean();
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const amounts = await resolveTransactionAmounts({
    employeeId: sessionResult.session!.user.id,
    amount: parsed.data.amount,
    actorRole: "EMPLOYEE",
    actorCurrency: sessionResult.session!.user.currency,
  });

  const admin = await User.findOne({ _id: amounts.adminId, isAdmin: true, isActive: true }).lean();
  if (!admin) {
    return Response.json({ error: "Admin not found" }, { status: 404 });
  }

  const tx = await Transaction.create({
    employeeId: sessionResult.session!.user.id,
    adminId: amounts.adminId,
    createdById: sessionResult.session!.user.id,
    createdByRole: "EMPLOYEE",
    type: parsed.data.type,
    creditSource: parsed.data.type === "credit" ? "CASH_IN_HAND" : null,
    billImageUrl: parsed.data.type === "debit" ? (parsed.data.billImageUrl ?? null) : null,
    billStoragePath: parsed.data.type === "debit" ? (parsed.data.billStoragePath ?? null) : null,
    description: parsed.data.description,
    amountEmployee: amounts.employeeAmount,
    amountAdmin: amounts.adminAmount,
    employeeCurrency: amounts.employeeCurrency,
    adminCurrency: amounts.adminCurrency,
    exchangeRate: amounts.rate,
    transactionAt: parsed.data.transactionAt ? new Date(parsed.data.transactionAt) : new Date(),
  });

  try {
    await createNotificationAndSendFcm({
      recipient: {
        id: admin._id.toString(),
        role: "ADMIN",
        fcmTokens: admin.fcmTokens ?? [],
      },
      actor: {
        id: employee._id.toString(),
        role: "EMPLOYEE",
        name: employee.name,
        email: employee.email,
        avatarUrl: employee.avatarUrl ?? null,
      },
      eventType: "TRANSACTION_ADDED",
      transaction: {
        id: tx._id.toString(),
        description: tx.description,
        type: tx.type,
        amountAdmin: tx.amountAdmin,
        amountEmployee: tx.amountEmployee,
        adminCurrency: tx.adminCurrency,
        employeeCurrency: tx.employeeCurrency,
      },
    });
  } catch {
    // Notification persistence must not block transaction creation.
  }

  return Response.json({ transaction: mapTransactionResponse(tx.toObject()) }, { status: 201 });
}
