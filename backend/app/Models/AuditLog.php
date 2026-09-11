<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant-level audit log (§18.1). Immutable — no `updated_at` column.
 */
#[Fillable(['event', 'actor_user_id', 'target_user_id', 'metadata', 'before', 'after'])]
class AuditLog extends Model
{
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
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }
}
