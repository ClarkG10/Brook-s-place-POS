import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../cn';

/** Meaningful empty state: icon + message + optional action (per UX guidelines). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="grid size-14 place-items-center rounded-full bg-[hsl(var(--muted))]">
          <Icon className="size-7 text-[hsl(var(--muted-foreground))]" aria-hidden />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-[hsl(var(--foreground))]">{title}</p>
        {description && <p className="mx-auto max-w-xs text-sm text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
