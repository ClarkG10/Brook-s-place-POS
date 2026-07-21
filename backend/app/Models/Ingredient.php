<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ingredient extends Model
{
    protected $fillable = [
        'name', 'unit', 'type', 'stock_quantity', 'low_stock_threshold', 'cost_per_unit', 'is_active',
    ];

    protected $casts = [
        'stock_quantity' => 'decimal:3',
        'low_stock_threshold' => 'decimal:3',
        'cost_per_unit' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function recipeItems(): HasMany
    {
        return $this->hasMany(RecipeItem::class);
    }

    public function isLow(): bool
    {
        return (float) $this->stock_quantity <= (float) $this->low_stock_threshold;
    }
}
