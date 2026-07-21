<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorefrontTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_settings_are_available_without_auth(): void
    {
        $this->seed(\Database\Seeders\StoreSettingsSeeder::class);

        $this->getJson('/api/public/settings')
            ->assertOk()
            ->assertJsonStructure(['shop_name', 'currency_symbol', 'theme' => ['palette', 'tokens']]);
    }

    public function test_public_menu_lists_categories_and_products(): void
    {
        $this->seedStore();

        $res = $this->getJson('/api/public/menu')->assertOk()
            ->assertJsonStructure(['categories' => [['id', 'name', 'products' => [['id', 'name', 'base_price', 'is_sold_out']]]]]);

        $this->assertNotEmpty($res->json('categories'));
    }

    public function test_customer_can_place_an_order(): void
    {
        $this->seedStore();
        $product = Product::where('slug', 'americano')->firstOrFail();

        $res = $this->postJson('/api/public/orders', [
            'table_number' => '5',
            'customer_name' => 'Sam',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        $res->assertCreated()
            ->assertJsonStructure(['order_number', 'status', 'table_number', 'total', 'placed_at'])
            ->assertJsonPath('status', 'incoming')
            ->assertJsonPath('table_number', '5');

        $this->assertMatchesRegularExpression('/^BP-\d{6}-\d{4}$/', $res->json('order_number'));
        $this->assertDatabaseHas('order_items', ['product_name' => $product->name, 'quantity' => 2]);
    }

    public function test_order_status_returns_receipt_details_with_images(): void
    {
        $this->seedStore();
        $product = Product::where('slug', 'americano')->firstOrFail();
        $product->update(['image_url' => 'https://cdn.test/americano.png']);

        $place = $this->postJson('/api/public/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();

        $this->getJson("/api/public/orders/{$place->json('order_number')}/status")
            ->assertOk()
            ->assertJsonStructure(['order_number', 'status', 'total', 'items' => [['product_name', 'image_url', 'quantity', 'unit_price', 'line_total', 'options']]])
            ->assertJsonPath('items.0.image_url', 'https://cdn.test/americano.png')
            ->assertJsonPath('items.0.line_total', fn ($v) => (float) $v === 100.0);
    }

    public function test_option_pricing_is_computed_server_side(): void
    {
        $this->seedStore();
        $product = Product::with('optionGroups.options')->where('slug', 'americano')->firstOrFail();
        $large = $this->optionNamed($product, 'Large');   // +20
        $shot = $this->optionNamed($product, 'Extra Shot'); // +25

        $res = $this->postJson('/api/public/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'option_ids' => [$large->id, $shot->id]]],
        ])->assertCreated();

        // base 100 + 20 + 25 = 145 (tax inclusive → total equals subtotal)
        $this->assertEquals(145.0, $res->json('total'));
    }

    public function test_invalid_option_is_rejected(): void
    {
        $this->seedStore();
        $product = Product::where('slug', 'americano')->firstOrFail();

        $this->postJson('/api/public/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'option_ids' => [999999]]],
        ])->assertStatus(422);
    }

    public function test_sold_out_product_cannot_be_ordered(): void
    {
        $this->seedStore();
        $product = Product::where('slug', 'americano')->firstOrFail();
        $product->update(['manual_sold_out' => true]);

        $this->postJson('/api/public/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertStatus(422);
    }

    private function optionNamed(Product $product, string $name)
    {
        return $product->optionGroups->flatMap->options->firstWhere('name', $name);
    }
}
