<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Permission Guard (§7.4). Route usage: ->middleware('permission:patient.read')
 * or ->middleware('permission:patient.read,patient.update') — comma-separated
 * codes match on ANY (§7.3's canAny), not ALL.
 */
class EnsurePermission
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $codes): Response
    {
        $user = Auth::guard('web')->user();

        if (! $user || ! $user->hasAnyPermission(explode(',', $codes))) {
            throw new ApiException('FORBIDDEN', 'You do not have permission to perform this action.', 403);
        }

        return $next($request);
    }
}
