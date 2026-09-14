<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\AbstractLoginController;

class LoginController extends AbstractLoginController
{
    protected function guard(): string
    {
        return 'web';
    }
}
