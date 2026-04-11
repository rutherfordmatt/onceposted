"use client";

interface NewBadgeProps {
  createdAt: Date | string;
  scheduledFor?: Date | string | null;
  compact?: boolean;
}

export function NewBadge({ createdAt, scheduledFor, compact = false }: NewBadgeProps) {
  const publishDate = scheduledFor ? new Date(scheduledFor) : new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - publishDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > 7) return null;

  return (
    <span
      className={`
        inline-flex items-center font-semibold uppercase tracking-wider
        bg-red-700/85 text-white backdrop-blur-sm border border-red-500/30
        shadow-lg shadow-red-900/20
        ${compact
          ? "text-[8px] px-1.5 py-0.5 rounded"
          : "text-[10px] px-2 py-0.5 rounded-sm"
        }
      `}
      data-testid="badge-new"
    >
      New
    </span>
  );
}
