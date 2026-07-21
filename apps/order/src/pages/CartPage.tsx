import { Button, EmptyState } from '@brooks/ui';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { money } from '../lib/format';
import { cartSubtotal, useCart } from '../store/cart';

export function CartPage() {
  const navigate = useNavigate();
  const { lines, updateQty, removeLine } = useCart();

  return (
    <div className="flex min-h-full flex-col pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/menu')}
          aria-label="Back to menu"
          className="grid size-9 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="font-display text-lg font-bold">Your Order</h1>
      </header>

      {lines.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add a drink or two to get started."
          action={<Button onClick={() => navigate('/menu')}>Browse Menu</Button>}
        />
      ) : (
        <>
          <ul className="mx-auto w-full max-w-2xl flex-1 divide-y divide-[hsl(var(--border))] px-4">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-[hsl(var(--foreground))]">
                    {line.product.name}
                  </p>
                  {line.options.length > 0 && (
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                      {line.options.map((o) => o.option.name).join(' · ')}
                    </p>
                  )}
                  {line.notes && (
                    <p className="mt-0.5 text-xs italic text-[hsl(var(--muted-foreground))]">“{line.notes}”</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-[hsl(var(--border))] p-0.5">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => updateQty(line.id, line.quantity - 1)}
                        className="grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() => updateQty(line.id, line.quantity + 1)}
                        className="grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${line.product.name}`}
                      onClick={() => removeLine(line.id)}
                      className="grid size-8 cursor-pointer place-items-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--danger))]/10 hover:text-[hsl(var(--danger))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <span className="font-display text-sm font-bold tabular-nums text-[hsl(var(--foreground))]">
                  {money(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-2xl border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Subtotal</span>
              <span className="font-display text-lg font-bold tabular-nums">{money(cartSubtotal(lines))}</span>
            </div>
            <Button size="lg" className="w-full" onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
