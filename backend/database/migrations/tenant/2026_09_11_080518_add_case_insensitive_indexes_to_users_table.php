<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Login must be case-insensitive (§2.5) without rewriting the stored
     * casing (§2.5 explicitly forbids mutating original data), so the
     * lookup is done via LOWER() at query time — backed by these
     * expression indexes rather than a plain column index.
     */
    public function up(): void
    {
        DB::statement('CREATE INDEX users_username_lower_index ON users (LOWER(username))');
        DB::statement('CREATE INDEX users_email_lower_index ON users (LOWER(email))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS users_username_lower_index');
        DB::statement('DROP INDEX IF EXISTS users_email_lower_index');
    }
};
