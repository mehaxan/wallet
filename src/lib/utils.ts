import { NextResponse } from "next/server";
import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBDT(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "৳0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `৳${Math.abs(num).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatBDTCompact(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount ?? "0") : (amount ?? 0);
  if (num >= 10_000_000) return `৳${(num / 10_000_000).toFixed(2)} Cr`;
  if (num >= 100_000) return `৳${(num / 100_000).toFixed(2)} L`;
  if (num >= 1_000) return `৳${(num / 1_000).toFixed(1)}K`;
  return formatBDT(num);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** BD fiscal year string, e.g. "2024-25" */
export function getBDFiscalYear(date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 7) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

export function calcROI(invested: number, returned: number): number {
  if (!invested || invested === 0) return 0;
  return Math.round(((returned - invested) / invested) * 10_000) / 100;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: "success",
    approved: "success",
    completed: "success",
    paid: "success",
    matured: "success",
    pending: "warning",
    overdue: "danger",
    draft: "dim",
    paused: "dim",
    cancelled: "danger",
    rejected: "danger",
    closed: "muted",
    abandoned: "muted",
  };
  return map[status] ?? "muted";
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
