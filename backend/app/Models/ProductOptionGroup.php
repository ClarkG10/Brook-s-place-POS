<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductOptionGroup extends Model
{
    protected $fillable = [
        'product_id', 'name', 'min_select', 'max_select', 'is_required', 'sort_order',
    ];

    protected $casts = [
        'min_select' => 'integer',
        'max_select' => 'integer',
        'is_required' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(ProductOption::class, 'option_group_id')->orderBy('sort_order');
    }
}
