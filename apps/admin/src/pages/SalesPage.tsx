import { Button, Card, Input, Skeleton, Spinner } from '@brooks/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Coins, Download, Layers, Package, Percent, PiggyBank, Receipt, Store, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../lib/api';

function Delta({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-[hsl(var(--muted-foreground))]">vs prev · —</span>;
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--danger))]'}`}>
      {up ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
      {Math.abs(change)}% <span className="font-normal text-[hsl(var(--muted-foreground))]">vs prev</span>
    </span>
  );
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

type Preset = 'today' | '7d' | '30d' | 'month' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

export function SalesPage() {
  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: api.settings });
  const sym = settings?.currency_symbol ?? '₱';
  const money = (n: number) => `${sym}${n.toFixed(2)}`;

  const [preset, setPreset] = useState<Preset>('7d');
  const [customFrom, setCustomFrom] = useState(ymd(daysAgo(6)));
  const [customTo, setCustomTo] = useState(ymd(new Date()));

  const { from, to } = useMemo(() => {
    const today = ymd(new Date());
    switch (preset) {
      case 'today': return { from: today, to: today };
      case '30d': return { from: ymd(daysAgo(29)), to: today };
      case 'month': { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), to: today }; }
      case 'custom': return { from: customFrom, to: customTo };
      case '7d':
      default: return { from: ymd(daysAgo(6)), to: today };
    }
  }, [preset, customFrom, customTo]);

  const { data, isPending } = useQuery({ queryKey: ['sales', from, to], queryFn: () => api.salesReport(from, to) });
  const exportCsv = useMutation({ mutationFn: () => api.exportSales(from, to) });

  const maxDay = Math.max(1, ...(data?.by_day.map((d) => d.total) ?? [1]));
  const maxHour = Math.max(1, ...(data?.by_hour.map((h) => h.orders) ?? [1]));

  const stats = [
    { label: 'Gross Sales', value: money(data?.summary.gross_sales ?? 0), icon: Coins, tone: 'text-[hsl(var(--success))]', change: data?.comparison.gross_sales_change ?? null },
    { label: 'Orders', value: String(data?.summary.orders ?? 0), icon: Receipt, tone: 'text-[hsl(var(--primary))]', change: data?.comparison.orders_change ?? null },
    { label: 'Avg Order', value: money(data?.summary.avg_order_value ?? 0), icon: TrendingUp, tone: 'text-[hsl(var(--accent))]', change: undefined },
    { label: 'Items Sold', value: String(data?.summary.items_sold ?? 0), icon: Package, tone: 'text-[hsl(var(--primary))]', change: undefined },
  ];

  const profit = [
    { label: 'Cost of Goods', value: money(data?.summary.cogs ?? 0), icon: PiggyBank, hint: 'Ingredient cost of completed orders' },
    { label: 'Gross Profit', value: money(data?.summary.gross_profit ?? 0), icon: Coins, hint: 'Gross sales − cost of goods' },
    { label: 'Margin', value: `${data?.summary.margin ?? 0}%`, icon: Percent, hint: 'Profit as a share of sales' },
  ];
  const maxCat = Math.max(1, ...(data?.by_category.map((c) => c.revenue) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Sales</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Completed orders from {from} to {to}.</p>
        </div>
        <Button onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
          {exportCsv.isPending ? <Spinner className="size-4" /> : <Download className="size-4" aria-hidden />} Export to Excel
        </Button>
      </div>

      {/* Timeframe */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
              preset === p.key ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:brightness-95'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-auto" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">to</span>
            <Input type="date" value={customTo} min={customFrom} max={ymd(new Date())} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-auto" />
          </div>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{s.label}</span>
                  <s.icon className={`size-5 ${s.tone}`} aria-hidden />
                </div>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value}</p>
                {s.change !== undefined && <div className="mt-1"><Delta change={s.change} /></div>}
              </Card>
            ))}
          </div>

          {/* Profitability (ties sales to ingredient cost) */}
          <div className="grid gap-4 sm:grid-cols-3">
            {profit.map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{s.label}</span>
                  <s.icon className="size-5 text-[hsl(var(--accent))]" aria-hidden />
                </div>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{s.hint}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 font-display text-sm font-bold">Sales by day</h2>
              {data && data.by_day.length > 0 ? (
                <div className="flex h-48 items-end gap-1.5 overflow-x-auto">
                  {data.by_day.map((d) => (
                    <div key={d.date} className="flex h-full min-w-6 flex-1 flex-col items-center gap-1.5">
                      <div className="flex w-full flex-1 items-end">
                        <div className="w-full rounded-t-md bg-[hsl(var(--primary))] transition-all" style={{ height: `${Math.max(2, (d.total / maxDay) * 100)}%` }} title={`${d.date}: ${money(d.total)} (${d.orders} orders)`} />
                      </div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{new Date(d.date).getDate()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No sales in this range.</p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-sm font-bold">Payment methods</h2>
              {data?.by_payment.length ? (
                <ul className="space-y-2.5 text-sm">
                  {data.by_payment.map((p) => (
                    <li key={p.method} className="flex items-center justify-between">
                      <span className="capitalize">{p.method}</span>
                      <span className="tabular-nums text-[hsl(var(--muted-foreground))]">{p.count} · {money(p.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">—</p>}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 font-display text-sm font-bold">Top products</h2>
              {data?.top_products.length ? (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {data.top_products.map((p, i) => (
                      <tr key={p.name}>
                        <td className="py-2 pr-2 text-[hsl(var(--muted-foreground))]">{i + 1}</td>
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 text-right tabular-nums text-[hsl(var(--muted-foreground))]">{p.quantity} sold</td>
                        <td className="py-2 pl-3 text-right font-semibold tabular-nums">{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">No sales in this range.</p>}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-sm font-bold">Busiest hours</h2>
              {data?.by_hour.length ? (
                <div className="flex h-40 items-end gap-1">
                  {data.by_hour.map((h) => (
                    <div key={h.hour} className="flex h-full flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end">
                        <div className="w-full rounded-t bg-[hsl(var(--accent))] transition-all" style={{ height: `${Math.max(3, (h.orders / maxHour) * 100)}%` }} title={`${h.hour}:00 — ${h.orders} orders`} />
                      </div>
                      <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{h.hour}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">—</p>}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-1.5 font-display text-sm font-bold"><Layers className="size-4 text-[hsl(var(--primary))]" aria-hidden /> Sales by category</h2>
              {data?.by_category.length ? (
                <ul className="space-y-3">
                  {data.by_category.map((c) => (
                    <li key={c.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{c.category}</span>
                        <span className="tabular-nums text-[hsl(var(--muted-foreground))]">{c.quantity} sold · <span className="font-semibold text-[hsl(var(--foreground))]">{money(c.revenue)}</span></span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                        <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${Math.max(2, (c.revenue / maxCat) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">No sales in this range.</p>}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-1.5 font-display text-sm font-bold"><Store className="size-4 text-[hsl(var(--accent))]" aria-hidden /> By channel</h2>
              {data?.by_source.length ? (
                <ul className="space-y-2.5 text-sm">
                  {data.by_source.map((s) => (
                    <li key={s.source} className="flex items-center justify-between">
                      <span className="uppercase">{s.source}</span>
                      <span className="tabular-nums text-[hsl(var(--muted-foreground))]">{s.count} · {money(s.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">—</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
