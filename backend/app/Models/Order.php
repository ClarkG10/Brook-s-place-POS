<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const STATUSES = ['incoming', 'preparing', 'ready', 'completed', 'cancelled'];

    protected $fillable = [
        'order_number', 'source', 'table_number', 'status', 'customer_name', 'notes',
        'subtotal', 'discount', 'tax', 'service_charge', 'total',
        'payment_method', 'payment_reference', 'amount_tendered', 'change_due', 'is_paid',
        'inventory_deducted', 'cashier_id', 'placed_at', 'completed_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_tendered' => 'decimal:2',
        'change_due' => 'decimal:2',
        'is_paid' => 'boolean',
        'inventory_deducted' => 'boolean',
        'placed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /** Statuses that still consume kitchen/bar attention. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', ['incoming', 'preparing', 'ready']);
    }
}
