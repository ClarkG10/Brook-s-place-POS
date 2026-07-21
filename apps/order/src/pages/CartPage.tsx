import { Button, EmptyState } from '@brooks/ui';
import { ArrowLeft, GlassWater, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { money } from '../lib/format';
import { cartSubtotal, useCart } from '../store/cart';

export function CartPage() {
  const navigate = useNavigate();
  const { lines, updateQty, removeLine } = useCart();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/menu')}
          aria-label="Back to menu"
          className="grid size-10 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="font-display text-3xl font-bold">Your Order</h1>
      </header>

      {lines.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add a drink or two to get started."
          action={<Button size="lg" onClick={() => navigate('/menu')}>Browse Menu</Button>}
        />
      ) : (
        <div className="mx-auto grid w-full max-w-4xl flex-1 gap-6 p-4 lg:grid-cols-[1fr_20rem] lg:items-start">
          {/* Items */}
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="wobble flex gap-3 border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 sm:gap-4">
                <div className="wobble-2 size-20 shrink-0 overflow-hidden sm:size-24">
                  {line.product.image_url ? (
                    <img src={line.product.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--accent) / 0.12))' }}>
                      <GlassWater className="size-8 text-[hsl(var(--primary))]/55" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-extrabold leading-tight text-[hsl(var(--foreground))] sm:text-xl">{line.product.name}</h3>
                    <span className="shrink-0 font-display text-2xl font-bold tabular-nums text-[hsl(var(--primary))]">{money(line.lineTotal)}</span>
                  </div>
                  {line.options.length > 0 && (
                    <p className="mt-0.5 text-sm font-medium text-[hsl(var(--muted-foreground))]">{line.options.map((o) => o.option.name).join(' · ')}</p>
                  )}
                  {line.notes && <p className="mt-0.5 text-sm italic text-[hsl(var(--muted-foreground))]">“{line.notes}”</p>}

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center gap-1 rounded-full border-2 border-[hsl(var(--border))] p-1">
                      <button type="button" aria-label="Decrease" onClick={() => updateQty(line.id, line.quantity - 1)} className="grid size-9 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <span className="w-8 text-center text-lg font-bold tabular-nums">{line.quantity}</span>
                      <button type="button" aria-label="Increase" onClick={() => updateQty(line.id, line.quantity + 1)} className="grid size-9 cursor-pointer place-items-center rounded-full transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
                        <Plus className="size-4" aria-hidden />
                      </button>
                    </div>
                    <button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => removeLine(line.id)} className="grid size-10 cursor-pointer place-items-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--danger))]/10 hover:text-[hsl(var(--danger))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
                      <Trash2 className="size-5" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}

            <button type="button" onClick={() => navigate('/menu')} className="w-full cursor-pointer rounded-full border-2 border-dashed border-[hsl(var(--border))] py-3 text-base font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary))]/50 hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
              + Add more items
            </button>
          </ul>

          {/* Summary */}
          <div className="wobble border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 lg:sticky lg:top-24">
            <h2 className="mb-3 font-display text-2xl font-bold">Summary</h2>
            <div className="flex items-center justify-between text-base">
              <span className="text-[hsl(var(--muted-foreground))]">Subtotal</span>
              <span className="font-display text-2xl font-bold tabular-nums">{money(cartSubtotal(lines))}</span>
            </div>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Pay at the counter — your order goes straight to the bar.</p>
            <Button size="lg" className="mt-4 w-full text-lg" onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
