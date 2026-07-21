import { Button } from '@brooks/ui';
import { motion } from 'framer-motion';
import { ArrowRight, Coffee, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/queries';
import { useCart } from '../store/cart';

export function WelcomePage() {
  const { data: settings } = useSettings();
  const table = useCart((s) => s.table);
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      {/* Warm brand backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, hsl(var(--accent) / 0.18), transparent 60%), hsl(var(--background))',
        }}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="grid size-24 place-items-center rounded-[2rem] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg"
        >
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="" className="size-16 rounded-2xl object-cover" />
          ) : (
            <Coffee className="size-12" aria-hidden />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="space-y-2"
        >
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
            {settings?.shop_name ?? "Brook's Place"}
          </h1>
          {settings?.tagline && (
            <p className="text-base text-[hsl(var(--muted-foreground))]">{settings.tagline}</p>
          )}
        </motion.div>

        {table && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-4 py-1.5 text-sm font-medium text-[hsl(var(--foreground))]">
            <MapPin className="size-4 text-[hsl(var(--primary))]" aria-hidden />
            Table {table}
          </span>
        )}
      </div>

      <div className="sticky bottom-0 space-y-3 px-6 pb-10 pt-2">
        <Button size="lg" className="w-full text-lg" onClick={() => navigate('/menu')}>
          Start Ordering
          <ArrowRight className="size-5" aria-hidden />
        </Button>
        <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
          Order in under a minute · No account needed
        </p>
      </div>
    </div>
  );
}
