<?php

namespace App\Http\Requests\Personnel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name_en' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'parent_id' => ['required', Rule::exists('departments', 'id')->where('is_company', 0)],
            'selected_bases' => ['nullable', 'array'],
            'selected_bases.*' => ['integer'],
            'start_time' => [Rule::requiredIf(fn () => filled($this->input('end_time'))), 'nullable', 'date_format:H:i'],
            'end_time' => [Rule::requiredIf(fn () => filled($this->input('start_time'))), 'nullable', 'date_format:H:i'],
        ];
    }
}
