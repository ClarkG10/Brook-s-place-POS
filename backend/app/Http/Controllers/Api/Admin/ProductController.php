<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\CatalogService;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function __construct(
        private CatalogService $catalog,
        private InventoryService $inventory,
    ) {}

    /** All products (including inactive), with recipe + live availability. */
    public function index(): JsonResponse
    {
        $availability = $this->inventory->availabilityMap();

        $products = Product::query()
            ->with(['category', 'recipeItems.ingredient', 'optionGroups.options'])
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Product $p) => $this->present($p, $availability));

        return response()->json(['data' => $products]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateProduct($request);
        $data['slug'] = $this->uniqueSlug($data['name']);

        $product = Product::create($data);
        $this->syncRecipe($product, $request);
        $this->syncOptionGroups($product, $request);
        $this->flush();

        return response()->json($this->present($product->fresh(['category', 'recipeItems.ingredient', 'optionGroups.options']), $this->inventory->availabilityMap()), 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validateProduct($request);
        $product->update($data);
        $this->syncRecipe($product, $request);
        $this->syncOptionGroups($product, $request);
        $this->flush();

        return response()->json($this->present($product->fresh(['category', 'recipeItems.ingredient', 'optionGroups.options']), $this->inventory->availabilityMap()));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();
        $this->flush();

        return response()->json(null, 204);
    }

    private function validateProduct(Request $request): array
    {
        return $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'prep_time_minutes' => ['nullable', 'integer', 'min:0', 'max:120'],
            'is_active' => ['boolean'],
            'is_popular' => ['boolean'],
            'is_new' => ['boolean'],
            'manual_sold_out' => ['boolean'],
            // Optional recipe sync: [{ ingredient_id, quantity }]
            'recipe' => ['sometimes', 'array'],
            'recipe.*.ingredient_id' => ['required_with:recipe', 'exists:ingredients,id'],
            'recipe.*.quantity' => ['required_with:recipe', 'numeric', 'min:0'],
            // Optional customization sync: option groups with options (each option can consume stock)
            'option_groups' => ['sometimes', 'array'],
            'option_groups.*.name' => ['required', 'string', 'max:60'],
            'option_groups.*.min_select' => ['nullable', 'integer', 'min:0'],
            'option_groups.*.max_select' => ['nullable', 'integer', 'min:1'],
            'option_groups.*.is_required' => ['boolean'],
            'option_groups.*.options' => ['required', 'array', 'min:1'],
            'option_groups.*.options.*.name' => ['required', 'string', 'max:60'],
            'option_groups.*.options.*.price_delta' => ['nullable', 'numeric'],
            'option_groups.*.options.*.is_default' => ['boolean'],
            'option_groups.*.options.*.consumes_ingredient_id' => ['nullable', 'exists:ingredients,id'],
            'option_groups.*.options.*.consume_quantity' => ['nullable', 'numeric', 'min:0'],
        ]);
    }

    private function syncOptionGroups(Product $product, Request $request): void
    {
        if (! $request->has('option_groups')) {
            return;
        }
        $product->optionGroups()->delete(); // cascade removes their options
        foreach ($request->input('option_groups', []) as $gi => $g) {
            $group = $product->optionGroups()->create([
                'name' => $g['name'],
                'min_select' => $g['min_select'] ?? 0,
                'max_select' => $g['max_select'] ?? 1,
                'is_required' => $g['is_required'] ?? false,
                'sort_order' => $gi,
            ]);
            foreach ($g['options'] ?? [] as $oi => $o) {
                $group->options()->create([
                    'name' => $o['name'],
                    'price_delta' => $o['price_delta'] ?? 0,
                    'is_default' => $o['is_default'] ?? false,
                    'sort_order' => $oi,
                    'consumes_ingredient_id' => $o['consumes_ingredient_id'] ?? null,
                    'consume_quantity' => $o['consume_quantity'] ?? 0,
                ]);
            }
        }
    }

    private function syncRecipe(Product $product, Request $request): void
    {
        if (! $request->has('recipe')) {
            return;
        }
        $product->recipeItems()->delete();
        foreach ($request->input('recipe', []) as $row) {
            $product->recipeItems()->create([
                'ingredient_id' => $row['ingredient_id'],
                'quantity' => $row['quantity'],
            ]);
        }
    }

    private function present(Product $p, array $availability): array
    {
        $avail = $availability[$p->id] ?? ['max_producible' => null, 'is_sold_out' => (bool) $p->manual_sold_out, 'limiting_ingredient' => null];

        return [
            'id' => $p->id,
            'category_id' => $p->category_id,
            'category' => $p->category?->name,
            'name' => $p->name,
            'slug' => $p->slug,
            'description' => $p->description,
            'image_url' => $p->image_url,
            'base_price' => (float) $p->base_price,
            'prep_time_minutes' => $p->prep_time_minutes,
            'is_active' => $p->is_active,
            'is_popular' => $p->is_popular,
            'is_new' => $p->is_new,
            'manual_sold_out' => $p->manual_sold_out,
            'max_producible' => $avail['max_producible'],
            'is_sold_out' => $avail['is_sold_out'],
            'limiting_ingredient' => $avail['limiting_ingredient'],
            'recipe' => $p->recipeItems->map(fn ($r) => [
                'ingredient_id' => $r->ingredient_id,
                'ingredient' => $r->ingredient?->name,
                'unit' => $r->ingredient?->unit,
                'quantity' => (float) $r->quantity,
            ]),
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
                    'consumes_ingredient_id' => $o->consumes_ingredient_id,
                    'consume_quantity' => (float) $o->consume_quantity,
                ]),
            ]),
        ];
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;
        while (Product::where('slug', $slug)->exists()) {
            $slug = "{$base}-".++$i;
        }

        return $slug;
    }

    private function flush(): void
    {
        $this->catalog->flush();
        $this->inventory->flush();
    }
}
