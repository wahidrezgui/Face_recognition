<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string|null $name_en
 * @property string|null $name_ar
 */
class Nationality extends Model
{
    protected $table = 'nationalities';
}
