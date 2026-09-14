<?php

declare(strict_types=1);

use App\Http\Controllers\Api\Platform\Auth\LoginController;
use App\Http\Controllers\Api\Platform\Auth\PasswordResetController;
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
});
