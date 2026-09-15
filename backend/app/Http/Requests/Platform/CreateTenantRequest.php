<?php

declare(strict_types=1);

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;

class CreateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'id' => ['required', 'string', 'max:63', 'alpha_dash', 'unique:tenants,id'],
            'name' => ['required', 'string', 'max:255'],
            'domain' => ['required', 'string', 'max:255', 'unique:domains,domain'],
            'admin' => ['required', 'array'],
            'admin.first_name' => ['required', 'string', 'max:255'],
            'admin.last_name' => ['nullable', 'string', 'max:255'],
            'admin.email' => ['required', 'string', 'email', 'max:255'],
            'admin.username' => ['nullable', 'string', 'max:255'],
            'features' => ['sometimes', 'array'],
            'features.*' => ['string', 'exists:features,code'],
        ];
    }
}
