<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateBranchRequest;
use App\Http\Requests\UpdateBranchRequest;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;

class BranchController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Branch::all()]);
    }

    public function show(Branch $branch): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $branch]);
    }

    public function store(CreateBranchRequest $request): JsonResponse
    {
        $branch = Branch::create($request->validated());

        return response()->json(['success' => true, 'data' => $branch], 201);
    }

    public function update(UpdateBranchRequest $request, Branch $branch): JsonResponse
    {
        $branch->update($request->validated());

        return response()->json(['success' => true, 'data' => $branch->fresh()]);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $branch->delete();

        return response()->json(['success' => true]);
    }
}
