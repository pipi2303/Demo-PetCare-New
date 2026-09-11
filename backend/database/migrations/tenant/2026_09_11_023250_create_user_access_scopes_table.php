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
     * Table only for now — enforcement lands in Phase 7/9 (§9.8).
     */
    public function up(): void
    {
        Schema::create('user_access_scopes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('scope_type', ['TENANT', 'BRANCH', 'DEPARTMENT', 'OWN']);
            $table->foreignId('branch_id')->nullable()->constrained('branches')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'scope_type', 'branch_id', 'department_id'], 'user_access_scopes_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_access_scopes');
    }
};
