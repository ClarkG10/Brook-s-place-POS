import { Badge } from '@brooks/ui';
import { Clock, GlassWater, Plus } from 'lucide-react';
import { money } from '../lib/format';
import type { Product } from '../lib/types';

/** flat = no tilt (used in horizontal rows where rotation would clip). */
export function ProductCard({ product, onSelect, flat }: { product: Product; onSelect: (p: Product) => void; flat?: boolean }) {
  const soldOut = product.is_sold_out;
  const lowStock = !soldOut && product.max_producible !== null && product.max_producible <= 10;
  const tiltClass = flat ? '' : product.id % 2 === 0 ? 'rotate-[-1deg] hover:rotate-0 focus-visible:rotate-0' : 'rotate-[1deg] hover:rotate-0 focus-visible:rotate-0';

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => onSelect(product)}
      aria-label={`${product.name}, ${money(product.base_price)}${soldOut ? ', sold out' : ''}`}
      className={`group wobble sketch-shadow relative flex h-full w-full ${tiltClass} flex-col overflow-hidden border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-60 enabled:cursor-pointer enabled:active:translate-y-0`}
    >
      <div className="wobble-2 relative m-2 aspect-square overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--accent) / 0.12))' }}>
            <GlassWater className="size-14 text-[hsl(var(--primary))]/55" aria-hidden />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.is_popular && <Badge variant="accent" className="text-sm">★ Popular</Badge>}
          {product.is_new && <Badge variant="primary" className="text-sm">New</Badge>}
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <Badge variant="danger" className="rotate-[-6deg] text-base">Sold Out</Badge>
          </div>
        )}
        {lowStock && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="warning" className="text-sm">Only {product.max_producible} left</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-4 pb-4">
        <h3 className="text-xl font-extrabold leading-tight text-[hsl(var(--foreground))]">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-sm font-medium leading-snug text-[hsl(var(--muted-foreground))]">{product.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <span className="font-display text-4xl font-bold leading-none text-[hsl(var(--primary))]">{money(product.base_price)}</span>
            <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
              <Clock className="size-4" aria-hidden /> {product.prep_time_minutes} min
            </span>
          </div>
          {!soldOut && (
            <span
              aria-hidden
              className="sketch-shadow-primary grid size-14 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90"
            >
              <Plus className="size-7" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
