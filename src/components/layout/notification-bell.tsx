"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { subscribeToForegroundFcm } from "@/lib/firebase-client";
import { formatCurrency } from "@/lib/format";

type NotificationItem = {
  id: string;
  eventType: "TRANSACTION_ADDED" | "BILL_ADDED";
  description: string;
  transactionType: "credit" | "debit";
  amountAdmin: number;
  amountEmployee: number;
  adminCurrency: string;
  employeeCurrency: string;
  isSeen: boolean;
  actor: {
    id: string;
    role: "ADMIN" | "EMPLOYEE";
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  link: string;
  createdAt: string;
};

type NotificationsPayload = {
  items: NotificationItem[];
  unseenCount: number;
};

function NotificationCard({
  item,
  role,
  onSeen,
  onClick,
}: {
  item: NotificationItem;
  role: "ADMIN" | "EMPLOYEE";
  onSeen: (id: string) => void;
  onClick: () => void;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (item.isSeen || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onSeen(item.id);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [item.id, item.isSeen, onSeen]);

  const amount =
    role === "ADMIN"
      ? formatCurrency(item.amountAdmin, item.adminCurrency)
      : formatCurrency(item.amountEmployee, item.employeeCurrency);
  const actorInitials = item.actor.name.slice(0, 2).toUpperCase();

  return (
    <Link
      ref={ref}
      href={item.link}
      onClick={onClick}
      className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 size-9">
          <AvatarImage src={item.actor.avatarUrl ?? undefined} alt={item.actor.name} />
          {!item.actor.avatarUrl ? <AvatarFallback>{actorInitials}</AvatarFallback> : null}
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{item.actor.name}</p>
            {!item.isSeen ? <span className="inline-block size-2 rounded-full bg-blue-600" /> : null}
          </div>
          <p className="truncate text-xs text-slate-500">{item.actor.email}</p>
          <p className="text-sm text-slate-700">{item.description}</p>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="uppercase">
              {item.transactionType}
            </Badge>
            <span className="font-semibold text-slate-900">{amount}</span>
            <span className="text-slate-500">
              {item.eventType === "BILL_ADDED" ? "Bill Added" : "Transaction Added"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function NotificationBell({ role }: { role: "ADMIN" | "EMPLOYEE" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const seenQueueRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=40", { cache: "no-store" });
      const payload = (await response.json()) as NotificationsPayload;
      if (!response.ok) return;
      setItems(payload.items ?? []);
      setUnseenCount(payload.unseenCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const flushSeen = useCallback(async () => {
    const ids = [...seenQueueRef.current];
    seenQueueRef.current.clear();
    if (!ids.length) return;

    const response = await fetch("/api/notifications/seen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      await loadNotifications();
      return;
    }

    const payload = (await response.json()) as { unseenCount?: number };
    if (typeof payload.unseenCount === "number") {
      setUnseenCount(payload.unseenCount);
    }
  }, [loadNotifications]);

  const markAsSeen = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target || target.isSeen || seenQueueRef.current.has(id)) {
        return;
      }

      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          return item.isSeen ? item : { ...item, isSeen: true };
        }),
      );

      setUnseenCount((current) => Math.max(0, current - 1));
      seenQueueRef.current.add(id);

      if (flushTimerRef.current) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        void flushSeen();
      }, 350);
    },
    [flushSeen, items],
  );

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 10000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };
    const onFocus = () => {
      void loadNotifications();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    let unsubscribeForeground = () => {};
    void (async () => {
      unsubscribeForeground = await subscribeToForegroundFcm(() => {
        void loadNotifications();
      });
    })();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      unsubscribeForeground();
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, [loadNotifications]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void loadNotifications();
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative bg-white">
          <Bell className="size-4" />
          {unseenCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unseenCount > 99 ? "99+" : unseenCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" showCloseButton={false} className="w-full p-0 sm:w-[400px] sm:max-w-[400px]">
        <SheetHeader className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base">Notifications</SheetTitle>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon" className="size-8">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading && !items.length ? <p className="text-sm text-slate-500">Loading notifications...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-slate-500">No notifications yet.</p> : null}

          {items.map((item) => (
            <NotificationCard key={item.id} item={item} role={role} onSeen={markAsSeen} onClick={() => setOpen(false)} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
