<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Back-side badge template, one per department.
 *
 * Unlike `badges`, the live `badges2.height` column IS spelled correctly — the legacy
 * app's model/controller use `heigth` here too, which is a bug (writes silently fail
 * against a non-existent column). Do not reproduce that; use `height`.
 *
 * @property int $id
 * @property int $dep_id
 * @property string $content
 * @property int $width
 * @property int $height
 */
class Badge2 extends Model
{
    protected $table = 'badges2';

    protected $fillable = [
        'dep_id',
        'content',
        'width',
        'height',
    ];
}
