<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StoreSettingsSeeder extends Seeder
{
    public function run(): void
    {
        Setting::query()->firstOrCreate([], [
            'shop_name' => "Brook's Place",
            'tagline' => 'Coffee · Milk Tea · Good Vibes',
            'currency_code' => 'PHP',
            'currency_symbol' => '₱',
            'tax_rate' => 12,          // PH VAT
            'tax_inclusive' => true,
            'service_charge_rate' => 0,
            'receipt_header' => "Brook's Place",
            'receipt_footer' => 'Thank you, come again!',
            'public_theme' => ['palette' => 'espresso'],
            'admin_theme' => ['palette' => 'moss', 'mode' => 'light'],
        ]);

        // Staff accounts for the management portal.
        $staff = [
            ['name' => 'Store Owner', 'email' => 'owner@brooks.place', 'role' => 'owner'],
            ['name' => 'Store Manager', 'email' => 'manager@brooks.place', 'role' => 'manager'],
            ['name' => 'Cashier', 'email' => 'cashier@brooks.place', 'role' => 'cashier'],
            ['name' => 'Barista', 'email' => 'barista@brooks.place', 'role' => 'barista'],
        ];

        foreach ($staff as $s) {
            User::query()->updateOrCreate(
                ['email' => $s['email']],
                ['name' => $s['name'], 'role' => $s['role'], 'password' => Hash::make('password')],
            );
        }
    }
}
