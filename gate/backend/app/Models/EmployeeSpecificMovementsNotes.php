<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeSpecificMovementsNotes extends Model
{

    protected $table = 'employee_specific_movements_notes_view';

 
    public $timestamps = false;

    protected $fillable = [
        'id', 
        'department', 
        'dep_id', 
        'rank', 
        'rank_category',
        'rank_category_id', 
        'military_number', 
        'fullname_en', 
        'fullname_ar', 
        'gender', 
        'dep_parent_id', 
        'mvdate', 
        'checkin_mvtime', 
        'checkout_mvtime', 
        'first_mvtype', 
        'last_mvtype', 
        'first_automatic', 
        'last_automatic', 
        'first_gate', 
        'last_gate', 
        'first_base', 
        'last_base',
        'first_gate_id', 
        'last_gate_id', 
        'first_base_id', 
        'last_base_id', 
        'gender_id', 
        'rank_id', 
        'active', 
        'notes',
        'start_time',       // New field
        'end_time',         // New field
        'entry_issue',      // New field
        'exit_issue'        // New fields
    ];
}
