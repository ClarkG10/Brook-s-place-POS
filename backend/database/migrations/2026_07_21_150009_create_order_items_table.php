<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // Keep the line even if the product is later deleted; name is snapshotted.
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();

            $table->string('product_name');            // snapshot at order time
            $table->decimal('unit_price', 10, 2);      // base + chosen option deltas
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('line_total', 10, 2);
            $table->text('notes')->nullable();

            // Snapshot of chosen customizations:
            // [{ "group": "Cup Size", "name": "Large", "price_delta": 20 }, ...]
            $table->json('options')->nullable();

            $table->timestamps();

            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
