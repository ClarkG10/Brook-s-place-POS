<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Ingredient;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\ProductOptionGroup;
use App\Models\RecipeItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MenuSeeder extends Seeder
{
    /** @var array<string,int> ingredient name => id */
    private array $ing = [];

    public function run(): void
    {
        $this->ing = Ingredient::query()->pluck('id', 'name')->all();

        // [name, icon (Lucide), color, isDrink]
        $categories = [
            ['Coffee', 'coffee', '#6f4e37', true],
            ['Milk Tea', 'cup-soda', '#b5651d', true],
            ['Fruit Tea', 'citrus', '#e08a1e', true],
            ['Smoothies', 'blend', '#d94f70', true],
            ['Non-Coffee', 'leaf', '#3f8f5b', true],
            ['Snacks', 'cookie', '#b98037', false],
        ];

        $products = [
            // [category, name, price, [badges], [recipe name=>qty], [addon codes]]
            ['Coffee', 'Café Latte', 120, ['popular'], ['Coffee Beans' => 18, 'Fresh Milk' => 200, 'Ice' => 100], ['extra_shot', 'oat_milk', 'whipped_cream']],
            ['Coffee', 'Spanish Latte', 140, ['popular', 'new'], ['Coffee Beans' => 18, 'Fresh Milk' => 180, 'Sugar Syrup' => 20, 'Ice' => 100], ['extra_shot', 'oat_milk', 'whipped_cream']],
            ['Coffee', 'Americano', 100, [], ['Coffee Beans' => 18, 'Ice' => 120], ['extra_shot']],
            ['Coffee', 'Cappuccino', 130, [], ['Coffee Beans' => 18, 'Fresh Milk' => 150], ['extra_shot', 'oat_milk']],

            ['Milk Tea', 'Brown Sugar Pearl Milk Tea', 140, ['popular'], ['Black Tea' => 8, 'Fresh Milk' => 150, 'Brown Sugar Syrup' => 30, 'Tapioca Pearls' => 30, 'Ice' => 100], ['pearls', 'coffee_jelly', 'cream_cheese']],
            ['Milk Tea', 'Classic Milk Tea', 110, [], ['Black Tea' => 8, 'Fresh Milk' => 150, 'Sugar Syrup' => 20, 'Ice' => 100], ['pearls', 'coffee_jelly']],
            ['Milk Tea', 'Wintermelon Milk Tea', 120, ['new'], ['Black Tea' => 8, 'Fresh Milk' => 150, 'Sugar Syrup' => 25, 'Ice' => 100], ['pearls', 'coffee_jelly']],
            ['Milk Tea', 'Matcha Milk Tea', 150, [], ['Matcha Powder' => 8, 'Fresh Milk' => 180, 'Sugar Syrup' => 15, 'Ice' => 100], ['pearls', 'cream_cheese']],

            ['Fruit Tea', 'Mango Fruit Tea', 130, ['popular'], ['Black Tea' => 6, 'Fresh Mango' => 120, 'Sugar Syrup' => 20, 'Ice' => 120], ['pearls', 'coffee_jelly']],
            ['Fruit Tea', 'Wintermelon Fruit Tea', 115, [], ['Black Tea' => 6, 'Sugar Syrup' => 25, 'Ice' => 120], ['pearls']],

            ['Smoothies', 'Mango Smoothie', 160, ['popular'], ['Fresh Mango' => 150, 'Fresh Milk' => 100, 'Sugar Syrup' => 20, 'Ice' => 200], ['whipped_cream']],
            ['Smoothies', 'Matcha Smoothie', 165, [], ['Matcha Powder' => 10, 'Fresh Milk' => 150, 'Sugar Syrup' => 20, 'Ice' => 200], ['whipped_cream']],

            ['Non-Coffee', 'Iced Chocolate', 120, [], ['Fresh Milk' => 200, 'Sugar Syrup' => 25, 'Ice' => 100], ['whipped_cream', 'oat_milk']],
            ['Non-Coffee', 'Matcha Latte', 145, ['new'], ['Matcha Powder' => 8, 'Fresh Milk' => 200, 'Sugar Syrup' => 15, 'Ice' => 100], ['whipped_cream', 'oat_milk']],

            ['Snacks', 'Butter Croissant', 90, ['popular'], ['Napkin' => 1], []],
            ['Snacks', 'Chocolate Chip Cookie', 60, [], ['Napkin' => 1], []],
            ['Snacks', 'Cheesecake Slice', 130, [], ['Napkin' => 1], []],
        ];

        $categoryModels = [];
        foreach ($categories as $order => [$name, $icon, $color, $isDrink]) {
            $categoryModels[$name] = Category::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'icon' => $icon, 'color' => $color, 'sort_order' => $order, 'is_active' => true],
            );
        }

        foreach ($products as $order => [$cat, $name, $price, $badges, $recipe, $addons]) {
            $isDrink = $categories[array_search($cat, array_column($categories, 0))][3];

            $product = Product::updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'category_id' => $categoryModels[$cat]->id,
                    'name' => $name,
                    'description' => $this->describe($name),
                    'base_price' => $price,
                    'prep_time_minutes' => $isDrink ? 5 : 2,
                    'is_active' => true,
                    'is_popular' => in_array('popular', $badges, true),
                    'is_new' => in_array('new', $badges, true),
                    'sort_order' => $order,
                ],
            );

            // Recipe (+ packaging for drinks).
            $product->recipeItems()->delete();
            $fullRecipe = $recipe;
            if ($isDrink) {
                $fullRecipe += ['Cup 16oz' => 1, 'Dome Lid' => 1, 'Straw' => 1];
            }
            foreach ($fullRecipe as $ingName => $qty) {
                if (! isset($this->ing[$ingName])) {
                    continue;
                }
                RecipeItem::create([
                    'product_id' => $product->id,
                    'ingredient_id' => $this->ing[$ingName],
                    'quantity' => $qty,
                ]);
            }

            // Customization groups.
            $product->optionGroups()->delete();
            if ($isDrink) {
                $this->addGroup($product, 'Cup Size', 1, 1, true, 0, [
                    ['Small', -10, false], ['Medium', 0, true], ['Large', 20, false],
                ]);
                $this->addGroup($product, 'Sugar Level', 1, 1, true, 1, [
                    ['0%', 0, false], ['25%', 0, false], ['50%', 0, true], ['75%', 0, false], ['100%', 0, false],
                ]);
                $this->addGroup($product, 'Ice Level', 1, 1, true, 2, [
                    ['No Ice', 0, false], ['Less Ice', 0, false], ['Normal', 0, true], ['Extra Ice', 0, false],
                ]);
            }
            if ($addons) {
                $this->addAddonGroup($product, $addons, 3);
            }
        }
    }

    private function addGroup(Product $product, string $name, int $min, int $max, bool $required, int $sort, array $options): void
    {
        $group = ProductOptionGroup::create([
            'product_id' => $product->id, 'name' => $name,
            'min_select' => $min, 'max_select' => $max, 'is_required' => $required, 'sort_order' => $sort,
        ]);
        foreach ($options as $i => [$optName, $delta, $default]) {
            ProductOption::create([
                'option_group_id' => $group->id, 'name' => $optName,
                'price_delta' => $delta, 'is_default' => $default, 'sort_order' => $i,
            ]);
        }
    }

    private function addAddonGroup(Product $product, array $codes, int $sort): void
    {
        $catalog = [
            'pearls' => ['Pearls', 15, 'Tapioca Pearls', 30],
            'coffee_jelly' => ['Coffee Jelly', 15, 'Coffee Jelly', 30],
            'cream_cheese' => ['Cream Cheese Foam', 25, 'Cream Cheese', 30],
            'extra_shot' => ['Extra Shot', 25, 'Coffee Beans', 18],
            'oat_milk' => ['Oat Milk', 20, 'Oat Milk', 60],
            'whipped_cream' => ['Whipped Cream', 15, 'Whipped Cream', 30],
        ];

        $group = ProductOptionGroup::create([
            'product_id' => $product->id, 'name' => 'Add-ons',
            'min_select' => 0, 'max_select' => count($codes), 'is_required' => false, 'sort_order' => $sort,
        ]);

        foreach ($codes as $i => $code) {
            [$optName, $delta, $ingName, $qty] = $catalog[$code];
            ProductOption::create([
                'option_group_id' => $group->id, 'name' => $optName,
                'price_delta' => $delta, 'is_default' => false, 'sort_order' => $i,
                'consumes_ingredient_id' => $this->ing[$ingName] ?? null,
                'consume_quantity' => $qty,
            ]);
        }
    }

    private function describe(string $name): string
    {
        return match ($name) {
            'Café Latte' => 'Smooth espresso with steamed milk over ice.',
            'Spanish Latte' => 'Espresso with sweet condensed-style milk.',
            'Americano' => 'Bold espresso with cold water and ice.',
            'Cappuccino' => 'Espresso with a light, airy milk foam.',
            'Brown Sugar Pearl Milk Tea' => 'Caramelized brown sugar, chewy pearls, fresh milk.',
            'Classic Milk Tea' => 'Our signature black tea with creamy milk.',
            'Wintermelon Milk Tea' => 'Sweet wintermelon with milk tea.',
            'Matcha Milk Tea' => 'Stone-ground matcha with fresh milk.',
            'Mango Fruit Tea' => 'Fresh mango shaken with black tea.',
            'Wintermelon Fruit Tea' => 'Refreshing wintermelon tea, no dairy.',
            'Mango Smoothie' => 'Blended fresh mango and milk.',
            'Matcha Smoothie' => 'Icy blended matcha and milk.',
            'Iced Chocolate' => 'Rich chocolate with fresh milk over ice.',
            'Matcha Latte' => 'Premium matcha with fresh milk.',
            'Butter Croissant' => 'Flaky, buttery, baked fresh daily.',
            'Chocolate Chip Cookie' => 'Warm, gooey, loaded with chocolate.',
            'Cheesecake Slice' => 'Creamy New York-style cheesecake.',
            default => 'A Brook\'s Place favorite.',
        };
    }
}
