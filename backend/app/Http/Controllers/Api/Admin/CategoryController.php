<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\CatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function __construct(private CatalogService $catalog) {}

    public function index(): JsonResponse
    {
        $categories = Category::withCount('products')->orderBy('sort_order')->get()
            ->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'icon' => $c->icon,
                'color' => $c->color,
                'sort_order' => $c->sort_order,
                'is_active' => $c->is_active,
                'products_count' => $c->products_count,
            ]);

        return response()->json(['data' => $categories]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(4));
        $category = Category::create($data);
        $this->catalog->flush();

        return response()->json($category, 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $category->update($this->validated($request));
        $this->catalog->flush();

        return response()->json($category);
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->delete();
        $this->catalog->flush();

        return response()->json(null, 204);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'icon' => ['nullable', 'string', 'max:40'],
            'color' => ['nullable', 'string', 'max:20'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);
    }
}
