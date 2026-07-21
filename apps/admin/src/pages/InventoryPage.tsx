import { Badge, Button, Card, EmptyState, Input, Label, Modal, Skeleton } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Boxes, Coins, History, PackageMinus, Plus, RefreshCcw, Search, Timer, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { dateTime, qty as fmtQty } from '../lib/format';
import { api, type Ingredient } from '../lib/api';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const STATUS_DOT: Record<string, string> = {
  green: 'bg-[hsl(var(--success))]',
  yellow: 'bg-[hsl(var(--warning))]',
  orange: 'bg-orange-500',
  red: 'bg-[hsl(var(--danger))]',
};

export function InventoryPage() {
  const qc = useQueryClient();
  const { data: ingredients, isPending } = useQuery({ queryKey: ['inventory'], queryFn: api.inventory });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [view, setView] = useState<'stock' | 'analytics' | 'logs'>('stock');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ingredient' | 'packaging'>('all');

  const q = search.trim().toLowerCase();
  const filtered = (ingredients ?? []).filter(
    (i) => (typeFilter === 'all' || i.type === typeFilter) && (!q || i.name.toLowerCase().includes(q)),
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['inventory-logs'] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['pos-menu'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const restock = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) => api.restockIngredient(id, qty, 'add'),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Stock drives product availability automatically.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden /> Add item
        </Button>
      </div>

      <div className="flex gap-2">
        {(['stock', 'analytics', 'logs'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
              view === v ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))]'
            }`}
          >
            {{ stock: 'Stock', analytics: 'Usage & analytics', logs: 'Activity log' }[v]}
          </button>
        ))}
      </div>

      {view === 'stock' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="pl-9" aria-label="Search inventory" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="h-11 cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]" aria-label="Filter by type">
            <option value="all">All types</option>
            <option value="ingredient">Ingredients</option>
            <option value="packaging">Packaging</option>
          </select>
        </div>
      )}

      {view === 'analytics' ? (
        <InventoryAnalytics />
      ) : view === 'logs' ? (
        <LogsTable />
      ) : isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-[var(--radius)]" />)}</div>
      ) : !filtered.length ? (
        <EmptyState icon={Boxes} title="No items" description={ingredients?.length ? 'None match your filters.' : 'Add ingredients and packaging to track stock.'} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[hsl(var(--border))]">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-[hsl(var(--muted))] text-left text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Stock</th>
                <th className="hidden p-3 sm:table-cell">Low at</th>
                <th className="p-3">Restock</th>
                <th className="p-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {filtered.map((i) => (
                <tr key={i.id} className="bg-[hsl(var(--card))]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[i.status] ?? 'bg-[hsl(var(--muted))]'}`} title={i.status} />
                      <span className="font-medium">{i.name}</span>
                      {i.type === 'packaging' && <span className="text-xs text-[hsl(var(--muted-foreground))]">pkg</span>}
                    </div>
                  </td>
                  <td className="p-3 tabular-nums">{i.stock_quantity} {i.unit}</td>
                  <td className="hidden p-3 tabular-nums text-[hsl(var(--muted-foreground))] sm:table-cell">{i.low_stock_threshold} {i.unit}</td>
                  <td className="p-3"><RestockCell unit={i.unit} onAdd={(qty) => restock.mutate({ id: i.id, qty })} /></td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => setEditing(i)} className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium hover:bg-[hsl(var(--muted))]">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(adding || editing) && (
        <IngredientForm ingredient={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={invalidate} />
      )}
    </div>
  );
}

function RestockCell({ unit, onAdd }: { unit: string; onAdd: (qty: number) => void }) {
  const [qty, setQty] = useState('');
  return (
    <div className="flex items-center gap-1.5">
      <Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min={0} placeholder={`+ ${unit}`} className="h-8 w-20" />
      <Button size="sm" variant="subtle" disabled={!Number(qty)} onClick={() => { onAdd(Number(qty)); setQty(''); }}>Add</Button>
    </div>
  );
}

