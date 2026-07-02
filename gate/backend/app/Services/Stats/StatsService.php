<?php

namespace App\Services\Stats;

use Illuminate\Support\Facades\DB;
use App\Models\Employees;
use App\Models\User;
use App\Models\Departments;
use App\Models\Gates;
use App\Models\Bases;
use App\Models\Zones;
use App\Models\Movements;
use App\Support\Tree\DepartmentTreeService;

class StatsService
{
    public function __construct(private StatsScopeResolver $scopeResolver)
    {
    }

    public function allStats(){
        $employees=Employees::where('active',1)->count();
        $users=User::count();
        $departments=Departments::count();
        $gates=Gates::count();
        $bases=Bases::count();
        $zones=Zones::count();

        $pending=Employees::where('active',1)->where('status',0)->count();
        $printed=Employees::where('active',1)->where('status',2)->count();
        $collected=Employees::where('active',1)->where('status',3)->count();
        $checkedIn = $this->countCurrentlyInsideToday();
        $checkInsToday = $this->countCheckInsToday();
        $checkOutsToday = $this->countCheckOutsToday();

        $stats=array(
            'users'=>$users,
            'departments'=>$departments,
            'bases'=>$bases,
            'gates'=>$gates,
            'zones'=>$zones,
            'employees'=>$employees,
            'pending'=>$pending,
            'printed'=>$printed,
            'collected'=>$collected,
            'checkedIn'=>$checkedIn,
            'checkInsToday'=>$checkInsToday,
            'checkOutsToday'=>$checkOutsToday,
            'scope'=>'global',
            'scopeLabel'=>$this->scopeResolver->scopeLabel('global'),
        );
        return response()->json($stats);
    }


    public function stats(int $id, string $scope = 'hierarchy'){
        $departmentIds = $this->scopeResolver->resolveDepartmentIds($id, $scope);

        $employees = $this->scopedActiveEmployeesQuery($departmentIds)->count();
        $pending = $this->scopedActiveEmployeesQuery($departmentIds)->where('status', 0)->count();
        $printed = $this->scopedActiveEmployeesQuery($departmentIds)->where('status', 2)->count();
        $collected = $this->scopedActiveEmployeesQuery($departmentIds)->where('status', 3)->count();

        $departmentScope = function ($query) use ($departmentIds) {
            $query->whereIn('employees.dep_id', $departmentIds);
        };

        $checkedIn = $this->countCurrentlyInsideToday($departmentScope);
        $checkedOut = $this->countCurrentlyOutsideToday($departmentScope);
        $checkInsToday = $this->countCheckInsToday($departmentScope);
        $checkOutsToday = $this->countCheckOutsToday($departmentScope);

        $stats=array(
            'employees'=>$employees,
            'pending'=>$pending,
            'printed'=>$printed,
            'collected'=>$collected,
            'checkedIn'=>$checkedIn,
            'checkedOut'=>$checkedOut,
            'checkInsToday'=>$checkInsToday,
            'checkOutsToday'=>$checkOutsToday,
            'scope'=>$scope,
            'scopeLabel'=>$this->scopeResolver->scopeLabel($scope),
            'departmentId'=>$id,
            'departmentIdsCount'=>count($departmentIds),
        );
        return response()->json($stats);
    }


