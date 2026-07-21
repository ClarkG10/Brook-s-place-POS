<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_email(): void
    {
        $this->owner(['email' => 'boss@shop.com', 'password' => 'secret123']);

        $res = $this->postJson('/api/auth/login', ['email' => 'boss@shop.com', 'password' => 'secret123']);

        $res->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'username', 'role', 'is_owner']])
            ->assertJsonPath('user.is_owner', true);
    }

    public function test_login_with_username(): void
    {
        $this->staff('cashier', ['username' => 'jbarista', 'password' => 'secret123']);

        $res = $this->postJson('/api/auth/login', ['login' => 'jbarista', 'password' => 'secret123']);

        $res->assertOk()->assertJsonPath('user.username', 'jbarista')->assertJsonPath('user.is_owner', false);
    }

    public function test_login_rejects_bad_password(): void
    {
        $this->owner(['username' => 'boss', 'password' => 'secret123']);

        $this->postJson('/api/auth/login', ['login' => 'boss', 'password' => 'wrong'])
            ->assertStatus(422)->assertJsonValidationErrors('login');
    }

    public function test_login_requires_an_identifier(): void
    {
        $this->postJson('/api/auth/login', ['password' => 'x'])->assertStatus(422);
    }

    public function test_me_requires_auth(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_me_returns_current_user(): void
    {
        $user = $this->staff('manager');

        $this->actingAs($user, 'sanctum')->getJson('/api/auth/me')
            ->assertOk()->assertJsonPath('user.id', $user->id)->assertJsonPath('user.role', 'manager');
    }

    public function test_logout_revokes_token(): void
    {
        $user = $this->owner();
        $token = $user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_user_can_update_own_profile(): void
    {
        $user = $this->staff('cashier', ['username' => 'old', 'name' => 'Old Name']);

        $this->actingAs($user, 'sanctum')->putJson('/api/auth/profile', [
            'name' => 'New Name',
            'email' => 'new@shop.com',
            'username' => 'newname',
        ])->assertOk()->assertJsonPath('user.username', 'newname');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name', 'username' => 'newname']);
    }

    public function test_profile_username_must_be_unique(): void
    {
        $this->staff('cashier', ['username' => 'taken']);
        $user = $this->staff('cashier', ['username' => 'mine']);

        $this->actingAs($user, 'sanctum')->putJson('/api/auth/profile', [
            'name' => 'X', 'email' => 'x@shop.com', 'username' => 'taken',
        ])->assertStatus(422)->assertJsonValidationErrors('username');
    }

    public function test_user_can_change_own_password(): void
    {
        $user = $this->staff('cashier', ['password' => 'oldpass123']);

        $this->actingAs($user, 'sanctum')->putJson('/api/auth/password', [
            'current_password' => 'oldpass123',
            'password' => 'brandnew123',
            'password_confirmation' => 'brandnew123',
        ])->assertOk();

        $this->assertTrue(Hash::check('brandnew123', $user->fresh()->password));
    }

    public function test_password_change_requires_correct_current_password(): void
    {
        $user = $this->staff('cashier', ['password' => 'oldpass123']);

        $this->actingAs($user, 'sanctum')->putJson('/api/auth/password', [
            'current_password' => 'WRONG',
            'password' => 'brandnew123',
            'password_confirmation' => 'brandnew123',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');
    }
}
