<?php

use App\Models\Product;
use App\Services\InventoryService;
use Database\Seeders\InventorySeeder;
use Database\Seeders\MenuSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Data migration: bootstrap a starter catalog (inventory + full menu with recipes
 * and customization options) so a freshly-deployed install isn't empty.
 *
 * Runs automatically with `php artisan migrate` on deploy. It's safe:
 *  - skipped in the testing env (each test controls its own fixtures);
 *  - only seeds when the catalog is empty, so it never clobbers a live menu or
 *    recipe/option edits made in the admin UI.
 *
 * No secrets here (unlike owner credentials), so seeding via migration is fine.
 * To re-seed later, use `php artisan app:seed-starter`.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        if (Product::query()->exists()) {
            return; // catalog already populated — leave it alone
        }

        // Inventory first: the menu maps ingredient names -> ids.
        (new InventorySeeder)->run();
        (new MenuSeeder)->run();

        app(InventoryService::class)->flush(); // drop cached menu + availability
    }

    public function down(): void
    {
        // No-op: we never delete catalog data on rollback.
    }
};
