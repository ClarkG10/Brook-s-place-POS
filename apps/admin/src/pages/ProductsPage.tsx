import { Badge, Button, EmptyState, Input, Label, Skeleton } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coffee, ImagePlus, Loader2, Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api, type AdminCategory, type AdminOption, type AdminOptionGroup, type AdminProduct } from '../lib/api';

export function ProductsPage() {
  const qc = useQueryClient();
  const { data: products, isPending } = useQuery({ queryKey: ['products'], queryFn: api.products });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<number | 'all'>('all');
  const [manageCats, setManageCats] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = (products ?? []).filter(
    (p) => (catFilter === 'all' || p.category_id === catFilter) && (!q || p.name.toLowerCase().includes(q)),
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['pos-menu'] });
  };
  const mutate = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) => api.updateProduct(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: number) => api.deleteProduct(id), onSuccess: invalidate });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Recipes, options and images. Availability updates from inventory.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageCats(true)}><Tags className="size-4" aria-hidden /> Categories</Button>
          <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden /> New</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-9" aria-label="Search products" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="h-11 cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]" aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-[var(--radius)]" />)}</div>
      ) : !filtered.length ? (
        <EmptyState icon={Coffee} title="No products" description={products?.length ? 'None match your filters.' : 'Create your first product.'} action={<Button onClick={() => setEditing('new')}>New product</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[hsl(var(--border))]">
          <table className="w-full min-w-[40rem] text-sm">
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
              {filtered.map((p) => (
                <tr key={p.id} className="bg-[hsl(var(--card))]">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="size-9 rounded-md object-cover" />
                      ) : (
                        <span className="grid size-9 place-items-center rounded-md bg-[hsl(var(--muted))]"><Coffee className="size-4 text-[hsl(var(--muted-foreground))]" aria-hidden /></span>
                      )}
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{p.option_groups.length} option group(s) · {p.recipe.length} ingredient(s)</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden p-3 text-[hsl(var(--muted-foreground))] sm:table-cell">{p.category}</td>
                  <td className="p-3 tabular-nums">₱{p.base_price.toFixed(2)}</td>
                  <td className="hidden p-3 tabular-nums md:table-cell">
                    {p.max_producible === null ? '—' : p.max_producible}
                    {p.limiting_ingredient && p.max_producible !== null && p.max_producible <= 10 && (
                      <span className="ml-1 text-xs text-[hsl(var(--muted-foreground))]">({p.limiting_ingredient})</span>
                    )}
                  </td>
                  <td className="p-3">
                    {!p.is_active ? <Badge variant="neutral">Hidden</Badge> : p.is_sold_out ? <Badge variant="danger">Sold out</Badge> : <Badge variant="success">Available</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => mutate.mutate({ id: p.id, patch: fullPatch(p, { manual_sold_out: !p.manual_sold_out }) })} className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium hover:bg-[hsl(var(--muted))]">
                        {p.manual_sold_out ? 'Unhide' : 'Sold out'}
                      </button>
                      <button type="button" aria-label="Edit" onClick={() => setEditing(p)} className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-[hsl(var(--muted))]"><Pencil className="size-4" aria-hidden /></button>
                      <button type="button" aria-label="Delete" onClick={() => confirm(`Delete ${p.name}?`) && remove.mutate(p.id)} className="grid size-8 cursor-pointer place-items-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--danger))]/10 hover:text-[hsl(var(--danger))]"><Trash2 className="size-4" aria-hidden /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={invalidate} />}
      {manageCats && <CategoriesManager categories={categories ?? []} onClose={() => setManageCats(false)} onChanged={invalidate} />}
    </div>
  );
}

function CategoriesManager({ categories, onClose, onChanged }: { categories: AdminCategory[]; onClose: () => void; onChanged: () => void }) {
  const [name, setName] = useState('');
  const create = useMutation({ mutationFn: () => api.createCategory({ name, is_active: true }), onSuccess: () => { setName(''); onChanged(); } });
  const update = useMutation({ mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) => api.updateCategory(id, patch), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: (id: number) => api.deleteCategory(id), onSuccess: onChanged });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[var(--radius)] bg-[hsl(var(--card))] shadow-xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
          <h2 className="font-display text-lg font-bold">Categories</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[hsl(var(--muted))]"><X className="size-4" aria-hidden /></button>
        </div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto p-5">
          {categories.length === 0 && <p className="text-sm text-[hsl(var(--muted-foreground))]">No categories yet.</p>}
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Input
                defaultValue={c.name}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.name) update.mutate({ id: c.id, patch: { name: v, is_active: c.is_active } }); }}
                className="h-9 flex-1"
              />
              <span className="w-14 text-right text-xs text-[hsl(var(--muted-foreground))]">{c.products_count} item{c.products_count === 1 ? '' : 's'}</span>
              <button
                type="button"
                aria-label={`Delete ${c.name}`}
                onClick={() => confirm(`Delete "${c.name}"? This also deletes its ${c.products_count} product(s).`) && remove.mutate(c.id)}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--danger))]/10 hover:text-[hsl(var(--danger))]"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-[hsl(var(--border))] p-5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1" />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>Add</Button>
        </div>
      </div>
    </div>
  );
}

