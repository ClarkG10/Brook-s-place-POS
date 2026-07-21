<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets an option REPLACE a base-recipe ingredient (e.g. "Oat Milk" removes the
 * recipe's Fresh Milk and instead consumes Oat Milk). consumes_ingredient_id +
 * consume_quantity handle the "add"; replaces_ingredient_id handles the "remove".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_options', function (Blueprint $table) {
            $table->foreignId('replaces_ingredient_id')->nullable()->after('consume_quantity')
                ->constrained('ingredients')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('product_options', function (Blueprint $table) {
            $table->dropConstrainedForeignId('replaces_ingredient_id');
        });
    }
};
