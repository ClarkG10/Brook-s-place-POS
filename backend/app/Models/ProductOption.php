<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductOption extends Model
{
    protected $fillable = [
        'option_group_id', 'name', 'price_delta', 'is_default', 'sort_order',
        'consumes_ingredient_id', 'consume_quantity',
    ];

    protected $casts = [
        'price_delta' => 'decimal:2',
        'is_default' => 'boolean',
        'sort_order' => 'integer',
        'consume_quantity' => 'decimal:3',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(ProductOptionGroup::class, 'option_group_id');
    }

    public function consumesIngredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'consumes_ingredient_id');
    }
}
