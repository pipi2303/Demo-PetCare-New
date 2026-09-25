<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Models\Department;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Department::with('children')->whereNull('parent_id')->get()]);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $department->load('children')]);
    }

    public function store(CreateDepartmentRequest $request): JsonResponse
    {
        $department = Department::create($request->validated());

        return response()->json(['success' => true, 'data' => $department], 201);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $department->update($request->validated());

        return response()->json(['success' => true, 'data' => $department->fresh()]);
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return response()->json(['success' => true]);
    }
}
