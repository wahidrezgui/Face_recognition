<?php
namespace App\DTO;

class EmployeeReportDTO
{
    public $department;
    public $rank_category;
    public $rank;
    public $military_number;
    public $fullname_ar;
    public $gender;
    public $checkin_msg;
    public $checkout_msg;
    public $notes;
    public $hasEntryIssue;
    public $hasExitIssue;

    public function __construct($employee, $checkin_msg, $checkout_msg, $hasEntryIssue, $hasExitIssue)
    {
        $this->department = $employee->department;
        $this->rank_category = $employee->rank_category;
        $this->rank = $employee->rank;
        $this->military_number = $employee->military_number;
        $this->fullname_ar = $employee->fullname_ar;
        $this->gender = $employee->gender;
        $this->checkin_msg = $checkin_msg;
        $this->checkout_msg = $checkout_msg;
        $this->notes = $employee->notes;
        $this->hasEntryIssue = $hasEntryIssue;
        $this->hasExitIssue = $hasExitIssue;
    }
}
