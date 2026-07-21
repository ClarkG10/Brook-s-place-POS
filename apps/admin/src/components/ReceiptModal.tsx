import { Button } from '@brooks/ui';
import { Printer, X } from 'lucide-react';
import { dateTime } from '../lib/format';
import type { AdminSettings, Order } from '../lib/api';

/** Print-friendly receipt. The @media print rules in index.css isolate `.receipt-print`. */
export function ReceiptModal({
  order,
  settings,
  onClose,
}: {
  order: Order;
  settings: AdminSettings;
  onClose: () => void;
}) {
  const sym = settings.currency_symbol;
  const money = (n: number) => `${sym}${n.toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] bg-[hsl(var(--card))] shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-[hsl(var(--border))] p-4">
          <h2 className="font-display text-sm font-bold">Receipt · {order.order_number}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Printable area */}
        <div className="receipt-print max-h-[60vh] overflow-y-auto p-5 text-sm">
          <div className="text-center">
            <p className="font-display text-base font-bold">{settings.receipt_header || settings.shop_name}</p>
            {settings.tagline && <p className="text-xs text-[hsl(var(--muted-foreground))]">{settings.tagline}</p>}
          </div>

          <div className="my-3 border-y border-dashed border-[hsl(var(--border))] py-2 text-xs">
            <div className="flex justify-between">
              <span>Order</span>
              <span className="font-semibold">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>{order.table_number ? 'Table' : 'Type'}</span>
              <span>{order.table_number ?? order.source.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{dateTime(order.placed_at ?? order.created_at)}</span>
            </div>
            {order.cashier && (
              <div className="flex justify-between">
                <span>Cashier</span>
                <span>{order.cashier}</span>
              </div>
            )}
          </div>

          <ul className="space-y-1.5">
            {order.items.map((item) => (
              <li key={item.id}>
                <div className="flex justify-between gap-2">
                  <span>
                    {item.quantity}× {item.product_name}
                  </span>
                  <span className="tabular-nums">{money(item.line_total)}</span>
                </div>
                {item.options.length > 0 && (
                  <p className="pl-4 text-xs text-[hsl(var(--muted-foreground))]">
                    {item.options.map((o) => o.name).join(', ')}
                  </p>
                )}
                {item.notes && <p className="pl-4 text-xs italic text-[hsl(var(--muted-foreground))]">“{item.notes}”</p>}
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-1 border-t border-dashed border-[hsl(var(--border))] pt-2 text-xs">
            <Row label="Subtotal" value={money(order.subtotal)} />
            {order.discount > 0 && <Row label="Discount" value={`-${money(order.discount)}`} />}
            <Row label="Total" value={money(order.total)} bold />
            {order.payment_method && <Row label="Paid via" value={order.payment_method.toUpperCase()} />}
          </div>

          {settings.receipt_footer && (
            <p className="mt-3 text-center text-xs text-[hsl(var(--muted-foreground))]">{settings.receipt_footer}</p>
          )}
        </div>

        <div className="no-print flex gap-2 border-t border-[hsl(var(--border))] p-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Print
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
