"use client";

import { useCallback, useState } from "react";

import { InfiniteTransactionList } from "@/components/transactions/infinite-transaction-list";
import { MetricCard } from "@/components/shared/metric-card";
import { formatCurrency } from "@/lib/format";

export function EmployeeTransactions({ currency }: { currency: string }) {
  const [totals, setTotals] = useState({ pettyCash: 0, cashInHand: 0, expense: 0 });
  const currentMonth = new Date().toLocaleString("en-US", { month: "long" });
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthBalance = totals.pettyCash + totals.cashInHand - totals.expense;
  const handleTotals = useCallback((value?: { pettyCash: number; cashInHand: number; expense: number }) => {
    if (value) setTotals(value);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label={`Balance (${currentMonth})`} value={formatCurrency(currentMonthBalance, currency)} />
        <MetricCard label={`Expense (${currentMonth})`} value={formatCurrency(totals.expense, currency)} />
      </div>

      <InfiniteTransactionList
        endpoint="/api/employee/transactions"
        view="employee"
        detailHref={(id) => `/employee/transactions/${id}`}
        limit={20}
        initialMonth={currentMonthKey}
        onTotals={handleTotals}
      />
    </div>
  );
}
