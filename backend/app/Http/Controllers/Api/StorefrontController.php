<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use App\Services\CatalogService;
use App\Services\OrderService;
use App\Services\ThemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public, unauthenticated endpoints for the customer ordering app.
 */
class StorefrontController extends Controller
{
    public function __construct(
        private CatalogService $catalog,
        private OrderService $orders,
        private ThemeService $theme,
    ) {}

    /** Public store branding + theme (shop name is configurable, not hard-coded). */
    public function settings(): JsonResponse
    {
        $s = Setting::current();

        return response()->json([
            'shop_name' => $s->shop_name,
            'tagline' => $s->tagline,
            'logo_url' => $s->logo_url,
            'currency_code' => $s->currency_code,
            'currency_symbol' => $s->currency_symbol,
            'theme' => $this->theme->resolve('public', $s->public_theme),
        ]);
    }

    /** Full menu with live availability (cached). */
    public function menu(): JsonResponse
    {
        return response()->json(['categories' => $this->catalog->menu()]);
    }

    public function placeOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source' => ['nullable', 'in:qr,tablet,pos'],
            'table_number' => ['nullable', 'string', 'max:20'],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
            'items.*.option_ids' => ['array'],
            'items.*.option_ids.*' => ['integer'],
        ]);

        $order = $this->orders->place($data);

        return response()->json([
            'order_number' => $order->order_number,
            'status' => $order->status,
            'table_number' => $order->table_number,
            'total' => (float) $order->total,
            'placed_at' => $order->placed_at,
        ], 201);
    }

    /** Waiting-screen polling: minimal public view of one order. */
    public function orderStatus(string $orderNumber): JsonResponse
    {
        $order = Order::with('items')->where('order_number', $orderNumber)->firstOrFail();

        return response()->json([
            'order_number' => $order->order_number,
            'status' => $order->status,
            'table_number' => $order->table_number,
            'total' => (float) $order->total,
            'placed_at' => $order->placed_at,
            'items' => $order->items->map(fn ($i) => [
                'product_name' => $i->product_name,
                'quantity' => $i->quantity,
                'options' => collect($i->options ?? [])->pluck('name'),
                'notes' => $i->notes,
            ]),
        ]);
    }
}
