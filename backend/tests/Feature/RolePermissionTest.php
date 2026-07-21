<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * "Owner vs staff": owner does everything (settings + user management);
 * all other staff get full operational access but no settings-write / no user mgmt.
 */
class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_endpoints_require_authentication(): void
    {
        $this->getJson('/api/admin/products')->assertUnauthorized();
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
        $this->putJson('/api/admin/settings', [])->assertUnauthorized();
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_staff_can_read_settings_but_not_write(): void
    {
        $this->seed(\Database\Seeders\StoreSettingsSeeder::class);
        $manager = $this->staff('manager');

        $this->actingAs($manager, 'sanctum')->getJson('/api/admin/settings')->assertOk();

        $this->actingAs($manager, 'sanctum')->putJson('/api/admin/settings', [
            'shop_name' => 'Hacked',
        ])->assertForbidden();
    }

    public function test_owner_can_write_settings(): void
    {
        $this->seed(\Database\Seeders\StoreSettingsSeeder::class);
        $owner = $this->owner();

        $this->actingAs($owner, 'sanctum')->putJson('/api/admin/settings', [
            'shop_name' => 'My Cafe',
        ])->assertOk()->assertJsonPath('shop_name', 'My Cafe');
    }

    #[DataProvider('staffRoles')]
    public function test_staff_cannot_access_user_management(string $role): void
    {
        $user = $this->staff($role);

        $this->actingAs($user, 'sanctum')->getJson('/api/admin/users')->assertForbidden();
        $this->actingAs($user, 'sanctum')->postJson('/api/admin/users', [])->assertForbidden();
    }

    public static function staffRoles(): array
    {
        return [['manager'], ['cashier'], ['barista']];
    }

    public function test_owner_can_access_user_management(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/users')->assertOk();
    }

    public function test_staff_can_use_operational_endpoints(): void
    {
        $this->seedStore();
        $cashier = $this->staff('cashier');

        // Products, inventory, orders, categories, reports, dashboard — all allowed for staff.
        $this->actingAs($cashier, 'sanctum')->getJson('/api/admin/products')->assertOk();
        $this->actingAs($cashier, 'sanctum')->getJson('/api/admin/inventory')->assertOk();
        $this->actingAs($cashier, 'sanctum')->getJson('/api/admin/orders')->assertOk();
        $this->actingAs($cashier, 'sanctum')->getJson('/api/admin/categories')->assertOk();
        $this->actingAs($cashier, 'sanctum')->getJson('/api/admin/dashboard')->assertOk();
    }
}
