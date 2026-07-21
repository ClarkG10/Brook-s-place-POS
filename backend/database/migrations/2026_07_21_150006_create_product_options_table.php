<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A single choice within a group, e.g. "Large" (+20), "Pearls" (+15).
 * An option can optionally consume extra inventory (e.g. Pearls -> pearls stock).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('option_group_id')->constrained('product_option_groups')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('price_delta', 10, 2)->default(0);
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('sort_order')->default(0);

            // Optional inventory consumption when this option is chosen.
            $table->foreignId('consumes_ingredient_id')->nullable()->constrained('ingredients')->nullOnDelete();
            $table->decimal('consume_quantity', 12, 3)->default(0);

            $table->timestamps();

            $table->index(['option_group_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_options');
    }
};
