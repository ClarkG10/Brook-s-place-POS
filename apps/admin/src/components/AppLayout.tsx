import { applyTheme } from '@brooks/ui';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Boxes, ClipboardList, Coffee, LayoutDashboard, LogOut, Settings as SettingsIcon, ShoppingCart, UserCog, UtensilsCrossed, Users } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end: boolean;
  ownerOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pos', label: 'POS', icon: ShoppingCart, end: false },
  { to: '/orders', label: 'Orders', icon: ClipboardList, end: false },
  { to: '/products', label: 'Products', icon: UtensilsCrossed, end: false },
  { to: '/inventory', label: 'Inventory', icon: Boxes, end: false },
  { to: '/sales', label: 'Sales', icon: BarChart3, end: false },
  { to: '/account', label: 'Account', icon: UserCog, end: false },
  { to: '/staff', label: 'Staff', icon: Users, end: false, ownerOnly: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false, ownerOnly: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, setUser, clear } = useAuth();
  const navigate = useNavigate();
  // Owner-only items stay hidden until we know the role (avoids a flash for staff).
  const nav = NAV.filter((item) => !item.ownerOnly || user?.is_owner);

  // Validate the token and load the current user.
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  // Load settings so we can apply the admin palette and show the shop name.
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: api.settings });

  useEffect(() => {
    if (me.data?.user) setUser(me.data.user);
  }, [me.data, setUser]);

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) clear();
  }, [me.error, clear]);

  useEffect(() => {
    if (settings.data?.admin_theme) {
      applyTheme(settings.data.admin_theme as never);
      document.title = `Manage · ${settings.data.shop_name}`;
    }
  }, [settings.data]);

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* ignore network errors on logout */
    }
    clear();
    navigate('/', { replace: true });
  }

  const shopName = settings.data?.shop_name ?? "Brook's Place";

  return (
    <div className="flex min-h-full">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          {settings.data?.logo_url ? (
            <img src={settings.data.logo_url} alt="" className="size-9 rounded-lg object-cover" />
          ) : (
            <div className="grid size-9 place-items-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
              <Coffee className="size-5" aria-hidden />
            </div>
          )}
          <span className="truncate font-display text-sm font-bold text-[hsl(var(--foreground))]">{shopName}</span>
        </div>
        <NavLinks items={nav} />
        <div className="mt-auto border-t border-[hsl(var(--border))] pt-3">
          <div className="mb-2 px-2 text-xs">
            <p className="truncate font-medium text-[hsl(var(--foreground))]">{user?.name ?? '—'}</p>
            <p className="truncate capitalize text-[hsl(var(--muted-foreground))]">{user?.role}</p>
          </div>
          <LogoutButton onClick={logout} />
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 md:hidden">
          <span className="font-display text-sm font-bold">{shopName}</span>
          <LogoutButton onClick={logout} compact />
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="no-scrollbar fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 md:hidden">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-[4.25rem] shrink-0 grow cursor-pointer flex-col items-center gap-1 py-1 text-xs ${
                  isActive ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'
                }`
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function NavLinks({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
              isActive
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
            }`
          }
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function LogoutButton({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
    >
      <LogOut className="size-4" aria-hidden />
      {!compact && 'Sign out'}
    </button>
  );
}
