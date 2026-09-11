<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tenant_provisioning_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->enum('status', ['PENDING', 'PROVISIONING', 'COMPLETED', 'FAILED', 'ROLLBACK'])->default('PENDING');
            $table->text('error_message')->nullable();
            $table->json('diagnostics')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_provisioning_jobs');
    }
};
