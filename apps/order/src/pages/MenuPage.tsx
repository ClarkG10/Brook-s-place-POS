import { EmptyState, Skeleton } from '@brooks/ui';
import { CupSoda, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartBar } from '../components/CartBar';
import { CustomizeSheet } from '../components/CustomizeSheet';
import { ProductCard } from '../components/ProductCard';
import { useMenu, useSettings } from '../hooks/queries';
import type { Product } from '../lib/types';
import { useCart } from '../store/cart';

export function MenuPage() {
  const { data: settings } = useSettings();
  const { data: categories, isPending, isError, refetch } = useMenu();
  const table = useCart((s) => s.table);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [customizing, setCustomizing] = useState<Product | null>(null);

  const current = useMemo(() => {
    if (!categories?.length) return null;
    return categories.find((c) => c.id === activeCat) ?? categories[0];
  }, [categories, activeCat]);

  return (
    <div className="flex min-h-full flex-col pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-bold text-[hsl(var(--foreground))]">
              {settings?.shop_name ?? "Brook's Place"}
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Tap a drink to customize</p>
          </div>
          {table && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-xs font-medium">
              <MapPin className="size-3.5 text-[hsl(var(--primary))]" aria-hidden />
              Table {table}
            </span>
          )}
        </div>

        {/* Category rail */}
        {categories && categories.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            {categories.map((cat) => {
              const active = (current?.id ?? null) === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCat(cat.id)}
                  className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                    active
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:brightness-95'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 px-4 py-4">
        {isPending && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] w-full rounded-[var(--radius)]" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={CupSoda}
            title="Menu unavailable"
            description="We couldn't load the menu. Pull to retry."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="cursor-pointer text-sm font-semibold text-[hsl(var(--primary))] underline underline-offset-4"
              >
                Try again
              </button>
            }
          />
        )}

        {current && (
          <section aria-label={current.name} className="space-y-3">
            <h2 className="font-display text-base font-bold text-[hsl(var(--foreground))]">{current.name}</h2>
            {current.products.length === 0 ? (
              <EmptyState icon={CupSoda} title="Nothing here yet" description="Check another category." />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {current.products.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={setCustomizing} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <CustomizeSheet product={customizing} onClose={() => setCustomizing(null)} />
      <CartBar />
    </div>
  );
}
