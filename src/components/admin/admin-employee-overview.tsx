"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionCard, type TransactionView } from "@/components/transactions/transaction-card";
import { formatCurrency } from "@/lib/format";

export function AdminEmployeeOverview({
  employee,
  adminCurrency,
}: {
  employee: { id: string; name: string; email: string; currency: string };
  adminCurrency: string;
}) {
  const [recent, setRecent] = useState<TransactionView[]>([]);
  const [totals, setTotals] = useState({ pettyCash: 0, cashInHand: 0, expense: 0 });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const response = await fetch(`/api/admin/employees/${employee.id}/transactions?limit=30`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!cancelled && response.ok) {
        setRecent(payload.items);
        setTotals(payload.totals);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [employee.id]);

  const balance = totals.pettyCash + totals.cashInHand - totals.expense;

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{employee.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {employee.email} • Employee Currency: {employee.currency}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/employees/${employee.id}/transactions/new`}>Add Transaction</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Current Balance" value={formatCurrency(balance, adminCurrency)} />
        <MetricCard label="Petty Cash" value={formatCurrency(totals.pettyCash, adminCurrency)} />
        <MetricCard label="Cash In Hand" value={formatCurrency(totals.cashInHand, adminCurrency)} />
        <MetricCard label="Expense" value={formatCurrency(totals.expense, adminCurrency)} />
      </div>

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Recent 30 Transactions</CardTitle>
            <Link href={`/admin/employees/${employee.id}/transactions`} className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} view="admin" href={`/admin/transactions/${tx.id}`} />
          ))}
          {!recent.length && <p className="py-6 text-sm text-muted-foreground">No transactions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
