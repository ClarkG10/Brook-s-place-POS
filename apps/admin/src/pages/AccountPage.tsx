import { Button, Card, Input, Label } from '@brooks/ui';
import { useMutation } from '@tanstack/react-query';
import { Check, KeyRound, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function AccountPage() {
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState({ name: '', email: '', username: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (user) setProfile({ name: user.name, email: user.email, username: user.username });
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => api.updateProfile(profile),
    onSuccess: (updated) => {
      setUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    },
  });

  const savePassword = useMutation({
    mutationFn: () => api.updatePassword(pw),
    onSuccess: () => {
      setPw({ current_password: '', password: '', password_confirmation: '' });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    },
  });

  const profileErr = saveProfile.error instanceof ApiError ? saveProfile.error.message : null;
  const pwErr = savePassword.error instanceof ApiError ? savePassword.error.message : null;
  const pwMismatch = pw.password.length > 0 && pw.password !== pw.password_confirmation;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">Your account</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Update your details and password.</p>
      </div>

      {/* Profile */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserCog className="size-5 text-[hsl(var(--primary))]" aria-hidden />
          <h2 className="font-display text-lg font-bold">Profile</h2>
          <span className="ml-auto rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs font-semibold capitalize text-[hsl(var(--muted-foreground))]">
            {user?.role}
          </span>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={profile.username} autoCapitalize="none" spellCheck={false} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} maxLength={50} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} maxLength={255} />
          </div>

          {profileErr && (
            <p role="alert" className="rounded-md bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]">{profileErr}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? 'Saving…' : 'Save profile'}
            </Button>
            {profileSaved && (
              <span className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--success))]">
                <Check className="size-4" aria-hidden /> Saved
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Password */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="size-5 text-[hsl(var(--primary))]" aria-hidden />
          <h2 className="font-display text-lg font-bold">Password</h2>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!pwMismatch) savePassword.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="current_password">Current password</Label>
            <Input id="current_password" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password_confirmation">Confirm new password</Label>
              <Input id="password_confirmation" type="password" autoComplete="new-password" aria-invalid={pwMismatch} value={pw.password_confirmation} onChange={(e) => setPw((p) => ({ ...p, password_confirmation: e.target.value }))} />
            </div>
          </div>

          {pwMismatch && <p className="text-xs text-[hsl(var(--danger))]">Passwords don’t match.</p>}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">At least 8 characters.</p>

          {pwErr && (
            <p role="alert" className="rounded-md bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]">{pwErr}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={savePassword.isPending || pwMismatch || pw.password.length < 8}>
              {savePassword.isPending ? 'Updating…' : 'Update password'}
            </Button>
            {pwSaved && (
              <span className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--success))]">
                <Check className="size-4" aria-hidden /> Password changed
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
