<?php

namespace App\Http\Requests\Gate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitMovementRequest extends FormRequest
{
    private const PLATE_NUMBER_MAX_LENGTH = 20;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'emp_id' => ['required_without:qrcode', 'nullable', 'integer', 'exists:employees,id'],
            'qrcode' => ['required_without:emp_id', 'nullable', 'string'],
            'mvtype' => ['required', 'in:Check-In,Check-Out'],
            'base_id' => ['required', 'integer', 'exists:bases,id'],
            'gate_id' => ['required', 'integer', 'exists:gates,id'],
            'platenumber' => ['nullable', 'string', 'max:'.self::PLATE_NUMBER_MAX_LENGTH],
            'automatic' => ['required', 'boolean'],
            'client_request_id' => ['required', 'uuid'],
            // Manual path: guard-edited, required. Auto path: MovementService stamps now() in app timezone.
            'mvdate' => [Rule::requiredIf(fn () => ! $this->boolean('automatic')), 'nullable', 'date', 'before_or_equal:today'],
            'mvtime' => [Rule::requiredIf(fn () => ! $this->boolean('automatic')), 'nullable', 'date_format:H:i'],
        ];
    }
}
