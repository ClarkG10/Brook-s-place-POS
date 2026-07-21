import { Button, Card, EmptyState, Input, Label, Skeleton } from '@brooks/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, ApiError, type StaffRole, type StaffUser } from '../lib/api';
import { useAuth } from '../lib/auth';

const ROLES: { value: StaffRole; label: string; hint: string }[] = [
  { value: 'owner', label: 'Owner', hint: 'Full access, including settings & staff' },
  { value: 'manager', label: 'Manager', hint: 'All operations, no settings/staff' },
  { value: 'cashier', label: 'Cashier', hint: 'POS + take & close orders' },
  { value: 'barista', label: 'Barista', hint: 'Order queue + status' },
];

const ROLE_BADGE: Record<StaffRole, string> = {
  owner: 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]',
  manager: 'bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent-foreground,var(--foreground)))]',
  cashier: 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]',
  barista: 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]',
};

export function StaffPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null);

  const { data: users, isPending } = useQuery({ queryKey: ['staff'], queryFn: api.users, enabled: !!user?.is_owner });

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });

  // Staff can't manage accounts — bounce them home once we know the role.
  if (user && !user.is_owner) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-[hsl(var(--foreground))]">
            <Users className="size-6 text-[hsl(var(--primary))]" aria-hidden /> Staff
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Create accounts and set what each person can do.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden /> Add staff
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-[var(--radius)]" />)}
        </div>
      ) : !users?.length ? (
        <EmptyState icon={Users} title="No staff yet" description="Add your first team member." />
      ) : (
        <Card className="divide-y divide-[hsl(var(--border))]">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--muted))] font-display font-bold text-[hsl(var(--foreground))]">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-[hsl(var(--foreground))]">{u.name}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${ROLE_BADGE[u.role]}`}>
                    {u.is_owner && <ShieldCheck className="size-3" aria-hidden />} {u.role}
                  </span>
                </div>
                <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">@{u.username} · {u.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(u)}
                  aria-label={`Edit ${u.name}`}
                  className="grid size-9 cursor-pointer place-items-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                {u.id !== user?.id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete ${u.name}'s account? This can't be undone.`)) remove.mutate(u.id);
                    }}
                    aria-label={`Delete ${u.name}`}
                    className="grid size-9 cursor-pointer place-items-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--danger))]/10 hover:text-[hsl(var(--danger))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <StaffModal
          key={editing === 'new' ? 'new' : editing.id}
          existing={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['staff'] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function StaffModal({ existing, onClose, onSaved }: { existing: StaffUser | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    email: existing?.email ?? '',
    username: existing?.username ?? '',
    role: (existing?.role ?? 'cashier') as StaffRole,
    password: '',
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { name: form.name, email: form.email, username: form.username, role: form.role };
      if (form.password) payload.password = form.password;
      return isEdit ? api.updateUser(existing!.id, payload) : api.createUser({ ...payload, password: form.password });
    },
    onSuccess: onSaved,
  });

  const err = save.error instanceof ApiError ? save.error.message : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{isEdit ? `Edit ${existing?.name}` : 'Add staff'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 cursor-pointer place-items-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Full name</Label>
            <Input id="s-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={100} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-username">Username</Label>
              <Input id="s-username" value={form.username} autoCapitalize="none" spellCheck={false} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} maxLength={50} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} maxLength={255} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-role">Role</Label>
            <select
              id="s-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
              className="h-10 w-full cursor-pointer rounded-[calc(var(--radius)-0.25rem)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm focus-visible:border-[hsl(var(--ring))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/40"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{ROLES.find((r) => r.value === form.role)?.hint}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-password">{isEdit ? 'New password (leave blank to keep)' : 'Password'}</Label>
            <Input id="s-password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!isEdit} placeholder={isEdit ? '••••••••' : 'At least 8 characters'} />
          </div>

          {err && <p role="alert" className="rounded-md bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
