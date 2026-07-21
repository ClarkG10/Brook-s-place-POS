<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Ingredient;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_products_with_recipe_and_availability(): void
    {
        $this->seedStore();

        $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/products')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'base_price', 'max_producible', 'is_sold_out', 'recipe', 'option_groups']]]);
    }

    public function test_create_product_with_recipe_and_options(): void
    {
        $manager = $this->staff('manager');
        $cat = Category::create(['name' => 'Coffee', 'slug' => 'coffee', 'sort_order' => 0, 'is_active' => true]);
        $beans = Ingredient::create(['name' => 'Beans', 'unit' => 'g', 'type' => 'ingredient', 'stock_quantity' => 1000, 'low_stock_threshold' => 100, 'cost_per_unit' => 1, 'is_active' => true]);

        $res = $this->actingAs($manager, 'sanctum')->postJson('/api/admin/products', [
            'category_id' => $cat->id,
            'name' => 'Test Latte',
            'base_price' => 120,
            'prep_time_minutes' => 5,
            'recipe' => [['ingredient_id' => $beans->id, 'quantity' => 18]],
            'option_groups' => [[
                'name' => 'Size', 'min_select' => 1, 'max_select' => 1, 'is_required' => true,
                'options' => [
                    ['name' => 'Small', 'price_delta' => -10, 'is_default' => false],
                    ['name' => 'Large', 'price_delta' => 20, 'is_default' => true, 'consumes_ingredient_id' => $beans->id, 'consume_quantity' => 5],
                ],
            ]],
        ])->assertCreated();

        $productId = $res->json('id');
        $this->assertDatabaseHas('products', ['name' => 'Test Latte', 'slug' => 'test-latte']);
        $this->assertDatabaseHas('recipe_items', ['product_id' => $productId, 'ingredient_id' => $beans->id]);
        $this->assertDatabaseHas('product_option_groups', ['product_id' => $productId, 'name' => 'Size']);
        $this->assertCount(2, $res->json('option_groups.0.options'));
    }

    public function test_update_resyncs_recipe(): void
    {
        $this->seedStore();
        $manager = $this->staff('manager');
        $product = Product::where('slug', 'americano')->firstOrFail();
        $beans = Ingredient::where('name', 'Coffee Beans')->firstOrFail();

        $this->actingAs($manager, 'sanctum')->putJson("/api/admin/products/{$product->id}", [
            'category_id' => $product->category_id,
            'name' => $product->name,
            'base_price' => 105,
            'recipe' => [['ingredient_id' => $beans->id, 'quantity' => 22]],
        ])->assertOk()->assertJsonPath('base_price', fn ($v) => (float) $v === 105.0);

        $this->assertDatabaseHas('recipe_items', ['product_id' => $product->id, 'ingredient_id' => $beans->id, 'quantity' => 22]);
        $this->assertSame(1, $product->recipeItems()->count());
    }

    public function test_create_validates_required_fields(): void
    {
        $this->actingAs($this->staff('manager'), 'sanctum')->postJson('/api/admin/products', [])
            ->assertStatus(422)->assertJsonValidationErrors(['category_id', 'name', 'base_price']);
    }

    public function test_product_can_be_deleted(): void
    {
        $this->seedStore();
        $product = Product::where('slug', 'americano')->firstOrFail();

        $this->actingAs($this->staff('manager'), 'sanctum')->deleteJson("/api/admin/products/{$product->id}")
            ->assertNoContent();
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }
}
