<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Front-side badge template, one per department.
 *
 * @property int $id
 * @property int $dep_id
 * @property string $content
 * @property int $width
 * @property int $heigth column is genuinely misspelled in the live schema
 */
class Badge extends Model
{
    protected $table = 'badges';

    protected $fillable = [
        'dep_id',
        'content',
        'width',
        'heigth',
    ];
}
