<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Platform-level audit log (§18.1). Immutable — no `updated_at` column.
 */
#[Fillable(['event', 'actor_platform_user_id', 'target_type', 'target_id', 'metadata', 'before', 'after'])]
class PlatformAuditLog extends Model
{
    protected $table = 'audit_logs';

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'before' => 'array',
            'after' => 'array',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(PlatformUser::class, 'actor_platform_user_id');
    }
}
