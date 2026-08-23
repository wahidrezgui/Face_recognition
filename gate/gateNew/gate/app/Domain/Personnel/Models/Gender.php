<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name_en
 * @property string $name_ar
 */
class Gender extends Model
{
    protected $table = 'genders';
}
