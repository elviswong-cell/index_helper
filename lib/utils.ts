import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "";
  return format(value, "yyyy年M月d日 (eee) HH:mm", { locale: zhTW });
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "";
  return format(value, "yyyy年M月d日 (eee)", { locale: zhTW });
}

export function formatTimeRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
): string {
  if (!start || !end) return "";
  const s = format(start, "HH:mm", { locale: zhTW });
  const e = format(end, "HH:mm", { locale: zhTW });
  return `${s} – ${e}`;
}

export function durationHours(
  start: Date | null | undefined,
  end: Date | null | undefined,
): number {
  if (!start || !end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5);
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("zh-Hant")}`;
}
