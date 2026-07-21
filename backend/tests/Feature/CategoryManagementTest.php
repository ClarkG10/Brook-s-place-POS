<?php

namespace Tests\Feature;

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_categories_with_product_counts(): void
    {
        $this->seedStore();

        $this->actingAs($this->staff('manager'), 'sanctum')->getJson('/api/admin/categories')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'products_count']]]);
    }

    public function test_create_category_generates_slug(): void
    {
        $res = $this->actingAs($this->staff('manager'), 'sanctum')->postJson('/api/admin/categories', [
            'name' => 'Seasonal Specials', 'icon' => 'sparkles', 'color' => '#ff8800', 'sort_order' => 2,
        ])->assertCreated();

        $this->assertStringStartsWith('seasonal-specials-', $res->json('slug'));
        $this->assertDatabaseHas('categories', ['name' => 'Seasonal Specials']);
    }

    public function test_update_and_delete_category(): void
    {
        $manager = $this->staff('manager');
        $cat = Category::create(['name' => 'Temp', 'slug' => 'temp', 'sort_order' => 0, 'is_active' => true]);

        $this->actingAs($manager, 'sanctum')->putJson("/api/admin/categories/{$cat->id}", ['name' => 'Renamed'])
            ->assertOk()->assertJsonPath('name', 'Renamed');

        $this->actingAs($manager, 'sanctum')->deleteJson("/api/admin/categories/{$cat->id}")->assertNoContent();
        $this->assertDatabaseMissing('categories', ['id' => $cat->id]);
    }

    public function test_create_requires_name(): void
    {
        $this->actingAs($this->staff('manager'), 'sanctum')->postJson('/api/admin/categories', [])
            ->assertStatus(422)->assertJsonValidationErrors('name');
    }
}
