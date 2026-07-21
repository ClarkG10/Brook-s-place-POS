<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\ThemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function __construct(private ThemeService $theme) {}

    public function show(): JsonResponse
    {
        return response()->json($this->payload(Setting::current()));
    }

    public function update(Request $request): JsonResponse
    {
        $publicKeys = collect($this->theme->palettes('public'))->pluck('key')->all();
        $adminKeys = collect($this->theme->palettes('admin'))->pluck('key')->all();

        $data = $request->validate([
            'shop_name' => ['required', 'string', 'max:60'],
            'tagline' => ['nullable', 'string', 'max:120'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'currency_code' => ['nullable', 'string', 'max:8'],
            'currency_symbol' => ['nullable', 'string', 'max:8'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_inclusive' => ['boolean'],
            'service_charge_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'receipt_header' => ['nullable', 'string', 'max:255'],
            'receipt_footer' => ['nullable', 'string', 'max:255'],
            'public_palette' => ['nullable', Rule::in($publicKeys)],
            'admin_palette' => ['nullable', Rule::in($adminKeys)],
            'admin_mode' => ['nullable', Rule::in(['light', 'dark', 'system'])],
        ]);

        $settings = Setting::current();
        $settings->fill([
            'shop_name' => $data['shop_name'],
            'tagline' => $data['tagline'] ?? null,
            'logo_url' => $data['logo_url'] ?? null,
            'currency_code' => $data['currency_code'] ?? $settings->currency_code,
            'currency_symbol' => $data['currency_symbol'] ?? $settings->currency_symbol,
            'tax_rate' => $data['tax_rate'] ?? $settings->tax_rate,
            'tax_inclusive' => $request->boolean('tax_inclusive', $settings->tax_inclusive),
            'service_charge_rate' => $data['service_charge_rate'] ?? $settings->service_charge_rate,
            'receipt_header' => $data['receipt_header'] ?? null,
            'receipt_footer' => $data['receipt_footer'] ?? null,
        ]);

        if (! empty($data['public_palette'])) {
            $settings->public_theme = ['palette' => $data['public_palette']];
        }
        if (! empty($data['admin_palette']) || ! empty($data['admin_mode'])) {
            $settings->admin_theme = [
                'palette' => $data['admin_palette'] ?? ($settings->admin_theme['palette'] ?? ThemeService::DEFAULTS['admin']),
                'mode' => $data['admin_mode'] ?? ($settings->admin_theme['mode'] ?? 'light'),
            ];
        }

        $settings->save(); // model event clears the settings cache

        return response()->json($this->payload($settings->refresh()));
    }

    private function payload(Setting $s): array
    {
        return [
            'shop_name' => $s->shop_name,
            'tagline' => $s->tagline,
            'logo_url' => $s->logo_url,
            'currency_code' => $s->currency_code,
            'currency_symbol' => $s->currency_symbol,
            'tax_rate' => (float) $s->tax_rate,
            'tax_inclusive' => $s->tax_inclusive,
            'service_charge_rate' => (float) $s->service_charge_rate,
            'receipt_header' => $s->receipt_header,
            'receipt_footer' => $s->receipt_footer,
            'public_theme' => $this->theme->resolve('public', $s->public_theme),
            'admin_theme' => $this->theme->resolve('admin', $s->admin_theme),
            'palettes' => [
                'public' => $this->theme->palettes('public'),
                'admin' => $this->theme->palettes('admin'),
            ],
        ];
    }
}
