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
     * Immutable log (§18.1): only created_at is tracked, no updated_at —
     * an audit record must never be edited in place.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event');
            $table->foreignId('actor_platform_user_id')->nullable()->constrained('platform_users')->nullOnDelete();
            $table->string('target_type')->nullable();
            $table->string('target_id')->nullable();
            $table->json('metadata')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('event');
            $table->index(['target_type', 'target_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
