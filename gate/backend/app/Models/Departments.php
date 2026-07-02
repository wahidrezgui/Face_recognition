<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Departments extends Model
{
    use HasFactory;

    protected $fillable = [
        'name_en',
        'name_ar',
        'parent_id',
        'is_company'
    ];

    public function children2()
    {
        return $this->hasMany(Departments::class, 'parent_id', 'id');
    }

    public function fchildren()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->fchildren()->with('children');
    }

}
