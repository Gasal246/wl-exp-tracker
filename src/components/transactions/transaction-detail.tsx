"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

import { BillUploader } from "@/components/transactions/bill-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/format";

type Transaction = {
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

export function TransactionDetail({
  transactionId,
  view,
  editable,
}: {
  transactionId: string;
  view: "employee" | "admin";
  editable: boolean;
}) {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/transactions/${transactionId}`, { cache: "no-store" });
      const payload = await response.json();
      if (response.ok) {
        setTx(payload.transaction);
      }
    }

    void load();
  }, [transactionId]);

  if (!tx) {
    return <p className="text-sm text-muted-foreground">Loading transaction...</p>;
  }

  const amount = view === "employee" ? tx.amountEmployee : tx.amountAdmin;
  const currency = view === "employee" ? tx.employeeCurrency : tx.adminCurrency;

  async function save() {
    if (!tx) return;

    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: tx.description,
        type: tx.type,
        creditSource: tx.type === "credit" ? tx.creditSource : null,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error || "Failed to save changes");
      return;
    }

    toast.success("Transaction updated");
    setTx(payload.transaction);
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={tx.description}
              onChange={(event) => setTx({ ...tx, description: event.target.value })}
              disabled={!editable}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={tx.type}
                onValueChange={(value) =>
                  setTx({
                    ...tx,
                    type: value as "credit" | "debit",
                    creditSource: value === "debit" ? null : tx.creditSource ?? "PETTY_CASH",
                  })
                }
                disabled={!editable}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tx.type === "credit" && (
              <div className="space-y-2">
                <Label>Credit Source</Label>
                <Select
                  value={tx.creditSource ?? "PETTY_CASH"}
                  onValueChange={(value) =>
                    setTx({ ...tx, creditSource: value as "PETTY_CASH" | "CASH_IN_HAND" })
                  }
                  disabled={!editable}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                    <SelectItem value="CASH_IN_HAND">Cash In Hand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p>
              Amount: <span className="font-semibold">{formatCurrency(amount, currency)}</span>
            </p>
            <p>
              Date & Time: <span className="font-semibold">{formatDateTime(tx.transactionAt)}</span>
            </p>
          </div>

          {editable && <Button onClick={() => void save()}>Save Changes</Button>}
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Bill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tx.billImageUrl ? (
            <>
              <button
                type="button"
                className="relative h-[150px] w-[150px] overflow-hidden rounded-xl border bg-white"
                onClick={() => setIsPreviewOpen(true)}
              >
                <Image src={tx.billImageUrl} alt="Bill image" fill className="object-cover" />
              </button>

              {isPreviewOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md">
                  <div className="fixed inset-x-0 top-0 z-10 flex justify-end gap-2 p-4 sm:p-6">
                    <a
                      href={tx.billImageUrl}
                      download
                      className="inline-flex h-[36px] items-center gap-2 rounded-md bg-white/90 px-3 py-2 text-xs font-medium text-black shadow-sm hover:bg-white"
                    >
                      <Download className="size-3.5" />
                      Download
                    </a>
                    <button
                      type="button"
                      aria-label="Close preview"
                      className="inline-flex h-[36px] items-center justify-center rounded-md bg-white/90 px-3 text-black shadow-sm hover:bg-white"
                      onClick={() => setIsPreviewOpen(false)}
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="flex h-full items-center justify-center px-4 pb-4 pt-20 sm:px-6 sm:pb-6 sm:pt-24">
                    <div className="relative h-full w-full max-w-5xl">
                      <Image src={tx.billImageUrl} alt="Bill image full preview" fill className="object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/50 px-4 py-12 text-center text-sm text-muted-foreground">
              No bill image attached.
            </div>
          )}

          <BillUploader
            transactionId={transactionId}
            hasImage={Boolean(tx.billImageUrl)}
            onUploaded={(url) => {
              setTx((prev) => (prev ? { ...prev, billImageUrl: url } : prev));
            }}
            onRemoved={() => {
              setTx((prev) => (prev ? { ...prev, billImageUrl: null } : prev));
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
