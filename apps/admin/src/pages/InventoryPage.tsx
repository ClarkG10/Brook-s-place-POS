import { Badge, Button, EmptyState, Input, Label, Skeleton } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, History, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { api, type Ingredient } from '../lib/api';

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
  const [view, setView] = useState<'stock' | 'logs'>('stock');

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
        {(['stock', 'logs'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
              view === v ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))]'
            }`}
          >
            {v === 'stock' ? 'Stock' : 'Activity log'}
          </button>
        ))}
      </div>

      {view === 'logs' ? (
        <LogsTable />
      ) : isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-[var(--radius)]" />)}</div>
      ) : !ingredients?.length ? (
        <EmptyState icon={Boxes} title="No inventory items" description="Add ingredients and packaging to track stock." />
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
              {ingredients.map((i) => (
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
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
    </div>
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
                <td className="whitespace-nowrap p-3 text-xs text-[hsl(var(--muted-foreground))]">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-3 font-medium">{l.ingredient}</td>
                <td className="p-3"><Badge variant={variant(l.type)} className="capitalize">{l.type}</Badge></td>
                <td className="whitespace-nowrap p-3 tabular-nums text-[hsl(var(--muted-foreground))]">
                  {before.toFixed(1)} → {l.balance_after.toFixed(1)} {l.unit}
                </td>
                <td className={`p-3 font-semibold tabular-nums ${l.quantity_delta < 0 ? 'text-[hsl(var(--danger))]' : 'text-[hsl(var(--success))]'}`}>
                  {l.quantity_delta > 0 ? '+' : ''}{l.quantity_delta} {l.unit}
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
