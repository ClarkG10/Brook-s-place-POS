<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    public const CACHE_KEY = 'store.settings';

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

    protected static function booted(): void
    {
        // Keep the cached singleton fresh whenever settings change.
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    /** The single store-settings row, cached. */
    public static function current(): self
    {
        return Cache::rememberForever(self::CACHE_KEY, fn () => static::query()->firstOrCreate([]));
    }
}
