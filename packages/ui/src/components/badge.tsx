import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
        primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
        accent: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
        success: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
        warning: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
        danger: 'bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]',
        outline: 'border border-[hsl(var(--border))] text-[hsl(var(--foreground))]',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
