<?php

namespace App\Domain\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $emp_id
 * @property string $plate_number
 * @property string|null $car_description
 * @property int $active
 */
class EmployeeCar extends Model
{
    protected $table = 'employee_cars';

    protected $fillable = [
        'emp_id',
        'plate_number',
        'car_description',
        'active',
    ];
}
