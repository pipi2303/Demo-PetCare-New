<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Navigation\NavigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NavigationController extends Controller
{
    public function __construct(private NavigationService $navigation) {}

    public function index(): JsonResponse
    {
        return response()->json(['items' => $this->navigation->forUser(Auth::guard('web')->user())]);
    }
}
