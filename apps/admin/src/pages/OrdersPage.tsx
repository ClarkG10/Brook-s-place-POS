import { Badge, Button, EmptyState, Input, Modal, Spinner } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, LayoutGrid, Printer, Rows3, Search, X } from 'lucide-react';
import { useState } from 'react';
import { ReceiptModal } from '../components/ReceiptModal';
import { dateTime } from '../lib/format';
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
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>(FILTERS[0].key);
  const [layout, setLayout] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: api.settings });
  const { data, isPending } = useQuery({ queryKey: ['orders', filter], queryFn: () => api.orders(filter), refetchInterval: 10_000 });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.updateOrderStatus(id, status),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      // keep the open detail modal in sync
      setSelected((cur) => (cur && cur.id === res.data.id ? res.data : cur));
    },
  });

  const s = search.trim().toLowerCase();
  const orders = (data?.data ?? []).filter(
    (o) => !s || o.order_number.toLowerCase().includes(s) || (o.customer_name?.toLowerCase().includes(s) ?? false),
  );
  const sym = settings?.currency_symbol ?? '₱';
  const money = (n: number) => `${sym}${n.toFixed(2)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Orders</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Kitchen &amp; bar queue · auto-refreshing</p>
        </div>
        <div className="flex items-center gap-3">
          {advance.isPending && <Spinner className="size-4" />}
          {/* layout toggle */}
          <div className="flex rounded-full border border-[hsl(var(--border))] p-0.5">
            {([['cards', LayoutGrid], ['table', Rows3]] as const).map(([v, Icon]) => (
              <button
                key={v}
                type="button"
                aria-label={`${v} view`}
                aria-pressed={layout === v}
                onClick={() => setLayout(v)}
                className={`grid size-8 cursor-pointer place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                  layout === v ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                filter === f.key ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:brightness-95'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-52 flex-1 sm:max-w-xs sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order # or name…" className="pl-9" aria-label="Search orders" />
        </div>
      </div>

      {isPending ? (
        <div className="grid place-items-center py-16"><Spinner className="size-7" /></div>
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders here" description="New orders appear automatically." />
      ) : layout === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const next = NEXT[order.status];
            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(order)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(order)}
                className="flex cursor-pointer flex-col rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-bold tabular-nums">{order.order_number}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {order.table_number ? `Table ${order.table_number}` : 'Counter'}{order.customer_name ? ` · ${order.customer_name}` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">{order.status}</Badge>
                </div>

                <ul className="my-3 flex-1 space-y-1.5 text-sm">
                  {order.items.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.product_name}
                      {item.options.length > 0 && (
                        <span className="block pl-5 text-xs text-[hsl(var(--muted-foreground))]">{item.options.map((o) => o.name).join(', ')}</span>
                      )}
                    </li>
                  ))}
                  {order.items.length > 4 && <li className="text-xs text-[hsl(var(--muted-foreground))]">+{order.items.length - 4} more…</li>}
                </ul>

                <div className="flex items-center justify-between gap-2 border-t border-[hsl(var(--border))] pt-3" onClick={(e) => e.stopPropagation()}>
                  <span className="font-display font-bold tabular-nums">{money(order.total)}</span>
                  <div className="flex gap-2">
                    {order.status === 'completed' && (
                      <Button variant="ghost" size="sm" onClick={() => setReceipt(order)}><Printer className="size-4" aria-hidden /> Receipt</Button>
                    )}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <Button variant="ghost" size="sm" onClick={() => advance.mutate({ id: order.id, status: 'cancelled' })}>Cancel</Button>
                    )}
                    {next && <Button size="sm" onClick={() => advance.mutate({ id: order.id, status: next.status })}>{next.label}</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[hsl(var(--border))]">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-[hsl(var(--muted))] text-left text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Where</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {orders.map((order) => {
                const next = NEXT[order.status];
                return (
                  <tr key={order.id} onClick={() => setSelected(order)} className="cursor-pointer bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/40">
                    <td className="p-3 font-semibold tabular-nums">{order.order_number}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{order.table_number ? `Table ${order.table_number}` : 'Counter'}{order.customer_name ? ` · ${order.customer_name}` : ''}</td>
                    <td className="p-3 tabular-nums">{order.items.reduce((n, i) => n + i.quantity, 0)}</td>
                    <td className="p-3 font-semibold tabular-nums">{money(order.total)}</td>
                    <td className="p-3"><Badge variant={STATUS_VARIANT[order.status]} className="capitalize">{order.status}</Badge></td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        {order.status === 'completed' && (
                          <button type="button" aria-label="Print receipt" onClick={() => setReceipt(order)} className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-[hsl(var(--muted))]"><Printer className="size-4" aria-hidden /></button>
                        )}
                        {next && <Button size="sm" onClick={() => advance.mutate({ id: order.id, status: next.status })}>{next.label}</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && settings && (
        <OrderDetailModal
          order={selected}
          money={money}
          onClose={() => setSelected(null)}
          onPrint={() => setReceipt(selected)}
          onAdvance={(status) => advance.mutate({ id: selected.id, status })}
          busy={advance.isPending}
        />
      )}
      {receipt && settings && <ReceiptModal order={receipt} settings={settings} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function OrderDetailModal({
  order,
  money,
  onClose,
  onPrint,
  onAdvance,
  busy,
}: {
  order: Order;
  money: (n: number) => string;
  onClose: () => void;
  onPrint: () => void;
  onAdvance: (status: string) => void;
  busy: boolean;
}) {
  const next = NEXT[order.status];
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <div className="my-8 w-full max-w-lg rounded-[var(--radius)] bg-[hsl(var(--card))] shadow-xl">
        <div className="flex items-start justify-between gap-2 border-b border-[hsl(var(--border))] p-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold tabular-nums">{order.order_number}</h2>
              <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">{order.status}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              {order.source.toUpperCase()} · {dateTime(order.placed_at ?? order.created_at)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[hsl(var(--muted))]"><X className="size-4" aria-hidden /></button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
          <div className="space-y-1 rounded-[var(--radius)] bg-[hsl(var(--muted))]/40 p-3">
            {row('Where', order.table_number ? `Table ${order.table_number}` : 'Counter')}
            {order.customer_name && row('Customer', order.customer_name)}
            {order.payment_method && row('Payment', order.payment_method.toUpperCase() + (order.is_paid ? ' · paid' : ''))}
            {order.completed_at && row('Completed', dateTime(order.completed_at))}
            {order.cashier && row('Cashier', order.cashier)}
          </div>

          <div>
            <h3 className="mb-2 font-display text-sm font-bold">Items</h3>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 border-b border-[hsl(var(--border))] pb-2 text-sm last:border-0">
                  <div>
                    <p className="font-semibold">{item.quantity}× {item.product_name}</p>
                    {item.options.length > 0 && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.options.map((o) => `${o.group}: ${o.name}`).join(' · ')}</p>
                    )}
                    {item.notes && <p className="text-xs italic text-[hsl(var(--accent))]">“{item.notes}”</p>}
                  </div>
                  <span className="shrink-0 tabular-nums">{money(item.line_total)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1 border-t border-[hsl(var(--border))] pt-3">
            {row('Subtotal', money(order.subtotal))}
            {order.discount > 0 && row('Discount', `-${money(order.discount)}`)}
            {order.tax > 0 && row('Tax', money(order.tax))}
            {order.service_charge > 0 && row('Service charge', money(order.service_charge))}
            <div className="flex justify-between pt-1 font-display text-base font-bold">
              <span>Total</span><span className="tabular-nums">{money(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[hsl(var(--border))] p-5">
          <Button variant="outline" onClick={onPrint}><Printer className="size-4" aria-hidden /> Print receipt</Button>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button variant="ghost" disabled={busy} onClick={() => onAdvance('cancelled')}>Cancel order</Button>
          )}
          {next && <Button disabled={busy} onClick={() => onAdvance(next.status)}>{next.label}</Button>}
        </div>
      </div>
    </Modal>
  );
}
