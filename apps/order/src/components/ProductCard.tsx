import { Badge } from '@brooks/ui';
import { Clock, GlassWater } from 'lucide-react';
import { money } from '../lib/format';
import type { Product } from '../lib/types';

/** Deterministic warm gradient for products without a photo (attractive empty state). */
function placeholderGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(140deg, hsl(${h} 55% 62%), hsl(${(h + 40) % 360} 60% 48%))`;
}

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const soldOut = product.is_sold_out;
  const lowStock = !soldOut && product.max_producible !== null && product.max_producible <= 10;

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => onSelect(product)}
      aria-label={`${product.name}, ${money(product.base_price)}${soldOut ? ', sold out' : ''}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left shadow-sm transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-60 enabled:cursor-pointer enabled:active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center" style={{ background: placeholderGradient(product.name) }}>
            <GlassWater className="size-10 text-white/85" aria-hidden />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {product.is_popular && <Badge variant="accent">Popular</Badge>}
          {product.is_new && <Badge variant="primary">New</Badge>}
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <Badge variant="danger" className="text-sm">Sold Out</Badge>
          </div>
        )}
        {lowStock && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="warning">Only {product.max_producible} left</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-display text-sm font-semibold leading-tight text-[hsl(var(--foreground))]">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="font-display text-base font-bold text-[hsl(var(--primary))]">
            {money(product.base_price)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            <Clock className="size-3" aria-hidden />
            {product.prep_time_minutes}m
          </span>
        </div>
      </div>
    </button>
  );
}
