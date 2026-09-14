<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\PasswordResetConfirmRequest;
use App\Http\Requests\Auth\PasswordResetRequestRequest;
use App\Services\Auth\PasswordResetService;
use Illuminate\Http\JsonResponse;

/**
 * Shared by the tenant and platform password-reset controllers — only the
 * guard name differs.
 */
abstract class AbstractPasswordResetController extends Controller
{
    public function __construct(protected PasswordResetService $passwordResetService) {}

    abstract protected function guard(): string;

    public function request(PasswordResetRequestRequest $request): JsonResponse
    {
        $this->passwordResetService->requestReset($this->guard(), $request->validated()['email']);

        // Always the same response whether or not the email exists.
        return response()->json([
            'success' => true,
            'message' => 'If an account with that email exists, a password reset link has been sent.',
        ]);
    }

    public function confirm(PasswordResetConfirmRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->passwordResetService->confirmReset(
            $this->guard(),
            $validated['email'],
            $validated['token'],
            $validated['password'],
        );

        return response()->json(['success' => true, 'message' => 'Password has been reset.']);
    }
}
