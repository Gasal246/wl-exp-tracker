"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { ReactNode } from "react";

import { InfiniteTransactionList } from "@/components/transactions/infinite-transaction-list";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AdminEmployeeTransactions({
  employeeId,
  headerLeft,
}: {
  employeeId: string;
  headerLeft?: ReactNode;
}) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  function exportExcel() {
    const params = new URLSearchParams({ employeeId });
    if (range?.from) params.set("from", format(range.from, "yyyy-MM-dd"));
    if (range?.to) params.set("to", format(range.to, "yyyy-MM-dd"));

    window.open(`/api/admin/reports/export?${params.toString()}`, "_blank");
    setExportDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>{headerLeft}</div>
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 size-4" />
              Export Excel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Export Transactions</DialogTitle>
            </DialogHeader>
            <div className="rounded-xl border bg-white">
              <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
            </div>
            <DialogFooter>
              <Button onClick={exportExcel} disabled={!range?.from || !range?.to} className="w-full sm:w-auto">
                <FileSpreadsheet className="mr-2 size-4" />
                Export Excel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <InfiniteTransactionList
        endpoint={`/api/admin/employees/${employeeId}/transactions`}
        view="admin"
        detailHref={(id) => `/admin/transactions/${id}`}
        initialLimit={30}
        loadMoreLimit={10}
        showFilters
      />
    </div>
  );
}
