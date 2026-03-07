"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TransactionCard, type TransactionView } from "@/components/transactions/transaction-card";
import { cn } from "@/lib/utils";

type ResponseShape = {
  items: TransactionView[];
  nextCursor: string | null;
  hasMore: boolean;
  totals?: {
    pettyCash: number;
    cashInHand: number;
    expense: number;
  };
};

export function InfiniteTransactionList({
  endpoint,
  view,
  detailHref,
  limit = 20,
  initialLimit,
  loadMoreLimit,
  showFilters = true,
  initialMonth,
  onTotals,
}: {
  endpoint: string;
  view: "employee" | "admin";
  detailHref: (id: string) => string;
  limit?: number;
  initialLimit?: number;
  loadMoreLimit?: number;
  showFilters?: boolean;
  initialMonth?: string;
  onTotals?: (totals: ResponseShape["totals"]) => void;
}) {
  const [items, setItems] = useState<TransactionView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState(initialMonth ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const onTotalsRef = useRef(onTotals);
  const firstPageLimit = initialLimit ?? limit;
  const nextPageLimit = loadMoreLimit ?? limit;

  useEffect(() => {
    onTotalsRef.current = onTotals;
  }, [onTotals]);

  const queryBase = useMemo(() => {
    const params = new URLSearchParams();

    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (month) params.set("month", month);

    return params.toString();
  }, [from, to, month]);

  const loadInitial = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams(queryBase);
      params.set("limit", String(firstPageLimit));

      const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ResponseShape;

      if (!response.ok) {
        throw new Error("Unable to load transactions");
      }

      setItems(payload.items);
      setCursor(payload.nextCursor);
      setHasMore(payload.hasMore && Boolean(payload.nextCursor));
      onTotalsRef.current?.(payload.totals);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch data");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [endpoint, firstPageLimit, queryBase]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (!hasMore || !cursor) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams(queryBase);
      params.set("limit", String(nextPageLimit));
      params.set("cursor", cursor);

      const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ResponseShape;

      if (!response.ok) {
        throw new Error("Unable to load transactions");
      }

      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const nextItems = payload.items.filter((item) => !existingIds.has(item.id));
        return [...prev, ...nextItems];
      });
      setCursor(payload.nextCursor);
      setHasMore(payload.hasMore && Boolean(payload.nextCursor));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch data");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [cursor, endpoint, hasMore, nextPageLimit, queryBase]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(false);
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const current = observerRef.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          void loadMore();
        }
      },
      { threshold: 0.8 },
    );

    observer.observe(current);

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={filtersOpen ? "Hide filters" : "Show filters"}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <Filter className="size-4" />
          </Button>
        </div>
      )}

      {showFilters && (
        <Card className={cn("border-white/70 bg-white/90", !filtersOpen && "hidden")}>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            <Button
              type="button"
              variant="outline"
              className="sm:col-span-3"
              onClick={() => {
                setMonth(initialMonth ?? "");
                setFrom("");
                setTo("");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((tx) => (
          <TransactionCard key={tx.id} tx={tx} view={view} href={detailHref(tx.id)} />
        ))}
        {!items.length && !loading && (
          <p className="rounded-xl border border-dashed bg-white/70 px-4 py-8 text-center text-sm text-muted-foreground">
            No transactions found.
          </p>
        )}
      </div>

      <div ref={observerRef} className="flex justify-center py-2">
        {loading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
