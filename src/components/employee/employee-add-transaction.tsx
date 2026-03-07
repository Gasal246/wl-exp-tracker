"use client";

import { useRouter } from "next/navigation";

import { useLiveBalance } from "@/components/layout/live-balance-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transactions/transaction-form";

export function EmployeeAddTransaction() {
  const router = useRouter();
  const liveBalance = useLiveBalance();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border-white/70 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle>Add Transaction</CardTitle>
          <CardDescription>Record a new expense or cash entry.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm
            endpoint="/api/employee/transactions"
            defaultCreditSource="CASH_IN_HAND"
            allowCreditSource={false}
            allowBillUpload
            onSuccess={(payload) => {
              if (payload?.transaction) {
                const delta =
                  payload.transaction.type === "credit"
                    ? payload.transaction.amountEmployee
                    : -payload.transaction.amountEmployee;
                liveBalance?.applyDelta(delta);
              }
              router.push("/employee/transactions");
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
