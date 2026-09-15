<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AcceptInvitationRequest;
use App\Services\Auth\InvitationService;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    public function __construct(private InvitationService $invitations) {}

    public function accept(AcceptInvitationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = $this->invitations->accept($validated['email'], $validated['token'], $validated['password']);

        return response()->json(['success' => true, 'data' => ['user' => $user]]);
    }
}
