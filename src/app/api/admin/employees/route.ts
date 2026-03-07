import { z } from "zod";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { requireSession } from "@/lib/session";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

const createEmployeeSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  currency: z.string().trim().length(3),
});

export async function GET() {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  await connectToDatabase();

  const adminObjectId = new Types.ObjectId(sessionResult.session!.user.id);

  const [employees, balances] = await Promise.all([
    User.find({
      adminId: adminObjectId,
      isAdmin: false,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .select("name email currency avatarUrl createdAt")
      .lean(),
    Transaction.aggregate<{
      _id: unknown;
      pettyCash: number;
      cashInHand: number;
      expense: number;
    }>([
      {
        $match: {
          adminId: adminObjectId,
        },
      },
      {
        $group: {
          _id: "$employeeId",
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
    ]),
  ]);

  const balanceByEmployeeId = new Map(
    balances.map((entry) => [
      String(entry._id),
      Number((entry.pettyCash + entry.cashInHand - entry.expense).toFixed(2)),
    ]),
  );

  return Response.json({
    adminCurrency: sessionResult.session?.user.currency ?? "AED",
    employees: employees.map((employee) => ({
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      currency: employee.currency,
      avatarUrl: employee.avatarUrl ?? null,
      currentBalance: balanceByEmployeeId.get(employee._id.toString()) ?? 0,
      createdAt: employee.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  const body = await request.json();
  const parsed = createEmployeeSchema.safeParse(body);

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

  const employee = await User.create({
    name: parsed.data.name,
    email,
    passwordHash,
    isAdmin: false,
    adminId: sessionResult.session!.user.id,
    currency: parsed.data.currency.toUpperCase(),
  });

  return Response.json(
    {
      employee: {
        id: employee._id.toString(),
        name: employee.name,
        email: employee.email,
        currency: employee.currency,
      },
      temporaryPassword: tempPassword,
    },
    { status: 201 },
  );
}
