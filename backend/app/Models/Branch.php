<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['code', 'name', 'address', 'phone', 'email', 'is_active', 'is_main_branch'])]
class Branch extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_main_branch' => 'boolean',
        ];
    }
}
