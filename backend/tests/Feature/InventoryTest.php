<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\ProductOptionGroup;
use App\Models\RecipeItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_list_inventory_with_status(): void
    {
        $this->seedStore();

        $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/inventory')
            ->assertOk()
            ->assertJsonStructure(['ingredients' => [['id', 'name', 'unit', 'stock_quantity', 'status']]]);
    }

    public function test_creating_an_ingredient_logs_initial_stock(): void
    {
        $manager = $this->staff('manager');

        $this->actingAs($manager, 'sanctum')->postJson('/api/admin/inventory', [
            'name' => 'Vanilla Syrup', 'unit' => 'ml', 'type' => 'ingredient',
            'stock_quantity' => 1000, 'low_stock_threshold' => 200, 'cost_per_unit' => 0.05,
        ])->assertCreated();

        $this->assertDatabaseHas('ingredients', ['name' => 'Vanilla Syrup']);
        $this->assertDatabaseHas('stock_movements', ['type' => 'adjustment', 'note' => 'Initial stock']);
    }

    public function test_restock_add_and_set_modes(): void
    {
        $manager = $this->staff('manager');
        $ing = Ingredient::create(['name' => 'Milk', 'unit' => 'ml', 'type' => 'ingredient', 'stock_quantity' => 100, 'low_stock_threshold' => 50, 'cost_per_unit' => 0.05, 'is_active' => true]);

        $add = $this->actingAs($manager, 'sanctum')->postJson("/api/admin/inventory/{$ing->id}/restock", ['quantity' => 50, 'mode' => 'add'])->assertOk();
        $this->assertEquals(150, $add->json('stock_quantity'));

        $set = $this->actingAs($manager, 'sanctum')->postJson("/api/admin/inventory/{$ing->id}/restock", ['quantity' => 25, 'mode' => 'set'])->assertOk();
        $this->assertEquals(25, $set->json('stock_quantity'));

        $this->assertDatabaseHas('stock_movements', ['ingredient_id' => $ing->id, 'type' => 'restock']);
        $this->assertDatabaseHas('stock_movements', ['ingredient_id' => $ing->id, 'type' => 'adjustment']);
    }

    public function test_low_stock_endpoint(): void
    {
        $this->seedStore(); // Tapioca Pearls seeded at 400 with threshold 500 → low
        $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/inventory/low-stock')
            ->assertOk()->assertJsonPath('ingredients.0.name', 'Tapioca Pearls');
    }

    public function test_inventory_logs_are_paginated(): void
    {
        $this->seedStore();
        $ing = Ingredient::first();
        $this->actingAs($this->staff('manager'), 'sanctum')->postJson("/api/admin/inventory/{$ing->id}/restock", ['quantity' => 10]);

        // Raw LengthAwarePaginator serializes with top-level current_page/total (no 'meta' wrapper).
        $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/inventory/logs')
            ->assertOk()->assertJsonStructure(['data' => [['id', 'type', 'quantity_delta', 'balance_after']], 'current_page', 'total']);
    }

    public function test_ingredient_can_be_deleted(): void
    {
        $manager = $this->staff('manager');
        $ing = Ingredient::create(['name' => 'Temp', 'unit' => 'g', 'type' => 'ingredient', 'stock_quantity' => 0, 'low_stock_threshold' => 0, 'cost_per_unit' => 0, 'is_active' => true]);

        $this->actingAs($manager, 'sanctum')->deleteJson("/api/admin/inventory/{$ing->id}")->assertNoContent();
        $this->assertDatabaseMissing('ingredients', ['id' => $ing->id]);
    }

    public function test_analytics_reports_usage_cost_and_projections(): void
    {
        $this->seedStore();
        $staff = $this->staff('barista');
        $product = \App\Models\Product::where('slug', 'americano')->firstOrFail();

        // Complete an order so there are deduction movements to analyse.
        $this->postJson('/api/public/orders', ['items' => [['product_id' => $product->id, 'quantity' => 2]]]);
        $order = Order::latest()->first();
        $this->actingAs($staff, 'sanctum')->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();

        $res = $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/inventory/analytics')
            ->assertOk()
            ->assertJsonStructure([
                'range' => ['from', 'to'],
                'summary' => ['consumption_cost', 'restock_cost', 'current_stock_value', 'tracked_ingredients', 'low_stock_count'],
                'top_consumed' => [['name', 'unit', 'quantity', 'cost']],
                'by_day' => [['date', 'cost']],
                'movements' => ['deduction', 'restock', 'adjustment'],
                'projections' => [['name', 'unit', 'stock_quantity', 'avg_daily_use', 'days_left']],
            ]);

        // Coffee Beans were consumed (18g × 2), so they surface in usage + projections.
        $this->assertGreaterThan(0, $res->json('summary.consumption_cost'));
        $this->assertGreaterThan(0, $res->json('summary.current_stock_value'));
        $this->assertContains('Coffee Beans', array_column($res->json('top_consumed'), 'name'));
        $this->assertGreaterThanOrEqual(1, $res->json('movements.deduction'));
    }

    public function test_analytics_is_empty_without_movements(): void
    {
        $this->seedStore();

        $res = $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/inventory/analytics')->assertOk();

        $this->assertEquals(0, $res->json('summary.consumption_cost'));
        $this->assertCount(0, $res->json('top_consumed'));
        $this->assertGreaterThan(0, $res->json('summary.current_stock_value')); // seeded stock still has value
    }

    /**
     * Ingredient replacement: an option with replaces_ingredient_id skips the base
     * ingredient it replaces and consumes its own instead (e.g. oat milk swaps out milk).
     */
    public function test_option_replacement_skips_base_ingredient_on_deduction(): void
    {
        $staff = $this->staff('barista');

        $milk = Ingredient::create(['name' => 'Milk', 'unit' => 'ml', 'type' => 'ingredient', 'stock_quantity' => 1000, 'low_stock_threshold' => 100, 'cost_per_unit' => 0.05, 'is_active' => true]);
        $oat = Ingredient::create(['name' => 'Oat Milk', 'unit' => 'ml', 'type' => 'ingredient', 'stock_quantity' => 1000, 'low_stock_threshold' => 100, 'cost_per_unit' => 0.09, 'is_active' => true]);
        $cat = Category::create(['name' => 'Latte', 'slug' => 'latte', 'sort_order' => 0, 'is_active' => true]);
        $product = Product::create(['category_id' => $cat->id, 'name' => 'Latte', 'slug' => 'latte-x', 'base_price' => 100, 'prep_time_minutes' => 5, 'is_active' => true]);
        RecipeItem::create(['product_id' => $product->id, 'ingredient_id' => $milk->id, 'quantity' => 200]);

        $group = ProductOptionGroup::create(['product_id' => $product->id, 'name' => 'Milk', 'min_select' => 0, 'max_select' => 1, 'is_required' => false, 'sort_order' => 0]);
        $oatOption = ProductOption::create([
            'option_group_id' => $group->id, 'name' => 'Oat Milk', 'price_delta' => 20, 'is_default' => false, 'sort_order' => 0,
            'consumes_ingredient_id' => $oat->id, 'consume_quantity' => 200, 'replaces_ingredient_id' => $milk->id,
        ]);

        $this->postJson('/api/public/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'option_ids' => [$oatOption->id]]],
        ])->assertCreated();
        $order = Order::latest()->first();

        $this->actingAs($staff, 'sanctum')->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();

        // Milk untouched (replaced), Oat Milk consumed 200.
        $this->assertEqualsWithDelta(1000, (float) $milk->fresh()->stock_quantity, 0.001);
        $this->assertEqualsWithDelta(800, (float) $oat->fresh()->stock_quantity, 0.001);
    }
}
