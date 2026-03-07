"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useFcmRegistration } from "@/hooks/use-fcm-registration";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionCard, type TransactionView } from "@/components/transactions/transaction-card";
import { formatCurrency } from "@/lib/format";

type DashboardPayload = {
  recent: TransactionView[];
  monthTotals: {
    pettyCash: number;
    cashInHand: number;
    expense: number;
  };
  balance: number;
};

export function EmployeeHome({ currency }: { currency: string }) {
  const [data, setData] = useState<DashboardPayload | null>(null);

  useFcmRegistration(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const response = await fetch("/api/employee/dashboard", { cache: "no-store" });
      const payload = (await response.json()) as DashboardPayload;
      if (!cancelled && response.ok) {
        setData(payload);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Current Balance" value={formatCurrency(data?.balance ?? 0, currency)} />
        <MetricCard
          label="Petty Cash This Month"
          value={formatCurrency(data?.monthTotals.pettyCash ?? 0, currency)}
        />
        <MetricCard
          label="Cash In Hand This Month"
          value={formatCurrency(data?.monthTotals.cashInHand ?? 0, currency)}
        />
        <MetricCard
          label="Expense This Month"
          value={formatCurrency(data?.monthTotals.expense ?? 0, currency)}
        />
      </div>

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/employee/transactions" className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.recent.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} view="employee" href={`/employee/transactions/${tx.id}`} />
          ))}
          {data?.recent?.length === 20 && (
            <div className="pt-2 text-center">
              <Link href="/employee/transactions" className="text-sm font-medium text-primary hover:underline">
                View All
              </Link>
            </div>
          )}
          {!data?.recent?.length && <p className="py-6 text-sm text-muted-foreground">No transactions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
