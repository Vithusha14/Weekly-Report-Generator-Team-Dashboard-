import { cn, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
