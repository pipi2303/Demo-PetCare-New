<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Independent of account lockout (§5.4) — this limits login
        // *attempts* regardless of which account they target.
        RateLimiter::for('login', function ($request) {
            $key = mb_strtolower((string) $request->input('identifier')).'|'.$request->ip();

            return new Limit(
                $key,
                config('authentication.login_rate_limit.max_attempts'),
                config('authentication.login_rate_limit.decay_seconds'),
            );
        });
    }
}
