<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportFilterRequest extends FormRequest
{
    /** Presets that filter a single day rather than a date range. */
    private const SINGLE_DATE_PRESETS = ['reports', 'issues'];

    /** Plain employee-attribute presets — no date filter at all. */
    private const NO_DATE_PRESETS = [
        'deactivatedEmployees', 'expiredCards', 'deactivatedUnreturnedCards',
        'companiesDeactivatedEmployees', 'companiesExpiredCards', 'companiesDeactivatedUnreturnedCards',
    ];

    private const VALID_PRESETS = [
        'reports', 'issues', 'justified', 'unjustified', 'export', 'individual',
        'deactivatedEmployees', 'expiredCards', 'deactivatedUnreturnedCards',
        'companiesDeactivatedEmployees', 'companiesExpiredCards', 'companiesDeactivatedUnreturnedCards',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $preset = $this->input('preset');
        $isSingleDate = in_array($preset, self::SINGLE_DATE_PRESETS, true);
        $isNoDate = in_array($preset, self::NO_DATE_PRESETS, true);

        return [
            'preset' => ['required', Rule::in(self::VALID_PRESETS)],
            'military_number' => ['nullable', 'string', 'max:50'],
            'fullname_ar' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:50'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'rank_ids' => ['nullable', 'array'],
            'rank_ids.*' => ['integer'],
            'base_ids' => ['nullable', 'array'],
            'base_ids.*' => ['integer'],
            'gate_ids' => ['nullable', 'array'],
            'gate_ids.*' => ['integer'],
            'mvtype' => ['nullable', 'in:Check-In,Check-Out'],
            'date' => [Rule::requiredIf($isSingleDate), 'nullable', 'date'],
            'from_date' => [Rule::requiredIf(! $isSingleDate && ! $isNoDate), 'nullable', 'date'],
            'to_date' => [Rule::requiredIf(! $isSingleDate && ! $isNoDate), 'nullable', 'date', 'after_or_equal:from_date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:5000'],
        ];
    }
}
