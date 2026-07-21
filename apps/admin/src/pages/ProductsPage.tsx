import { Badge, Button, EmptyState, Input, Label, Skeleton } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coffee, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api, type AdminProduct } from '../lib/api';

export function ProductsPage() {
  const qc = useQueryClient();
  const { data: products, isPending } = useQuery({ queryKey: ['products'], queryFn: api.products });
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);

  const mutate = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) => api.updateProduct(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['pos-menu'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Availability updates automatically from inventory.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden /> New
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[var(--radius)]" />)}</div>
      ) : !products?.length ? (
        <EmptyState icon={Coffee} title="No products" description="Create your first product." action={<Button onClick={() => setEditing('new')}>New product</Button>} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[hsl(var(--border))]">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--muted))] text-left text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="p-3">Product</th>
                <th className="hidden p-3 sm:table-cell">Category</th>
                <th className="p-3">Price</th>
                <th className="hidden p-3 md:table-cell">Can make</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {products.map((p) => (
                <tr key={p.id} className="bg-[hsl(var(--card))]">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="hidden p-3 text-[hsl(var(--muted-foreground))] sm:table-cell">{p.category}</td>
                  <td className="p-3 tabular-nums">₱{p.base_price.toFixed(2)}</td>
                  <td className="hidden p-3 tabular-nums md:table-cell">
                    {p.max_producible === null ? '—' : p.max_producible}
                    {p.limiting_ingredient && p.max_producible !== null && p.max_producible <= 10 && (
                      <span className="ml-1 text-xs text-[hsl(var(--muted-foreground))]">({p.limiting_ingredient})</span>
                    )}
                  </td>
                  <td className="p-3">
                    {!p.is_active ? (
                      <Badge variant="neutral">Hidden</Badge>
                    ) : p.is_sold_out ? (
                      <Badge variant="danger">Sold out</Badge>
                    ) : (
                      <Badge variant="success">Available</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title={p.manual_sold_out ? 'Mark available' : 'Mark sold out'}
                        onClick={() => mutate.mutate({ id: p.id, patch: fullPatch(p, { manual_sold_out: !p.manual_sold_out }) })}
                        className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium hover:bg-[hsl(var(--muted))]"
                      >
                        {p.manual_sold_out ? 'Unhide' : 'Sold out'}
                      </button>
                      <button type="button" aria-label="Edit" onClick={() => setEditing(p)} className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-[hsl(var(--muted))]">
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button type="button" aria-label="Delete" onClick={() => confirm(`Delete ${p.name}?`) && remove.mutate(p.id)} className="grid size-8 cursor-pointer place-items-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--danger))]/10 hover:text-[hsl(var(--danger))]">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** Availability toggles send the full core payload so validation passes. */
function fullPatch(p: AdminProduct, override: Record<string, unknown>): Record<string, unknown> {
  return {
    category_id: p.category_id,
    name: p.name,
    description: p.description,
    base_price: p.base_price,
    prep_time_minutes: p.prep_time_minutes,
    is_active: p.is_active,
    is_popular: p.is_popular,
    is_new: p.is_new,
    manual_sold_out: p.manual_sold_out,
    ...override,
  };
}

function ProductForm({ product, onClose }: { product: AdminProduct | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const [form, setForm] = useState({
    category_id: product?.category_id ?? 0,
    name: product?.name ?? '',
    description: product?.description ?? '',
    base_price: product?.base_price ?? 0,
    prep_time_minutes: product?.prep_time_minutes ?? 5,
    is_active: product?.is_active ?? true,
    is_popular: product?.is_popular ?? false,
    is_new: product?.is_new ?? false,
    manual_sold_out: product?.manual_sold_out ?? false,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, category_id: form.category_id || categories?.[0]?.id };
      return product ? api.updateProduct(product.id, payload) : api.createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['pos-menu'] });
      onClose();
    },
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="w-full max-w-lg space-y-4 rounded-[var(--radius)] bg-[hsl(var(--card))] p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{product ? 'Edit product' : 'New product'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[hsl(var(--muted))]">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={form.name} required onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-cat">Category</Label>
            <select id="p-cat" value={form.category_id} onChange={(e) => set('category_id', Number(e.target.value))} className="h-11 w-full cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-price">Price</Label>
            <Input id="p-price" type="number" min={0} step="0.01" value={form.base_price} onChange={(e) => set('base_price', Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Description</Label>
          <Input id="p-desc" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {(['is_active', 'is_popular', 'is_new', 'manual_sold_out'] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="size-4 cursor-pointer accent-[hsl(var(--primary))]" />
              {{ is_active: 'Active', is_popular: 'Popular', is_new: 'New', manual_sold_out: 'Sold out' }[k]}
            </label>
          ))}
        </div>

        {save.isError && <p className="text-sm text-[hsl(var(--danger))]">Could not save. Check the fields.</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </div>
  );
}
