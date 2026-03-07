import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { buildCursorFilter, encodeCursor } from "@/lib/pagination";
import { connectToDatabase } from "@/lib/db";
import { firebaseMessaging } from "@/lib/firebase-admin";
import { requireSession } from "@/lib/session";
import { mapTransactionResponse, resolveTransactionAmounts } from "@/lib/transaction";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

const createTransactionSchema = z.object({
  description: z.string().trim().min(2).max(500),
  amount: z.coerce.number().positive(),
  type: z.enum(["credit", "debit"]).default("debit"),
  creditSource: z.enum(["PETTY_CASH", "CASH_IN_HAND"]).optional(),
  billImageUrl: z.string().url().optional(),
  billStoragePath: z.string().optional(),
  transactionAt: z.string().optional(),
});

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
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

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid employee id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  await connectToDatabase();

  const employee = await User.findOne({ _id: id, adminId: sessionResult.session!.user.id, isAdmin: false }).lean();
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const baseFilter: Record<string, unknown> = {
    employeeId: id,
    adminId: sessionResult.session!.user.id,
    ...buildCursorFilter(parsed.data.cursor ?? null),
  };

  const dateFilter = resolveDateFilter(parsed.data);
  if (dateFilter) {
    baseFilter.transactionAt = dateFilter;
  }

  const transactions = await Transaction.find(baseFilter)
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
        employeeId: employee._id,
        adminId: employee.adminId,
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
              "$amountAdmin",
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
              "$amountAdmin",
              0,
            ],
          },
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ["$type", "debit"] }, "$amountAdmin", 0],
          },
        },
      },
    },
  ]);

  return Response.json({
    items: items.map(mapTransactionResponse),
    nextCursor,
    hasMore,
    totals: totalsAgg[0] ?? { pettyCash: 0, cashInHand: 0, expense: 0 },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid employee id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = createTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  const employee = await User.findOne({ _id: id, adminId: sessionResult.session!.user.id, isAdmin: false }).lean();
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const amounts = await resolveTransactionAmounts({
    employeeId: id,
    amount: parsed.data.amount,
    actorRole: "ADMIN",
    actorCurrency: sessionResult.session!.user.currency,
  });

  const tx = await Transaction.create({
    employeeId: id,
    adminId: sessionResult.session!.user.id,
    createdById: sessionResult.session!.user.id,
    createdByRole: "ADMIN",
    type: parsed.data.type,
    creditSource: parsed.data.type === "credit" ? (parsed.data.creditSource ?? "PETTY_CASH") : null,
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

  if (parsed.data.type === "credit") {
    try {
      if (employee.fcmTokens?.length) {
        await firebaseMessaging().sendEachForMulticast({
          tokens: employee.fcmTokens,
          notification: {
            title: "Petty Cash Updated",
            body: `${amounts.employeeCurrency} ${amounts.employeeAmount.toFixed(2)} credited to your account`,
          },
          data: {
            type: "petty_cash_credit",
            transactionId: tx._id.toString(),
          },
        });
      }
    } catch {
      // notification failures should not block transaction creation
    }
  }

  return Response.json({ transaction: mapTransactionResponse(tx.toObject()) }, { status: 201 });
}
