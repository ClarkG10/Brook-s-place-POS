<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    public function __construct(private OrderService $orders) {}

    /** Order queue with optional status / search filters. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::query()->with(['items', 'cashier'])->latest('created_at');

        if ($status = $request->query('status')) {
            $query->whereIn('status', explode(',', $status));
        }
        if ($table = $request->query('table')) {
            $query->where('table_number', $table);
        }
        if ($q = $request->query('q')) {
            $query->where(fn ($sub) => $sub
                ->where('order_number', 'like', "%{$q}%")
                ->orWhere('customer_name', 'like', "%{$q}%"));
        }

        return OrderResource::collection($query->paginate((int) $request->query('per_page', 25)));
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load(['items', 'cashier']));
    }

    /** Staff-created (POS) order. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'table_number' => ['nullable', 'string', 'max:20'],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'in:cash,gcash,card,other'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
            'items.*.option_ids' => ['array'],
            'items.*.option_ids.*' => ['integer'],
        ]);

        $data['source'] = 'pos';
        $data['cashier_id'] = $request->user()->id;

        $order = $this->orders->place($data);

        return (new OrderResource($order->load(['items', 'cashier'])))
            ->response()->setStatusCode(201);
    }

    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', Order::STATUSES)],
        ]);

        $order = $this->orders->transition($order, $data['status']);

        return new OrderResource($order->load(['items', 'cashier']));
    }
}
