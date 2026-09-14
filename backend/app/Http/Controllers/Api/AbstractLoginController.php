<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Auth\AuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Shared by the tenant and platform login controllers — only the guard
 * name differs, so the actual login/logout/me logic lives once here.
 */
abstract class AbstractLoginController extends Controller
{
    public function __construct(protected AuthenticationService $authService) {}

    abstract protected function guard(): string;

    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = $this->authService->attempt(
            $this->guard(),
            $validated['identifier'],
            $validated['password'],
            $request,
        );

        return response()->json(['success' => true, 'data' => ['user' => $user]]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($this->guard(), $request);

        return response()->json(['success' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => ['user' => Auth::guard($this->guard())->user()]]);
    }
}
