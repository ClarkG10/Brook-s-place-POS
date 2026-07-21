<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsAndDashboardTest extends TestCase
{
    use RefreshDatabase;

    /** Place and complete an order so reports have data. Exercises MySQL DATE()/HOUR(). */
    private function completeAnOrder(): void
    {
        $product = Product::where('slug', 'americano')->firstOrFail();
        $this->postJson('/api/public/orders', ['items' => [['product_id' => $product->id, 'quantity' => 2]]]);
        $order = Order::latest()->first();
        $this->actingAs($this->staff('barista'), 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertOk();
    }

    public function test_sales_report_returns_full_breakdown(): void
    {
        $this->seedStore();
        $this->completeAnOrder();

        $res = $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/reports/sales')
            ->assertOk()
            ->assertJsonStructure([
                'range' => ['from', 'to'],
                'summary' => ['gross_sales', 'orders', 'avg_order_value', 'items_sold', 'discount', 'tax'],
                'by_day' => [['date', 'total', 'orders']],
                'by_payment',
                'by_hour',
                'top_products',
            ]);

        $this->assertSame(1, $res->json('summary.orders'));
        $this->assertSame(2, $res->json('summary.items_sold'));
        $this->assertGreaterThan(0, $res->json('summary.gross_sales'));
    }

    public function test_sales_report_respects_date_range(): void
    {
        $this->seedStore();
        $this->completeAnOrder();

        // A window entirely in the past → no completed orders.
        $res = $this->actingAs($this->staff('manager'), 'sanctum')
            ->getJson('/api/admin/reports/sales?from=2020-01-01&to=2020-01-07')->assertOk();

        $this->assertSame(0, $res->json('summary.orders'));
    }

    public function test_sales_export_streams_csv(): void
    {
        $this->seedStore();
        $this->completeAnOrder();

        $res = $this->actingAs($this->staff('manager'), 'sanctum')->get('/api/admin/reports/sales/export');
        $res->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('Order #', $res->streamedContent());
    }

    public function test_dashboard_summary_structure(): void
    {
        $this->seedStore();
        $this->completeAnOrder();

        $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'sales_today', 'orders_today', 'completed_today', 'avg_order_value',
                'active_orders', 'low_stock_count', 'top_products', 'revenue_last_7_days', 'recent_orders',
            ])
            ->assertJsonCount(7, 'revenue_last_7_days');
    }
}