function fullPatch(p: AdminProduct, override: Record<string, unknown>): Record<string, unknown> {
  return {
    category_id: p.category_id, name: p.name, description: p.description, image_url: p.image_url,
    base_price: p.base_price, prep_time_minutes: p.prep_time_minutes, is_active: p.is_active,
    is_popular: p.is_popular, is_new: p.is_new, manual_sold_out: p.manual_sold_out, ...override,
  };
}

function emptyOption(): AdminOption {
  return { name: '', price_delta: 0, is_default: false, consumes_ingredient_id: null, consume_quantity: 0, replaces_ingredient_id: null };
}

function ProductForm({ product, onClose, onSaved }: { product: AdminProduct | null; onClose: () => void; onSaved: () => void }) {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const { data: ingredients } = useQuery({ queryKey: ['inventory'], queryFn: api.inventory });

  const [form, setForm] = useState({
    category_id: product?.category_id ?? 0,
    name: product?.name ?? '',
    description: product?.description ?? '',
    image_url: product?.image_url ?? '',
    base_price: product?.base_price ?? 0,
    prep_time_minutes: product?.prep_time_minutes ?? 5,
    is_active: product?.is_active ?? true,
    is_popular: product?.is_popular ?? false,
    is_new: product?.is_new ?? false,
    manual_sold_out: product?.manual_sold_out ?? false,
  });
  const [recipe, setRecipe] = useState(product?.recipe.map((r) => ({ ingredient_id: r.ingredient_id, quantity: r.quantity })) ?? []);
  const [groups, setGroups] = useState<AdminOptionGroup[]>(product?.option_groups ?? []);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, category_id: form.category_id || categories?.[0]?.id, recipe, option_groups: groups };
      return product ? api.updateProduct(product.id, payload) : api.createProduct(payload);
    },
    onSuccess: () => { onSaved(); onClose(); },
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      set('image_url', url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="my-8 w-full max-w-2xl space-y-6 rounded-[var(--radius)] bg-[hsl(var(--card))] p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{product ? 'Edit product' : 'New product'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[hsl(var(--muted))]"><X className="size-4" aria-hidden /></button>
        </div>

        {/* Basics + image */}
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="grid size-24 place-items-center overflow-hidden rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
              {uploading ? <Loader2 className="size-6 animate-spin text-[hsl(var(--muted-foreground))]" aria-hidden /> :
                form.image_url ? <img src={form.image_url} alt="" className="size-full object-cover" /> :
                  <ImagePlus className="size-7 text-[hsl(var(--muted-foreground))]" aria-hidden />}
            </div>
            <label className="mt-2 block cursor-pointer text-center text-xs font-semibold text-[hsl(var(--primary))]">
              {form.image_url ? 'Change' : 'Upload'}
              <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
            </label>
            {form.image_url && (
              <button type="button" onClick={() => set('image_url', '')} className="block w-full cursor-pointer text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))]">
                Remove
              </button>
            )}
          </div>
          <div className="flex-1 space-y-3">
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Input id="p-desc" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-prep">Prep time (minutes)</Label>
            <Input id="p-prep" type="number" min={0} max={120} value={form.prep_time_minutes} onChange={(e) => set('prep_time_minutes', Number(e.target.value))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {(['is_active', 'is_popular', 'is_new', 'manual_sold_out'] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="size-4 cursor-pointer accent-[hsl(var(--primary))]" />
              {{ is_active: 'Active', is_popular: 'Popular', is_new: 'New', manual_sold_out: 'Sold out' }[k]}
            </label>
          ))}
        </div>

        {/* Recipe */}
        <RecipeEditor recipe={recipe} setRecipe={setRecipe} ingredients={ingredients ?? []} />

        {/* Options */}
        <OptionsEditor groups={groups} setGroups={setGroups} ingredients={ingredients ?? []} />

        {save.isError && <p className="text-sm text-[hsl(var(--danger))]">Could not save. Check the fields and try again.</p>}
        <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.isPending || uploading}>{save.isPending ? 'Saving…' : 'Save product'}</Button>
        </div>
      </form>
    </div>
  );
}

type Ing = { id: number; name: string; unit: string };

