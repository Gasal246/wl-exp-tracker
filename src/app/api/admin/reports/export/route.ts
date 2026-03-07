import { isValidObjectId } from "mongoose";
import { format } from "date-fns";

import { buildTransactionsWorkbook } from "@/lib/excel";
import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

function resolveDateFilter(input: { month?: string | null; from?: string | null; to?: string | null }) {
  if (input.month) {
    const [yearString, monthString] = input.month.split("-");
    const year = Number(yearString);
    const month = Number(monthString);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return undefined;
    }

    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const now = new Date();
    const isCurrentMonth = now.getUTCFullYear() === year && now.getUTCMonth() === month - 1;
    const to = isCurrentMonth ? now : new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return {
      query: { $gte: from, $lte: to },
      selectedRange: { from, to },
    };
  }

  const filter: Record<string, Date> = {};
  let selectedFrom: Date | undefined;
  let selectedTo: Date | undefined;

  if (input.from) {
    selectedFrom = new Date(`${input.from}T00:00:00.000Z`);
    filter.$gte = selectedFrom;
  }

  if (input.to) {
    selectedTo = new Date(`${input.to}T23:59:59.999Z`);
    filter.$lte = selectedTo;
  }

  if (!selectedFrom && selectedTo) selectedFrom = new Date(selectedTo);
  if (!selectedTo && selectedFrom) selectedTo = new Date(selectedFrom);

  if (!Object.keys(filter).length) {
    return undefined;
  }

  return {
    query: filter,
    selectedRange: selectedFrom && selectedTo ? { from: selectedFrom, to: selectedTo } : undefined,
  };
}

export async function GET(request: Request) {
  const sessionResult = await requireSession(["ADMIN"]);
  if (sessionResult.error) return sessionResult.error;

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");

  if (!employeeId || !isValidObjectId(employeeId)) {
    return Response.json({ error: "Invalid employeeId" }, { status: 400 });
  }

  const dateFilter = resolveDateFilter({
    month: url.searchParams.get("month"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  await connectToDatabase();

  const employee = await User.findOne({
    _id: employeeId,
    adminId: sessionResult.session!.user.id,
    isAdmin: false,
  })
    .select("name email")
    .lean();

  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const transactions = await Transaction.find({
    employeeId,
    adminId: sessionResult.session!.user.id,
    ...(dateFilter?.query ? { transactionAt: dateFilter.query } : {}),
  })
    .sort({ transactionAt: 1, _id: 1 })
    .lean();

  const totals = transactions.reduce(
    (acc, tx) => {
      if (tx.type === "debit") {
        acc.expense += tx.amountAdmin;
      } else if (tx.creditSource === "PETTY_CASH") {
        acc.pettyCash += tx.amountAdmin;
      } else {
        acc.cashInHand += tx.amountAdmin;
      }

      return acc;
    },
    { pettyCash: 0, cashInHand: 0, expense: 0 },
  );

  const workbook = await buildTransactionsWorkbook({
    fileName: `transactions-${employeeId}.xlsx`,
    employee: {
      name: employee.name,
      email: employee.email,
    },
    selectedDateRange: dateFilter?.selectedRange,
    downloadedAt: new Date(),
    rows: transactions.map((tx) => ({
      date: format(new Date(tx.transactionAt), "dd-MM-yy"),
      description: tx.description ?? "",
      type: tx.type === "credit" ? "Credit" : "Debit",
      amount: Number(tx.amountAdmin.toFixed(2)),
    })),
    totals,
  });

  return new Response(workbook.buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${workbook.fileName}"`,
    },
  });
}
