import { applyTheme, Button, Card, Input, Label, Skeleton, toast } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, Loader2, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, ApiError, type Palette } from '../lib/api';
import { useAuth } from '../lib/auth';

export function SettingsPage() {
  const qc = useQueryClient();
  const currentUser = useAuth((s) => s.user);
  const { data: settings, isPending } = useQuery({ queryKey: ['admin-settings'], queryFn: api.settings });

  const [form, setForm] = useState({
    shop_name: '',
    tagline: '',
    logo_url: '',
    currency_symbol: '₱',
    currency_code: 'PHP',
    tax_rate: 0,
    tax_inclusive: true,
    service_charge_rate: 0,
    receipt_footer: '',
    public_palette: 'espresso',
    admin_palette: 'slate',
    admin_mode: 'light',
  });
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      shop_name: settings.shop_name,
      tagline: settings.tagline ?? '',
      logo_url: settings.logo_url ?? '',
      currency_symbol: settings.currency_symbol,
      currency_code: settings.currency_code,
      tax_rate: settings.tax_rate,
      tax_inclusive: settings.tax_inclusive,
      service_charge_rate: settings.service_charge_rate,
      receipt_footer: settings.receipt_footer ?? '',
      public_palette: settings.public_theme.palette,
      admin_palette: settings.admin_theme.palette,
      admin_mode: settings.admin_theme.mode ?? 'light',
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.updateSettings(form),
    onSuccess: (updated) => {
      qc.setQueryData(['admin-settings'], updated);
      qc.invalidateQueries({ queryKey: ['settings'] });
      applyTheme(updated.admin_theme as never); // admin palette change is instant
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  // Only the owner may change store settings (staff can read via the shared theme fetch).
  if (currentUser && !currentUser.is_owner) return <Navigate to="/" replace />;

  if (isPending || !settings) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-[var(--radius)]" />
      </div>
    );
  }

  const err = save.error instanceof ApiError ? save.error.message : null;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ variant: 'error', title: 'Image too large', description: 'Please choose an image under 4 MB.' });
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      set('logo_url', url);
      toast({ variant: 'success', title: 'Logo uploaded' });
    } catch {
      toast({ variant: 'error', title: 'Upload failed', description: 'Use a JPG, PNG, or WebP under 4 MB.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Your shop name and look — used across both apps.</p>
      </div>

      {/* Brand */}
      <Card className="space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold">
          <Store className="size-4 text-[hsl(var(--primary))]" aria-hidden /> Brand
        </h2>

        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
            {uploading ? (
              <Loader2 className="size-5 animate-spin text-[hsl(var(--muted-foreground))]" aria-hidden />
            ) : form.logo_url ? (
              <img src={form.logo_url} alt="Shop logo" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-[hsl(var(--muted-foreground))]" aria-hidden />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Logo</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Shown in the admin nav and on the customer app.</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Square, ≥512×512px · PNG (transparent) or WebP · max 4MB.</p>
            <div className="mt-1.5 flex gap-3 text-xs font-semibold">
              <label className="cursor-pointer text-[hsl(var(--primary))]">
                {form.logo_url ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" className="sr-only" onChange={onLogoFile} />
              </label>
              {form.logo_url && (
                <button type="button" onClick={() => set('logo_url', '')} className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))]">Remove</button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shop_name">Shop name</Label>
            <Input id="shop_name" value={form.shop_name} maxLength={60} onChange={(e) => set('shop_name', e.target.value)} />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Shown on the customer app, dashboard, and receipts.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={form.tagline} maxLength={120} onChange={(e) => set('tagline', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cur_symbol">Currency symbol</Label>
            <Input id="cur_symbol" value={form.currency_symbol} maxLength={8} onChange={(e) => set('currency_symbol', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax">Tax rate (%)</Label>
            <Input
              id="tax"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.tax_rate}
              onChange={(e) => set('tax_rate', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="receipt">Receipt footer</Label>
            <Input id="receipt" value={form.receipt_footer} maxLength={255} onChange={(e) => set('receipt_footer', e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Public palette */}
      <PaletteSection
        title="Customer app color"
        description="The palette customers see when ordering."
        palettes={settings.palettes.public}
        value={form.public_palette}
        onChange={(k) => set('public_palette', k)}
      />

      {/* Admin palette */}
      <PaletteSection
        title="Management portal color"
        description="Your staff-facing theme — changes apply here immediately on save."
        palettes={settings.palettes.admin}
        value={form.admin_palette}
        onChange={(k) => set('admin_palette', k)}
        extra={
          <div className="flex items-center gap-2 pt-1">
            <Label htmlFor="admin_mode" className="text-xs">Mode</Label>
            <select
              id="admin_mode"
              value={form.admin_mode}
              onChange={(e) => set('admin_mode', e.target.value)}
              className="cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        }
      />

      {err && (
        <p role="alert" className="rounded-md bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]">
          {err}
        </p>
      )}

      <div className="sticky bottom-4 flex items-center gap-3">
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--success))]">
            <Check className="size-4" aria-hidden /> Saved
          </span>
        )}
      </div>
    </form>
  );
}

function PaletteSection({
  title,
  description,
  palettes,
  value,
  onChange,
  extra,
}: {
  title: string;
  description: string;
  palettes: Palette[];
  value: string;
  onChange: (key: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-display text-sm font-bold">{title}</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {palettes.map((p) => {
          const active = p.key === value;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(p.key)}
              className={`flex cursor-pointer items-center gap-3 rounded-[calc(var(--radius)-0.3rem)] border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                active ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/40'
              }`}
            >
              <div className="flex -space-x-1.5">
                {['primary', 'accent', 'background'].map((t) => (
                  <span
                    key={t}
                    className="size-6 rounded-full border-2 border-[hsl(var(--card))]"
                    style={{ background: `hsl(${p.tokens[t]})` }}
                  />
                ))}
              </div>
              <span className="flex-1 text-sm font-medium">{p.label}</span>
              {active && <Check className="size-4 text-[hsl(var(--primary))]" aria-hidden />}
            </button>
          );
        })}
      </div>
      {extra}
    </Card>
  );
}
