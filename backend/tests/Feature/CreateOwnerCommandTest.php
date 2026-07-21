<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateOwnerCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_owner_and_settings_row(): void
    {
        $this->artisan('app:create-owner', [
            '--email' => 'boss@shop.com',
            '--username' => 'boss',
            '--password' => 'password123',
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', ['email' => 'boss@shop.com', 'username' => 'boss', 'role' => 'owner']);
        $this->assertTrue(Hash::check('password123', User::where('email', 'boss@shop.com')->first()->password));
        $this->assertNotNull(Setting::current());
    }

    public function test_it_is_idempotent_and_resets_the_password(): void
    {
        $this->artisan('app:create-owner', ['--email' => 'boss@shop.com', '--password' => 'first12345'])->assertSuccessful();
        $this->artisan('app:create-owner', ['--email' => 'boss@shop.com', '--password' => 'second12345'])->assertSuccessful();

        $this->assertSame(1, User::where('email', 'boss@shop.com')->count());
        $this->assertTrue(Hash::check('second12345', User::where('email', 'boss@shop.com')->first()->password));
    }

    public function test_if_missing_skips_when_an_owner_already_exists(): void
    {
        $this->owner(['email' => 'existing@shop.com']);

        $this->artisan('app:create-owner', [
            '--if-missing' => true,
            '--email' => 'new@shop.com',
            '--password' => 'password123',
        ])->assertSuccessful();

        $this->assertDatabaseMissing('users', ['email' => 'new@shop.com']);
    }

    public function test_non_interactive_without_credentials_skips_without_failing(): void
    {
        // Simulates a deploy run with no OWNER_* env set: ensures settings, no crash, no account.
        $this->artisan('app:create-owner', ['--no-interaction' => true])->assertSuccessful();

        $this->assertSame(0, User::count());
        $this->assertNotNull(Setting::current());
    }
}
