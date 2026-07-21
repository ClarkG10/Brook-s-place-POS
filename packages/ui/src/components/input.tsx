import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-[calc(var(--radius)-0.35rem)] border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 text-sm',
        'text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:border-[hsl(var(--ring))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-[hsl(var(--danger))] aria-[invalid=true]:ring-[hsl(var(--danger))]/30',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
