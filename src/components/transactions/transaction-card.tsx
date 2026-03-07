import Link from "next/link";
import { Receipt, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TransactionView = {
  id: string;
  description: string;
  amountEmployee: number;
  amountAdmin: number;
  employeeCurrency: string;
  adminCurrency: string;
  type: "credit" | "debit";
  creditSource?: "PETTY_CASH" | "CASH_IN_HAND" | null;
  transactionAt: string;
  billImageUrl?: string | null;
};

export function TransactionCard({
  tx,
  view = "employee",
  href,
}: {
  tx: TransactionView;
  view?: "employee" | "admin";
  href?: string;
}) {
  const isCredit = tx.type === "credit";
  const amount = view === "employee" ? tx.amountEmployee : tx.amountAdmin;
  const currency = view === "employee" ? tx.employeeCurrency : tx.adminCurrency;
  const signed = `${isCredit ? "+" : "-"} ${formatCurrency(amount, currency)}`;
  const body = (
    <Card className="overflow-hidden border-white/70 bg-white/90 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "mt-0.5 rounded-xl p-2",
                isCredit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
              )}
            >
              {isCredit ? <Wallet className="size-4" /> : <Receipt className="size-4" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{tx.description}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(tx.transactionAt)}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={isCredit ? "default" : "destructive"}>{tx.type.toUpperCase()}</Badge>
                {isCredit && tx.creditSource && (
                  <Badge variant="secondary">{tx.creditSource === "PETTY_CASH" ? "Petty Cash" : "Cash In Hand"}</Badge>
                )}
              </div>
            </div>
          </div>
          <p className={cn("text-sm font-bold", isCredit ? "text-emerald-700" : "text-rose-700")}>{signed}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return body;

  return (
    <Link href={href} className="block transition hover:scale-[1.005]">
      {body}
    </Link>
  );
}
