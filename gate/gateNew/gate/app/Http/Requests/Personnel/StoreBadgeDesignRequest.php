<?php

namespace App\Http\Requests\Personnel;

use Illuminate\Foundation\Http\FormRequest;

class StoreBadgeDesignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // An intentionally cleared/zero-element canvas is a valid save, not an error.
            'content' => ['nullable', 'string'],
            'width' => ['required', 'integer', 'min:1'],
            'height' => ['required', 'integer', 'min:1'],
            'apply_to_children' => ['nullable', 'boolean'],
        ];
    }
}
