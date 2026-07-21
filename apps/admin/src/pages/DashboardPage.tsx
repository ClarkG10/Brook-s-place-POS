import { Card, Skeleton } from '@brooks/ui';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, Coins, Receipt, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';

function useSymbol() {
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: api.settings });
  return data?.currency_symbol ?? '₱';
}

export function DashboardPage() {
  const symbol = useSymbol();
  const { data, isPending } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 30_000 });
  const money = (n: number) => `${symbol}${n.toFixed(2)}`;

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...(data?.revenue_last_7_days.map((d) => d.total) ?? [1]));

  const stats = [
    { label: "Today's Sales", value: money(data?.sales_today ?? 0), icon: Coins, tone: 'text-[hsl(var(--success))]' },
    { label: 'Orders Today', value: String(data?.orders_today ?? 0), icon: Receipt, tone: 'text-[hsl(var(--primary))]' },
    { label: 'Avg Order', value: money(data?.avg_order_value ?? 0), icon: TrendingUp, tone: 'text-[hsl(var(--accent))]' },
    { label: 'Active Orders', value: String(data?.active_orders ?? 0), icon: ClipboardList, tone: 'text-[hsl(var(--primary))]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Live overview of your shop.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">{s.label}</span>
              <s.icon className={`size-5 ${s.tone}`} aria-hidden />
            </div>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      {(data?.low_stock_count ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 px-4 py-3 text-sm">
          <AlertTriangle className="size-5 text-[hsl(var(--warning))]" aria-hidden />
          <span className="text-[hsl(var(--foreground))]">
            <strong>{data?.low_stock_count}</strong> ingredient(s) are running low. Check inventory.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-sm font-bold">Revenue · Last 7 days</h2>
          <div className="flex h-40 items-end gap-2">
            {data?.revenue_last_7_days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-[hsl(var(--primary))] transition-all"
                    style={{ height: `${Math.max(4, (d.total / maxRevenue) * 100)}%` }}
                    title={money(d.total)}
                  />
                </div>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-sm font-bold">Top Drinks · 7 days</h2>
          {data?.top_products.length ? (
            <ul className="space-y-3">
              {data.top_products.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[hsl(var(--muted))] text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-semibold tabular-nums text-[hsl(var(--muted-foreground))]">{p.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No sales yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
