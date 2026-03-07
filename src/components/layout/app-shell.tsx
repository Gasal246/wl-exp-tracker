"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  ReceiptText,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { LiveBalanceContext } from "@/components/layout/live-balance-context";
import { NotificationBell } from "@/components/layout/notification-bell";
import { LogoutButton } from "@/components/shared/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFcmRegistration } from "@/hooks/use-fcm-registration";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: "dashboard" | "employees" | "profile" | "home" | "transactions" | "add";
  mobileOnly?: boolean;
};

const navIconMap: Record<NonNullable<NavItem["icon"]>, LucideIcon> = {
  dashboard: LayoutDashboard,
  employees: Users,
  profile: UserRound,
  home: Home,
  transactions: ReceiptText,
  add: Plus,
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  roleLabel: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  balanceLabel?: string;
  balanceAmount?: number;
  balanceCurrency?: string;
  navItems: NavItem[];
  mobileBottomNav?: boolean;
  children: React.ReactNode;
};

function NavList({
  items,
  pathname,
  fullWidth = true,
}: {
  items: NavItem[];
  pathname: string;
  fullWidth?: boolean;
}) {
  const visibleItems = items.filter((item) => !item.mobileOnly);

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon ? navIconMap[item.icon] : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "items-center rounded-lg px-3 py-2 text-sm font-medium transition",
              fullWidth ? "flex w-full gap-[5px]" : "inline-flex gap-[5px]",
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  title,
  subtitle,
  roleLabel,
  userName,
  userEmail,
  avatarUrl,
  balanceLabel,
  balanceAmount,
  balanceCurrency,
  navItems,
  mobileBottomNav,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const { data: clientSession } = useSession();
  const [liveBalance, setLiveBalance] = useState<number | null>(
    typeof balanceAmount === "number" ? balanceAmount : null,
  );

  const currentName = clientSession?.user?.name ?? userName;
  const currentEmail = clientSession?.user?.email ?? userEmail;
  const currentAvatarUrl = clientSession?.user?.avatarUrl ?? avatarUrl ?? null;
  const avatarInitials = currentName.slice(0, 2).toUpperCase();
  const currentBalanceLabel =
    liveBalance !== null && balanceCurrency ? formatCurrency(liveBalance, balanceCurrency) : balanceLabel;

  const applyDelta = useCallback((delta: number) => {
    setLiveBalance((current) => (current === null ? null : Number((current + delta).toFixed(2))));
  }, []);

  const setBalance = useCallback((value: number) => {
    setLiveBalance(Number(value.toFixed(2)));
  }, []);

  const liveBalanceContextValue = useMemo(() => {
    if (!balanceCurrency) return null;

    return {
      currency: balanceCurrency,
      setBalance,
      applyDelta,
    };
  }, [applyDelta, balanceCurrency, setBalance]);

  useFcmRegistration(roleLabel === "ADMIN" || roleLabel === "EMPLOYEE");

  return (
    <LiveBalanceContext.Provider value={liveBalanceContextValue}>
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_40%),#f8fafc]">
        <div className="flex min-h-screen w-full">
          <aside className="hidden w-72 border-r border-slate-200 bg-white lg:block">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200 px-6 py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Expense Tracker</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
              </div>

              <div className="px-4 py-4">
                <NavList items={navItems} pathname={pathname} />
              </div>

              <div className="mt-auto border-t border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={currentAvatarUrl ?? undefined} alt={currentName} />
                    {!currentAvatarUrl ? <AvatarFallback>{avatarInitials}</AvatarFallback> : null}
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{currentName}</p>
                    <p className="truncate text-xs text-slate-500">{currentEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className={cn("flex min-w-0 flex-1 flex-col", mobileBottomNav && "pb-20 lg:pb-0")}>
            <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/80 px-4 py-3 backdrop-blur lg:px-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 lg:hidden">
                  {roleLabel !== "EMPLOYEE" && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-white">
                          <Menu className="size-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="flex h-full w-[86vw] max-w-[340px] flex-col p-0">
                        <SheetHeader className="border-b border-slate-200 px-5 py-5 text-left">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Expense Tracker</p>
                          <SheetTitle className="mt-2 text-lg">{title}</SheetTitle>
                          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
                        </SheetHeader>
                        <div className="px-[15px] py-4">
                          <NavList items={navItems} pathname={pathname} />
                        </div>
                        <div className="mt-auto border-t border-slate-200 px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={currentAvatarUrl ?? undefined} alt={currentName} />
                              {!currentAvatarUrl ? <AvatarFallback>{avatarInitials}</AvatarFallback> : null}
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{currentName}</p>
                              <p className="truncate text-xs text-slate-500">{currentEmail}</p>
                            </div>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                  {roleLabel === "EMPLOYEE" ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 uppercase tracking-wider">Expense Tracker</p>
                      {currentBalanceLabel && (
                        <Badge className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-semibold">
                          <Wallet className="size-3.5" />
                          <span className="font-bold">{currentBalanceLabel}</span>
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="max-w-[170px] shrink-0 truncate whitespace-nowrap px-2 py-0.5 text-[10px] sm:max-w-[240px] sm:text-xs"
                    >
                      {roleLabel}
                    </Badge>
                  )}
                </div>

                <div className="hidden items-center gap-2 lg:flex">
                  {roleLabel === "EMPLOYEE" ? (
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">Expense Tracker</p>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="max-w-[280px] truncate">
                      {roleLabel}
                    </Badge>
                  )}
                  {currentBalanceLabel && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="inline-flex items-center gap-1.5 text-sm font-semibold">
                          <Wallet className="size-3.5" />
                          <span className="font-semibold">{currentBalanceLabel}</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>Total balance from all employees</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                  {(roleLabel === "ADMIN" || roleLabel === "EMPLOYEE") && (
                    <NotificationBell role={roleLabel === "ADMIN" ? "ADMIN" : "EMPLOYEE"} />
                  )}
                  {roleLabel === "ADMIN" || roleLabel === "EMPLOYEE" ? (
                    <Link
                      href={roleLabel === "ADMIN" ? "/admin/profile" : "/employee/profile"}
                      className="flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-slate-100"
                    >
                      <div className={cn("min-w-0 text-right", roleLabel === "EMPLOYEE" ? "block" : "hidden sm:block")}>
                        <p className="truncate text-sm font-medium leading-none">{currentName}</p>
                        <p className="truncate text-xs text-muted-foreground">{currentEmail}</p>
                      </div>
                      <Avatar>
                        <AvatarImage src={currentAvatarUrl ?? undefined} alt={currentName} />
                        {!currentAvatarUrl ? <AvatarFallback>{avatarInitials}</AvatarFallback> : null}
                      </Avatar>
                    </Link>
                  ) : (
                    <>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-medium leading-none">{currentName}</p>
                        <p className="text-xs text-muted-foreground">{currentEmail}</p>
                      </div>
                      <Avatar>
                        <AvatarImage src={currentAvatarUrl ?? undefined} alt={currentName} />
                        {!currentAvatarUrl ? <AvatarFallback>{avatarInitials}</AvatarFallback> : null}
                      </Avatar>
                    </>
                  )}
                  {roleLabel !== "EMPLOYEE" ? <LogoutButton compact /> : null}
                </div>
              </div>
              {currentBalanceLabel && roleLabel !== "EMPLOYEE" && (
                <div className="mt-2 flex lg:hidden">
                  <Badge className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <Wallet className="size-3.5" />
                    <span className="font-semibold">{currentBalanceLabel}</span>
                  </Badge>
                </div>
              )}
            </header>

            <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
          </div>
        </div>

        {mobileBottomNav && (
          <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3 lg:hidden">
            <div className="mx-auto flex w-fit items-center gap-[20px] rounded-2xl border border-white/60 bg-white/65 px-6 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              {navItems
                .filter((item) => !(roleLabel === "EMPLOYEE" && item.icon === "transactions"))
                .map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon ? navIconMap[item.icon] : null;
                const isPrimaryAdd = item.icon === "add";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      "flex items-center justify-center transition",
                      isPrimaryAdd
                        ? cn(
                            "h-11 min-w-[72px] rounded-xl px-4 shadow-[0_10px_24px_rgba(34,197,94,0.35)]",
                            isActive
                              ? "bg-emerald-600 text-white"
                              : "border border-white/80 bg-emerald-500 text-white hover:bg-emerald-600",
                          )
                        : cn(
                            "size-11 rounded-xl",
                            isActive
                              ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.28)]"
                              : "border border-slate-200/80 bg-white/55 text-slate-600 hover:bg-white/80 hover:text-slate-900",
                          ),
                    )}
                  >
                    {Icon ? (
                      <Icon className={cn(isPrimaryAdd ? "size-6" : "size-5")} />
                    ) : (
                      <span className="text-xs font-semibold">{item.label[0]}</span>
                    )}
                  </Link>
                );
                })}
            </div>
          </div>
        )}
      </div>
    </LiveBalanceContext.Provider>
  );
}
