<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompanyReportFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'preset' => ['required', Rule::in(['companiesReporting', 'companiesIssues'])],
            'dep_id' => ['nullable', 'integer', 'exists:departments,id'],
            'day' => ['nullable', 'date'],
            'mvtype' => ['nullable', 'array'],
            'mvtype.*' => ['in:Check-In,Check-Out'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }
}
