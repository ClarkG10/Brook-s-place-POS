<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
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

    /** Add stock to an ingredient (restock). */
    public function restock(Request $request, Ingredient $ingredient): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'numeric'],
            'mode' => ['nullable', 'in:add,set'],
        ]);

        if (($data['mode'] ?? 'add') === 'set') {
            $ingredient->stock_quantity = $data['quantity'];
        } else {
            $ingredient->increment('stock_quantity', $data['quantity']);
        }
        $ingredient->save();

        $this->inventory->flush();

        return response()->json([
            'id' => $ingredient->id,
            'stock_quantity' => (float) $ingredient->stock_quantity,
            'status' => InventoryService::statusColor($ingredient),
        ]);
    }
}
