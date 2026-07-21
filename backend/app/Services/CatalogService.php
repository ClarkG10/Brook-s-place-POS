<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Facades\Cache;

/**
 * Builds the customer-facing menu payload (categories -> products -> option groups),
 * with live availability merged in. Cached under a single key and invalidated whenever
 * catalog or inventory data changes.
 */
class CatalogService
{
    public const CACHE_KEY = 'catalog.menu';

    public function __construct(private InventoryService $inventory) {}

    public function menu(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $availability = $this->inventory->availabilityMap();

            $categories = Category::query()
                ->active()
                ->with(['products' => function ($q) {
                    $q->where('is_active', true)->orderBy('sort_order')
                        ->with(['optionGroups' => fn ($g) => $g->orderBy('sort_order')->with('options')]);
                }])
                ->orderBy('sort_order')
                ->get();

            return $categories->map(function (Category $category) use ($availability) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'icon' => $category->icon,
                    'image_url' => $category->image_url,
                    'color' => $category->color,
                    'products' => $category->products->map(function ($p) use ($availability) {
                        $avail = $availability[$p->id] ?? ['max_producible' => null, 'is_sold_out' => false, 'limiting_ingredient' => null];

                        return [
                            'id' => $p->id,
                            'category_id' => $p->category_id,
                            'name' => $p->name,
                            'slug' => $p->slug,
                            'description' => $p->description,
                            'base_price' => (float) $p->base_price,
                            'image_url' => $p->image_url,
                            'prep_time_minutes' => $p->prep_time_minutes,
                            'is_popular' => $p->is_popular,
                            'is_new' => $p->is_new,
                            'is_sold_out' => $avail['is_sold_out'],
                            'max_producible' => $avail['max_producible'],
                            'limiting_ingredient' => $avail['limiting_ingredient'],
                            'option_groups' => $p->optionGroups->map(fn ($g) => [
                                'id' => $g->id,
                                'name' => $g->name,
                                'min_select' => $g->min_select,
                                'max_select' => $g->max_select,
                                'is_required' => $g->is_required,
                                'options' => $g->options->map(fn ($o) => [
                                    'id' => $o->id,
                                    'name' => $o->name,
                                    'price_delta' => (float) $o->price_delta,
                                    'is_default' => $o->is_default,
                                ])->all(),
                            ])->all(),
                        ];
                    })->all(),
                ];
            })->all();
        });
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
