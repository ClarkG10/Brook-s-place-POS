<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            StoreSettingsSeeder::class,
            InventorySeeder::class,
            MenuSeeder::class,
        ]);
    }
}
