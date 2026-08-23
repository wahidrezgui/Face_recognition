<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name_en
 * @property string $name_ar
 * @property int $ordre
 */
class RankCategory extends Model
{
    protected $table = 'ranks_categories';
}
