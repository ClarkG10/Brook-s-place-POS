<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Single-row store settings. The shop name and per-surface color palettes
 * live here so they are configurable at runtime (not hard-coded).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('shop_name')->default("Brook's Place");
            $table->string('tagline')->nullable();
            $table->string('logo_url')->nullable();

            $table->string('currency_code', 8)->default('PHP');
            $table->string('currency_symbol', 8)->default('₱');
            $table->decimal('tax_rate', 5, 2)->default(0);        // percent
            $table->boolean('tax_inclusive')->default(true);
            $table->decimal('service_charge_rate', 5, 2)->default(0);

            $table->string('receipt_header')->nullable();
            $table->string('receipt_footer')->nullable();

            // Color palettes — separate for each surface. See config/palettes.php.
            $table->json('public_theme')->nullable();  // customer ordering app
            $table->json('admin_theme')->nullable();    // management portal

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
