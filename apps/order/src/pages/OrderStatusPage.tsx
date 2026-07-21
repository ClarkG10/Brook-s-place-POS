import { Button, Skeleton, Spinner } from '@brooks/ui';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, ChefHat, Clock, GlassWater, PartyPopper, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { money } from '../lib/format';

const STEPS = [
  { key: 'incoming', label: 'Received', icon: Clock },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: CheckCircle2 },
] as const;

function placedTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function OrderStatusPage() {
  const { orderNumber = '' } = useParams();
  const navigate = useNavigate();

  const { data, isPending } = useQuery({
    queryKey: ['order-status', orderNumber],
    queryFn: () => api.orderStatus(orderNumber),
    refetchInterval: (q) => (['completed', 'cancelled'].includes(q.state.data?.status ?? '') ? false : 5000),
  });

  if (isPending) return <StatusSkeleton />;

  const status = data?.status ?? 'incoming';
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  const done = status === 'completed';
  const cancelled = status === 'cancelled';
  const time = placedTime(data?.placed_at ?? null);

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-10 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18 }}
        className={`grid size-24 place-items-center rounded-full ${cancelled ? 'bg-[hsl(var(--danger))]/12' : 'bg-[hsl(var(--success))]/12'}`}
      >
        {cancelled ? (
          <XCircle className="size-12 text-[hsl(var(--danger))]" aria-hidden />
        ) : done ? (
          <PartyPopper className="size-12 text-[hsl(var(--success))]" aria-hidden />
        ) : (
          <Check className="size-12 text-[hsl(var(--success))]" aria-hidden />
        )}
      </motion.div>

      <h1 className="mt-5 font-display text-4xl font-extrabold leading-none">
        {cancelled ? 'Order cancelled' : done ? 'Enjoy your order!' : 'Order received!'}
      </h1>
      <p className="mt-2 text-base text-[hsl(var(--muted-foreground))]">
        Order <span className="font-bold text-[hsl(var(--foreground))]">{data?.order_number}</span>
        {data?.table_number ? ` · Table ${data.table_number}` : ''}
        {time ? ` · ${time}` : ''}
      </p>

      {!cancelled && (
        <div className="mt-8 flex w-full max-w-sm items-start justify-between">
          {STEPS.map((step, i) => {
            const reached = done || i <= activeIndex;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`grid size-12 place-items-center rounded-full border-2 transition-colors duration-300 ${
                    reached
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
                <span className={`text-sm font-semibold ${reached ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt with product imagery + line totals. */}
      <section className="wobble mt-8 w-full max-w-md border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-left sketch-shadow">
        <h2 className="mb-4 font-display text-xl font-bold">Your order</h2>
        <ul className="space-y-4">
          {data?.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <div className="wobble-2 size-14 shrink-0 overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--accent) / 0.12))' }}>
                    <GlassWater className="size-6 text-[hsl(var(--primary))]/55" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-tight text-[hsl(var(--foreground))]">
                    <span className="text-[hsl(var(--primary))]">{item.quantity}×</span> {item.product_name}
                  </p>
                  <span className="shrink-0 font-display text-base font-bold tabular-nums">{money(item.line_total)}</span>
                </div>
                {item.options.length > 0 && (
                  <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{item.options.join(' · ')}</p>
                )}
                {item.notes && <p className="mt-0.5 text-sm italic text-[hsl(var(--muted-foreground))]">“{item.notes}”</p>}
              </div>
            </li>
          ))}
        </ul>

        <div className="my-4 border-t-2 border-dashed border-[hsl(var(--border))]" />
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg font-bold">Total</span>
          <span className="font-display text-2xl font-bold tabular-nums text-[hsl(var(--primary))]">{money(data?.total ?? 0)}</span>
        </div>
      </section>

      {!done && !cancelled && (
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <Spinner className="size-4" /> Updating live…
        </p>
      )}

      <Button variant="outline" size="lg" className="mt-8" onClick={() => navigate('/menu')}>
        Order Again
      </Button>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="flex min-h-full flex-col items-center px-4 py-10">
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="mt-5 h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-40" />
      <div className="mt-8 flex w-full max-w-sm justify-between">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
      <div className="wobble mt-8 w-full max-w-md space-y-4 border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="wobble-2 size-14 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
