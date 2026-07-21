import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';

const buttonVariants = cva(
  // base: touch-friendly, visible focus ring, smooth 200ms transitions, cursor-pointer
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius)-0.35rem)] font-semibold ' +
    'transition-[background-color,color,box-shadow,opacity] duration-200 ease-out cursor-pointer select-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[hsl(var(--background))] disabled:pointer-events-none disabled:opacity-50 ' +
    'active:scale-[0.98] [&_svg]:size-[1.15em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110 shadow-sm',
        accent: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:brightness-110 shadow-sm',
        outline:
          'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
        ghost: 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
        destructive: 'bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))] hover:brightness-110 shadow-sm',
        subtle: 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:brightness-95',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-7 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
