<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Bases extends Model
{
    use HasFactory;

    protected $fillable = [
        'name_en',
        'name_ar',
        'base_photo',
    ];
    
    public function Gates()
    {
        return $this->hasMany(Gates::class, 'base_id', 'id');
    }

    public function Zones()
    {
        return $this->hasMany(Zones::class, 'base_id', 'id');
    }
}
