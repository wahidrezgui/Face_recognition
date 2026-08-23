<?php

namespace App\Http\Requests\Identity;

use App\Domain\AccessControl\AccessCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `dep_id` arrives as an empty string when the department picker is cleared;
     * coerce to null so `nullable` applies instead of failing `integer` on ''.
     * `default_base` of '' or 0 both mean "no base" — coerce both to null here so
     * `exists:bases,id` only ever checks a real id; the service layer coerces null
     * back to 0 before saving, matching the live NOT NULL DEFAULT 0 column.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(collect($this->only(['dep_id', 'military_number']))
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
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'military_number' => ['required', 'integer', 'max:2147483647'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in(AccessCatalog::assignableRoleNamesForActor($this->user()))],
            'dep_id' => [
                Rule::requiredIf(fn () => AccessCatalog::roleRequiresDepartment((string) $this->input('role'))),
                'nullable', 'integer', 'exists:departments,id',
            ],
            'default_base' => ['nullable', 'integer', 'exists:bases,id'],
        ];
    }
}
