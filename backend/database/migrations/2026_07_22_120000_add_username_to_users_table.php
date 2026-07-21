<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Nullable + unique so existing rows don't collide; login accepts
            // either username or email, so old accounts keep working.
            $table->string('username')->nullable()->unique()->after('email');
        });

        // Backfill a sensible username for existing accounts (local-part of email),
        // de-duplicated by id so the unique index never trips.
        foreach (DB::table('users')->whereNull('username')->get(['id', 'email']) as $user) {
            $base = strtolower((string) strtok((string) $user->email, '@')) ?: 'user';
            $username = $base;
            if (DB::table('users')->where('username', $username)->exists()) {
                $username = $base.$user->id;
            }
            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
