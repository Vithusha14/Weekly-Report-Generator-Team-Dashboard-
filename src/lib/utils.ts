import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function weekLabel(start: string | Date, end: string | Date) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  NEEDS_CORRECTION: "Needs Correction",
  APPROVED: "Approved",
  NOT_STARTED: "Not started",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  SUBMITTED: "bg-sky-50 text-sky-800 ring-sky-200",
  NEEDS_CORRECTION: "bg-amber-50 text-amber-900 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  NOT_STARTED: "bg-stone-100 text-stone-600 ring-stone-200",
};
