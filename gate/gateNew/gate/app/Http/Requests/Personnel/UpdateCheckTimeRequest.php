<?php

namespace App\Http\Requests\Personnel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCheckTimeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dep_id' => [
                'required',
                'integer',
                'exists:departments,id',
                Rule::unique('check_times')
                    ->where(
                        fn ($query) => $query->where('gender_id', $this->input('gender_id'))->where('rank_id', $this->input('rank_id'))
                    )
                    ->ignore($this->route('checkTime')),
            ],
            'gender_id' => ['required', 'integer', 'exists:genders,id'],
            'rank_id' => ['required', 'integer', 'exists:ranks_categories,id'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
        ];
    }
}
