<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Ingredient;
use App\Models\Product;
use App\Models\ProductOptionGroup;
use App\Models\RecipeItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeedStarterDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_inventory_menu_and_customization(): void
    {
        $this->artisan('app:seed-starter')->assertSuccessful();

        $this->assertGreaterThan(0, Ingredient::count());
        $this->assertGreaterThan(0, Product::count());
        $this->assertDatabaseHas('products', ['slug' => 'americano']);
        $this->assertGreaterThan(0, RecipeItem::count());
        // Customization: seeded drinks get Cup Size / Sugar / Ice / Add-ons groups.
        $this->assertGreaterThan(0, ProductOptionGroup::count());
        $this->assertDatabaseHas('product_option_groups', ['name' => 'Cup Size']);
    }

    public function test_if_empty_skips_when_catalog_not_empty(): void
    {
        $cat = Category::create(['name' => 'X', 'slug' => 'x', 'sort_order' => 0, 'is_active' => true]);
        Product::create(['category_id' => $cat->id, 'name' => 'Y', 'slug' => 'y', 'base_price' => 10, 'prep_time_minutes' => 1, 'is_active' => true]);

        $this->artisan('app:seed-starter', ['--if-empty' => true])->assertSuccessful();

        // The inventory seeder never ran, so no ingredients were created.
        $this->assertSame(0, Ingredient::count());
    }
}
