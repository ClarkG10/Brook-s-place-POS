<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\InventoryService;
use Database\Seeders\InventorySeeder;
use Database\Seeders\MenuSeeder;
use Illuminate\Console\Command;

/**
 * Seed a starter catalog (inventory + a full menu with recipes & customization
 * options) so a fresh install isn't empty.
 *
 *   php artisan app:seed-starter               # seed / refresh the starter catalog
 *   php artisan app:seed-starter --if-empty    # deploy-safe: only when no products exist
 *
 * Deploy-safe with --if-empty: it no-ops once any product exists, so it never
 * overwrites recipe/option edits made in the admin UI on later deploys. The
 * underlying seeders key on name/slug, so a manual re-run won't create duplicates.
 */
class SeedStarterData extends Command
{
    protected $signature = 'app:seed-starter
        {--if-empty : Only seed when no products exist yet (safe to run on every deploy)}';

    protected $description = 'Seed a starter catalog (inventory + menu with recipes & options)';

    public function handle(InventoryService $inventory): int
    {
        if ($this->option('if-empty') && Product::query()->exists()) {
            $this->info('Catalog already has products — skipping starter seed.');

            return self::SUCCESS;
        }

        // Order matters: the menu maps ingredient names -> ids, so inventory first.
        $this->callSilent('db:seed', ['--class' => InventorySeeder::class, '--force' => true]);
        $this->callSilent('db:seed', ['--class' => MenuSeeder::class, '--force' => true]);

        $inventory->flush(); // drop cached menu + availability so new data shows immediately

        $this->info('Starter inventory + menu seeded.');

        return self::SUCCESS;
    }
}
