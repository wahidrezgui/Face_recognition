<?php

namespace App\Services\Reports;



class IssueDetectionService
{
    public function getCheckInMessage($checktimes, $in)
{
    if ($in) {
        $checkintime = $in->mvtime;
    } else {
        $checkintime = null;
    }

    if ($checktimes && $checkintime !== null && $checktimes->start_time < $checkintime) {
        $minutes = $this->calculateMinutesDiff($checktimes->start_time, $checkintime);
       // return $minutes > 0 ? 'Check-In delay: ' . $minutes . ' minutes' : $checkintime;
        return $minutes > 0 ? '.' . $checkintime : $checkintime;
    }

    return $checkintime;
}


    public function getCheckOutMessage($checktimes, $out)
{
    if ($out) {
        $checkouttime = $out->mvtime;
    } else {
        $checkouttime = null;
    }

    if ($checktimes && $checkouttime !== null && $checktimes->end_time > $checkouttime) {
        $minutes = $this->calculateMinutesDiff($checktimes->end_time, $checkouttime);
       // return $minutes > 0 ? 'Check-Out early: ' . $minutes . ' minutes' : $checkouttime;
        return $minutes > 0 ? '.' . $checkouttime : $checkouttime;
    }

    return $checkouttime;
}


    public function getCCheckInMessage($checktimes, $in)
        {
            if ($in) {
                $checkintime = $in->mvtime;
            } else {
                $checkintime = null;
            }
        
            if ($checktimes && $checkintime !== null && $checktimes->start_time > $checkintime) {
                $minutes = $this->calculateMinutesDiff($checkintime,$checktimes->start_time);
                return $minutes > 0 ? '.' . $checkintime : $checkintime;
            }
        
            return $checkintime;
        }
        

    public function getCCheckOutMessage($checktimes, $out)
        {
            if ($out) {
                $checkouttime = $out->mvtime;
            } else {
                $checkouttime = null;
            }
        
            if ($checktimes && $checkouttime !== null && $checktimes->end_time < $checkouttime) {
                $minutes = $this->calculateMinutesDiff($checktimes->end_time,$checkouttime);
                return $minutes > 0 ? '.' . $checkouttime : $checkouttime;
            }
        
            return $checkouttime;
        }


    public function calculateMinutesDiff($time1, $time2)
{
    // $diff = (new DateTime($time1))->diff(new DateTime($time2));
    // return $diff->h * 60 + $diff->i;

    $timestamp1 = strtotime($time1);
    $timestamp2 = strtotime($time2);

    return ($timestamp2 - $timestamp1) / 60;
}


    public function hasIssues($in, $out, $checktimes)
{
    return ($checktimes && $in && $checktimes->start_time < $in->mvtime) || ($checktimes && $out && $checktimes->end_time > $out->mvtime);
}


    public function hasIssuesCheck($checkin_mvtime, $checkout_mvtime, $checktimes)
{
    // Check if there is a checktimes entry and checkin/checkout times
    if (!$checktimes) {
        return false;
    }

    // Initialize flags
    $hasEntryIssue = false;
    $hasExitIssue = false;

    // Check if the check-in time is after the allowed start time (late entry)
    if ($checkin_mvtime && $checktimes->start_time < $checkin_mvtime) {
        $hasEntryIssue = true;
    }

    // Check if the check-out time is before the allowed end time (early exit)
    if ($checkout_mvtime && $checktimes->end_time > $checkout_mvtime) {
        $hasExitIssue = true;
    }

    return ['hasEntryIssue' => $hasEntryIssue, 'hasExitIssue' => $hasExitIssue];
}



    public function hasCompIssues($in, $out, $checktimes)
{
    return 
    ($checktimes && $in && $checktimes->start_time > $in->mvtime)
        ||  ($checktimes && $in && $checktimes->start_time < $in->mvtime)
        || ($checktimes && $out && $checktimes->end_time < $out->mvtime);
}


    public function formatMovement($movement)
    {
        if (!$movement) {
            return '';
        }
        
        return date('d M, Y', strtotime($movement->mvdate)) . ' - ' . $movement->mvtime;

    }


   


    public function formatEmployeeData($employee, string $day)
    {
        $movements = Movements::where('emp_id', $employee->id)
            ->where('mvdate', $day)
            ->whereIn('mvtype', ['Check-In', 'Check-Out'])
            ->get();
    
        $checkin = $movements->where('mvtype', 'Check-In')->sortBy('mvtime')->first();
        $checkout = $movements->where('mvtype', 'Check-Out')->sortBy('mvtime')->last();
    
        $note = EmployeeNotes::where('emp_id', $employee->id)->where('mvdate', $day)->first();
    
        return [
            'id' => $employee->id,
            'department' => $employee->department->name_ar ?? '',
            'rank' => $employee->rank->name_ar ?? '',
            'military_number' => $employee->military_number,
            'photo' => $employee->photo,
            'fullname_ar' => $employee->fullname_ar,
            'checkin' => $this->formatMovement($checkin),
            'checkout' => $this->formatMovement($checkout),
            'notes' => $note ? $note->notes : '',
        ];
    }
    

    public function getColumnConfiguration()
    {
        return [
            ['headerName' => 'الوحدة', 'field' => 'department', 'sortable' => true, 'filter' => 'agSetColumnFilter', 'width' => 250],
            ['headerName' => 'الرتبة', 'field' => 'rank', 'sortable' => true, 'filter' => 'agSetColumnFilter', 'width' => 150],
            ['headerName' => 'ر/ع', 'field' => 'military_number', 'sortable' => true, 'filter' => 'agSetColumnFilter', 'width' => 150],
            ['headerName' => 'الصورة', 'field' => 'photo', 'width' => 120],
            ['headerName' => 'الاسم', 'field' => 'fullname_ar', 'sortable' => true, 'filter' => 'agSetColumnFilter', 'width' => 250],
            ['headerName' => 'دخول', 'field' => 'checkin', 'sort' => 'desc', 'filter' => 'agSetColumnFilter', 'sortIndex' => 1, 'width' => 250],
            ['headerName' => 'خروج', 'field' => 'checkout', 'sort' => 'desc', 'filter' => 'agSetColumnFilter', 'sortIndex' => 0, 'width' => 250],
            ['headerName' => 'ملاحظات', 'field' => 'notes', 'filter' => 'agSetColumnFilter', 'width' => 350],
        ];
    }
    

    public function fetchEmployees(array $departmentIds, int $page, int $perPage)
    {
        return Employees::with(['department', 'rank'])
            ->whereIn('dep_id', $departmentIds)
            ->orWhere('dep_parent_id', $departmentIds[0]) // Use first departmentId for parent check
            ->where(['active' => 1, 'is_employee' => 0])
            ->latest('updated_at')
            ->paginate($perPage, ['*'], 'page', $page);
    }
    
}
