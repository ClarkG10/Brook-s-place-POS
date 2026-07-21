import { Badge } from '@brooks/ui';
import { Clock, GlassWater, Plus } from 'lucide-react';
import { money } from '../lib/format';
import type { Product } from '../lib/types';

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const soldOut = product.is_sold_out;
  const lowStock = !soldOut && product.max_producible !== null && product.max_producible <= 10;
  // Gentle hand-placed tilt, straightened on hover/focus.
  const tiltClass = product.id % 2 === 0 ? 'rotate-[-1.2deg]' : 'rotate-[1.4deg]';

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => onSelect(product)}
      aria-label={`${product.name}, ${money(product.base_price)}${soldOut ? ', sold out' : ''}`}
      className={`group wobble sketch-shadow relative flex w-full ${tiltClass} flex-col overflow-hidden border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left transition-[transform,box-shadow] duration-300 ease-out hover:rotate-0 hover:-translate-y-1 focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-60 enabled:cursor-pointer enabled:active:translate-y-0`}
    >
      <div className="wobble-2 relative m-2 aspect-[5/4] overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          // Palette-consistent placeholder (follows the selected theme, no random colors).
          <div
            className="grid size-full place-items-center"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--accent) / 0.12))' }}
          >
            <GlassWater className="size-12 text-[hsl(var(--primary))]/55" aria-hidden />
          </div>
        )}

        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          {product.is_popular && <Badge variant="accent" className="text-[0.8rem]">★ Popular</Badge>}
          {product.is_new && <Badge variant="primary" className="text-[0.8rem]">New</Badge>}
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <Badge variant="danger" className="rotate-[-6deg] text-base">Sold Out</Badge>
          </div>
        )}
        {lowStock && (
          <div className="absolute bottom-1.5 left-1.5">
            <Badge variant="warning" className="text-[0.8rem]">Only {product.max_producible} left</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5">
        <h3 className="text-lg font-extrabold leading-tight text-[hsl(var(--foreground))]">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-sm font-medium leading-snug text-[hsl(var(--muted-foreground))]">{product.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <span className="font-display text-3xl font-bold leading-none text-[hsl(var(--primary))]">{money(product.base_price)}</span>
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              <Clock className="size-3.5" aria-hidden /> {product.prep_time_minutes} min
            </span>
          </div>
          {!soldOut && (
            <span
              aria-hidden
              className="sketch-shadow-primary grid size-12 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90"
            >
              <Plus className="size-6" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
