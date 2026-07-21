<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->decimal('base_price', 10, 2)->default(0);
            $table->string('image_url')->nullable();
            $table->unsignedSmallInteger('prep_time_minutes')->default(5);

            $table->boolean('is_active')->default(true);      // staff on/off switch
            $table->boolean('is_popular')->default(false);     // "Best Seller" badge
            $table->boolean('is_new')->default(false);
            // Manual override; the real availability is computed from inventory.
            $table->boolean('manual_sold_out')->default(false);

            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['category_id', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
