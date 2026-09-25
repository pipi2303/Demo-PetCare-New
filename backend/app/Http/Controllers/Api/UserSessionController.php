<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * §14, reusing Phase 1's `sessions` table directly (the doc's §2.2
 * `user_sessions` and Laravel's own database-session-driver table are the
 * same concept here — no separate table, no Eloquent model needed for it).
 */
class UserSessionController extends Controller
{
    public function index(User $user): JsonResponse
    {
        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity']);

        return response()->json(['success' => true, 'data' => $sessions]);
    }

    public function revoke(Request $request, User $user): JsonResponse
    {
        $request->validate(['session_id' => ['required', 'string']]);

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', $request->string('session_id'))
            ->delete();

        $this->audit($user);

        return response()->json(['success' => true]);
    }

    public function revokeAll(User $user): JsonResponse
    {
        DB::table('sessions')->where('user_id', $user->id)->delete();

        $this->audit($user);

        return response()->json(['success' => true]);
    }

    private function audit(User $user): void
    {
        AuditLog::create([
            'event' => 'SESSION_REVOKED',
            'actor_user_id' => Auth::guard('web')->id(),
            'target_user_id' => $user->id,
        ]);
    }
}
