import { endOfMonth, startOfMonth } from "date-fns";

export function resolveDateRange(params: { from?: string | null; to?: string | null; month?: string | null }) {
  const { from, to, month } = params;

  if (month) {
    const monthDate = new Date(`${month}-01T00:00:00.000Z`);
    return {
      from: startOfMonth(monthDate),
      to: endOfMonth(monthDate),
    };
  }

  const fromDate = from ? new Date(from) : new Date("1970-01-01T00:00:00.000Z");
  const toDate = to ? new Date(to) : new Date();

  return {
    from: fromDate,
    to: toDate,
  };
}

export function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
