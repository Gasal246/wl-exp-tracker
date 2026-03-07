import { startOfMonth } from "date-fns";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

export async function GET() {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  await connectToDatabase();

  const adminId = sessionResult.session!.user.id;
  const monthStart = startOfMonth(new Date());
  const adminObjectId = new Types.ObjectId(adminId);

  const [employeeCount, monthlyTotals, chartData] = await Promise.all([
    User.countDocuments({ adminId, isAdmin: false, isActive: true }),
    Transaction.aggregate([
      { $match: { adminId: adminObjectId, transactionAt: { $gte: monthStart } } },
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
          expense: {
            $sum: {
              $cond: [{ $eq: ["$type", "debit"] }, "$amountAdmin", 0],
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
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { adminId: adminObjectId } },
      {
        $group: {
          _id: {
            year: { $year: "$transactionAt" },
            month: { $month: "$transactionAt" },
          },
          credit: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amountAdmin", 0] } },
          debit: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amountAdmin", 0] } },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  return Response.json({
    employeeCount,
    totals: monthlyTotals[0] ?? { pettyCash: 0, expense: 0, cashInHand: 0 },
    chart: chartData.map((entry) => ({
      month: `${entry._id.year}-${String(entry._id.month).padStart(2, "0")}`,
      credit: Number(entry.credit.toFixed(2)),
      debit: Number(entry.debit.toFixed(2)),
    })),
  });
}
