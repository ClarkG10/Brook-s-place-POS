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
  discount: number;
  tax: number;
  service_charge: number;
  total: number;
  payment_method: string | null;
  payment_reference: string | null;
  is_paid: boolean;
  cashier: string | null;
  placed_at: string | null;
  completed_at: string | null;
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

export interface AdminProduct {
  id: number;
  category_id: number;
  category: string | null;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  prep_time_minutes: number;
  is_active: boolean;
  is_popular: boolean;
  is_new: boolean;
  manual_sold_out: boolean;
  max_producible: number | null;
  is_sold_out: boolean;
  limiting_ingredient: string | null;
  recipe: { ingredient_id: number; ingredient: string | null; unit: string | null; quantity: number }[];
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  products_count: number;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  type: 'ingredient' | 'packaging';
  stock_quantity: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  status: 'green' | 'yellow' | 'orange' | 'red';
}

export interface MenuOption {
  id: number;
  name: string;
  price_delta: number;
  is_default: boolean;
}
export interface MenuOptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  options: MenuOption[];
}
export interface MenuProduct {
  id: number;
  category_id: number;
  name: string;
  base_price: number;
  is_sold_out: boolean;
  option_groups: MenuOptionGroup[];
}
export interface MenuCategory {
  id: number;
  name: string;
  products: MenuProduct[];
}

export interface PosOrderPayload {
  table_number?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  discount?: number;
  payment_method?: string | null;
  items: { product_id: number; quantity: number; notes?: string | null; option_ids: number[] }[];
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
  order: (id: number) => request<{ data: Order }>(`/admin/orders/${id}`).then((r) => r.data),

  // POS
  menu: () => request<{ categories: MenuCategory[] }>('/public/menu').then((r) => r.categories),
  createOrder: (payload: PosOrderPayload) =>
    request<{ data: Order }>('/admin/orders', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.data),

  // Products
  products: () => request<{ data: AdminProduct[] }>('/admin/products').then((r) => r.data),
  createProduct: (p: Record<string, unknown>) =>
    request<AdminProduct>('/admin/products', { method: 'POST', body: JSON.stringify(p) }),
  updateProduct: (id: number, p: Record<string, unknown>) =>
    request<AdminProduct>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteProduct: (id: number) => request<void>(`/admin/products/${id}`, { method: 'DELETE' }),

  // Categories
  categories: () => request<{ data: AdminCategory[] }>('/admin/categories').then((r) => r.data),

  // Inventory
  inventory: () => request<{ ingredients: Ingredient[] }>('/admin/inventory').then((r) => r.ingredients),
  createIngredient: (i: Record<string, unknown>) =>
    request<Ingredient>('/admin/inventory', { method: 'POST', body: JSON.stringify(i) }),
  updateIngredient: (id: number, i: Record<string, unknown>) =>
    request<Ingredient>(`/admin/inventory/${id}`, { method: 'PUT', body: JSON.stringify(i) }),
  restockIngredient: (id: number, quantity: number, mode: 'add' | 'set' = 'add') =>
    request<{ id: number; stock_quantity: number; status: string }>(`/admin/inventory/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify({ quantity, mode }),
    }),
};
