import { getToken, type AdminUser } from './auth';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (res.status === 401) throw new ApiError(401, 'Session expired. Please sign in again.');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Types ----
export interface Palette {
  key: string;
  label: string;
  tokens: Record<string, string>;
}

export interface AdminSettings {
  shop_name: string;
  tagline: string | null;
  logo_url: string | null;
  currency_code: string;
  currency_symbol: string;
  tax_rate: number;
  tax_inclusive: boolean;
  service_charge_rate: number;
  receipt_header: string | null;
  receipt_footer: string | null;
  public_theme: { palette: string; label?: string; mode?: string; tokens: Record<string, string> };
  admin_theme: { palette: string; label?: string; mode?: string; tokens: Record<string, string> };
  palettes: { public: Palette[]; admin: Palette[] };
}

export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
  options: { group: string; name: string; price_delta: number }[];
}

export interface Order {
  id: number;
  order_number: string;
  source: string;
  table_number: string | null;
  status: 'incoming' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  customer_name: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  payment_method: string | null;
  is_paid: boolean;
  placed_at: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface DashboardSummary {
  sales_today: number;
  orders_today: number;
  completed_today: number;
  avg_order_value: number;
  active_orders: number;
  low_stock_count: number;
  top_products: { name: string; quantity: number }[];
  revenue_last_7_days: { date: string; total: number }[];
  recent_orders: { data: Order[] };
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, device_name: 'admin-portal' }),
    }),
  me: () => request<{ user: AdminUser }>('/auth/me'),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  dashboard: () => request<DashboardSummary>('/admin/dashboard'),
  settings: () => request<AdminSettings>('/admin/settings'),
  updateSettings: (payload: Record<string, unknown>) =>
    request<AdminSettings>('/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),

  orders: (status?: string) =>
    request<{ data: Order[] }>(`/admin/orders${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (id: number, status: string) =>
    request<{ data: Order }>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
