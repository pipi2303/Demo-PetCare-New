<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Here you can register the tenant routes for your application.
| These routes are loaded by the TenantRouteServiceProvider.
|
| Feel free to customize them however you want. Good luck!
|
*/

Route::middleware([
    'web',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    // Phase 1 acceptance-test endpoint: proves each tenant domain resolves to
    // its own isolated tenant context (and, transitively, its own database).
    Route::get('/api/tenant/ping', function () {
        return response()->json([
            'tenant_id' => tenant('id'),
            'database' => tenant()->database()->getName(),
            'message' => 'pong',
        ]);
    });

    // Temporary Phase 1 isolation-proof endpoint (removed once real tenant
    // user endpoints land in Phase 9). Confirms queries only ever see rows
    // from the current tenant's own database.
    Route::get('/api/tenant/_debug/users', function () {
        return response()->json([
            'tenant_id' => tenant('id'),
            'users' => DB::table('users')->get(['id', 'username', 'email']),
        ]);
    });
});
