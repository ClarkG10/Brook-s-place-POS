import { applyTheme } from '@brooks/ui';
import { Coffee } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useSettings } from '../hooks/queries';
import { setCurrencySymbol } from '../lib/format';

/**
 * Fetches store settings, applies the configured public palette to :root, and sets
 * the currency symbol before revealing the app. Renders a branded splash while loading.
 */
export function ThemeGate({ children }: { children: ReactNode }) {
  const { data: settings, isPending, isError } = useSettings();

  useEffect(() => {
    if (settings) {
      applyTheme(settings.theme);
      setCurrencySymbol(settings.currency_symbol);
      document.title = `Order · ${settings.shop_name}`;
    }
  }, [settings]);

  if (isPending) {
    return (
      <div className="grid min-h-full place-items-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-3 text-[hsl(var(--muted-foreground))]">
          <Coffee className="size-8 animate-pulse text-[hsl(var(--primary))]" aria-hidden />
          <span className="text-sm">Loading menu…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid min-h-full place-items-center p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="font-display text-xl font-bold">Can’t reach the shop</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Please check your connection and try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
