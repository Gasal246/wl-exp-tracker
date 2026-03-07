import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { mapTransactionResponse } from "@/lib/transaction";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

const updateSchema = z.object({
  description: z.string().trim().min(2).max(500).optional(),
  type: z.enum(["credit", "debit"]).optional(),
  creditSource: z.enum(["PETTY_CASH", "CASH_IN_HAND"]).nullable().optional(),
  billImageUrl: z.string().url().nullable().optional(),
  billStoragePath: z.string().nullable().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession(["ADMIN", "EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  await connectToDatabase();

  const filter: Record<string, unknown> = { _id: id };
  if (sessionResult.session!.user.role === "ADMIN") {
    filter.adminId = sessionResult.session!.user.id;
  } else {
    filter.employeeId = sessionResult.session!.user.id;
  }

  const tx = await Transaction.findOne(filter).lean();
  if (!tx) {
    return Response.json({ error: "Transaction not found" }, { status: 404 });
  }

  return Response.json({ transaction: mapTransactionResponse(tx) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession(["ADMIN", "EMPLOYEE"]);
  if (sessionResult.error) return sessionResult.error;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  const tx = await Transaction.findById(id);
  if (!tx) {
    return Response.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (sessionResult.session!.user.role === "ADMIN") {
    if (tx.adminId.toString() !== sessionResult.session!.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (sessionResult.session!.user.role === "EMPLOYEE") {
    if (tx.employeeId.toString() !== sessionResult.session!.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await User.findById(sessionResult.session!.user.id).lean();
    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    // Employee can only modify bill attachments.
    const allowedFields = {
      billImageUrl: parsed.data.billImageUrl,
      billStoragePath: parsed.data.billStoragePath,
    };

    if (allowedFields.billImageUrl !== undefined) {
      tx.billImageUrl = allowedFields.billImageUrl;
    }
    if (allowedFields.billStoragePath !== undefined) {
      tx.billStoragePath = allowedFields.billStoragePath;
    }

    await tx.save();
    return Response.json({ transaction: mapTransactionResponse(tx.toObject()) });
  }

  if (parsed.data.description !== undefined) tx.description = parsed.data.description;
  if (parsed.data.type !== undefined) tx.type = parsed.data.type;

  if (parsed.data.type === "debit") {
    tx.creditSource = null;
  } else if (parsed.data.creditSource !== undefined) {
    tx.creditSource = parsed.data.creditSource;
  }

  if (parsed.data.billImageUrl !== undefined) tx.billImageUrl = parsed.data.billImageUrl;
  if (parsed.data.billStoragePath !== undefined) tx.billStoragePath = parsed.data.billStoragePath;

  await tx.save();

  return Response.json({ transaction: mapTransactionResponse(tx.toObject()) });
}
