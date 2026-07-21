<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    public function index(): JsonResponse
    {
        $ingredients = Ingredient::query()->orderBy('name')->get()->map(fn (Ingredient $i) => [
            'id' => $i->id,
            'name' => $i->name,
            'unit' => $i->unit,
            'type' => $i->type,
            'stock_quantity' => (float) $i->stock_quantity,
            'low_stock_threshold' => (float) $i->low_stock_threshold,
            'cost_per_unit' => (float) $i->cost_per_unit,
            'status' => InventoryService::statusColor($i),
        ]);

        return response()->json(['ingredients' => $ingredients]);
    }

    /**
     * Usage analytics over a date range: what we consumed, what it cost, the trend,
     * the movement mix, and a "days of stock left" projection per ingredient.
     */
    public function analytics(Request $request): JsonResponse
    {
        [$from, $to] = $this->range($request);
        $days = max(1, $from->diffInDays($to) + 1);

        // Stock consumed (deductions) in range, joined to cost.
        $deductions = fn () => StockMovement::query()
            ->join('ingredients', 'ingredients.id', '=', 'stock_movements.ingredient_id')
            ->where('stock_movements.type', 'deduction')
            ->whereBetween('stock_movements.created_at', [$from, $to]);

        $consumptionCost = (float) (clone $deductions())
            ->sum(DB::raw('ABS(stock_movements.quantity_delta) * ingredients.cost_per_unit'));

        $restockCost = (float) StockMovement::query()
            ->join('ingredients', 'ingredients.id', '=', 'stock_movements.ingredient_id')
            ->where('stock_movements.type', 'restock')
            ->whereBetween('stock_movements.created_at', [$from, $to])
            ->sum(DB::raw('stock_movements.quantity_delta * ingredients.cost_per_unit'));

        $currentStockValue = (float) Ingredient::query()->sum(DB::raw('stock_quantity * cost_per_unit'));

        $topConsumed = (clone $deductions())
            ->select('ingredients.name', 'ingredients.unit',
                DB::raw('SUM(ABS(stock_movements.quantity_delta)) as qty'),
                DB::raw('SUM(ABS(stock_movements.quantity_delta) * ingredients.cost_per_unit) as cost'))
            ->groupBy('ingredients.name', 'ingredients.unit')
            ->orderByDesc('cost')->limit(10)->get()
            ->map(fn ($r) => ['name' => $r->name, 'unit' => $r->unit, 'quantity' => (float) $r->qty, 'cost' => (float) $r->cost]);

        // Daily consumption cost, gaps filled with zero.
        $daily = (clone $deductions())
            ->select(DB::raw('DATE(stock_movements.created_at) as d'),
                DB::raw('SUM(ABS(stock_movements.quantity_delta) * ingredients.cost_per_unit) as cost'))
            ->groupBy('d')->pluck('cost', 'd');
        $byDay = [];
        foreach (CarbonPeriod::create($from->copy()->startOfDay(), $to->copy()->startOfDay()) as $day) {
            $key = $day->toDateString();
            $byDay[] = ['date' => $key, 'cost' => (float) ($daily[$key] ?? 0)];
        }

        $typeCounts = StockMovement::query()
            ->whereBetween('created_at', [$from, $to])
            ->select('type', DB::raw('COUNT(*) as count'))
            ->groupBy('type')->pluck('count', 'type');
        $movements = [
            'deduction' => (int) ($typeCounts['deduction'] ?? 0),
            'restock' => (int) ($typeCounts['restock'] ?? 0),
            'adjustment' => (int) ($typeCounts['adjustment'] ?? 0),
        ];

        // Days-of-stock-left projection from average daily use in range.
        $consumedById = (clone $deductions())
            ->select('ingredients.id', DB::raw('SUM(ABS(stock_movements.quantity_delta)) as qty'))
            ->groupBy('ingredients.id')->pluck('qty', 'ingredients.id');

        $projections = Ingredient::query()->whereIn('id', $consumedById->keys()->all())->get()
            ->map(function (Ingredient $ing) use ($consumedById, $days) {
                $avgDaily = (float) $consumedById[$ing->id] / $days;

                return [
                    'name' => $ing->name,
                    'unit' => $ing->unit,
                    'stock_quantity' => (float) $ing->stock_quantity,
                    'avg_daily_use' => round($avgDaily, 2),
                    'days_left' => $avgDaily > 0 ? round((float) $ing->stock_quantity / $avgDaily, 1) : null,
                ];
            })
            ->sortBy(fn ($r) => $r['days_left'] ?? INF)->values()->take(10);

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'consumption_cost' => round($consumptionCost, 2),
                'restock_cost' => round($restockCost, 2),
                'current_stock_value' => round($currentStockValue, 2),
                'tracked_ingredients' => Ingredient::count(),
                'low_stock_count' => $this->inventory->lowStock()->count(),
            ],
            'top_consumed' => $topConsumed,
            'by_day' => $byDay,
            'movements' => $movements,
            'projections' => $projections,
        ]);
    }

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

    public function lowStock(): JsonResponse
    {
        $low = $this->inventory->lowStock()->map(fn (Ingredient $i) => [
            'id' => $i->id,
            'name' => $i->name,
            'unit' => $i->unit,
            'stock_quantity' => (float) $i->stock_quantity,
            'low_stock_threshold' => (float) $i->low_stock_threshold,
            'status' => InventoryService::statusColor($i),
        ]);

        return response()->json(['ingredients' => $low]);
    }

    /** Recent stock movements (audit log). */
    public function logs(Request $request): JsonResponse
    {
        $logs = StockMovement::with(['ingredient:id,name,unit', 'user:id,name', 'order:id,order_number'])
            ->latest()
            ->paginate((int) $request->query('per_page', 30));

        return response()->json(
            $logs->through(fn (StockMovement $m) => [
                'id' => $m->id,
                'type' => $m->type,
                'quantity_delta' => (float) $m->quantity_delta,
                'balance_after' => (float) $m->balance_after,
                'note' => $m->note,
                'ingredient' => $m->ingredient?->name,
                'unit' => $m->ingredient?->unit,
                'order_number' => $m->order?->order_number,
                'user' => $m->user?->name,
                'created_at' => $m->created_at,
            ])
        );
    }

    /** Add or set an ingredient's stock (logged). */
    public function restock(Request $request, Ingredient $ingredient): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'numeric'],
            'mode' => ['nullable', 'in:add,set'],
            'note' => ['nullable', 'string', 'max:120'],
        ]);

        $old = (float) $ingredient->stock_quantity;
        $mode = $data['mode'] ?? 'add';
        $ingredient->stock_quantity = $mode === 'set' ? (float) $data['quantity'] : $old + (float) $data['quantity'];
        $ingredient->save();

        $delta = (float) $ingredient->stock_quantity - $old;
        $this->inventory->record(
            $ingredient,
            $mode === 'set' ? 'adjustment' : 'restock',
            $delta,
            $data['note'] ?? ($mode === 'set' ? 'Manual adjustment' : 'Restock'),
            null,
            $request->user()->id,
        );
        $this->inventory->flush();

        return response()->json([
            'id' => $ingredient->id,
            'stock_quantity' => (float) $ingredient->stock_quantity,
            'status' => InventoryService::statusColor($ingredient),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $ingredient = Ingredient::create($this->validated($request));
        if ((float) $ingredient->stock_quantity > 0) {
            $this->inventory->record($ingredient, 'adjustment', (float) $ingredient->stock_quantity, 'Initial stock', null, $request->user()->id);
        }
        $this->inventory->flush();

        return response()->json($ingredient, 201);
    }

    public function update(Request $request, Ingredient $ingredient): JsonResponse
    {
        $old = (float) $ingredient->stock_quantity;
        $ingredient->update($this->validated($request));

        $delta = (float) $ingredient->stock_quantity - $old;
        if (abs($delta) > 0.0001) {
            $this->inventory->record($ingredient, 'adjustment', $delta, 'Edited stock', null, $request->user()->id);
        }
        $this->inventory->flush();

        return response()->json($ingredient);
    }

    public function destroy(Ingredient $ingredient): JsonResponse
    {
        $ingredient->delete();
        $this->inventory->flush();

        return response()->json(null, 204);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'unit' => ['required', 'string', 'max:16'],
            'type' => ['required', 'in:ingredient,packaging'],
            'stock_quantity' => ['required', 'numeric', 'min:0'],
            'low_stock_threshold' => ['required', 'numeric', 'min:0'],
            'cost_per_unit' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);
    }
}
