<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'shop_name', 'tagline', 'logo_url',
        'currency_code', 'currency_symbol', 'tax_rate', 'tax_inclusive', 'service_charge_rate',
        'receipt_header', 'receipt_footer',
        'public_theme', 'admin_theme',
    ];

    protected $casts = [
        'tax_rate' => 'decimal:2',
        'tax_inclusive' => 'boolean',
        'service_charge_rate' => 'decimal:2',
        'public_theme' => 'array',
        'admin_theme' => 'array',
    ];

    /** Per-request memoized singleton (avoids re-querying within one request). */
    protected static ?self $current = null;

    /** The single store-settings row. */
    public static function current(): self
    {
        return static::$current ??= static::query()->firstOrCreate([]);
    }

    protected static function booted(): void
    {
        // Drop the in-request memo when the row changes.
        static::saved(fn () => static::$current = null);
        static::deleted(fn () => static::$current = null);
    }
}
