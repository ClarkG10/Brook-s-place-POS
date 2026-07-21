import { EmptyState, Skeleton } from '@brooks/ui';
import { CupSoda, MapPin, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartBar } from '../components/CartBar';
import { CustomizeSheet } from '../components/CustomizeSheet';
import { ProductCard } from '../components/ProductCard';
import { HScroll, ScrollDownHint } from '../components/Scrollers';
import { useMenu, useSettings } from '../hooks/queries';
import { CategoryIcon } from '../lib/categoryIcon';
import type { Product } from '../lib/types';
import { useCart } from '../store/cart';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function MenuPage() {
  const { data: settings } = useSettings();
  const { data: categories, isPending, isError, refetch } = useMenu();
  const table = useCart((s) => s.table);
  const addLine = useCart((s) => s.addLine);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [customizing, setCustomizing] = useState<Product | null>(null);

  // Items with options open the customize sheet; simple items add in one tap.
  const handleSelect = (p: Product) => {
    if (p.option_groups.length === 0) addLine(p, [], '', 1);
    else setCustomizing(p);
  };

  const allProducts = useMemo(() => categories?.flatMap((c) => c.products) ?? [], [categories]);
  const popular = useMemo(() => allProducts.filter((p) => p.is_popular && !p.is_sold_out).slice(0, 8), [allProducts]);
  const current = useMemo(() => {
    if (!categories?.length) return null;
    return categories.find((c) => c.id === activeCat) ?? categories[0];
  }, [categories, activeCat]);

  const q = query.trim().toLowerCase();
  const searchResults = useMemo(
    () => (q ? allProducts.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) : []),
    [q, allProducts],
  );

  return (
    <div className="flex min-h-full flex-col pb-28">
      {/* Greeting hero */}
      <header className="relative overflow-hidden px-4 pb-4 pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64"
          style={{ background: 'radial-gradient(120% 90% at 50% 0%, hsl(var(--accent) / 0.16), transparent 60%)' }}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {settings?.logo_url && <img src={settings.logo_url} alt="" className="size-9 rounded-xl object-cover" />}
            <p className="text-base font-bold text-[hsl(var(--foreground))]">{settings?.shop_name ?? "Brook's Place"}</p>
          </div>
          {table && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold shadow-sm">
              <MapPin className="size-3.5 text-[hsl(var(--primary))]" aria-hidden /> Table {table}
            </span>
          )}
        </div>
        <h1 className="font-display text-5xl font-bold leading-none text-[hsl(var(--foreground))]">{greeting()}!</h1>
        <p className="mt-1 text-base text-[hsl(var(--muted-foreground))]">What would you like today?</p>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drinks & snacks…"
            aria-label="Search the menu"
            className="wobble h-12 w-full border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-10 pr-4 text-sm font-medium placeholder:text-[hsl(var(--muted-foreground))] focus-visible:border-[hsl(var(--ring))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/30"
          />
        </div>
      </header>

      <main className="flex-1 px-4">
        {isPending && (
          <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="wobble border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <Skeleton className="wobble-2 m-2 aspect-square" />
                <div className="space-y-2 px-4 pb-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="mt-2 h-8 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={CupSoda}
            title="Menu unavailable"
            description="We couldn't load the menu."
            action={<button type="button" onClick={() => refetch()} className="cursor-pointer text-sm font-bold text-[hsl(var(--primary))] underline underline-offset-4">Try again</button>}
          />
        )}

        {/* Search results */}
        {q && (
          <section className="pt-1">
            <h2 className="mb-3 font-display text-2xl font-bold">Results for “{query}”</h2>
            {searchResults.length === 0 ? (
              <EmptyState icon={Search} title="Nothing found" description="Try a different drink or snack." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {searchResults.map((p) => <ProductCard key={p.id} product={p} onSelect={handleSelect} />)}
              </div>
            )}
          </section>
        )}

        {/* Discovery (when not searching) */}
        {!q && categories && (
          <>
            {popular.length > 0 && (
              <section className="pb-4">
                <h2 className="mb-3 flex items-center gap-1.5 font-display text-2xl font-bold">
                  <Sparkles className="size-5 text-[hsl(var(--accent))]" aria-hidden /> Popular right now
                </h2>
                <HScroll wrapperClassName="-mx-4" className="flex snap-x items-stretch gap-4 px-4 py-2">
                  {popular.map((p) => (
                    <div key={p.id} className="w-56 shrink-0 snap-start sm:w-60">
                      <ProductCard product={p} onSelect={handleSelect} flat />
                    </div>
                  ))}
                </HScroll>
              </section>
            )}

            {/* Category rail */}
            <HScroll wrapperClassName="sticky top-0 z-10 -mx-4 bg-[hsl(var(--background))]/90 backdrop-blur" className="flex gap-2 px-4 py-3">
              {categories.map((cat) => {
                const active = (current?.id ?? null) === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCat(cat.id)}
                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2 text-base font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                      active
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))]/40'
                    }`}
                  >
                    <CategoryIcon name={cat.icon} className="size-[1.1em]" />
                    {cat.name}
                  </button>
                );
              })}
            </HScroll>

            {current && (
              <section aria-label={current.name} className="pt-3">
                <h2 className="mb-3 font-display text-2xl font-bold">{current.name}</h2>
                {current.products.length === 0 ? (
                  <EmptyState icon={CupSoda} title="Nothing here yet" description="Check another category." />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {current.products.map((p) => <ProductCard key={p.id} product={p} onSelect={handleSelect} />)}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <CustomizeSheet product={customizing} onClose={() => setCustomizing(null)} />
      <ScrollDownHint />
      <CartBar />
    </div>
  );
}
