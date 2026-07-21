import { Badge, Button, EmptyState, Spinner } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { api, type Order } from '../lib/api';

const FILTERS = [
  { key: 'incoming,preparing,ready', label: 'Active' },
  { key: 'incoming', label: 'Incoming' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
] as const;

const NEXT: Record<string, { status: string; label: string } | null> = {
  incoming: { status: 'preparing', label: 'Start Preparing' },
  preparing: { status: 'ready', label: 'Mark Ready' },
  ready: { status: 'completed', label: 'Complete' },
  completed: null,
  cancelled: null,
};

const STATUS_VARIANT: Record<Order['status'], 'warning' | 'primary' | 'success' | 'neutral' | 'danger'> = {
  incoming: 'warning',
  preparing: 'primary',
  ready: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

export function OrdersPage() {
  const [filter, setFilter] = useState<string>(FILTERS[0].key);
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => api.orders(filter),
    refetchInterval: 10_000,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const orders = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Orders</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Kitchen &amp; bar queue · auto-refreshing</p>
        </div>
        {advance.isPending && <Spinner className="size-4" />}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
              filter === f.key
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:brightness-95'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-7" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders here" description="New orders will appear automatically." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const next = NEXT[order.status];
            return (
              <div
                key={order.id}
                className="flex flex-col rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-bold tabular-nums">{order.order_number}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {order.table_number ? `Table ${order.table_number}` : 'Counter'}
                      {order.customer_name ? ` · ${order.customer_name}` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
                    {order.status}
                  </Badge>
                </div>

                <ul className="my-3 flex-1 space-y-1.5 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.product_name}
                      {item.options.length > 0 && (
                        <span className="block pl-5 text-xs text-[hsl(var(--muted-foreground))]">
                          {item.options.map((o) => o.name).join(', ')}
                        </span>
                      )}
                      {item.notes && (
                        <span className="block pl-5 text-xs italic text-[hsl(var(--accent))]">“{item.notes}”</span>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-2 border-t border-[hsl(var(--border))] pt-3">
                  <span className="font-display font-bold tabular-nums">
                    ₱{order.total.toFixed(2)}
                  </span>
                  <div className="flex gap-2">
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => advance.mutate({ id: order.id, status: 'cancelled' })}
                      >
                        Cancel
                      </Button>
                    )}
                    {next && (
                      <Button size="sm" onClick={() => advance.mutate({ id: order.id, status: next.status })}>
                        {next.label}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
