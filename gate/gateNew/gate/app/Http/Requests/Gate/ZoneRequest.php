<?php

namespace App\Http\Requests\Gate;

use Illuminate\Foundation\Http\FormRequest;

class ZoneRequest extends FormRequest
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
            'color' => ['required', 'string', 'max:32'],
            'pattern_type' => ['nullable', 'string', 'in:none,line,cross'],
            'pattern_color' => ['required_unless:pattern_type,none', 'nullable', 'string', 'max:32'],
        ];
    }
}
