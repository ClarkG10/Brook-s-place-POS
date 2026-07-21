import { Button, EmptyState, Input, Label, Modal, Skeleton, toast } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coffee, Minus, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ReceiptModal } from '../components/ReceiptModal';
import { api, type MenuOption, type MenuOptionGroup, type MenuProduct, type Order, type PosOrderPayload } from '../lib/api';

interface Line {
  key: string;
  product: MenuProduct;
  quantity: number;
  optionIds: number[];
  optionNames: string[];
  unitPrice: number;
}

const PAYMENTS = ['cash', 'gcash', 'card', 'other'] as const;

function defaultsFor(p: MenuProduct): { ids: number[]; names: string[]; delta: number } {
  const ids: number[] = [];
  const names: string[] = [];
  let delta = 0;
  for (const g of p.option_groups) {
    const chosen = g.options.filter((o) => o.is_default);
    const picks = chosen.length ? chosen : g.is_required && g.options.length ? [g.options[0]] : [];
    for (const o of picks) {
      ids.push(o.id);
      if (o.price_delta !== 0) names.push(o.name);
      delta += o.price_delta;
    }
  }
  return { ids, names, delta };
}

export function PosPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: api.settings });
  const { data: categories, isPending } = useQuery({ queryKey: ['pos-menu'], queryFn: api.menu, refetchInterval: 30_000 });

  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [table, setTable] = useState('');
  const [customer, setCustomer] = useState('');
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]>('cash');
  const [tendered, setTendered] = useState('');
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [customizing, setCustomizing] = useState<MenuProduct | null>(null);

  const sym = settings?.currency_symbol ?? '₱';
  const money = (n: number) => `${sym}${n.toFixed(2)}`;

  const current = useMemo(() => {
    if (!categories?.length) return null;
    return categories.find((c) => c.id === activeCat) ?? categories[0];
  }, [categories, activeCat]);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const change = payment === 'cash' && tendered ? Number(tendered) - total : null;

  function pushLine(product: MenuProduct, ids: number[], names: string[], unitPrice: number) {
    const key = `${product.id}:${[...ids].sort((a, b) => a - b).join(',')}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { key, product, quantity: 1, optionIds: ids, optionNames: names, unitPrice }];
    });
  }

  function warnIfLow(product: MenuProduct) {
    const left = product.max_producible;
    if (left !== null && left <= 5) {
      toast({
        variant: left <= 3 ? 'warning' : 'info',
        title: `Only ${left} more ${product.name} can be made`,
        description: product.limiting_ingredient ? `${product.limiting_ingredient} is running low.` : 'An ingredient is running low.',
      });
    }
  }

  function addProduct(product: MenuProduct) {
    if (product.is_sold_out) {
      toast({
        variant: 'error',
        title: `${product.name} is sold out`,
        description: product.limiting_ingredient ? `Out of ${product.limiting_ingredient}.` : 'Not enough stock to make it.',
      });
      return;
    }
    warnIfLow(product);
    // Products with options open the customize sheet; simple items are one tap.
    if (product.option_groups.length > 0) {
      setCustomizing(product);
      return;
    }
    const d = defaultsFor(product);
    pushLine(product, d.ids, d.names, product.base_price + d.delta);
  }

  const setQty = (key: string, q: number) =>
    setLines((prev) => (q <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: q } : l))));

  const place = useMutation({
    mutationFn: () => {
      const payload: PosOrderPayload = {
        table_number: table.trim() || null,
        customer_name: customer.trim() || null,
        discount,
        payment_method: payment,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity, option_ids: l.optionIds })),
      };
      return api.createOrder(payload);
    },
    onSuccess: (order) => {
      setReceipt(order);
      setLines([]);
      setTable('');
      setCustomer('');
      setDiscount(0);
      setTendered('');
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Menu */}
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Point of Sale</h1>

        {isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-[var(--radius)]" />
            ))}
          </div>
        ) : (
          <>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {categories?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCat(c.id)}
                  className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                    (current?.id ?? null) === c.id
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:brightness-95'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {current?.products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.is_sold_out}
                  onClick={() => addProduct(p)}
                  className="flex cursor-pointer flex-col gap-2 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-left transition-[box-shadow,transform] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-md">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--accent) / 0.12))' }}>
                        <Coffee className="size-6 text-[hsl(var(--primary))]/50" aria-hidden />
                      </div>
                    )}
                    {p.is_sold_out && <div className="absolute inset-0 grid place-items-center bg-black/45 text-xs font-bold text-white">Sold out</div>}
                  </div>
                  <div className="px-1">
                    <span className="block text-sm font-semibold leading-tight">{p.name}</span>
                    <span className="font-display text-sm font-bold text-[hsl(var(--primary))]">{money(p.base_price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Ticket */}
      <div className="flex flex-col rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
        <div className="border-b border-[hsl(var(--border))] p-4">
          <h2 className="font-display text-sm font-bold">Current Order</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <EmptyState icon={Coffee} title="No items yet" description="Tap products to add them." />
          ) : (
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.key} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{l.product.name}</p>
                    {l.optionNames.length > 0 && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{l.optionNames.join(', ')}</p>
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <button type="button" aria-label="Decrease" onClick={() => setQty(l.key, l.quantity - 1)} className="grid size-6 cursor-pointer place-items-center rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                        <Minus className="size-3" aria-hidden />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                      <button type="button" aria-label="Increase" onClick={() => setQty(l.key, l.quantity + 1)} className="grid size-6 cursor-pointer place-items-center rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                        <Plus className="size-3" aria-hidden />
                      </button>
                      <button type="button" aria-label="Remove" onClick={() => setQty(l.key, 0)} className="ml-1 grid size-6 cursor-pointer place-items-center rounded-full text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))]">
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{money(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-[hsl(var(--border))] p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="pos-table" className="text-xs">Table</Label>
              <Input id="pos-table" value={table} onChange={(e) => setTable(e.target.value)} placeholder="—" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pos-disc" className="text-xs">Discount</Label>
              <Input id="pos-disc" type="number" min={0} value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="h-9" />
            </div>
          </div>

          <div className="flex gap-1.5">
            {PAYMENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPayment(p)}
                className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                  payment === p ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {payment === 'cash' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="pos-tendered" className="text-xs">Cash</Label>
              <Input id="pos-tendered" type="number" min={0} value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={total.toFixed(2)} className="h-9" />
              {change !== null && change >= 0 && (
                <span className="whitespace-nowrap text-xs text-[hsl(var(--muted-foreground))]">Change {money(change)}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-2">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Total</span>
            <span className="font-display text-xl font-bold tabular-nums">{money(total)}</span>
          </div>

          <Button size="lg" className="w-full" disabled={lines.length === 0 || place.isPending} onClick={() => place.mutate()}>
            {place.isPending ? 'Placing…' : `Charge ${money(total)}`}
          </Button>
          {place.isError && <p className="text-xs text-[hsl(var(--danger))]">Could not place the order. Check stock and try again.</p>}
        </div>
      </div>

      {customizing && (
        <PosCustomize
          product={customizing}
          money={money}
          onClose={() => setCustomizing(null)}
          onAdd={(ids, names, unitPrice) => {
            pushLine(customizing, ids, names, unitPrice);
            setCustomizing(null);
          }}
        />
      )}
      {receipt && settings && <ReceiptModal order={receipt} settings={settings} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function PosCustomize({
  product,
  money,
  onClose,
  onAdd,
}: {
  product: MenuProduct;
  money: (n: number) => string;
  onClose: () => void;
  onAdd: (ids: number[], names: string[], unitPrice: number) => void;
}) {
  const [selection, setSelection] = useState<Record<number, MenuOption[]>>(() => {
    const sel: Record<number, MenuOption[]> = {};
    for (const g of product.option_groups) {
      const defaults = g.options.filter((o) => o.is_default);
      sel[g.id] = defaults.length ? defaults.slice(0, Math.max(1, g.max_select)) : [];
    }
    return sel;
  });
  const [showErrors, setShowErrors] = useState(false);

  const chosen = Object.values(selection).flat();
  const unitPrice = chosen.reduce((s, o) => s + o.price_delta, product.base_price);
  const missing = product.option_groups.filter((g) => (g.is_required || g.min_select > 0) && (selection[g.id]?.length ?? 0) < Math.max(1, g.min_select));

  function toggle(group: MenuOptionGroup, option: MenuOption) {
    setSelection((prev) => {
      const cur = prev[group.id] ?? [];
      if (group.max_select <= 1) return { ...prev, [group.id]: [option] };
      const exists = cur.some((o) => o.id === option.id);
      if (exists) return { ...prev, [group.id]: cur.filter((o) => o.id !== option.id) };
      if (cur.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...cur, option] };
    });
  }

  function add() {
    if (missing.length) { setShowErrors(true); return; }
    onAdd(chosen.map((o) => o.id), chosen.map((o) => o.name), unitPrice);
  }

  return (
    <Modal onClose={onClose}>
      <div className="my-8 flex max-h-[85vh] w-full max-w-md flex-col rounded-[var(--radius)] bg-[hsl(var(--card))] shadow-xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
          <h2 className="font-display text-lg font-bold">{product.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[hsl(var(--muted))]"><X className="size-4" aria-hidden /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {product.option_groups.map((g) => {
            const invalid = showErrors && missing.some((m) => m.id === g.id);
            return (
              <fieldset key={g.id}>
                <legend className="mb-2 text-sm font-bold">
                  {g.name}
                  {(g.is_required || g.min_select > 0) && <span className="ml-1 text-[hsl(var(--danger))]">*</span>}
                  {g.max_select > 1 && <span className="ml-1 text-xs font-normal text-[hsl(var(--muted-foreground))]">(up to {g.max_select})</span>}
                </legend>
                {invalid && <p className="mb-2 text-xs text-[hsl(var(--danger))]">Please choose an option.</p>}
                <div className="grid grid-cols-2 gap-2">
                  {g.options.map((o) => {
                    const active = (selection[g.id] ?? []).some((s) => s.id === o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggle(g, o)}
                        className={`flex items-center justify-between gap-1 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                          active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 font-semibold' : 'cursor-pointer border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                        }`}
                      >
                        <span>{o.name}</span>
                        {o.price_delta !== 0 && <span className="text-xs text-[hsl(var(--muted-foreground))]">+{money(o.price_delta).replace(/^./, '')}</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="border-t border-[hsl(var(--border))] p-5">
          <Button size="lg" className="w-full" onClick={add}>Add · {money(unitPrice)}</Button>
        </div>
      </div>
    </Modal>
  );
}
