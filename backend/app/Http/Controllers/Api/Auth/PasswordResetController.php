<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\AbstractPasswordResetController;

class PasswordResetController extends AbstractPasswordResetController
{
    protected function guard(): string
    {
        return 'web';
    }
}
