"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BILL_UPLOAD_TARGET_BYTES, formatBytes } from "@/lib/bill-upload";
import { uploadBillImage } from "@/lib/bill-upload-client";
import type { TransactionView } from "@/components/transactions/transaction-card";

type CreateTransactionResponse = {
  transaction?: TransactionView;
  error?: string;
};

export type TransactionFormSuccessPayload = {
  transaction: TransactionView;
};

export function TransactionForm({
  endpoint,
  defaultCreditSource = "CASH_IN_HAND",
  allowCreditSource = true,
  allowBillUpload = false,
  onSuccess,
}: {
  endpoint: string;
  defaultCreditSource?: "PETTY_CASH" | "CASH_IN_HAND";
  allowCreditSource?: boolean;
  allowBillUpload?: boolean;
  onSuccess?: (payload?: TransactionFormSuccessPayload) => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("debit");
  const [creditSource, setCreditSource] = useState<"PETTY_CASH" | "CASH_IN_HAND">(defaultCreditSource);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const billInputRef = useRef<HTMLInputElement | null>(null);
  const billPreviewUrl = useMemo(() => (billFile ? URL.createObjectURL(billFile) : null), [billFile]);
  const billSizeLabel = billFile ? `${(billFile.size / 1024).toFixed(1)} KB` : null;

  useEffect(() => {
    return () => {
      if (billPreviewUrl) {
        URL.revokeObjectURL(billPreviewUrl);
      }
    };
  }, [billPreviewUrl]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountNumber = Number(amount);
    if (!description.trim() || Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast.error("Enter a valid description and amount");
      return;
    }

    setLoading(true);

    try {
      let billImageUrl: string | undefined;
      let billStoragePath: string | undefined;

      if (allowBillUpload && type === "debit" && billFile) {
        const uploadResult = await uploadBillImage(billFile);
        billImageUrl = uploadResult.url;
        billStoragePath = uploadResult.storagePath;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: amountNumber,
          type,
          creditSource,
          billImageUrl,
          billStoragePath,
        }),
      });

      const payload = (await response.json()) as CreateTransactionResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save transaction");
      }

      toast.success("Transaction added");
      setDescription("");
      setAmount("");
      setType("debit");
      setCreditSource(defaultCreditSource);
      setBillFile(null);
      if (billInputRef.current) {
        billInputRef.current.value = "";
      }
      onSuccess?.(payload.transaction ? { transaction: payload.transaction } : undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea placeholder="Taxi from airport" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Amount</Label>
        <Input type="number" step="0.01" placeholder="200" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as "credit" | "debit")}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {allowCreditSource && (
          <div className="space-y-2">
            <Label>Credit Source</Label>
            <Select
              value={creditSource}
              onValueChange={(value) => setCreditSource(value as "PETTY_CASH" | "CASH_IN_HAND")}
              disabled={type !== "credit"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                <SelectItem value="CASH_IN_HAND">Cash In Hand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {allowBillUpload && type === "debit" && (
        <div className="space-y-2">
          <Label htmlFor="bill-image">Bill Image (Optional)</Label>
          <Input
            id="bill-image"
            ref={billInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setBillFile(file);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Image only, max size 6 MB. Files above 1 MB are compressed before upload.
          </p>
          {billPreviewUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-2">
              <div className="relative h-12 w-12">
                <Image
                  src={billPreviewUrl}
                  alt="Selected bill preview"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-md object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove selected bill image"
                  className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
                  onClick={() => {
                    setBillFile(null);
                    if (billInputRef.current) {
                      billInputRef.current.value = "";
                    }
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {billSizeLabel}
                {billFile && billFile.size > BILL_UPLOAD_TARGET_BYTES
                  ? ` -> compressed under ${formatBytes(BILL_UPLOAD_TARGET_BYTES)} on upload`
                  : ""}
              </p>
            </div>
          )}
        </div>
      )}

      <Button disabled={loading} type="submit" className="w-full">
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        {loading ? "Saving..." : "Add Transaction"}
      </Button>
    </form>
  );
}
