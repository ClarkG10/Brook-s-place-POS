<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_create_a_pos_order(): void
    {
        $this->seedStore();
        $cashier = $this->staff('cashier');
        $product = Product::where('slug', 'butter-croissant')->firstOrFail();

        // A single OrderResource wraps its payload in a `data` key.
        $this->actingAs($cashier, 'sanctum')->postJson('/api/admin/orders', [
            'payment_method' => 'cash',
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
        ])->assertCreated()
            ->assertJsonPath('data.source', 'pos')
            ->assertJsonPath('data.cashier', $cashier->name);

        $this->assertDatabaseHas('orders', ['source' => 'pos', 'cashier_id' => $cashier->id]);
    }

    public function test_order_index_filters_by_status(): void
    {
        $this->seedStore();
        $staff = $this->staff('barista');
        $product = Product::where('slug', 'americano')->firstOrFail();

        $this->postJson('/api/public/orders', ['items' => [['product_id' => $product->id, 'quantity' => 1]]]);
        Order::latest()->first()->update(['status' => 'ready']);

        $res = $this->actingAs($staff, 'sanctum')->getJson('/api/admin/orders?status=ready')->assertOk();
        $this->assertCount(1, $res->json('data'));
        $this->assertSame('ready', $res->json('data.0.status'));

        $this->actingAs($staff, 'sanctum')->getJson('/api/admin/orders?status=incoming')
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_completing_an_order_deducts_inventory_and_logs_it(): void
    {
        $this->seedStore();
        $staff = $this->staff('barista');
        $product = Product::with('optionGroups.options')->where('slug', 'americano')->firstOrFail();
        $shot = $product->optionGroups->flatMap->options->firstWhere('name', 'Extra Shot');

        $beansBefore = (float) Ingredient::where('name', 'Coffee Beans')->value('stock_quantity');

        // Americano recipe uses 18g beans; the Extra Shot add-on consumes another 18g.
        $this->postJson('/api/public/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'option_ids' => [$shot->id]]],
        ])->assertCreated();
        $order = Order::latest()->first();

        $this->actingAs($staff, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertOk()->assertJsonPath('data.status', 'completed');

        $beansAfter = (float) Ingredient::where('name', 'Coffee Beans')->value('stock_quantity');
        $this->assertEqualsWithDelta($beansBefore - 36, $beansAfter, 0.001);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'inventory_deducted' => true, 'is_paid' => true]);
        $this->assertDatabaseHas('stock_movements', ['type' => 'deduction', 'order_id' => $order->id]);
    }

    public function test_deduction_is_idempotent(): void
    {
        $this->seedStore();
        $staff = $this->staff('barista');
        $product = Product::where('slug', 'americano')->firstOrFail();

        $this->postJson('/api/public/orders', ['items' => [['product_id' => $product->id, 'quantity' => 1]]]);
        $order = Order::latest()->first();

        $this->actingAs($staff, 'sanctum')->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();
        $beans = (float) Ingredient::where('name', 'Coffee Beans')->value('stock_quantity');

        // Re-completing must not double-deduct.
        $this->actingAs($staff, 'sanctum')->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();
        $this->assertEqualsWithDelta($beans, (float) Ingredient::where('name', 'Coffee Beans')->value('stock_quantity'), 0.001);
    }

    public function test_invalid_status_is_rejected(): void
    {
        $this->seedStore();
        $staff = $this->staff('barista');
        $product = Product::where('slug', 'americano')->firstOrFail();
        $this->postJson('/api/public/orders', ['items' => [['product_id' => $product->id, 'quantity' => 1]]]);
        $order = Order::latest()->first();

        $this->actingAs($staff, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'teleported'])
            ->assertStatus(422);
    }
}
