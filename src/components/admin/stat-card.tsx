import type { ReactNode } from 'react';

/**
 * Cartão de estatística do admin — ícone + label + número grande + dica.
 * Partilhado entre a visão geral (`/admin/estatisticas`) e as stats por curso
 * (`course-stats-content.tsx`).
 */
export function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="border-border bg-background rounded-lg border p-4">
      <div className="text-orange-primary flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <p className="font-display text-ink mt-2 text-3xl font-medium tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-2 text-xs">{hint}</p>
    </div>
  );
}
