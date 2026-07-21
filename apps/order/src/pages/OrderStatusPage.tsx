import { Button, Spinner } from '@brooks/ui';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, ChefHat, Clock, PartyPopper, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

const STEPS = [
  { key: 'incoming', label: 'Received', icon: Clock },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: CheckCircle2 },
] as const;

export function OrderStatusPage() {
  const { orderNumber = '' } = useParams();
  const navigate = useNavigate();

  const { data, isPending } = useQuery({
    queryKey: ['order-status', orderNumber],
    queryFn: () => api.orderStatus(orderNumber),
    refetchInterval: (q) => (['completed', 'cancelled'].includes(q.state.data?.status ?? '') ? false : 5000),
  });

  if (isPending) {
    return (
      <div className="grid min-h-full place-items-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const status = data?.status ?? 'incoming';
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  const done = status === 'completed';
  const cancelled = status === 'cancelled';

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18 }}
        className={`grid size-20 place-items-center rounded-full ${
          cancelled ? 'bg-[hsl(var(--danger))]/12' : 'bg-[hsl(var(--success))]/12'
        }`}
      >
        {cancelled ? (
          <XCircle className="size-10 text-[hsl(var(--danger))]" aria-hidden />
        ) : done ? (
          <PartyPopper className="size-10 text-[hsl(var(--success))]" aria-hidden />
        ) : (
          <Check className="size-10 text-[hsl(var(--success))]" aria-hidden />
        )}
      </motion.div>

      <h1 className="mt-5 font-display text-2xl font-extrabold">
        {cancelled ? 'Order cancelled' : done ? 'Enjoy your order!' : 'Order received!'}
      </h1>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        Order <span className="font-semibold text-[hsl(var(--foreground))]">{data?.order_number}</span>
        {data?.table_number ? ` · Table ${data.table_number}` : ''}
      </p>

      {!cancelled && (
        <div className="mt-8 flex w-full max-w-sm items-center justify-between">
          {STEPS.map((step, i) => {
            const reached = done || i <= activeIndex;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`grid size-11 place-items-center rounded-full border-2 transition-colors ${
                    reached
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
                <span className={`text-xs font-medium ${reached ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 w-full max-w-sm rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left">
        <h2 className="mb-2 font-display text-sm font-bold">Items</h2>
        <ul className="space-y-1.5 text-sm">
          {data?.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {item.quantity}× {item.product_name}
                {item.options.length > 0 && (
                  <span className="text-[hsl(var(--muted-foreground))]"> · {item.options.join(', ')}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {!done && !cancelled && (
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <Spinner className="size-4" /> Updating live…
        </p>
      )}

      <Button variant="outline" className="mt-8" onClick={() => navigate('/menu')}>
        Order Again
      </Button>
    </div>
  );
}
