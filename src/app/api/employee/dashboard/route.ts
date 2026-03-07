import { startOfMonth } from "date-fns";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Transaction } from "@/models/Transaction";

export async function GET() {
  const sessionResult = await requireSession(["EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  await connectToDatabase();

  const employeeId = sessionResult.session!.user.id;
  const employeeObjectId = new Types.ObjectId(employeeId);
  const monthStart = startOfMonth(new Date());

  const [recent, monthTotalsAgg, totalAgg] = await Promise.all([
    Transaction.find({ employeeId }).sort({ transactionAt: -1, _id: -1 }).limit(20).lean(),
    Transaction.aggregate([
      {
        $match: {
          employeeId: employeeObjectId,
          transactionAt: { $gte: monthStart },
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
    ]),
    Transaction.aggregate([
      {
        $match: {
          employeeId: employeeObjectId,
        },
      },
      {
        $group: {
          _id: null,
          credit: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amountEmployee", 0] } },
          debit: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amountEmployee", 0] } },
        },
      },
    ]),
  ]);

  const monthTotals = monthTotalsAgg[0] ?? { pettyCash: 0, cashInHand: 0, expense: 0 };
  const total = totalAgg[0] ?? { credit: 0, debit: 0 };

  return Response.json({
    recent: recent.map((tx) => ({
      id: tx._id.toString(),
      description: tx.description,
      amountEmployee: tx.amountEmployee,
      employeeCurrency: tx.employeeCurrency,
      type: tx.type,
      creditSource: tx.creditSource,
      transactionAt: tx.transactionAt,
      billImageUrl: tx.billImageUrl,
    })),
    monthTotals,
    balance: Number((total.credit - total.debit).toFixed(2)),
  });
}
