"use client";

import { useCallback } from "react";

import { useLiveBalance } from "@/components/layout/live-balance-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transactions/transaction-form";

export function AdminEmployeeAddTransaction({
  employee,
}: {
  employee: { id: string; name: string; email: string; currency: string };
}) {
  const liveBalance = useLiveBalance();

  const handleSuccess = useCallback(
    (payload?: {
      transaction: {
        type: "credit" | "debit";
        amountAdmin: number;
      };
    }) => {
      if (!payload?.transaction) return;

      const delta =
        payload.transaction.type === "credit" ? payload.transaction.amountAdmin : -payload.transaction.amountAdmin;
      liveBalance?.applyDelta(delta);
    },
    [liveBalance],
  );

  return (
    <div className="space-y-4">
      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Add Transaction for {employee.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {employee.email} • Employee Currency: {employee.currency}
          </p>
        </CardHeader>
      </Card>

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Transaction Form</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            endpoint={`/api/admin/employees/${employee.id}/transactions`}
            defaultCreditSource="PETTY_CASH"
            allowCreditSource
            allowBillUpload
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
}
