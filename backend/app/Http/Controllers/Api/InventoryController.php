<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
