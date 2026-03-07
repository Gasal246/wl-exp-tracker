import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";

import { convertCurrency } from "@/lib/currency";
import { User } from "@/models/User";
import type { CreditSource, TransactionType } from "@/types/app";

export const transactionInputSchema = z.object({
  employeeId: z.string(),
  description: z.string().trim().min(2).max(500),
  amount: z.coerce.number().positive(),
  type: z.enum(["credit", "debit"]).default("debit"),
  creditSource: z.enum(["PETTY_CASH", "CASH_IN_HAND"]).optional(),
  transactionAt: z.string().optional(),
});

export async function resolveTransactionAmounts(params: {
  employeeId: string;
  amount: number;
  actorRole: "ADMIN" | "EMPLOYEE";
  actorCurrency: string;
}) {
  const { employeeId, amount, actorRole, actorCurrency } = params;

  if (!isValidObjectId(employeeId)) {
    throw new Error("Invalid employee id");
  }

  const employee = await User.findById(employeeId).lean();
  if (!employee || employee.isAdmin) {
    throw new Error("Employee not found");
  }

  const admin = await User.findById(employee.adminId).lean();
  if (!admin || !admin.isAdmin) {
    throw new Error("Admin not found");
  }

  if (actorRole === "ADMIN") {
    const adminAmount = amount;
    const converted = await convertCurrency(amount, actorCurrency, employee.currency);

    return {
      adminId: admin._id,
      adminAmount,
      employeeAmount: converted.converted,
      rate: converted.rate,
      adminCurrency: actorCurrency,
      employeeCurrency: employee.currency,
    };
  }

  const employeeAmount = amount;
  const converted = await convertCurrency(amount, actorCurrency, admin.currency);

  return {
    adminId: admin._id,
    adminAmount: converted.converted,
    employeeAmount,
    rate: converted.rate,
    adminCurrency: admin.currency,
    employeeCurrency: actorCurrency,
  };
}

export function mapTransactionResponse(tx: {
  _id: Types.ObjectId | string;
  description: string;
  amountEmployee: number;
  amountAdmin: number;
  employeeCurrency: string;
  adminCurrency: string;
  type: TransactionType;
  creditSource?: CreditSource | null;
  billImageUrl?: string | null;
  transactionAt: Date;
  createdAt: Date;
  createdByRole?: string;
}) {
  return {
    id: tx._id.toString(),
    description: tx.description,
    amountEmployee: tx.amountEmployee,
    amountAdmin: tx.amountAdmin,
    employeeCurrency: tx.employeeCurrency,
    adminCurrency: tx.adminCurrency,
    type: tx.type,
    creditSource: tx.creditSource ?? null,
    billImageUrl: tx.billImageUrl ?? null,
    transactionAt: tx.transactionAt,
    createdAt: tx.createdAt,
    createdByRole: tx.createdByRole,
  };
}
