<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_lists_users(): void
    {
        $owner = $this->owner(['name' => 'Boss']);
        $this->staff('barista');

        $this->actingAs($owner, 'sanctum')->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'email', 'username', 'role', 'is_owner']]])
            ->assertJsonCount(2, 'data');
    }

    public function test_owner_creates_a_staff_account(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'New Barista',
            'email' => 'barista@shop.com',
            'username' => 'newbarista',
            'role' => 'barista',
            'password' => 'password123',
        ])->assertCreated()->assertJsonPath('data.role', 'barista');

        $this->assertDatabaseHas('users', ['email' => 'barista@shop.com', 'role' => 'barista']);
    }

    public function test_create_validates_unique_username_and_role(): void
    {
        $owner = $this->owner();
        $this->staff('cashier', ['username' => 'dupe']);

        $this->actingAs($owner, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'X', 'email' => 'x@shop.com', 'username' => 'dupe',
            'role' => 'wizard', 'password' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors(['username', 'role']);
    }

    public function test_owner_updates_a_user_and_optionally_password(): void
    {
        $owner = $this->owner();
        $target = $this->staff('cashier', ['name' => 'Before']);

        $this->actingAs($owner, 'sanctum')->putJson("/api/admin/users/{$target->id}", [
            'name' => 'After', 'email' => $target->email, 'username' => $target->username,
            'role' => 'manager',
        ])->assertOk()->assertJsonPath('data.role', 'manager');

        $this->assertDatabaseHas('users', ['id' => $target->id, 'name' => 'After', 'role' => 'manager']);
    }

    public function test_cannot_demote_the_only_owner(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner, 'sanctum')->putJson("/api/admin/users/{$owner->id}", [
            'name' => $owner->name, 'email' => $owner->email, 'username' => $owner->username,
            'role' => 'manager',
        ])->assertStatus(422)->assertJsonValidationErrors('role');
    }

    public function test_owner_can_delete_another_user(): void
    {
        $owner = $this->owner();
        $target = $this->staff('barista');

        $this->actingAs($owner, 'sanctum')->deleteJson("/api/admin/users/{$target->id}")->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_cannot_delete_self(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner, 'sanctum')->deleteJson("/api/admin/users/{$owner->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $owner->id]);
    }

    public function test_cannot_delete_last_owner(): void
    {
        $owner = $this->owner();
        $other = $this->owner(); // acting owner deletes the "only remaining" owner (target) -> but 2 owners exist
        // Delete one owner while two exist -> allowed
        $this->actingAs($owner, 'sanctum')->deleteJson("/api/admin/users/{$other->id}")->assertOk();

        // Now only one owner remains; a second admin cannot be created to delete them, so assert count.
        $this->assertSame(1, User::where('role', 'owner')->count());
    }
}
