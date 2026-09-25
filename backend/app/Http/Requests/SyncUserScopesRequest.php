<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SyncUserScopesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Full replace of a user's user_access_scopes rows (§9.8).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'scopes' => ['present', 'array'],
            'scopes.*.scope_type' => ['required', 'in:TENANT,BRANCH,DEPARTMENT,OWN'],
            'scopes.*.branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'scopes.*.department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ];
    }
}
