"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { formatCurrency } from "@/lib/format";

type DashboardPayload = {
  employeeCount: number;
  totals: {
    pettyCash: number;
    expense: number;
    cashInHand: number;
  };
  chart: Array<{ month: string; credit: number; debit: number }>;
};

export function AdminDashboard({ currency }: { currency: string }) {
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const payload = (await response.json()) as DashboardPayload;
      if (response.ok) {
        setData(payload);
      }
    }

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Petty Cash (Month)"
          value={formatCurrency(data?.totals.pettyCash ?? 0, currency)}
        />
        <MetricCard
          label="Expense (Month)"
          value={formatCurrency(data?.totals.expense ?? 0, currency)}
        />
        <MetricCard
          label="Cash Added by Employees"
          value={formatCurrency(data?.totals.cashInHand ?? 0, currency)}
        />
        <MetricCard label="Employees" value={String(data?.employeeCount ?? 0)} />
      </div>

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Credit vs Debit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              credit: { label: "Credit", color: "var(--chart-2)" },
              debit: { label: "Debit", color: "var(--chart-1)" },
            }}
            className="h-[280px] w-full"
          >
            <AreaChart data={data?.chart ?? []}>
              <defs>
                <linearGradient id="fillCredit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-credit)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-credit)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillDebit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-debit)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-debit)" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area dataKey="credit" type="monotone" fill="url(#fillCredit)" stroke="var(--color-credit)" />
              <Area dataKey="debit" type="monotone" fill="url(#fillDebit)" stroke="var(--color-debit)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
