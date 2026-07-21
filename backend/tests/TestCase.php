<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Availability is cached (rememberForever); reset it so state never leaks between tests.
        Cache::flush();
    }

    protected function owner(array $attrs = []): User
    {
        return User::factory()->create(array_merge(['role' => 'owner'], $attrs));
    }

    protected function staff(string $role = 'cashier', array $attrs = []): User
    {
        return User::factory()->create(array_merge(['role' => $role], $attrs));
    }

    /** Seed a realistic store (settings, inventory, menu). */
    protected function seedStore(): void
    {
        $this->seed([
            \Database\Seeders\StoreSettingsSeeder::class,
            \Database\Seeders\InventorySeeder::class,
            \Database\Seeders\MenuSeeder::class,
        ]);
    }
}
