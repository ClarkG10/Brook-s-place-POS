<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->enum('source', ['qr', 'tablet', 'pos'])->default('qr');
            $table->string('table_number')->nullable();

            $table->enum('status', ['incoming', 'preparing', 'ready', 'completed', 'cancelled'])
                ->default('incoming');

            $table->string('customer_name')->nullable();
            $table->text('notes')->nullable();

            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('service_charge', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);

            $table->enum('payment_method', ['cash', 'gcash', 'card', 'other'])->nullable();
            $table->string('payment_reference')->nullable();
            $table->decimal('amount_tendered', 10, 2)->nullable();
            $table->decimal('change_due', 10, 2)->nullable();
            $table->boolean('is_paid')->default(false);

            // Set true once inventory has been deducted (guards double-deduction).
            $table->boolean('inventory_deducted')->default(false);

            $table->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('placed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('table_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
