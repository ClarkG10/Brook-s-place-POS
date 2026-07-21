import { create } from 'zustand';
import type { Product, ProductOption } from '../lib/types';

export interface ChosenOption {
  groupId: number;
  groupName: string;
  option: ProductOption;
}

export interface CartLine {
  id: string;
  product: Product;
  options: ChosenOption[];
  notes: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface CartState {
  table: string | null;
  lines: CartLine[];
  setTable: (t: string | null) => void;
  addLine: (product: Product, options: ChosenOption[], notes: string, quantity: number) => void;
  updateQty: (id: string, quantity: number) => void;
  removeLine: (id: string) => void;
  clear: () => void;
}

function unitPriceFor(product: Product, options: ChosenOption[]): number {
  return options.reduce((sum, o) => sum + o.option.price_delta, product.base_price);
}

export const useCart = create<CartState>((set) => ({
  table: null,
  lines: [],
  setTable: (t) => set({ table: t }),
  addLine: (product, options, notes, quantity) =>
    set((state) => {
      const unitPrice = unitPriceFor(product, options);
      const line: CartLine = {
        id: crypto.randomUUID(),
        product,
        options,
        notes,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
      return { lines: [...state.lines, line] };
    }),
  updateQty: (id, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((l) => l.id !== id)
          : state.lines.map((l) => (l.id === id ? { ...l, quantity, lineTotal: l.unitPrice * quantity } : l)),
    })),
  removeLine: (id) => set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),
  clear: () => set({ lines: [] }),
}));

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.lineTotal, 0);
