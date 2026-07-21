<?php

namespace App\Services;

use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use App\Models\RecipeItem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The "smart" inventory engine.
 *
 * Instead of just counting stock, it answers "how many of each drink can we still
 * make?" from the recipes, exposes the limiting ingredient, and drives automatic
 * product availability + low-stock warnings. Stock is auto-deducted when an order
 * is completed.
 */
class InventoryService
{
    public const AVAILABILITY_CACHE = 'inventory.availability';

    /**
     * Per-product availability, keyed by product id:
     *   [ productId => ['max_producible' => int|null, 'is_sold_out' => bool, 'limiting_ingredient' => ?string] ]
     *
     * max_producible is null when the product has no recipe (stock not tracked → always available).
     */
    public function availabilityMap(): array
    {
        return Cache::rememberForever(self::AVAILABILITY_CACHE, function () {
            $stock = Ingredient::query()->pluck('stock_quantity', 'id')
                ->map(fn ($q) => (float) $q);
            $names = Ingredient::query()->pluck('name', 'id');

            $recipes = RecipeItem::query()->get(['product_id', 'ingredient_id', 'quantity'])
                ->groupBy('product_id');

            $soldOut = Product::query()->pluck('manual_sold_out', 'id');

            $map = [];
            foreach ($soldOut as $productId => $manual) {
                $items = $recipes->get($productId);

                if (! $items || $items->isEmpty()) {
                    $map[$productId] = [
                        'max_producible' => null,
                        'is_sold_out' => (bool) $manual,
                        'limiting_ingredient' => null,
                    ];
                    continue;
                }

                $producible = PHP_INT_MAX;
                $limiting = null;
                foreach ($items as $item) {
                    $per = (float) $item->quantity;
                    if ($per <= 0) {
                        continue;
                    }
                    $have = $stock->get($item->ingredient_id, 0.0);
                    $canMake = (int) floor($have / $per);
                    if ($canMake < $producible) {
                        $producible = $canMake;
                        $limiting = $names->get($item->ingredient_id);
                    }
                }
                if ($producible === PHP_INT_MAX) {
                    $producible = null; // recipe had only zero-quantity rows
                    $limiting = null;
                }

                $map[$productId] = [
                    'max_producible' => $producible,
                    'is_sold_out' => (bool) $manual || ($producible !== null && $producible <= 0),
                    'limiting_ingredient' => $producible === 0 ? $limiting : $limiting,
                ];
            }

            return $map;
        });
    }

    public function availabilityFor(Product $product): array
    {
        return $this->availabilityMap()[$product->id] ?? [
            'max_producible' => null, 'is_sold_out' => (bool) $product->manual_sold_out, 'limiting_ingredient' => null,
        ];
    }

    /** Traffic-light status for a single ingredient. */
    public static function statusColor(Ingredient $ingredient): string
    {
        $stock = (float) $ingredient->stock_quantity;
        $threshold = (float) $ingredient->low_stock_threshold;

        if ($stock <= 0) {
            return 'red';
        }
        if ($threshold > 0 && $stock <= $threshold) {
            return 'orange';
        }
        if ($threshold > 0 && $stock <= $threshold * 2) {
            return 'yellow';
        }

        return 'green';
    }

    /** Ingredients at or below their low-stock threshold, worst first. */
    public function lowStock(): \Illuminate\Support\Collection
    {
        return Ingredient::query()->where('is_active', true)->get()
            ->filter(fn (Ingredient $i) => $i->isLow())
            ->sortBy(fn (Ingredient $i) => (float) $i->low_stock_threshold > 0
                ? (float) $i->stock_quantity / (float) $i->low_stock_threshold
                : 0)
            ->values();
    }

    /**
     * Deduct all ingredients (recipe + chosen add-on options) for a completed order.
     * Idempotent: guarded by orders.inventory_deducted.
     */
    public function deductForOrder(Order $order): void
    {
        if ($order->inventory_deducted) {
            return;
        }

        DB::transaction(function () use ($order) {
            $order->loadMissing('items');

            foreach ($order->items as $item) {
                if (! $item->product_id) {
                    continue;
                }

                // Base recipe consumption.
                $recipe = RecipeItem::where('product_id', $item->product_id)->get();
                foreach ($recipe as $ri) {
                    Ingredient::where('id', $ri->ingredient_id)
                        ->decrement('stock_quantity', (float) $ri->quantity * $item->quantity);
                }

                // Add-on option consumption (e.g. Pearls, Extra Shot).
                foreach ((array) $item->options as $opt) {
                    if (! empty($opt['consumes_ingredient_id']) && ! empty($opt['consume_quantity'])) {
                        Ingredient::where('id', $opt['consumes_ingredient_id'])
                            ->decrement('stock_quantity', (float) $opt['consume_quantity'] * $item->quantity);
                    }
                }
            }

            $order->forceFill(['inventory_deducted' => true])->save();
        });

        $this->flush();
    }

    public function flush(): void
    {
        Cache::forget(self::AVAILABILITY_CACHE);
        Cache::forget('catalog.menu');
    }
}
