import { Button, Input, Label } from '@brooks/ui';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
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

  return (
    <div className="flex min-h-full flex-col pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/cart')}
          aria-label="Back to cart"
          className="grid size-9 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="font-display text-lg font-bold">Checkout</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Your name (optional)</Label>
          <Input
            id="customer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="For calling out your order"
            autoComplete="name"
            maxLength={100}
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Payment is handled at the counter. Your order goes straight to the bar.
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <h2 className="mb-3 font-display text-sm font-bold">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-[hsl(var(--muted-foreground))]">
                  {l.quantity}× {l.product.name}
                </span>
                <span className="tabular-nums">{money(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-[hsl(var(--border))] pt-3 font-display font-bold">
            <span>Total</span>
            <span className="tabular-nums">{money(cartSubtotal(lines))}</span>
          </div>
          {table && <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Serving to Table {table}</p>}
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]">
            {errorMessage}
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-2xl border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={placeOrder.isPending}
          onClick={() => placeOrder.mutate()}
        >
          {placeOrder.isPending ? 'Placing order…' : `Place Order · ${money(cartSubtotal(lines))}`}
        </Button>
      </div>
    </div>
  );
}
