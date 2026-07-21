<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private InventoryService $inventory) {}

    /**
     * Create an order from a validated payload. All pricing is computed server-side
     * (never trusted from the client). Returns the persisted order with items.
     *
     * @param  array{source?:string, table_number?:?string, customer_name?:?string, notes?:?string,
     *               payment_method?:?string, cashier_id?:?int, discount?:float,
     *               items: array<int, array{product_id:int, quantity:int, notes?:?string, option_ids?:int[]}>}  $data
     */
    public function place(array $data): Order
    {
        $settings = Setting::current();
        $availability = $this->inventory->availabilityMap();

        return DB::transaction(function () use ($data, $settings, $availability) {
            $lines = [];
            $subtotal = 0.0;

            foreach ($data['items'] as $row) {
                $product = Product::with('optionGroups.options')->find($row['product_id']);

                if (! $product || ! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ["Product #{$row['product_id']} is unavailable."],
                    ]);
                }

                if (($availability[$product->id]['is_sold_out'] ?? false)) {
                    throw ValidationException::withMessages([
                        'items' => ["{$product->name} is sold out."],
                    ]);
                }

                $qty = max(1, (int) $row['quantity']);
                $unitPrice = (float) $product->base_price;
                $chosen = [];

                // Resolve & validate selected options against this product's groups.
                $validOptionIds = $product->optionGroups
                    ->flatMap(fn ($g) => $g->options->pluck('id'))->all();

                foreach ($row['option_ids'] ?? [] as $optionId) {
                    if (! in_array($optionId, $validOptionIds, true)) {
                        throw ValidationException::withMessages([
                            'items' => ["Invalid option for {$product->name}."],
                        ]);
                    }
                    /** @var ProductOption $option */
                    $option = $product->optionGroups->flatMap->options->firstWhere('id', $optionId);
                    $unitPrice += (float) $option->price_delta;
                    $chosen[] = [
                        'group' => $option->group->name,
                        'name' => $option->name,
                        'price_delta' => (float) $option->price_delta,
                        'consumes_ingredient_id' => $option->consumes_ingredient_id,
                        'consume_quantity' => (float) $option->consume_quantity,
                        'replaces_ingredient_id' => $option->replaces_ingredient_id,
                    ];
                }

                $lineTotal = round($unitPrice * $qty, 2);
                $subtotal += $lineTotal;

                $lines[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price' => round($unitPrice, 2),
                    'quantity' => $qty,
                    'line_total' => $lineTotal,
                    'notes' => $row['notes'] ?? null,
                    'options' => $chosen,
                ];
            }

            $discount = round((float) ($data['discount'] ?? 0), 2);
            $subtotal = round($subtotal, 2);
            $taxable = max(0, $subtotal - $discount);

            $rate = (float) $settings->tax_rate / 100;
            if ($settings->tax_inclusive) {
                $tax = $rate > 0 ? round($taxable - $taxable / (1 + $rate), 2) : 0.0;
                $taxAdd = 0.0;
            } else {
                $tax = round($taxable * $rate, 2);
                $taxAdd = $tax;
            }
            $serviceCharge = round($taxable * ((float) $settings->service_charge_rate / 100), 2);
            $total = round($taxable + $taxAdd + $serviceCharge, 2);

            $order = Order::create([
                'order_number' => $this->nextOrderNumber(),
                'source' => $data['source'] ?? 'qr',
                'table_number' => $data['table_number'] ?? null,
                'status' => 'incoming',
                'customer_name' => $data['customer_name'] ?? null,
                'notes' => $data['notes'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'service_charge' => $serviceCharge,
                'total' => $total,
                'payment_method' => $data['payment_method'] ?? null,
                'cashier_id' => $data['cashier_id'] ?? null,
                'placed_at' => now(),
            ]);

            $order->items()->createMany($lines);

            return $order->load('items');
        });
    }

    /** Human-friendly, per-day sequential order number, e.g. BP-260721-0007. */
    public function nextOrderNumber(): string
    {
        $prefix = 'BP-'.now()->format('ymd').'-';
        $todayCount = Order::whereDate('created_at', now()->toDateString())->count();

        return $prefix.str_pad((string) ($todayCount + 1), 4, '0', STR_PAD_LEFT);
    }

    /**
     * Move an order to a new status. Completing an order triggers inventory deduction.
     */
    public function transition(Order $order, string $status): Order
    {
        abort_unless(in_array($status, Order::STATUSES, true), 422, 'Invalid status');

        $order->status = $status;
        if ($status === 'completed') {
            $order->completed_at = now();
            $order->is_paid = true;
        }
        $order->save();

        if ($status === 'completed') {
            $this->inventory->deductForOrder($order);
        }

        return $order->fresh('items');
    }
}
