<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Idempotent owner/staff account provisioning for production.
 *
 * Why this exists: deploys run `migrate` but never `db:seed` (the seeder holds
 * weak demo passwords), so there is no automatic account. This command ensures
 * the settings row and creates/updates one real account from flags or
 * OWNER_EMAIL / OWNER_USERNAME / OWNER_PASSWORD env.
 *
 *   php artisan app:create-owner --email=you@shop.com --password=secret
 *   php artisan app:create-owner                       # prompts, hiding the password
 *   php artisan app:create-owner --if-missing -n       # deploy-safe: bootstrap first owner only
 *
 * Deploy-safe: with --if-missing it no-ops once an owner exists (so a password the
 * owner later changes in-app is never clobbered), and run non-interactively with no
 * credentials it skips gracefully instead of prompting or failing the deploy.
 */
class CreateOwner extends Command
{
    protected $signature = 'app:create-owner
        {--email= : Owner email (falls back to OWNER_EMAIL env)}
        {--username= : Login username (falls back to OWNER_USERNAME env, then the email local-part)}
        {--password= : Owner password (falls back to OWNER_PASSWORD env)}
        {--name=Owner : Display name}
        {--role=owner : One of owner|manager|cashier|barista}
        {--if-missing : Only create when no owner exists yet (safe to run on every deploy)}';

    protected $description = 'Ensure the store settings row and create/update a staff account (idempotent)';

    public function handle(): int
    {
        Setting::current(); // guarantee the settings row exists

        if ($this->option('if-missing') && User::where('role', 'owner')->exists()) {
            $this->info('An owner account already exists — skipping.');

            return self::SUCCESS;
        }

        $email = $this->option('email') ?: env('OWNER_EMAIL');
        $password = $this->option('password') ?: env('OWNER_PASSWORD');
        $name = $this->option('name') ?: 'Owner';
        $role = $this->option('role') ?: 'owner';

        // Prompt only when a human is driving; -n / deploy runs fall through.
        if (! $email && $this->input->isInteractive()) {
            $email = $this->ask('Owner email');
        }
        if (! $password && $this->input->isInteractive()) {
            $password = $this->secret('Owner password (input hidden)');
        }

        if (! $email || ! $password) {
            // Non-interactive with no credentials: don't break the deploy, just skip.
            $this->warn('No owner credentials provided (set OWNER_EMAIL / OWNER_PASSWORD, or pass --email/--password). Skipping account creation.');

            return self::SUCCESS;
        }

        if (! in_array($role, User::ROLES, true)) {
            $this->error("Invalid role '{$role}'. Allowed: ".implode(', ', User::ROLES));

            return self::FAILURE;
        }

        $email = strtolower(trim($email));
        $username = $this->option('username') ?: env('OWNER_USERNAME') ?: strtok($email, '@');

        // password uses the model's 'hashed' cast — pass plaintext, never bcrypt() here.
        $user = User::updateOrCreate(
            ['email' => $email],
            ['name' => $name, 'username' => $username, 'role' => $role, 'password' => $password],
        );

        $this->info("Account ready: {$user->email} (role: {$user->role})");

        return self::SUCCESS;
    }
}
