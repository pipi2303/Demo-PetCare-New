<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['platform_user_id', 'role'])]
class PlatformUserRole extends Model
{
    public function platformUser(): BelongsTo
    {
        return $this->belongsTo(PlatformUser::class);
    }
}
