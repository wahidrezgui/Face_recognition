<?php

namespace App\Http\Requests\Personnel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Nullable numeric/time fields arrive as an empty string when the user clears a
     * select/input; coerce those to null so the `nullable` rule actually applies
     * instead of failing the paired type rule (e.g. `integer`) on an empty string.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(collect($this->only(['phone_number', 'default_base', 'dep_parent_id', 'StartTime', 'EndTime']))
            ->map(fn ($value) => $value === '' ? null : $value)
            ->all());
    }

    public function rules(): array
    {
        return [
            // Both columns are a plain SQL `int` (max 2147483647) — bounding here turns an
            // oversized value into a clear "must not be greater than" message instead of
            // either a confusing "must be an integer" (PHP's int range is far larger) or,
            // for anything in between, an unhandled DB "out of range value" error.
            'military_number' => ['required', 'integer', 'max:2147483647'],
            'phone_number' => ['nullable', 'integer', 'max:2147483647'],
            'fullname_en' => ['required', 'string', 'max:255'],
            'fullname_ar' => ['required', 'string', 'max:255'],
            'remarks' => ['nullable', 'string', 'max:300'],
            'bloodtype' => ['required', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'qid' => ['nullable', 'string', 'max:255'],
            'Job_Arabic' => ['nullable', 'string', 'max:300'],
            'Job_En' => ['required', 'string', 'max:300'],
            'StartTime' => ['nullable', 'date_format:H:i'],
            'EndTime' => ['nullable', 'date_format:H:i'],
            'Escort' => ['nullable', 'string', 'max:300'],
            'device' => ['nullable', 'string', 'max:300'],
            'expiry_date' => ['required', 'date'],
            'dep_id' => ['required', 'integer'],
            'dep_parent_id' => ['nullable', 'integer'],
            'rank_id' => ['required', 'integer'],
            'nationality_id' => ['required', 'integer'],
            'gender_id' => ['required', 'integer'],
            'default_base' => ['nullable', 'integer'],
            'is_employee' => ['nullable', 'integer', 'in:0,1'],
            'housing' => ['nullable', 'boolean'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'zoning' => ['nullable', 'array'],
            'zoning.*' => ['integer'],
        ];
    }
}
