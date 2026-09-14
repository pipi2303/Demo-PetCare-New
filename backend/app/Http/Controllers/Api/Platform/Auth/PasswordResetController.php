<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform\Auth;

use App\Http\Controllers\Api\AbstractPasswordResetController;

class PasswordResetController extends AbstractPasswordResetController
{
    protected function guard(): string
    {
        return 'platform';
    }
}
