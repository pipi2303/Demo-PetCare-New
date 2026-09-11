<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Platform-level roles are coarse-grained (PLATFORM_SUPER_ADMIN /
     * PLATFORM_ADMIN, seeded in Phase 4) — unlike tenant RBAC, there is no
     * separate platform permissions table per the master prompt (§2.1).
     */
    public function up(): void
    {
        Schema::create('platform_user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['PLATFORM_SUPER_ADMIN', 'PLATFORM_ADMIN']);
            $table->timestamps();

            $table->unique(['platform_user_id', 'role']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_user_roles');
    }
};
