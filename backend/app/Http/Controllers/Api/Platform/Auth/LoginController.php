<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform\Auth;

use App\Http\Controllers\Api\AbstractLoginController;

class LoginController extends AbstractLoginController
{
    protected function guard(): string
    {
        return 'platform';
    }
}
