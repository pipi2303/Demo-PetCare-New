<?php

declare(strict_types=1);

use App\Http\Controllers\Api\Platform\Auth\LoginController;
use App\Http\Controllers\Api\Platform\Auth\PasswordResetController;
use App\Http\Controllers\Api\Platform\TenantController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/api/platform/auth/login', [LoginController::class, 'login'])->middleware('throttle:login');
Route::post('/api/platform/auth/password-reset/request', [PasswordResetController::class, 'request']);
Route::post('/api/platform/auth/password-reset/confirm', [PasswordResetController::class, 'confirm']);

Route::middleware('auth:platform')->group(function () {
    Route::post('/api/platform/auth/logout', [LoginController::class, 'logout']);
    Route::get('/api/platform/auth/me', [LoginController::class, 'me']);

    // Phase 7 will add granular permission checks on top of this; for now
    // these are gated only by being a logged-in platform user.
    Route::get('/api/platform/tenants', [TenantController::class, 'index']);
    Route::post('/api/platform/tenants', [TenantController::class, 'store']);
    Route::get('/api/platform/tenants/{tenant}', [TenantController::class, 'show']);
    Route::patch('/api/platform/tenants/{tenant}', [TenantController::class, 'update']);
    Route::post('/api/platform/tenants/{tenant}/activate', [TenantController::class, 'activate']);
    Route::post('/api/platform/tenants/{tenant}/suspend', [TenantController::class, 'suspend']);
    Route::post('/api/platform/tenants/{tenant}/retry-provisioning', [TenantController::class, 'retryProvisioning']);
});
