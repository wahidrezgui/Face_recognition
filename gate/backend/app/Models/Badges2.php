<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Badges2 extends Model
{
    use HasFactory;
    protected $table = 'badges2';
    protected $fillable = [
        'dep_id',
        'content',
        'width',
        'heigth'
    ];
}
