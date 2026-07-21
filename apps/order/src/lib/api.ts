import type { Category, OrderStatus, PlacedOrder, StoreSettings } from './types';

// In dev, Vite proxies /api -> Laravel. In prod, set VITE_API_URL to the API origin.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api/public${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`, body);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export interface CartLinePayload {
  product_id: number;
  quantity: number;
  notes?: string | null;
  option_ids: number[];
}

export const api = {
  settings: () => request<StoreSettings>('/settings'),
  menu: () => request<{ categories: Category[] }>('/menu').then((r) => r.categories),
  placeOrder: (payload: {
    table_number?: string | null;
    customer_name?: string | null;
    notes?: string | null;
    items: CartLinePayload[];
  }) => request<PlacedOrder>('/orders', { method: 'POST', body: JSON.stringify({ source: 'qr', ...payload }) }),
  orderStatus: (orderNumber: string) => request<OrderStatus>(`/orders/${orderNumber}/status`),
};