    public function notification($id){
        
        $SpecificDate=date('Y-m-d');

        $query = DB::table('employees')
        ->join('movements', 'employees.id', '=', 'movements.emp_id')
        ->select(
            'employees.fullname_en',
            'employees.fullname_ar',
            'employees.remarks',
            'employees.military_number',
            'movements.mvtype',
            'movements.mvtime',
            'movements.id',
        )
        ->where('employees.dep_parent_id', $id)
        ->whereDate('movements.mvdate', $SpecificDate)
        ->where('movements.readed', 0)
        ->orderBy('movements.mvdate', 'desc');
        $data = $query->get();

        foreach($data as $row) {
            DB::table('movements')->where('id', $row->id)->update([
                'readed'=>1
            ]);  
        }

        $employeesWithoutCheckout = DB::table('employees')
            ->join('movements', 'employees.id', '=', 'movements.emp_id')
            ->leftJoin('companies_times', 'employees.dep_id', '=', 'companies_times.dep_id')
            ->leftJoin('departments', 'employees.dep_id', '=', 'departments.id')
            ->where('movements.mvtype', '=', 'Check-In')
            ->whereDate('movements.mvdate', $SpecificDate)
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('movements as m2')
                    ->whereRaw('m2.emp_id = employees.id')
                    ->where('m2.mvtype', '=', 'Check-Out')
                    ->whereDate('m2.mvdate', date('Y-m-d'));
            })
            ->whereRaw('TIME(NOW()) > companies_times.end_time')
            ->select('employees.*', 'departments.name_en as department')
            ->distinct()
            ->get();
            
        return response()->json(array('scan'=>$data,'issues'=>$employeesWithoutCheckout));

    }


    ###################################################################### Stats


    public function reports(int $id, string $scope = 'hierarchy')
    {
      $stats=[];

     $startDateTimestamp = strtotime('-7 days');
     $startDate = date('Y-m-d', $startDateTimestamp);

     $departmentIds = $this->scopeResolver->resolveDepartmentIds($id, $scope);

    $precordsIn = Movements::join('employees', 'movements.emp_id', '=', 'employees.id')
    ->select(
        DB::raw("COUNT(DISTINCT movements.emp_id) as count"),
        DB::raw("DAY(movements.mvdate) as day"),
        DB::raw("MONTH(movements.mvdate) as month"),
        DB::raw("movements.mvdate"),
    )
    ->where('employees.active', 1)
    ->whereIn('employees.dep_id', $departmentIds)
    ->whereDate('movements.mvdate', '>=', $startDate)
    ->groupBy('day', 'month', 'movements.mvdate')
    ->orderBy('movements.mvdate', 'asc')
    ->get();
        foreach($precordsIn as $row) {
            $nbout=Movements::join('employees', 'movements.emp_id', '=', 'employees.id')
            ->where('employees.active', 1)
            ->where('mvdate',$row->mvdate)
            ->whereIn('employees.dep_id', $departmentIds)
            ->where('mvtype', 'Check-Out')
            ->distinct('emp_id')
            ->count('emp_id');
            $nbin=Movements::join('employees', 'movements.emp_id', '=', 'employees.id')
            ->where('employees.active', 1)
            ->whereIn('employees.dep_id', $departmentIds)
            ->where('mvdate',$row->mvdate)
            ->where('mvtype', 'Check-In')
            ->distinct('emp_id')->count('emp_id');

        $stats['presence']['dayIn'][] = $row->day.'/'.$row->month;
        $stats['presence']['nbIn'][] = (int) $nbin;
        $stats['presence']['nbOut'][] = (int) $nbout;
        }
    

        $fromDate = date('Y-m-d H:i:s', $startDateTimestamp);

      $records = Employees::select(
          DB::raw('COUNT(*) as count'),
          DB::raw('DAY(created_at) as day'),
          DB::raw('MONTH(created_at) as month'),
          DB::raw('YEAR(created_at) as year')
      )
      ->where('active',1)
      ->whereIn('dep_id', $departmentIds)
      ->whereDate('created_at', '>', $fromDate)
      ->groupBy(DB::raw('YEAR(created_at), MONTH(created_at), DAY(created_at)'))
      ->orderBy(DB::raw('YEAR(created_at)'))
      ->orderBy(DB::raw('MONTH(created_at)'))
      ->orderBy(DB::raw('DAY(created_at)'))
      ->get();
    
        foreach($records as $row) {
        $stats['registration']['day'][] = $row->day.'/'.$row->month.'/'.$row->year;
        $stats['registration']['nb'][] = (int) $row->count;
        }

      $stats['scope'] = $scope;
      $stats['scopeLabel'] = $this->scopeResolver->scopeLabel($scope);
      $stats['departmentId'] = $id;
      $stats['departmentIdsCount'] = count($departmentIds);

      return response()->json($stats);
    }

    public function saReports(){
        $stats = [
            'presence' => [
                'dayIn' => [],
                'nbIn' => [],
                'nbOut' => [],
            ],
            'issuesByDepartment' => [
                'labels' => [],
                'lateEntry' => [],
                'earlyExit' => [],
            ],
            'issuesTrend' => [
                'days' => [],
                'lateEntry' => [],
                'earlyExit' => [],
            ],
        ];

        $startDateTimestamp = strtotime('-7 days');
        $startDate = date('Y-m-d', $startDateTimestamp);
        $today = date('Y-m-d');

        $presenceRecords = Movements::join('employees', 'movements.emp_id', '=', 'employees.id')
            ->select(
                DB::raw('DAY(movements.mvdate) as day'),
                DB::raw('MONTH(movements.mvdate) as month'),
                DB::raw('movements.mvdate'),
            )
            ->where('employees.active', 1)
            ->whereDate('movements.mvdate', '>=', $startDate)
            ->groupBy('day', 'month', 'movements.mvdate')
            ->orderBy('movements.mvdate', 'asc')
            ->get();

        foreach ($presenceRecords as $row) {
            $nbIn = Movements::join('employees', 'movements.emp_id', '=', 'employees.id')
                ->where('employees.active', 1)
                ->where('movements.mvdate', $row->mvdate)
                ->where('movements.mvtype', 'Check-In')
                ->distinct('emp_id')
                ->count('emp_id');

            $nbOut = Movements::join('employees', 'movements.emp_id', '=', 'employees.id')
                ->where('employees.active', 1)
                ->where('movements.mvdate', $row->mvdate)
                ->where('movements.mvtype', 'Check-Out')
                ->distinct('emp_id')
                ->count('emp_id');

            $stats['presence']['dayIn'][] = $row->day.'/'.$row->month;
            $stats['presence']['nbIn'][] = (int) $nbIn;
            $stats['presence']['nbOut'][] = (int) $nbOut;
        }

        $departmentIssues = DB::table('employee_specific_movements_notes_view as v')
            ->join('departments as parent', 'parent.id', '=', 'v.dep_parent_id')
            ->select(
                'parent.name_ar',
                DB::raw('SUM(v.entry_issue) as late_entry'),
                DB::raw('SUM(v.exit_issue) as early_exit'),
            )
            ->whereDate('v.mvdate', $today)
            ->where('v.active', 1)
            ->where(function ($query) {
                $query->where('v.entry_issue', 1)
                    ->orWhere('v.exit_issue', 1);
            })
            ->groupBy('v.dep_parent_id', 'parent.name_ar')
            ->orderByRaw('(SUM(v.entry_issue) + SUM(v.exit_issue)) DESC')
            ->limit(15)
            ->get();

        foreach ($departmentIssues as $row) {
            $stats['issuesByDepartment']['labels'][] = $row->name_ar;
            $stats['issuesByDepartment']['lateEntry'][] = (int) $row->late_entry;
            $stats['issuesByDepartment']['earlyExit'][] = (int) $row->early_exit;
        }

        $issuesTrend = DB::table('employee_specific_movements_notes_view as v')
            ->select(
                DB::raw('DAY(v.mvdate) as day'),
                DB::raw('MONTH(v.mvdate) as month'),
                DB::raw('v.mvdate'),
                DB::raw('SUM(v.entry_issue) as late_entry'),
                DB::raw('SUM(v.exit_issue) as early_exit'),
            )
            ->whereDate('v.mvdate', '>=', $startDate)
            ->where('v.active', 1)
            ->groupBy('day', 'month', 'v.mvdate')
            ->orderBy('v.mvdate', 'asc')
            ->get();

        foreach ($issuesTrend as $row) {
            $stats['issuesTrend']['days'][] = $row->day.'/'.$row->month;
            $stats['issuesTrend']['lateEntry'][] = (int) $row->late_entry;
            $stats['issuesTrend']['earlyExit'][] = (int) $row->early_exit;
        }

        return response()->json(array_merge($stats, [
            'scope' => 'global',
            'scopeLabel' => $this->scopeResolver->scopeLabel('global'),
        ]));
    }

    private function scopedActiveEmployeesQuery(array $departmentIds)
    {
        return Employees::query()
            ->where('active', 1)
            ->whereIn('dep_id', $departmentIds);
    }

    private function countCheckInsToday(?callable $employeeScope = null): int
    {
        $query = DB::table('movements')
            ->join('employees', 'employees.id', '=', 'movements.emp_id')
            ->where('employees.active', 1)
            ->whereDate('movements.mvdate', date('Y-m-d'))
            ->where('movements.mvtype', 'Check-In');

        if ($employeeScope) {
            $employeeScope($query);
        }

        return (int) $query->distinct('movements.emp_id')->count('movements.emp_id');
    }

    private function countCheckOutsToday(?callable $employeeScope = null): int
    {
        $query = DB::table('movements')
            ->join('employees', 'employees.id', '=', 'movements.emp_id')
            ->where('employees.active', 1)
            ->whereDate('movements.mvdate', date('Y-m-d'))
            ->where('movements.mvtype', 'Check-Out');

        if ($employeeScope) {
            $employeeScope($query);
        }

        return (int) $query->distinct('movements.emp_id')->count('movements.emp_id');
    }

    private function countCurrentlyInsideToday(?callable $employeeScope = null): int
    {
        return $this->countEmployeesByLatestMovementToday('Check-In', $employeeScope);
    }

    private function countCurrentlyOutsideToday(?callable $employeeScope = null): int
    {
        return $this->countEmployeesByLatestMovementToday('Check-Out', $employeeScope);
    }

    private function countEmployeesByLatestMovementToday(string $movementType, ?callable $employeeScope = null): int
    {
        $latestToday = DB::table('movements')
            ->select('emp_id', DB::raw('MAX(id) as latest_id'))
            ->whereDate('mvdate', date('Y-m-d'))
            ->groupBy('emp_id');

        $query = DB::table('employees')
            ->joinSub($latestToday, 'latest_today', function ($join) {
                $join->on('employees.id', '=', 'latest_today.emp_id');
            })
            ->join('movements', 'movements.id', '=', 'latest_today.latest_id')
            ->where('employees.active', 1)
            ->where('movements.mvtype', $movementType);

        if ($employeeScope) {
            $employeeScope($query);
        }

        return (int) $query->count();
    }

}
