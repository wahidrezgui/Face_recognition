<?php

namespace App\Http\Requests\Identity;

use App\Domain\AccessControl\AccessCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `dep_id` of '' means "cleared" -> null. `password` of '' means "leave
     * unchanged" -> null (the service strips a null password before saving, never
     * hashing an empty string). `default_base` of '' or 0 both mean "no base" ->
     * null, so `exists:bases,id` only ever checks a real id; the service coerces
     * null back to 0 before saving, matching the live NOT NULL DEFAULT 0 column.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(collect($this->only(['dep_id', 'password', 'military_number']))
            ->map(fn ($value) => $value === '' ? null : $value)
            ->all());

        $defaultBase = $this->input('default_base');
        $this->merge(['default_base' => in_array($defaultBase, ['', 0, '0', null], true) ? null : $defaultBase]);
    }

    public function rules(): array
    {
        return [
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')->ignore($this->route('user'))],
            'military_number' => ['required', 'integer', 'max:2147483647'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(AccessCatalog::assignableRoleNamesForActor($this->user()))],
            'dep_id' => [
                Rule::requiredIf(fn () => AccessCatalog::roleRequiresDepartment((string) $this->input('role'))),
                'nullable', 'integer', 'exists:departments,id',
            ],
            'default_base' => ['nullable', 'integer', 'exists:bases,id'],
            'activate_sso' => ['sometimes', 'boolean'],
        ];
    }
}
