<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 'base_price', 'image_url',
        'prep_time_minutes', 'is_active', 'is_popular', 'is_new', 'manual_sold_out', 'sort_order',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'prep_time_minutes' => 'integer',
        'is_active' => 'boolean',
        'is_popular' => 'boolean',
        'is_new' => 'boolean',
        'manual_sold_out' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function optionGroups(): HasMany
    {
        return $this->hasMany(ProductOptionGroup::class);
    }

    public function recipeItems(): HasMany
    {
        return $this->hasMany(RecipeItem::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
