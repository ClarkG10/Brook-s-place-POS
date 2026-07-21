<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    public function summary(): JsonResponse
    {
        $today = now()->startOfDay();

        $completedToday = Order::where('status', 'completed')
            ->where('completed_at', '>=', $today);

        $salesToday = (float) (clone $completedToday)->sum('total');
        $completedCount = (clone $completedToday)->count();
        $ordersToday = Order::where('created_at', '>=', $today)->count();

        // Top products (last 7 days by quantity).
        $topProducts = OrderItem::query()
            ->select('product_name', DB::raw('SUM(quantity) as qty'))
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('product_name')
            ->orderByDesc('qty')
            ->limit(5)
            ->get()
            ->map(fn ($r) => ['name' => $r->product_name, 'quantity' => (int) $r->qty]);

        // Revenue for the last 7 days (chart).
        $revenue = collect(range(6, 0))->map(function ($daysAgo) {
            $day = now()->subDays($daysAgo)->startOfDay();
            $total = (float) Order::where('status', 'completed')
                ->whereBetween('completed_at', [$day, (clone $day)->endOfDay()])
                ->sum('total');

            return ['date' => $day->toDateString(), 'total' => $total];
        });

        return response()->json([
            'sales_today' => $salesToday,
            'orders_today' => $ordersToday,
            'completed_today' => $completedCount,
            'avg_order_value' => $completedCount > 0 ? round($salesToday / $completedCount, 2) : 0,
            'active_orders' => Order::active()->count(),
            'low_stock_count' => $this->inventory->lowStock()->count(),
            'top_products' => $topProducts,
            'revenue_last_7_days' => $revenue,
            'recent_orders' => OrderResource::collection(
                Order::with('items')->latest()->limit(8)->get()
            ),
        ]);
    }
}