function IngredientForm({ ingredient, onClose, onSaved }: { ingredient: Ingredient | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: ingredient?.name ?? '',
    unit: ingredient?.unit ?? 'ml',
    type: ingredient?.type ?? 'ingredient',
    stock_quantity: ingredient?.stock_quantity ?? 0,
    low_stock_threshold: ingredient?.low_stock_threshold ?? 0,
    cost_per_unit: ingredient?.cost_per_unit ?? 0,
    is_active: true,
  });
  const save = useMutation({
    mutationFn: () => (ingredient ? api.updateIngredient(ingredient.id, form) : api.createIngredient(form)),
    onSuccess: () => { onSaved(); onClose(); },
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="w-full max-w-md space-y-4 rounded-[var(--radius)] bg-[hsl(var(--card))] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{ingredient ? 'Edit item' : 'Add item'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[hsl(var(--muted))]"><X className="size-4" aria-hidden /></button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-name">Name</Label>
          <Input id="i-name" value={form.name} required onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="i-unit">Unit</Label>
            <Input id="i-unit" value={form.unit} required onChange={(e) => set('unit', e.target.value)} placeholder="ml / g / pcs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-type">Type</Label>
            <select id="i-type" value={form.type} onChange={(e) => set('type', e.target.value as 'ingredient' | 'packaging')} className="h-11 w-full cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
              <option value="ingredient">Ingredient</option>
              <option value="packaging">Packaging</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-stock">Stock</Label>
            <Input id="i-stock" type="number" min={0} step="0.001" value={form.stock_quantity} onChange={(e) => set('stock_quantity', Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-low">Low-stock at</Label>
            <Input id="i-low" type="number" min={0} step="0.001" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', Number(e.target.value))} />
          </div>
        </div>
        {save.isError && <p className="text-sm text-[hsl(var(--danger))]">Could not save.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function LogsTable() {
  const { data: logs, isPending } = useQuery({ queryKey: ['inventory-logs'], queryFn: api.inventoryLogs });

  if (isPending) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-[var(--radius)]" />)}</div>;
  }
  if (!logs?.length) {
    return <EmptyState icon={History} title="No activity yet" description="Auto-deductions, restocks and adjustments appear here." />;
  }

  const variant = (t: string): 'danger' | 'success' | 'warning' =>
    t === 'deduction' ? 'danger' : t === 'restock' ? 'success' : 'warning';

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[hsl(var(--border))]">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="bg-[hsl(var(--muted))] text-left text-xs uppercase text-[hsl(var(--muted-foreground))]">
          <tr>
            <th className="p-3">When</th>
            <th className="p-3">Ingredient</th>
            <th className="p-3">Action</th>
            <th className="p-3">Before → After</th>
            <th className="p-3">Change</th>
            <th className="p-3">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--border))]">
          {logs.map((l) => {
            const before = l.balance_after - l.quantity_delta;
            return (
              <tr key={l.id} className="bg-[hsl(var(--card))]">
                <td className="whitespace-nowrap p-3 text-xs text-[hsl(var(--muted-foreground))]">{dateTime(l.created_at)}</td>
                <td className="p-3 font-medium">{l.ingredient}</td>
                <td className="p-3"><Badge variant={variant(l.type)} className="capitalize">{l.type}</Badge></td>
                <td className="whitespace-nowrap p-3 tabular-nums text-[hsl(var(--muted-foreground))]">
                  {fmtQty(before)} → {fmtQty(l.balance_after, l.unit)}
                </td>
                <td className={`p-3 font-semibold tabular-nums ${l.quantity_delta < 0 ? 'text-[hsl(var(--danger))]' : 'text-[hsl(var(--success))]'}`}>
                  {l.quantity_delta > 0 ? '+' : ''}{fmtQty(l.quantity_delta, l.unit)}
                </td>
                <td className="p-3 text-xs text-[hsl(var(--muted-foreground))]">
                  {l.order_number ? `Order ${l.order_number}` : l.note}
                  {l.user ? ` · ${l.user}` : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const A_PRESETS: { key: string; label: string; days: number }[] = [
  { key: '7d', label: 'Last 7 days', days: 6 },
  { key: '30d', label: 'Last 30 days', days: 29 },
  { key: '90d', label: 'Last 90 days', days: 89 },
];

function InventoryAnalytics() {
  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: api.settings });
  const sym = settings?.currency_symbol ?? '₱';
  const money = (n: number) => `${sym}${n.toFixed(2)}`;

  const [presetKey, setPresetKey] = useState('7d');
  const preset = A_PRESETS.find((p) => p.key === presetKey) ?? A_PRESETS[0];
  const { from, to } = useMemo(() => ({ from: ymd(daysAgo(preset.days)), to: ymd(new Date()) }), [preset.days]);

  const { data, isPending } = useQuery({ queryKey: ['inventory-analytics', from, to], queryFn: () => api.inventoryAnalytics(from, to) });

  const maxCost = Math.max(1, ...(data?.top_consumed.map((t) => t.cost) ?? [1]));
  const maxDay = Math.max(1, ...(data?.by_day.map((d) => d.cost) ?? [1]));

  const cards = [
    { label: 'Consumption cost', value: money(data?.summary.consumption_cost ?? 0), icon: PackageMinus, tone: 'text-[hsl(var(--danger))]', hint: 'Value of stock used' },
    { label: 'Restock spend', value: money(data?.summary.restock_cost ?? 0), icon: RefreshCcw, tone: 'text-[hsl(var(--success))]', hint: 'Value added back' },
    { label: 'Stock on hand', value: money(data?.summary.current_stock_value ?? 0), icon: Wallet, tone: 'text-[hsl(var(--primary))]', hint: 'Current inventory value' },
    { label: 'Low on stock', value: String(data?.summary.low_stock_count ?? 0), icon: AlertTriangle, tone: 'text-[hsl(var(--warning))]', hint: `of ${data?.summary.tracked_ingredients ?? 0} tracked` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {A_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPresetKey(p.key)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
              presetKey === p.key ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] hover:brightness-95'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{c.label}</span>
                  <c.icon className={`size-5 ${c.tone}`} aria-hidden />
                </div>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums">{c.value}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{c.hint}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 font-display text-sm font-bold">Most-used ingredients (by cost)</h2>
              {data?.top_consumed.length ? (
                <ul className="space-y-3">
                  {data.top_consumed.map((t) => (
                    <li key={t.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{t.name}</span>
                        <span className="tabular-nums text-[hsl(var(--muted-foreground))]">{fmtQty(t.quantity)} {t.unit} · <span className="font-semibold text-[hsl(var(--foreground))]">{money(t.cost)}</span></span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                        <div className="h-full rounded-full bg-[hsl(var(--danger))] transition-all" style={{ width: `${Math.max(2, (t.cost / maxCost) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">No usage in this range.</p>}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-sm font-bold">Movements</h2>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center justify-between"><span className="flex items-center gap-1.5"><PackageMinus className="size-4 text-[hsl(var(--danger))]" aria-hidden /> Deductions</span><span className="font-semibold tabular-nums">{data?.movements.deduction ?? 0}</span></li>
                <li className="flex items-center justify-between"><span className="flex items-center gap-1.5"><RefreshCcw className="size-4 text-[hsl(var(--success))]" aria-hidden /> Restocks</span><span className="font-semibold tabular-nums">{data?.movements.restock ?? 0}</span></li>
                <li className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Coins className="size-4 text-[hsl(var(--warning))]" aria-hidden /> Adjustments</span><span className="font-semibold tabular-nums">{data?.movements.adjustment ?? 0}</span></li>
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 font-display text-sm font-bold">Daily consumption cost</h2>
              {data && data.by_day.some((d) => d.cost > 0) ? (
                <div className="flex h-40 items-end gap-1.5 overflow-x-auto">
                  {data.by_day.map((d) => (
                    <div key={d.date} className="flex h-full min-w-5 flex-1 flex-col items-center gap-1.5">
                      <div className="flex w-full flex-1 items-end">
                        <div className="w-full rounded-t-md bg-[hsl(var(--danger))] transition-all" style={{ height: `${Math.max(2, (d.cost / maxDay) * 100)}%` }} title={`${d.date}: ${money(d.cost)}`} />
                      </div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{new Date(d.date).getDate()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">No consumption in this range.</p>}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-1.5 font-display text-sm font-bold"><Timer className="size-4 text-[hsl(var(--primary))]" aria-hidden /> Days of stock left</h2>
              {data?.projections.length ? (
                <ul className="space-y-2.5 text-sm">
                  {data.projections.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{p.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                        p.days_left === null ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          : p.days_left <= 3 ? 'bg-[hsl(var(--danger))]/12 text-[hsl(var(--danger))]'
                          : p.days_left <= 7 ? 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]'
                          : 'bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]'
                      }`}>
                        {p.days_left === null ? '—' : `${p.days_left}d`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">Not enough usage to project yet.</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
