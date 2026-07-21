import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

/** Loading placeholder. Animation auto-disables under prefers-reduced-motion (tokens.css). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-[hsl(var(--muted))]', className)} {...props} />;
}
