import { Button } from '@brooks/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, GlassWater, Minus, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { money } from '../lib/format';
import type { OptionGroup, Product, ProductOption } from '../lib/types';
import { useCart, type ChosenOption } from '../store/cart';

type Selection = Record<number, ProductOption[]>;

function defaultSelection(product: Product): Selection {
  const sel: Selection = {};
  for (const g of product.option_groups) {
    const defaults = g.options.filter((o) => o.is_default);
    sel[g.id] = defaults.length ? defaults.slice(0, Math.max(1, g.max_select)) : [];
  }
  return sel;
}

export function CustomizeSheet({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {product && <Sheet key={product.id} product={product} onClose={onClose} />}
    </AnimatePresence>
  );
}

function Sheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const addLine = useCart((s) => s.addLine);
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(product));
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  const unitPrice = useMemo(
    () =>
      Object.values(selection)
        .flat()
        .reduce((sum, o) => sum + o.price_delta, product.base_price),
    [selection, product.base_price],
  );

  const missing = product.option_groups.filter(
    (g) => (g.is_required || g.min_select > 0) && (selection[g.id]?.length ?? 0) < Math.max(1, g.min_select),
  );

  function toggle(group: OptionGroup, option: ProductOption) {
    setSelection((prev) => {
      const current = prev[group.id] ?? [];
      if (group.max_select <= 1) return { ...prev, [group.id]: [option] };
      const exists = current.some((o) => o.id === option.id);
      if (exists) return { ...prev, [group.id]: current.filter((o) => o.id !== option.id) };
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, option] };
    });
  }

  function addToCart() {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    const chosen: ChosenOption[] = product.option_groups.flatMap((g) =>
      (selection[g.id] ?? []).map((option) => ({ groupId: g.id, groupName: g.name, option })),
    );
    addLine(product, chosen, notes.trim(), qty);
    onClose();
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Customize ${product.name}`}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[hsl(var(--card))]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[hsl(var(--border))] p-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">{product.name}</h2>
            {product.description && (
              <p className="mt-0.5 text-base text-[hsl(var(--muted-foreground))]">{product.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
          {/* Product hero */}
          <div className="wobble-2 relative aspect-[5/3] w-full overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--accent) / 0.12))' }}>
                <GlassWater className="size-16 text-[hsl(var(--primary))]/55" aria-hidden />
              </div>
            )}
          </div>

          {product.option_groups.map((group) => {
            const invalid = showErrors && missing.some((m) => m.id === group.id);
            return (
              <fieldset key={group.id}>
                <legend className="mb-2 flex w-full items-center justify-between">
                  <span className="font-display text-lg font-bold text-[hsl(var(--foreground))]">
                    {group.name}
                    {(group.is_required || group.min_select > 0) && (
                      <span className="ml-1 text-[hsl(var(--danger))]">*</span>
                    )}
                  </span>
                  {group.max_select > 1 && (
                    <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Up to {group.max_select}</span>
                  )}
                </legend>
                {invalid && <p className="mb-2 text-sm text-[hsl(var(--danger))]">Please choose an option.</p>}
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((option) => {
                    const active = (selection[group.id] ?? []).some((o) => o.id === option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggle(group, option)}
                        className={`flex min-h-[3.25rem] cursor-pointer items-center justify-between gap-2 rounded-[calc(var(--radius)-0.4rem)] border px-4 py-3 text-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                          active
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 font-bold text-[hsl(var(--foreground))]'
                            : 'border-[hsl(var(--border))] font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {active && <Check className="size-5 shrink-0 text-[hsl(var(--primary))]" aria-hidden />}
                          {option.name}
                        </span>
                        {option.price_delta !== 0 && (
                          <span className="shrink-0 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                            {option.price_delta > 0 ? `+${money(option.price_delta)}` : money(option.price_delta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <div>
            <label htmlFor="line-notes" className="mb-2 block font-display text-lg font-bold">
              Notes <span className="text-base font-normal text-[hsl(var(--muted-foreground))]">(optional)</span>
            </label>
            <textarea
              id="line-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={255}
              rows={2}
              placeholder="e.g. No straw, less sweet"
              className="w-full resize-none rounded-[calc(var(--radius)-0.35rem)] border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-base placeholder:text-[hsl(var(--muted-foreground))] focus-visible:border-[hsl(var(--ring))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/40"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-[hsl(var(--border))] p-5">
          <div className="flex items-center gap-1 rounded-full border border-[hsl(var(--border))] p-1">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="grid size-11 cursor-pointer place-items-center rounded-full text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:opacity-40"
              disabled={qty <= 1}
            >
              <Minus className="size-5" aria-hidden />
            </button>
            <span className="w-8 text-center font-display font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
              className="grid size-11 cursor-pointer place-items-center rounded-full text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
          <Button className="flex-1" size="lg" onClick={addToCart}>
            Add · {money(unitPrice * qty)}
          </Button>
        </div>
      </motion.div>
    </>
  );
}
