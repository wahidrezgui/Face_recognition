<?php

namespace App\Http\Requests\Gate;

use Illuminate\Foundation\Http\FormRequest;

class SyncMovementsRequest extends FormRequest
{
    private const PLATE_NUMBER_MAX_LENGTH = 20;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array'],
            'items.*.client_request_id' => ['required', 'uuid'],
            'items.*.emp_id' => ['required_without:items.*.qrcode', 'nullable', 'integer'],
            'items.*.qrcode' => ['required_without:items.*.emp_id', 'nullable', 'string'],
            'items.*.mvtype' => ['required', 'in:Check-In,Check-Out'],
            'items.*.base_id' => ['required', 'integer', 'exists:bases,id'],
            'items.*.gate_id' => ['required', 'integer', 'exists:gates,id'],
            'items.*.platenumber' => ['nullable', 'string', 'max:'.self::PLATE_NUMBER_MAX_LENGTH],
            'items.*.automatic' => ['required', 'boolean'],
            // The real event time, captured client-side at scan/queue time — not sync time.
            'items.*.queued_at' => ['nullable', 'date'],
            'items.*.mvdate' => ['nullable', 'date'],
            'items.*.mvtime' => ['nullable', 'date_format:H:i'],
        ];
    }
}
