export interface ResolvedTheme {
  palette: string;
  label?: string;
  mode?: 'light' | 'dark' | 'system';
  tokens: Record<string, string>;
}

export interface StoreSettings {
  shop_name: string;
  tagline: string | null;
  logo_url: string | null;
  currency_code: string;
  currency_symbol: string;
  theme: ResolvedTheme;
}

export interface ProductOption {
  id: number;
  name: string;
  price_delta: number;
  is_default: boolean;
}

export interface OptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  options: ProductOption[];
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  prep_time_minutes: number;
  is_popular: boolean;
  is_new: boolean;
  is_sold_out: boolean;
  max_producible: number | null;
  option_groups: OptionGroup[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  color: string | null;
  products: Product[];
}

export interface PlacedOrder {
  order_number: string;
  status: string;
  table_number: string | null;
  total: number;
  placed_at: string;
}

export interface OrderStatus extends PlacedOrder {
  items: { product_name: string; quantity: number; options: string[]; notes: string | null }[];
}
