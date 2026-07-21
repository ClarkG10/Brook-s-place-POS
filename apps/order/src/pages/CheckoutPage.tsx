import { Button, Input, Label } from '@brooks/ui';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, GlassWater } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import { cartSubtotal, useCart } from '../store/cart';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { lines, table, clear } = useCart();
  const [name, setName] = useState('');

  const placeOrder = useMutation({
    mutationFn: () =>
      api.placeOrder({
        table_number: table,
        customer_name: name.trim() || null,
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          notes: l.notes || null,
          option_ids: l.options.map((o) => o.option.id),
        })),
      }),
    onSuccess: (order) => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(14); // gentle "order placed" tap
      clear();
      navigate(`/status/${order.order_number}`, { replace: true });
    },
  });

  if (lines.length === 0) {
    navigate('/menu', { replace: true });
    return null;
  }

  const errorMessage =
    placeOrder.error instanceof ApiError ? placeOrder.error.message : placeOrder.error ? 'Something went wrong.' : null;
  const total = cartSubtotal(lines);

  return (
    <div className="flex min-h-full flex-col pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/cart')}
          aria-label="Back to cart"
          className="grid size-10 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name" className="text-base">Your name <span className="font-normal text-[hsl(var(--muted-foreground))]">(optional)</span></Label>
          <Input
            id="customer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="So we can call your order"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={100}
            className="h-12 text-base"
          />
        </div>

        {/* Receipt-style summary with product imagery. */}
        <section className="wobble border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sketch-shadow">
          <h2 className="mb-4 font-display text-2xl font-bold">Order summary</h2>

          <ul className="space-y-4">
            {lines.map((l) => (
              <li key={l.id} className="flex gap-3">
                <div className="wobble-2 size-16 shrink-0 overflow-hidden">
                  {l.product.image_url ? (
                    <img src={l.product.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--accent) / 0.12))' }}>
                      <GlassWater className="size-7 text-[hsl(var(--primary))]/55" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-tight text-[hsl(var(--foreground))]">
                      <span className="text-[hsl(var(--primary))]">{l.quantity}×</span> {l.product.name}
                    </p>
                    <span className="shrink-0 font-display text-lg font-bold tabular-nums">{money(l.lineTotal)}</span>
                  </div>
                  {l.options.length > 0 && (
                    <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{l.options.map((o) => o.option.name).join(' · ')}</p>
                  )}
                  {l.notes && <p className="mt-0.5 text-sm italic text-[hsl(var(--muted-foreground))]">“{l.notes}”</p>}
                </div>
              </li>
            ))}
          </ul>

          <div className="my-4 border-t-2 border-dashed border-[hsl(var(--border))]" />

          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl font-bold">Total</span>
            <span className="font-display text-3xl font-bold tabular-nums text-[hsl(var(--primary))]">{money(total)}</span>
          </div>
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            Pay at the counter — your order goes straight to the bar.{table ? ` Serving to Table ${table}.` : ''}
          </p>
        </section>

        {errorMessage && (
          <p role="alert" className="rounded-md bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]">
            {errorMessage}
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-2xl border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <Button size="lg" className="w-full text-lg" disabled={placeOrder.isPending} onClick={() => placeOrder.mutate()}>
          {placeOrder.isPending ? 'Placing order…' : `Place Order · ${money(total)}`}
        </Button>
      </div>
    </div>
  );
}
