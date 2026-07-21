<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        // [name, unit, type, stock, low_threshold, cost_per_unit]
        $items = [
            ['Fresh Milk', 'ml', 'ingredient', 5000, 1500, 0.05],
            ['Coffee Beans', 'g', 'ingredient', 2000, 400, 0.90],
            ['Black Tea', 'g', 'ingredient', 1500, 300, 0.30],
            ['Tapioca Pearls', 'g', 'ingredient', 400, 500, 0.08],   // intentionally low → demo warning
            ['Brown Sugar Syrup', 'ml', 'ingredient', 3000, 500, 0.04],
            ['Sugar Syrup', 'ml', 'ingredient', 4000, 800, 0.03],
            ['Ice', 'g', 'ingredient', 100000, 5000, 0.001],
            ['Oat Milk', 'ml', 'ingredient', 1500, 500, 0.09],
            ['Almond Milk', 'ml', 'ingredient', 1200, 500, 0.09],
            ['Matcha Powder', 'g', 'ingredient', 600, 150, 1.20],
            ['Fresh Mango', 'g', 'ingredient', 3000, 800, 0.06],
            ['Cream Cheese', 'g', 'ingredient', 800, 300, 0.50],
            ['Whipped Cream', 'g', 'ingredient', 1000, 300, 0.20],
            ['Coffee Jelly', 'g', 'ingredient', 900, 300, 0.10],
            ['Cup 16oz', 'pcs', 'packaging', 500, 100, 3.00],
            ['Dome Lid', 'pcs', 'packaging', 500, 100, 1.00],
            ['Straw', 'pcs', 'packaging', 800, 150, 0.50],
            ['Napkin', 'pcs', 'packaging', 2000, 300, 0.10],
        ];

        foreach ($items as [$name, $unit, $type, $stock, $low, $cost]) {
            Ingredient::query()->updateOrCreate(
                ['name' => $name],
                ['unit' => $unit, 'type' => $type, 'stock_quantity' => $stock,
                    'low_stock_threshold' => $low, 'cost_per_unit' => $cost, 'is_active' => true],
            );
        }
    }
}
