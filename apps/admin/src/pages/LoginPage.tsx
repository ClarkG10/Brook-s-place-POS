import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@brooks/ui';
import { useMutation } from '@tanstack/react-query';
import { Coffee } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const setSession = useAuth((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (v: FormValues) => api.login(v.email, v.password),
    onSuccess: ({ token, user }) => setSession(token, user),
  });

  const serverError = login.error instanceof ApiError ? login.error.message : null;

  return (
    <div className="grid min-h-full place-items-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
            <Coffee className="size-7" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[hsl(var(--foreground))]">Management Portal</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Sign in to manage your shop</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((v) => login.mutate(v))}
          className="space-y-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p className="text-xs text-[hsl(var(--danger))]">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-[hsl(var(--danger))]">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p role="alert" className="rounded-md bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]">
              {serverError}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign In'}
          </Button>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
            Demo: owner@brooks.place / password
          </p>
        </form>
      </div>
    </div>
  );
}
