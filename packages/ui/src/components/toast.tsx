import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

// Tiny module-level store so toast() can be called from anywhere (mutations,
// event handlers) without threading a context through the tree.
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const l of listeners) l();
}

export function dismissToast(id: number) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export function toast(input: { title: string; description?: string; variant?: ToastVariant; duration?: number }): number {
  const id = nextId++;
  const item: ToastItem = {
    id,
    title: input.title,
    description: input.description,
    variant: input.variant ?? 'info',
    duration: input.duration ?? 4000,
  };
  items = [...items, item];
  emit();
  if (item.duration > 0) window.setTimeout(() => dismissToast(id), item.duration);
  return id;
}

const ACCENT: Record<ToastVariant, string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--primary)',
};

const GLYPH: Record<ToastVariant, string> = { success: '✓', error: '✕', warning: '!', info: 'i' };

function useToasts(): ToastItem[] {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return items;
}

/** Mount once near the app root. Renders active toasts in a portal on <body>. */
export function Toaster({ className }: { className?: string }) {
  const toasts = useToasts();
  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2.5 p-4 sm:inset-x-auto sm:right-0 sm:items-end',
        className,
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>,
    document.body,
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xl transition-all duration-300 ease-out',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      )}
      style={{ borderLeftColor: `hsl(${ACCENT[item.variant]})`, borderLeftWidth: 4 }}
    >
      <span
        aria-hidden
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: `hsl(${ACCENT[item.variant]})` }}
      >
        {GLYPH[item.variant]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight text-[hsl(var(--foreground))]">{item.title}</p>
        {item.description && <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        aria-label="Dismiss"
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
      >
        ✕
      </button>
    </div>
  );
}

/** Simple hover/focus tooltip. Wrap a focusable trigger; content shows above it. */
export function Tooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-[60] mb-2 hidden w-max max-w-[16rem] -translate-x-1/2 whitespace-normal rounded-md bg-[hsl(var(--foreground))] px-2.5 py-1.5 text-xs font-medium leading-snug text-[hsl(var(--background))] shadow-lg group-hover:block group-focus-within:block',
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
