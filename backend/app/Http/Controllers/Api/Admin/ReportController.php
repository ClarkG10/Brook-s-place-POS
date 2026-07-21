<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /** Sales metrics for a date range (completed orders). */
    public function sales(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);

        $completed = fn () => Order::where('status', 'completed')->whereBetween('completed_at', [$from, $to]);

        $orders = (clone $completed())->count();
        $gross = (float) (clone $completed())->sum('total');
        $discount = (float) (clone $completed())->sum('discount');
        $tax = (float) (clone $completed())->sum('tax');

        $itemsSold = (int) OrderItem::whereHas('order', fn ($q) => $q->where('status', 'completed')->whereBetween('completed_at', [$from, $to]))->sum('quantity');

        $byPayment = (clone $completed())
            ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($r) => ['method' => $r->payment_method ?? 'unspecified', 'count' => (int) $r->count, 'total' => (float) $r->total]);

        $topProducts = OrderItem::query()
            ->select('product_name', DB::raw('SUM(quantity) as qty'), DB::raw('SUM(line_total) as revenue'))
            ->whereHas('order', fn ($q) => $q->where('status', 'completed')->whereBetween('completed_at', [$from, $to]))
            ->groupBy('product_name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['name' => $r->product_name, 'quantity' => (int) $r->qty, 'revenue' => (float) $r->revenue]);

        // Per-day series (fills gaps with zero).
        $daily = (clone $completed())
            ->select(DB::raw('DATE(completed_at) as d'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as orders'))
            ->groupBy('d')->pluck('total', 'd');
        $dailyOrders = (clone $completed())
            ->select(DB::raw('DATE(completed_at) as d'), DB::raw('COUNT(*) as c'))
            ->groupBy('d')->pluck('c', 'd');

        $byDay = [];
        foreach (CarbonPeriod::create($from->copy()->startOfDay(), $to->copy()->startOfDay()) as $day) {
            $key = $day->toDateString();
            $byDay[] = ['date' => $key, 'total' => (float) ($daily[$key] ?? 0), 'orders' => (int) ($dailyOrders[$key] ?? 0)];
        }

        // Busiest hours (across the range).
        $byHour = (clone $completed())
            ->select(DB::raw('HOUR(completed_at) as h'), DB::raw('COUNT(*) as c'), DB::raw('SUM(total) as total'))
            ->groupBy('h')->orderBy('h')->get()
            ->map(fn ($r) => ['hour' => (int) $r->h, 'orders' => (int) $r->c, 'total' => (float) $r->total]);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'gross_sales' => round($gross, 2),
                'orders' => $orders,
                'avg_order_value' => $orders > 0 ? round($gross / $orders, 2) : 0,
                'items_sold' => $itemsSold,
                'discount' => round($discount, 2),
                'tax' => round($tax, 2),
            ],
            'by_day' => $byDay,
            'by_payment' => $byPayment,
            'by_hour' => $byHour,
            'top_products' => $topProducts,
        ]);
    }

    /** CSV export (opens in Excel) — one row per completed order in range. */
    public function export(Request $request)
    {
        [$from, $to] = $this->range($request);

        $orders = Order::with('cashier')
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$from, $to])
            ->orderBy('completed_at')
            ->get();

        $filename = "sales_{$from->toDateString()}_to_{$to->toDateString()}.csv";

        $columns = ['Order #', 'Completed At', 'Where', 'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'Service Charge', 'Total', 'Payment', 'Cashier'];

        return response()->streamDownload(function () use ($orders, $columns) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $columns);
            foreach ($orders as $o) {
                fputcsv($out, [
                    $o->order_number,
                    optional($o->completed_at)->format('Y-m-d H:i'),
                    $o->table_number ? "Table {$o->table_number}" : ucfirst($o->source),
                    $o->customer_name,
                    $o->items->sum('quantity'),
                    number_format((float) $o->subtotal, 2, '.', ''),
                    number_format((float) $o->discount, 2, '.', ''),
                    number_format((float) $o->tax, 2, '.', ''),
                    number_format((float) $o->service_charge, 2, '.', ''),
                    number_format((float) $o->total, 2, '.', ''),
                    $o->payment_method,
                    $o->cashier?->name,
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /** Resolve the [from, to] Carbon range from the request (defaults to last 7 days). */
    private function range(Request $request): array
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : now()->endOfDay();
        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : now()->subDays(6)->startOfDay();

        return [$from, $to];
    }
}
