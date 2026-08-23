<?php

namespace App\Http\Requests\AccessControl;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'routes' => ['array'],
            'routes.*' => ['string'],
            'resources' => ['array'],
            'resources.*' => ['string', 'in:none,read,write'],
            'scopes' => ['array'],
            'scopes.*' => ['string', 'in:none,global,hierarchy,self'],
        ];
    }
}
