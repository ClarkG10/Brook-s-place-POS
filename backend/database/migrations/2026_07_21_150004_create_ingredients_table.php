<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Raw inventory items: ingredients AND packaging (cups, lids, straws, etc.).
 * stock_quantity is stored in the item's base `unit` (e.g. ml, g, pcs).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('unit', 16);                          // ml | g | pcs | shot
            $table->enum('type', ['ingredient', 'packaging'])->default('ingredient');
            $table->decimal('stock_quantity', 14, 3)->default(0);
            $table->decimal('low_stock_threshold', 14, 3)->default(0);
            $table->decimal('cost_per_unit', 12, 4)->default(0);  // for profit estimates
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
