<?php

use App\Exceptions\ApiException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Stancl\Tenancy\Contracts\TenantCouldNotBeIdentifiedException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // This is a JSON API, not Blade-form-driven — CSRF protection here
        // will come from Sanctum's stateful-SPA cookie flow once the React
        // frontend is wired up (deferred, see the Phase 5 plan), which
        // brings its own token exchange. Until then there's no CSRF
        // token issuance path for these routes, so requiring one would
        // just lock every API client out.
        $middleware->validateCsrfTokens(except: ['api/*']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // An unresolvable tenant domain is client input (a bad/unknown host),
        // not a server fault — respond with the project's standard error
        // envelope (§22) instead of leaking a 500 + stack trace.
        $exceptions->render(function (TenantCouldNotBeIdentifiedException $e, Request $request) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TENANT_NOT_FOUND',
                    'message' => 'No tenant could be resolved for this request.',
                ],
            ], 404);
        });

        // Domain-level failures (auth, lockout, etc.) — the standard
        // envelope (§22), carrying whatever status/code the throw site chose.
        $exceptions->render(function (ApiException $e, Request $request) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => $e->errorCode,
                    'message' => $e->getMessage(),
                ],
            ], $e->status);
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => $e->getMessage(),
                    'fields' => $e->errors(),
                ],
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'Authentication is required to access this resource.',
                ],
            ], 401);
        });
    })->create();
