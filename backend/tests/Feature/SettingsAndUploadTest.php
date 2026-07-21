<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SettingsAndUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_show_includes_palettes(): void
    {
        $this->seed(\Database\Seeders\StoreSettingsSeeder::class);

        $this->actingAs($this->staff('cashier'), 'sanctum')->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonStructure([
                'shop_name', 'currency_symbol', 'tax_rate',
                'public_theme' => ['palette', 'tokens'],
                'admin_theme' => ['palette', 'tokens'],
                'palettes' => ['public', 'admin'],
            ]);
    }

    public function test_owner_updates_settings_and_palette(): void
    {
        $this->seed(\Database\Seeders\StoreSettingsSeeder::class);

        $this->actingAs($this->owner(), 'sanctum')->putJson('/api/admin/settings', [
            'shop_name' => 'Bean Scene',
            'tagline' => 'Sip happens',
            'tax_rate' => 12,
            'public_palette' => 'matcha',
            'admin_palette' => 'slate',
            'admin_mode' => 'dark',
        ])->assertOk()
            ->assertJsonPath('shop_name', 'Bean Scene')
            ->assertJsonPath('public_theme.palette', 'matcha')
            ->assertJsonPath('admin_theme.palette', 'slate');
    }

    public function test_settings_rejects_unknown_palette(): void
    {
        $this->seed(\Database\Seeders\StoreSettingsSeeder::class);

        $this->actingAs($this->owner(), 'sanctum')->putJson('/api/admin/settings', [
            'shop_name' => 'X', 'public_palette' => 'rainbow-unicorn',
        ])->assertStatus(422)->assertJsonValidationErrors('public_palette');
    }

    public function test_image_upload_returns_public_url(): void
    {
        Storage::fake('public');

        $res = $this->actingAs($this->staff('manager'), 'sanctum')->postJson('/api/admin/uploads', [
            'image' => UploadedFile::fake()->image('drink.jpg', 400, 400),
        ])->assertCreated()->assertJsonStructure(['path', 'url']);

        Storage::disk('public')->assertExists($res->json('path'));
    }

    public function test_upload_rejects_non_image(): void
    {
        Storage::fake('public');

        $this->actingAs($this->staff('manager'), 'sanctum')->postJson('/api/admin/uploads', [
            'image' => UploadedFile::fake()->create('resume.pdf', 100, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }
}
