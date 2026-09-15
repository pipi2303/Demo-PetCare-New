<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Account Lockout
    |--------------------------------------------------------------------------
    |
    | Master Prompt §5.4: after `max_attempts` consecutive failed logins,
    | the account is locked for `decay_minutes` (a "temporary lock" — it
    | clears itself once the window passes, in addition to an admin being
    | able to unlock it manually via a future Phase 9 endpoint).
    |
    */
    'lockout' => [
        'max_attempts' => (int) env('AUTH_LOCKOUT_MAX_ATTEMPTS', 5),
        'decay_minutes' => (int) env('AUTH_LOCKOUT_DECAY_MINUTES', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | Login Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Applied per IP + identifier combination, independent of the account
    | lockout above (Master Prompt §5.3).
    |
    */
    'login_rate_limit' => [
        'max_attempts' => (int) env('AUTH_LOGIN_RATE_LIMIT', 5),
        'decay_seconds' => (int) env('AUTH_LOGIN_RATE_LIMIT_DECAY', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Reset
    |--------------------------------------------------------------------------
    */
    'password_reset' => [
        'expire_minutes' => (int) env('AUTH_PASSWORD_RESET_EXPIRE', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | User Invitations
    |--------------------------------------------------------------------------
    |
    | Master Prompt §9.3 — how long a new user (including a freshly
    | provisioned tenant's bootstrap admin, Phase 6) has to accept their
    | invitation before the token expires.
    |
    */
    'invitation' => [
        'expire_days' => (int) env('AUTH_INVITATION_EXPIRE_DAYS', 7),
    ],

];