function RecipeEditor({ recipe, setRecipe, ingredients }: { recipe: { ingredient_id: number; quantity: number }[]; setRecipe: (r: { ingredient_id: number; quantity: number }[]) => void; ingredients: Ing[] }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">Recipe · consumed per unit</h3>
        <Button type="button" variant="subtle" size="sm" onClick={() => setRecipe([...recipe, { ingredient_id: ingredients[0]?.id ?? 0, quantity: 0 }])} disabled={!ingredients.length}>
          <Plus className="size-3.5" aria-hidden /> Ingredient
        </Button>
      </div>
      {recipe.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No recipe — stock isn’t tracked for this item (always available).</p>}
      <div className="space-y-2">
        {recipe.map((row, i) => {
          const unit = ingredients.find((x) => x.id === row.ingredient_id)?.unit ?? '';
          return (
            <div key={i} className="flex items-center gap-2">
              <select value={row.ingredient_id} onChange={(e) => setRecipe(recipe.map((r, j) => (j === i ? { ...r, ingredient_id: Number(e.target.value) } : r)))} className="h-10 flex-1 cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
                {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </select>
              <Input type="number" min={0} step="0.001" value={row.quantity} onChange={(e) => setRecipe(recipe.map((r, j) => (j === i ? { ...r, quantity: Number(e.target.value) } : r)))} className="h-10 w-24" />
              <span className="w-8 text-xs text-[hsl(var(--muted-foreground))]">{unit}</span>
              <button type="button" aria-label="Remove" onClick={() => setRecipe(recipe.filter((_, j) => j !== i))} className="grid size-8 cursor-pointer place-items-center rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))]"><Trash2 className="size-4" aria-hidden /></button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OptionsEditor({ groups, setGroups, ingredients }: { groups: AdminOptionGroup[]; setGroups: (g: AdminOptionGroup[]) => void; ingredients: Ing[] }) {
  const update = (gi: number, patch: Partial<AdminOptionGroup>) => setGroups(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const updateOpt = (gi: number, oi: number, patch: Partial<AdminOption>) =>
    update(gi, { options: groups[gi].options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">Customization options</h3>
        <Button type="button" variant="subtle" size="sm" onClick={() => setGroups([...groups, { name: '', min_select: 1, max_select: 1, is_required: true, options: [emptyOption()] }])}>
          <Plus className="size-3.5" aria-hidden /> Group
        </Button>
      </div>
      {groups.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No options — this item is ordered as-is (great for snacks/food).</p>}

      {groups.map((g, gi) => (
        <div key={gi} className="space-y-2 rounded-[var(--radius)] border border-[hsl(var(--border))] p-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Group name (e.g. Cup Size)" value={g.name} onChange={(e) => update(gi, { name: e.target.value })} className="h-9 flex-1" />
            <button type="button" aria-label="Remove group" onClick={() => setGroups(groups.filter((_, i) => i !== gi))} className="grid size-8 cursor-pointer place-items-center rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))]"><Trash2 className="size-4" aria-hidden /></button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1">Min <Input type="number" min={0} value={g.min_select} onChange={(e) => update(gi, { min_select: Number(e.target.value) })} className="h-8 w-16" /></label>
            <label className="flex items-center gap-1">Max <Input type="number" min={1} value={g.max_select} onChange={(e) => update(gi, { max_select: Number(e.target.value) })} className="h-8 w-16" /></label>
            <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={g.is_required} onChange={(e) => update(gi, { is_required: e.target.checked })} className="size-4 cursor-pointer accent-[hsl(var(--primary))]" /> Required</label>
          </div>

          <div className="space-y-1.5">
            {g.options.map((o, oi) => (
              <div key={oi} className="flex flex-wrap items-center gap-2 rounded-md bg-[hsl(var(--muted))]/50 p-2">
                <Input placeholder="Option (e.g. Large)" value={o.name} onChange={(e) => updateOpt(gi, oi, { name: e.target.value })} className="h-8 min-w-[7rem] flex-1" />
                <label className="flex items-center gap-1 text-xs">₱<Input type="number" step="0.5" value={o.price_delta} onChange={(e) => updateOpt(gi, oi, { price_delta: Number(e.target.value) })} className="h-8 w-20" /></label>
                <label className="flex cursor-pointer items-center gap-1 text-xs"><input type="checkbox" checked={o.is_default} onChange={(e) => updateOpt(gi, oi, { is_default: e.target.checked })} className="size-4 cursor-pointer accent-[hsl(var(--primary))]" /> Default</label>
                <select value={o.consumes_ingredient_id ?? ''} onChange={(e) => updateOpt(gi, oi, { consumes_ingredient_id: e.target.value ? Number(e.target.value) : null })} className="h-8 cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]" title="Consumes ingredient">
                  <option value="">uses no stock</option>
                  {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                </select>
                {o.consumes_ingredient_id && (
                  <Input type="number" min={0} step="0.001" value={o.consume_quantity} onChange={(e) => updateOpt(gi, oi, { consume_quantity: Number(e.target.value) })} className="h-8 w-20" title="Quantity consumed" />
                )}
                <select value={o.replaces_ingredient_id ?? ''} onChange={(e) => updateOpt(gi, oi, { replaces_ingredient_id: e.target.value ? Number(e.target.value) : null })} className="h-8 cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]" title="Replaces a base recipe ingredient">
                  <option value="">replaces nothing</option>
                  {ingredients.map((ing) => <option key={ing.id} value={ing.id}>swap out {ing.name}</option>)}
                </select>
                <button type="button" aria-label="Remove option" onClick={() => update(gi, { options: g.options.filter((_, i) => i !== oi) })} className="grid size-7 cursor-pointer place-items-center rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))]"><X className="size-3.5" aria-hidden /></button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => update(gi, { options: [...g.options, emptyOption()] })}>
              <Plus className="size-3.5" aria-hidden /> Option
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
