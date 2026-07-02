<?php

namespace App\Services\Reports;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Employees;
use App\Models\Movements;
use App\Models\Departments;
use App\Models\CompaniesTimes;
use App\Models\EmployeeMovement;
use App\Models\EmployeeSpecificMovementsNotes;
use App\Models\Genders;
use App\Models\Nationalities;
use App\Models\Ranks;
use App\Models\RanksCategories;
use App\Models\Bases;
use App\Models\Gates;
use App\Models\CheckTimes;
use App\Models\EmployeeNotes;
use App\Support\Tree\DepartmentTreeService;
use App\Support\Tree\RankTreeService;

class ReportQueryService
{
    public function __construct(
        private DepartmentTreeService $departmentTree,
        private RankTreeService $rankTreeService,
        private IssueDetectionService $issueDetection,
    ) {}
    public function getReports(Request $request){  

        $columns = $this->issueDetection->getColumnConfiguration();

        $depId = $request->query('dep_id');
        $day = $request->query('day', date('Y-m-d'));
        $perPage = $request->input('per_page', 25);
        $page = $request->input('page', 1);
    
        if (!$depId) {
            return response()->json(['error' => 'Department ID is required'], 400);
        }
    
        $departmentIds = $this->departmentTree->getAllChildrenDepartmentIds($depId);
        $departmentIds[] = $depId; // Include the selected department
    
        $guests = $this->issueDetection->fetchEmployees($departmentIds, $page, $perPage);
    
        $guestsData = $guests->map(fn($employee) => $this->issueDetection->formatEmployeeData($employee, $day));
    
        return response()->json([
            'columns' => $columns,
            'data' => $guestsData,
            'pagination' => [
                'current_page' => $guests->currentPage(),
                'per_page' => $guests->perPage(),
                'total' => $guests->total(),
            ],
        ]);
    }
    

    public function getReportsByDateRangeBasic(Request $request)
    {
        $columns = [
            [
                'headerName' => 'الوحدة',
                'field' => 'department',
                'filter' => 'agTextColumnFilter',
                'sortable' => 'true',
                'width' => 260,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الفئة',
                'field' => 'rank_category',
                'filter' => 'agTextColumnFilter',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الرتبة',
                'field' => 'rank',
                'filter' => 'agTextColumnFilter',
                'sortable' => 'true',
                'width' => 130,
                'headerClass' => 'center-header',
            ],
            
            [
                'headerName' => 'ر/ع',
                'field' => 'military_number',
                'filter' => true,
                'width' => 100,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الاسم',
                'field' => 'fullname_ar',
                'filter' => true,
                'width' => 200,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'التاريخ',
                'field' => 'date',
                'filter' => true,
                'width' => 150,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'دخول',
                'field' => 'checkin',
                'filter' => true,
                'sort' => 'desc',
                'sortIndex' => 1,
                'width' => 325,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'خروج',
                'field' => 'checkout',
                'sort' => 'desc',
                'sortIndex' => 0,
                'filter' => true,
                'width' => 325,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'ملاحظات',
                'field' => 'notes',
                'width' => 350,
                'headerClass' => 'center-header',
            ]
        ];
        
        $day = isset($_GET['day']) && $_GET['day'] != '' ? $_GET['day'] : date('Y-m-d');
        $end_day = isset($_GET['end_day']) && $_GET['end_day'] != '' ? $_GET['end_day'] : date('Y-m-d');
        
        $depId = $_GET['dep_id'] ?? $_GET['dep_user_id'];
    
        // Log the selected and determined department ID
        //\Log::info('Selected Department ID:', ['dep_id' => $_GET['dep_id'] ?? null]);
        //\Log::info('Passed to function with Department ID:', ['dep_id' => $depId]);
    
        if ($depId !== null) {
            $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);
    
            // \Log::info('XXXXXXXXXXXXXXXXXXXXX:', ['dep_id' => $departmentIds]);
            //array_unshift($departmentIds, $depId);
        
            // Add logging to check parameters and query execution
            // \Log::info('Parameters', ['day' => $day, 'end_day' => $end_day, 'depId' => $depId, 'departmentIds' => $departmentIds]);
        
            $query = Employees::select(
                    'employees.id',
                    'departments.name_ar as department',
                    'departments.id as dep_id',
                    'ranks.name_ar as rank',
                    'ranks_categories.name_ar as rank_category',
                    'employees.military_number',
                    'employees.fullname_en',
                    'employees.fullname_ar',
                    'employees.phone_number',
                    'employees.gender_id as gender_id',
                    'employees.rank_id as rank_id',
                    'ranks.rank_id as rank_category_id',
                    'employees.dep_parent_id as dep_parent_id',
                    'movements.mvdate',
                    'movements.mvtime',
                    'movements.mvtype',
                    'movements.automatic',
                    'movements.gate_id',
                    'movements.base_id'
                )
                ->join('movements', 'employees.id', '=', 'movements.emp_id')
                ->join('departments', 'employees.dep_id', '=', 'departments.id')
                ->join('ranks', 'employees.rank_id', '=', 'ranks.id')
                ->join('ranks_categories', 'ranks_categories.id', '=', 'ranks.rank_id')
                ->where('employees.is_employee', 0)
                /* ->when(isset($_GET['dep_id']), function ($query) {
                    return $query->where('employees.dep_id', $_GET['dep_id']);
                }) */
                ->where(function ($query) use ($departmentIds) {
                    $query->WhereIn('employees.dep_id', $departmentIds);
                })
                ->whereBetween('movements.mvdate', [$day, $end_day]);
                
    
    
            if (isset($_GET['mvtype'])) {
                $mvtype = is_array($_GET['mvtype']) ? $_GET['mvtype'] : [$_GET['mvtype']];
                $query->whereIn('movements.mvtype', $mvtype);
            }
        
            // Log the final query for debugging
            //\Log::info('SQL Query', ['query' => $query->toSql(), 'bindings' => $query->getBindings()]);
        
            $movements = $query->orderBy('movements.mvdate', 'asc')->get();
        
            // \Log::info('Movements Data', ['movements' => $movements]);
        
            $groupedMovements = $movements->groupBy(function ($item) {
                return $item->id . '_' . $item->mvdate;
            });
    
            
            $guests = [];
    
        
            foreach ($groupedMovements as $key => $group) {
    
                
                $firstItem = $group->first();
    
                $in = $group->filter(function ($mov) {
                    return $mov->mvtype === 'Check-In';
                })->sortBy('mvtime')->first();
        
                $out = $group->filter(function ($mov) {
                    return $mov->mvtype === 'Check-Out';
                })->sortBy('mvtime')->last();
        
    
                $mvti = $in?->automatic == 0 ? ' يدوي' : ' آلي';
                $mvto = $out?->automatic == 0 ? ' يدوي' : ' آلي';
                $mvtidate = $in?->mvdate;
                $mvtodate = $out?->mvdate;
            
                /*Modification to take the current department checktime if exsits*/
                $checktimes = CheckTimes::where('dep_id', $firstItem->dep_id)
                ->where('gender_id', $firstItem->gender_id)
                ->where('rank_id', $firstItem->rank_category_id)
                ->first(); 
                
                if (!$checktimes) {
                $checktimes = CheckTimes::where('dep_id', $firstItem->dep_parent_id)
                    ->where('gender_id', $firstItem->gender_id)
                    ->where('rank_id', $firstItem->rank_category_id)
                    ->first();
                }    
            
    
        
                $inpb = $this->issueDetection->getCheckInMessage($checktimes, $in);
                $outpb = $this->issueDetection->getCheckOutMessage($checktimes, $out);
     
    
        
                // Removed the condition on check-in and check-out times
                // if ($this->issueDetection->hasIssues($in, $out, $checktimes)) {
    
                    $hasEntryIssue=false;
                    $hasExitIssue=false;
    
                
    
                    if($checktimes && $in && $checktimes->start_time < $in->mvtime)
                    {
                    $hasEntryIssue=true;
                    }
                    if($checktimes && $out && $checktimes->end_time > $out->mvtime)
                    {
                    $hasExitIssue=true;
                    }
                    
    
                    $dep = Departments::find($firstItem->dep_id);
                    $rank = Ranks::find($firstItem->rank_id);
        
                    $ingate = Gates::find($in?->gate_id);
                    $inbase = Bases::find($in?->base_id);
        
                    $outgate = Gates::find($out?->gate_id);
                    $outbase = Bases::find($out?->base_id);
                    $cin = ''; $cout = '';
                    if($inpb){ $cin =  $inpb . ' | ' . $mvti . ' | ' . $ingate?->name_ar . ' | ' . $inbase?->name_ar ; }
                    if($outpb){ $cout =  $outpb . ' | ' . $mvto . ' | ' . $outgate?->name_ar . ' | ' . $outbase?->name_ar ; } 
        
                    $inNote = null;
                    $outNote = null;
                    $notes = '';
        
                    try {
                        $inNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $in->mvdate)->where('mvtype', 'Check-In')->first();
                    } catch (\Exception $e) {
                        $inNote = null;
                    }
        
                    try {
                        $outNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $out->mvdate)
                            ->where('mvtype', 'Check-Out')->first();
                    } catch (\Exception $e) {
                        $outNote = null;
                    }
        
                    if ($inNote) {
                        $notes .= 'دخول: ' . $inNote->notes . ' | ';
                    }
                    if ($outNote) {
                        $notes .= 'خروج: ' . $outNote->notes . ' | ';
                    }
        
                    $guests[] = [
                        'department' => $dep->name_ar,
                        'rank_category' => $rank->name_ar,
                        'rank' => $rank->name_ar,
                        'military_number' => $firstItem->military_number,
                        'fullname_ar' => $firstItem->fullname_ar,
                        'date' => $mvtidate,
                        'checkin' => $cin,
                        'checkout' => $cout,
                        'notes' => $notes,
                        'hasEntryIssue' => $hasEntryIssue,
                        'hasExitIssue' => $hasExitIssue,
                    ];
                // }
            }
        
            return response()->json(['data' => $guests, 'columns' => $columns]);
        }

    }

    public function getReportsByDateRangeBasicNew(Request $request)
{
    $columns = [
        [
            'headerName' => 'الوحدة',
            'field' => 'department',
            'filter' => 'agTextColumnFilter',
            'sortable' => 'true',
            'width' => 260,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الفئة',
            'field' => 'rank_category',
            'filter' => 'agTextColumnFilter',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الرتبة',
            'field' => 'rank',
            'filter' => 'agTextColumnFilter',
            'sortable' => 'true',
            'width' => 130,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ر/ع',
            'field' => 'military_number',
            'filter' => true,
            'width' => 100,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الاسم',
            'field' => 'fullname_ar',
            'filter' => true,
            'width' => 200,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'التاريخ',
            'field' => 'date',
            'filter' => true,
            'width' => 150,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'دخول',
            'field' => 'checkin',
            'filter' => true,
            'sort' => 'desc',
            'sortIndex' => 1,
            'width' => 325,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'خروج',
            'field' => 'checkout',
            'sort' => 'desc',
            'sortIndex' => 0,
            'filter' => true,
            'width' => 325,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ملاحظات',
            'field' => 'notes',
            'width' => 350,
            'headerClass' => 'center-header',
        ]
    ];
    
    $day = $request->get('day', date('Y-m-d'));
    $end_day = $request->get('end_day', date('Y-m-d'));
    $depId = $request->get('dep_id') ?? $request->get('dep_user_id');

    if ($depId !== null) {
        $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);

        $query = Employees::with(['department', 'rank'])
            ->join('movements', 'employees.id', '=', 'movements.emp_id')
            ->whereIn('employees.dep_id', $departmentIds)
            ->whereBetween('movements.mvdate', [$day, $end_day]);

        if ($request->has('mvtype')) {
            $mvtype = is_array($request->mvtype) ? $request->mvtype : [$request->mvtype];
            $query->whereIn('movements.mvtype', $mvtype);
        }

        // Paginate to limit data processed at once
        $movements = $query->orderBy('movements.mvdate', 'asc')->paginate(1000); // Adjust chunk size if needed

        $guests = [];

        foreach ($movements as $group) {
            $firstItem = $group->first();

            $in = $group->filter(function ($mov) {
                return $mov->mvtype === 'Check-In';
            })->sortBy('mvtime')->first();
    
            $out = $group->filter(function ($mov) {
                return $mov->mvtype === 'Check-Out';
            })->sortBy('mvtime')->last();

            $mvti = $in?->automatic == 0 ? ' يدوي' : ' آلي';
            $mvto = $out?->automatic == 0 ? ' يدوي' : ' آلي';
            $mvtidate = $in?->mvdate;
            $mvtodate = $out?->mvdate;
        
            // Modification to take the current department checktime if it exists
            $checktimes = CheckTimes::where('dep_id', $firstItem->dep_id)
                ->where('gender_id', $firstItem->gender_id)
                ->where('rank_id', $firstItem->rank_category_id)
                ->first(); 
            
            if (!$checktimes) {
                $checktimes = CheckTimes::where('dep_id', $firstItem->dep_parent_id)
                    ->where('gender_id', $firstItem->gender_id)
                    ->where('rank_id', $firstItem->rank_category_id)
                    ->first();
            }

            $inpb = $this->issueDetection->getCheckInMessage($checktimes, $in);
            $outpb = $this->issueDetection->getCheckOutMessage($checktimes, $out);

            $hasEntryIssue = $checktimes && $in && $checktimes->start_time < $in->mvtime;
            $hasExitIssue = $checktimes && $out && $checktimes->end_time > $out->mvtime;

            $dep = Departments::find($firstItem->dep_id);
            $rank = Ranks::find($firstItem->rank_id);

            $ingate = Gates::find($in?->gate_id);
            $inbase = Bases::find($in?->base_id);

            $outgate = Gates::find($out?->gate_id);
            $outbase = Bases::find($out?->base_id);
            $cin = $inpb ? $inpb . ' | ' . $mvti . ' | ' . $ingate?->name_ar . ' | ' . $inbase?->name_ar : '';
            $cout = $outpb ? $outpb . ' | ' . $mvto . ' | ' . $outgate?->name_ar . ' | ' . $outbase?->name_ar : ''; 

            $inNote = EmployeeNotes::where('emp_id', $firstItem->id)
                ->where('mvdate', $in->mvdate ?? null)
                ->where('mvtype', 'Check-In')
                ->first();
    
            $outNote = EmployeeNotes::where('emp_id', $firstItem->id)
                ->where('mvdate', $out->mvdate ?? null)
                ->where('mvtype', 'Check-Out')
                ->first();

            $notes = '';
            if ($inNote) {
                $notes .= 'دخول: ' . $inNote->notes . ' | ';
            }
            if ($outNote) {
                $notes .= 'خروج: ' . $outNote->notes . ' | ';
            }

            $guests[] = [
                'department' => $dep->name_ar,
                'rank_category' => $rank->name_ar,
                'rank' => $rank->name_ar,
                'military_number' => $firstItem->military_number,
                'fullname_ar' => $firstItem->fullname_ar,
                'date' => $mvtidate,
                'checkin' => $cin,
                'checkout' => $cout,
                'notes' => $notes,
                'hasEntryIssue' => $hasEntryIssue,
                'hasExitIssue' => $hasExitIssue,
            ];
        }

        return response()->json(['data' => $guests, 'columns' => $columns]);
    }
}


    public function getReportsByDateRange(Request $request)
    {
        $columns = [
            [
                'headerName' => 'الوحدة',
                'field' => 'department',
                'filter' => 'agTextColumnFilter',
                'sortable' => 'true',
                'width' => 260,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الفئة',
                'field' => 'rank_category',
                'filter' => 'agTextColumnFilter',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الرتبة',
                'field' => 'rank',
                'filter' => 'agTextColumnFilter',
                'sortable' => 'true',
                'width' => 130,
                'headerClass' => 'center-header',
            ],
            
            [
                'headerName' => 'ر/ع',
                'field' => 'military_number',
                'filter' => true,
                'width' => 100,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الاسم',
                'field' => 'fullname_ar',
                'filter' => true,
                'width' => 200,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'التاريخ',
                'field' => 'date',
                'filter' => true,
                'sortable' => 'true',
                'width' => 150,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'دخول',
                'field' => 'checkin',
                'filter' => true,
                'sort' => 'desc',
                'sortIndex' => 1,
                'width' => 325,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'خروج',
                'field' => 'checkout',
                'sort' => 'desc',
                'sortIndex' => 0,
                'filter' => true,
                'width' => 325,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'ملاحظات',
                'field' => 'notes',
                'width' => 350,
                'headerClass' => 'center-header',
            ]
        ];
    
        $day = isset($_GET['day']) && $_GET['day'] != '' ? $_GET['day'] : date('Y-m-d');
        $end_day = isset($_GET['end_day']) && $_GET['end_day'] != '' ? $_GET['end_day'] : date('Y-m-d');
    
        $depId = $_GET['dep_id'] ?? $_GET['dep_user_id'];

        // Log the selected and determined department ID
        //\Log::info('Selected Department ID:', ['dep_id' => $_GET['dep_id'] ?? null]);
        //\Log::info('Passed to function with Department ID:', ['dep_id' => $depId]);

        if ($depId !== null) {
        $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);

       // \Log::info('XXXXXXXXXXXXXXXXXXXXX:', ['dep_id' => $departmentIds]);
        //array_unshift($departmentIds, $depId);
    
        // Add logging to check parameters and query execution
       // \Log::info('Parameters', ['day' => $day, 'end_day' => $end_day, 'depId' => $depId, 'departmentIds' => $departmentIds]);
    
        $query = Employees::select(
                'employees.id',
                'departments.name_ar as department',
                'departments.id as dep_id',
                'ranks.name_ar as rank',
                'ranks_categories.name_ar as rank_category',
                'employees.military_number',
                'employees.fullname_en',
                'employees.fullname_ar',
                'employees.phone_number',
                'employees.gender_id as gender_id',
                'employees.rank_id as rank_id',
                'ranks.rank_id as rank_category_id',
                'employees.dep_parent_id as dep_parent_id',
                'movements.mvdate',
                'movements.mvtime',
                'movements.mvtype',
                'movements.automatic',
                'movements.gate_id',
                'movements.base_id'
            )
            ->join('movements', 'employees.id', '=', 'movements.emp_id')
            ->join('departments', 'employees.dep_id', '=', 'departments.id')
            ->join('ranks', 'employees.rank_id', '=', 'ranks.id')
            ->join('ranks_categories', 'ranks_categories.id', '=', 'ranks.rank_id')
            ->where('employees.is_employee', 0)
            /* ->when(isset($_GET['dep_id']), function ($query) {
                return $query->where('employees.dep_id', $_GET['dep_id']);
            }) */
            ->where(function ($query) use ($departmentIds) {
                $query->WhereIn('employees.dep_id', $departmentIds);
            })
            ->whereBetween('movements.mvdate', [$day, $end_day]);
            
/*
$query = Movements::select(
                'movements.id',
                'departments.name_ar as department',
                'departments.id as dep_id',
                'ranks.name_ar as rank',
                'ranks_categories.name_ar as rank_category',
                'employees.military_number',
                'employees.fullname_en',
                'employees.fullname_ar',
                'employees.phone_number',
                'employees.gender_id as gender_id',
                'employees.rank_id as rank_id',
                'ranks.rank_id as rank_category_id',
                'employees.dep_parent_id as dep_parent_id',
                'movements.mvdate',
                'movements.mvtime',
                'movements.mvtype',
                'movements.automatic',
                'movements.gate_id',
                'movements.base_id'
            )
            ->join('employees', 'movements.emp_id', '=', 'employees.id')
            ->join('departments', 'employees.dep_id', '=', 'departments.id')
            ->join('ranks', 'employees.rank_id', '=', 'ranks.id')
            ->join('ranks_categories', 'ranks_categories.id', '=', 'ranks.rank_id')
            ->where('employees.is_employee', 0)
            ->when(isset($_GET['dep_id']), function ($query) {
                return $query->where('employees.dep_id', $_GET['dep_id']);
            })
            ->where(function ($query) use ($departmentIds) {
                $query->where('employees.dep_parent_id', $_GET['dep_user_id'])
                    ->orWhereIn('employees.dep_id', $departmentIds);
            })
            ->whereBetween('movements.mvdate', [$day, $end_day]);


*/

        if (isset($_GET['mvtype'])) {
            $mvtype = is_array($_GET['mvtype']) ? $_GET['mvtype'] : [$_GET['mvtype']];
            $query->whereIn('movements.mvtype', $mvtype);
        }
    
        // Log the final query for debugging
        //\Log::info('SQL Query', ['query' => $query->toSql(), 'bindings' => $query->getBindings()]);
    
        $movements = $query->orderBy('movements.mvdate', 'asc')->get();
    
       // \Log::info('Movements Data', ['movements' => $movements]);
    
        $groupedMovements = $movements->groupBy(function ($item) {
            return $item->id . '_' . $item->mvdate;
        });

        
        $guests = [];

    
        foreach ($groupedMovements as $key => $group) {

            
            $firstItem = $group->first();

            $in = $group->filter(function ($mov) {
                return $mov->mvtype === 'Check-In';
            })->sortBy('mvtime')->first();
    
            $out = $group->filter(function ($mov) {
                return $mov->mvtype === 'Check-Out';
            })->sortBy('mvtime')->last();
    

            $mvti = $in?->automatic == 0 ? ' يدوي' : ' آلي';
            $mvto = $out?->automatic == 0 ? ' يدوي' : ' آلي';
            $mvtidate = $in?->mvdate;
            $mvtodate = $out?->mvdate;
        
            /*Modification to take the current department checktime if exsits*/
            $checktimes = CheckTimes::where('dep_id', $firstItem->dep_id)
            ->where('gender_id', $firstItem->gender_id)
            ->where('rank_id', $firstItem->rank_category_id)
            ->first(); 
            
            if (!$checktimes) {
            $checktimes = CheckTimes::where('dep_id', $firstItem->dep_parent_id)
                ->where('gender_id', $firstItem->gender_id)
                ->where('rank_id', $firstItem->rank_category_id)
                ->first();
            }    
        

    
            $inpb = $this->issueDetection->getCheckInMessage($checktimes, $in);
            $outpb = $this->issueDetection->getCheckOutMessage($checktimes, $out);
 

    
            if ($this->issueDetection->hasIssues($in, $out, $checktimes)) {

                $hasEntryIssue=false;
                $hasExitIssue=false;

            

                if($checktimes && $in && $checktimes->start_time < $in->mvtime)
                {
                $hasEntryIssue=true;
                }
                if($checktimes && $out && $checktimes->end_time > $out->mvtime)
                {
                $hasExitIssue=true;
                }
                

                $dep = Departments::find($firstItem->dep_id);
                $rank = Ranks::find($firstItem->rank_id);
    
                $ingate = Gates::find($in?->gate_id);
                $inbase = Bases::find($in?->base_id);
    
                $outgate = Gates::find($out?->gate_id);
                $outbase = Bases::find($out?->base_id);
                $cin = ''; $cout = '';
                if($inpb){ $cin =  $inpb . ' | ' . $mvti . ' | ' . $ingate?->name_ar . ' | ' . $inbase?->name_ar ; }
                if($outpb){ $cout =  $outpb . ' | ' . $mvto . ' | ' . $outgate?->name_ar . ' | ' . $outbase?->name_ar ; } 
    
                $inNote = null;
                $outNote = null;
                $notes = '';
    
                try {
                    $inNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $in->mvdate)->first();
                } catch (\Exception $e) {
                    \Log::error('Error fetching Check-In note: ' . $e->getMessage());
                }
    
                try {
                    $outNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $out->mvdate)->first();
                } catch (\Exception $e) {
                    \Log::error('Error fetching Check-Out note: ' . $e->getMessage());
                }
    
                if ($inNote) {
                    $notes .= $inNote->notes;
                }
                if ($outNote) {
                    $notes .= $outNote->notes;
                }
    
                $mvdate = $in ? $in->mvdate : ($out ? $out->mvdate : null);
    
                $guests[] = [
                    'id' => $firstItem->id,
                    'department' => $dep->name_ar,
                    'rank' => $rank->name_ar,
                    'rank_category' => $firstItem->rank_category,
                    'military_number' => $firstItem->military_number,
                    'fullname_en' => $firstItem->fullname_en,
                    'fullname_ar' => $firstItem->fullname_ar,
                    'phone' => $firstItem->phone_number,
                    'date' => $mvdate,
                    'checkin' => $cin,
                    'checkout' => $cout,
                    'notes' => $notes,
                    'hasEntryIssue' =>$hasEntryIssue,
                    'hasExitIssue' => $hasExitIssue
                ];
            }
        }
        }
        return response()->json(['columns' => $columns, 'data' => $guests]);
    }


    public function getReportsByDateRangeforJustified(Request $request)
    {
        $columns = [
            [
                'headerName' => 'الوحدة',
                'field' => 'department',
                'sortable' => 'true',
                'width' => 300,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الفئة',
                'field' => 'rank_category',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الرتبة',
                'field' => 'rank',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'ر/ع',
                'field' => 'military_number',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الاسم',
                'field' => 'fullname_ar',
                'sortable' => 'true',
                'width' => 200,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'التاريخ',
                'field' => 'mvdate',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'دخول',
                'field' => 'dakhool',
                'sortable' => 'true',
                'width' => 400,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'خروج',
                'field' => 'khorooj',
                'sortable' => 'true',
                'width' => 400,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'ملحوظات',
                'field' => 'notes',
                'sortable' => 'true',
                'width' => 150,
                'headerClass' => 'center-header',
            ]
        ];
    
        // Initialize the query
        $query = EmployeeSpecificMovementsNotes::query();
    
        // Add a condition to get records that have notes
        $query->whereNotNull('notes')->where('notes', '!=', '');
    
        // Filter by Military Number if provided
        if ($request->filled('military_number')) {
            $query->where('military_number', $request->input('military_number'));
        }
    
        // Filter by FROM date if provided
        if ($request->filled('from_date') && $request->filled('to_date')) {
            $query->whereBetween('mvdate', [$request->input('from_date'),$request->input('to_date')] );
        }
    
        // Filter by Department ID if provided
        if ($request->filled('department_id')) {
            $departmentId = $request->input('department_id');
            
            // Get the department IDs and all its child departments
            $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
            $query->whereIn('dep_id', $departmentIds);
        }
    
        // Filter by Rank IDs if provided
        if ($request->filled('rank_ids')) {
            $rankIds = $request->input('rank_ids'); // This should now be an array
            // Log the rankIds
            //Log::info('Rank IDs provided:', ['rankIds' => $rankIds]);
        
            // Get rank IDs and all their child ranks for each selected rank ID
            $allRankIds = [];
            foreach ($rankIds as $rankId) {
                $allRankIds = array_merge($allRankIds, $this->rankTreeService->getRankAndAllChildrenRankIds($rankId));
            }
        
            // Log allRankIds
            //Log::info('All Rank IDs and their children:', ['rankIds' => $allRankIds]);
                    
            $query->whereIn('rank_id', $allRankIds);
        }

        // Filter by Name if provided
        if ($request->filled('fullname_ar')) {
            $query->where('fullname_ar', 'LIKE', '%' . $request->input('fullname_ar') . '%');
        }
        
        // Filter by Gender if provided
        if ($request->filled('gender')) {
            $query->where('gender', $request->input('gender'));
        }
        
        // Filter by Base IDs if provided
        if ($request->filled('base_ids')) {
            $baseIds = $request->input('base_ids'); // This should now be an array
        
            // Log the baseIds
            // Log::info('Base IDs provided:', ['baseIds' => $baseIds]);
        
            // Search for the base IDs in both first_base_id and last_base_id columns
            $query->where(function ($query) use ($baseIds) {
                $query->whereIn('first_base_id', $baseIds)
                    ->orWhereIn('last_base_id', $baseIds);
            });
        }
        
        
        // Filter by Gate IDs if provided
        if ($request->filled('gate_ids')) {
            $gateIds = $request->input('gate_ids'); // This should now be an array
        
            // Log the gateIds
            // Log::info('Gate IDs provided:', ['gateIds' => $gateIds]);
        
            // Search for the gate IDs in both first_gate_id and last_gate_id columns
            $query->where(function ($query) use ($gateIds) {
                $query->whereIn('first_gate_id', $gateIds)
                    ->orWhereIn('last_gate_id', $gateIds);
            });
        }
        
        
        $mvtype = null;
        // Filter by MvType if provided
        if ($request->filled('mvtype')) {
            $mvtype = $request->input('mvtype');
    
            // Filter based on mvtype
            if ($mvtype === 'Check-In') {
                // Only include records with entry issues
                $query->where('entry_issue', 1);
            } elseif ($mvtype === 'Check-Out') {
                // Only include records with exit issues
                $query->where('exit_issue', 1);
            }
    
            // Search for mvtype in both first_mvtype and last_mvtype columns
            $query->where(function ($query) use ($mvtype) {
                $query->where('first_mvtype', $mvtype)
                      ->orWhere('last_mvtype', $mvtype);
            });
        }
    
        // Order the data by mvdate (defaulting to ascending order)
        $query->orderBy('mvdate', 'asc');  // 'asc' for ascending, 'desc' for descending
    
        // Pagination
        $perPage = $request->input('per_page', 25);
        $page = $request->input('page', 1);
    
        // Execute the query with pagination
        $guests = $query->paginate($perPage, ['*'], 'page', $page);
    
        // Collect unique department, gender, nationality, and rank IDs for efficient querying
        $departmentIds = $guests->pluck('dep_id')->unique()->toArray();
        $genderIds = $guests->pluck('gender_id')->unique()->toArray();
        $nationalityIds = $guests->pluck('nationality_id')->unique()->toArray();
        $rankIds = $guests->pluck('rank_id')->unique()->toArray();
    
        // Fetch related data for all guests in one go
        $departments = Departments::find($departmentIds)->keyBy('id');
        $genders = Genders::find($genderIds)->keyBy('id');
        $nationalities = Nationalities::find($nationalityIds)->keyBy('id');
        $ranks = Ranks::find($rankIds)->keyBy('id');
    
    
        // Map the related data to the guests
        foreach ($guests as &$guest) {
            $guest->department = $departments[$guest->dep_id]->name_ar ?? '';
            $guest->gender = $genders[$guest->gender_id]->name_ar ?? '';
            $guest->nationality = $nationalities[$guest->nationality_id]->name_ar ?? '';
            $guest->rank = $ranks[$guest->rank_id]->name_ar ?? '';
    
            // Set "dakhool" and "khorooj" based on mvtype
            if ($mvtype === 'Check-In') {
                $guest->dakhool = implode(' | ', array_filter([
                    $guest->checkin_mvtime,
                    $guest->first_base,
                    $guest->first_gate,
                    ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
                ]));
                $guest->khorooj = ''; // Set "khorooj" to an empty string
            } elseif ($mvtype === 'Check-Out') {
                $guest->dakhool = ''; // Set "dakhool" to an empty string
                $guest->khorooj = implode(' | ', array_filter([
                    $guest->checkout_mvtime,
                    $guest->last_base,
                    $guest->last_gate,
                    ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
                ]));
            } else {
                // If mvtype is not specified, show both "dakhool" and "khorooj"
                $guest->dakhool = implode(' | ', array_filter([
                    $guest->checkin_mvtime,
                    $guest->first_base,
                    $guest->first_gate,
                    ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
                ]));
                $guest->khorooj = implode(' | ', array_filter([
                    $guest->checkout_mvtime,
                    $guest->last_base,
                    $guest->last_gate,
                    ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
                ]));
            }
    
            // Check for issues
            $guest->hasEntryIssue = $guest->entry_issue == 1 ? true : false;
            $guest->hasExitIssue = $guest->exit_issue == 1 ? true : false;
        }
    
    
    
    
        // Prepare the response data
        $data = [
            [
                'guests' => $guests,
                'pagination' => [
                    'current_page' => $guests->currentPage(),
                    'per_page' => $guests->perPage(),
                    'total' => $guests->total(),
                ],
            ]
        ];
        $username = $request->query('userName', 'Unknown');
        $action = $request->query('action', 'Searched JUSTIFIED report');
        DB::table('logs')->insert([
            'emp_id'=> 1,
            'task' =>'JUSTIFIED Report - ' . $action . ' - User: ' . $username,
            'created_by' => $username ?? 'Unknown',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['columns' => $columns, 'data' => $data]);
    }


    public function getReportsByDateRangeforUnjustified(Request $request)
    {
        $columns = [
            [
                'headerName' => 'الوحدة',
                'field' => 'department',
                'sortable' => 'true',
                'width' => 300,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الفئة',
                'field' => 'rank_category',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الرتبة',
                'field' => 'rank',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'ر/ع',
                'field' => 'military_number',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الاسم',
                'field' => 'fullname_ar',
                'sortable' => 'true',
                'width' => 200,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'التاريخ',
                'field' => 'mvdate',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'دخول',
                'field' => 'dakhool',
                'sortable' => 'true',
                'width' => 400,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'خروج',
                'field' => 'khorooj',
                'sortable' => 'true',
                'width' => 400,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'ملحوظات',
                'field' => 'notes',
                'sortable' => 'true',
                'width' => 150,
                'headerClass' => 'center-header',
            ]
        ];
    
        // Initialize the query
        $query = EmployeeSpecificMovementsNotes::query();
    
        // Add a condition to filter records with either an entry issue or exit issue,
        // and where notes are either NULL or an empty string
        $query->where(function($q) {
            $q->where('entry_issue', 1)
              ->orWhere('exit_issue', 1);
        })
        ->where(function($q) {
            $q->whereNull('notes')
              ->orWhere('notes', ''); // Check for empty string
        });
    
        // Filter by Military Number if provided
        if ($request->filled('military_number')) {
            $query->where('military_number', $request->input('military_number'));
        }
    
        // Filter by FROM date if provided
        if ($request->filled('from_date') && $request->filled('to_date')) {
            $query->whereBetween('mvdate', [$request->input('from_date'),$request->input('to_date')] );
        }
    
        // Filter by Department ID if provided
        if ($request->filled('department_id')) {
            $departmentId = $request->input('department_id');
            
            // Get the department IDs and all its child departments
            $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
            $query->whereIn('dep_id', $departmentIds);
        }
    
        // Filter by Rank IDs if provided
        if ($request->filled('rank_ids')) {
            $rankIds = $request->input('rank_ids'); // This should now be an array
            // Log the rankIds
            //Log::info('Rank IDs provided:', ['rankIds' => $rankIds]);
        
            // Get rank IDs and all their child ranks for each selected rank ID
            $allRankIds = [];
            foreach ($rankIds as $rankId) {
                $allRankIds = array_merge($allRankIds, $this->rankTreeService->getRankAndAllChildrenRankIds($rankId));
            }
        
            // Log allRankIds
            //Log::info('All Rank IDs and their children:', ['rankIds' => $allRankIds]);
                    
            $query->whereIn('rank_id', $allRankIds);
        }

        // Filter by Name if provided
        if ($request->filled('fullname_ar')) {
            $query->where('fullname_ar', 'LIKE', '%' . $request->input('fullname_ar') . '%');
        }
        
        // Filter by Gender if provided
        if ($request->filled('gender')) {
            $query->where('gender', $request->input('gender'));
        }
        
        // Filter by Base IDs if provided
        if ($request->filled('base_ids')) {
            $baseIds = $request->input('base_ids'); // This should now be an array
        
            // Log the baseIds
            // Log::info('Base IDs provided:', ['baseIds' => $baseIds]);
        
            // Search for the base IDs in both first_base_id and last_base_id columns
            $query->where(function ($query) use ($baseIds) {
                $query->whereIn('first_base_id', $baseIds)
                    ->orWhereIn('last_base_id', $baseIds);
            });
        }
        
        
        // Filter by Gate IDs if provided
        if ($request->filled('gate_ids')) {
            $gateIds = $request->input('gate_ids'); // This should now be an array
        
            // Log the gateIds
            // Log::info('Gate IDs provided:', ['gateIds' => $gateIds]);
        
            // Search for the gate IDs in both first_gate_id and last_gate_id columns
            $query->where(function ($query) use ($gateIds) {
                $query->whereIn('first_gate_id', $gateIds)
                    ->orWhereIn('last_gate_id', $gateIds);
            });
        }
        
        
        $mvtype = null;
        // Filter by MvType if provided
        if ($request->filled('mvtype')) {
            $mvtype = $request->input('mvtype');
    
            // Filter based on mvtype
            if ($mvtype === 'Check-In') {
                // Only include records with entry issues
                $query->where('entry_issue', 1);
            } elseif ($mvtype === 'Check-Out') {
                // Only include records with exit issues
                $query->where('exit_issue', 1);
            }
    
            // Search for mvtype in both first_mvtype and last_mvtype columns
            $query->where(function ($query) use ($mvtype) {
                $query->where('first_mvtype', $mvtype)
                      ->orWhere('last_mvtype', $mvtype);
            });
        }
    
        // Order the data by mvdate (defaulting to ascending order)
        $query->orderBy('mvdate', 'asc');  // 'asc' for ascending, 'desc' for descending
    
        // Pagination
        $perPage = $request->input('per_page', 25);
        $page = $request->input('page', 1);
    
        // Execute the query with pagination
        $guests = $query->paginate($perPage, ['*'], 'page', $page);
    
        // Collect unique department, gender, nationality, and rank IDs for efficient querying
        $departmentIds = $guests->pluck('dep_id')->unique()->toArray();
        $genderIds = $guests->pluck('gender_id')->unique()->toArray();
        $nationalityIds = $guests->pluck('nationality_id')->unique()->toArray();
        $rankIds = $guests->pluck('rank_id')->unique()->toArray();
    
        // Fetch related data for all guests in one go
        $departments = Departments::find($departmentIds)->keyBy('id');
        $genders = Genders::find($genderIds)->keyBy('id');
        $nationalities = Nationalities::find($nationalityIds)->keyBy('id');
        $ranks = Ranks::find($rankIds)->keyBy('id');
    
    
        // Map the related data to the guests
        foreach ($guests as &$guest) {
            $guest->department = $departments[$guest->dep_id]->name_ar ?? '';
            $guest->gender = $genders[$guest->gender_id]->name_ar ?? '';
            $guest->nationality = $nationalities[$guest->nationality_id]->name_ar ?? '';
            $guest->rank = $ranks[$guest->rank_id]->name_ar ?? '';
    
            // Set "dakhool" and "khorooj" based on mvtype
            if ($mvtype === 'Check-In') {
                $guest->dakhool = implode(' | ', array_filter([
                    $guest->checkin_mvtime,
                    $guest->first_base,
                    $guest->first_gate,
                    ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
                ]));
                $guest->khorooj = ''; // Set "khorooj" to an empty string
            } elseif ($mvtype === 'Check-Out') {
                $guest->dakhool = ''; // Set "dakhool" to an empty string
                $guest->khorooj = implode(' | ', array_filter([
                    $guest->checkout_mvtime,
                    $guest->last_base,
                    $guest->last_gate,
                    ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
                ]));
            } else {
                // If mvtype is not specified, show both "dakhool" and "khorooj"
                $guest->dakhool = implode(' | ', array_filter([
                    $guest->checkin_mvtime,
                    $guest->first_base,
                    $guest->first_gate,
                    ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
                ]));
                $guest->khorooj = implode(' | ', array_filter([
                    $guest->checkout_mvtime,
                    $guest->last_base,
                    $guest->last_gate,
                    ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
                ]));
            }
    
            // Check for issues
            $guest->hasEntryIssue = $guest->entry_issue == 1 ? true : false;
            $guest->hasExitIssue = $guest->exit_issue == 1 ? true : false;
        }
    
    
    
    
        // Prepare the response data
        $data = [
            [
                'guests' => $guests,
                'pagination' => [
                    'current_page' => $guests->currentPage(),
                    'per_page' => $guests->perPage(),
                    'total' => $guests->total(),
                ],
            ]
        ];
        $username = $request->query('userName', 'Unknown');
        $action = $request->query('action', 'Searched UNJUSTIFIED report');
        DB::table('logs')->insert([
            'emp_id'=> 1,
            'task' =>'UNJUSTIFIED Report - ' . $action . ' - User: ' . $username,
            'created_by' => $username ?? 'Unknown',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    
        return response()->json(['columns' => $columns, 'data' => $data]);
    }    


    public function getReportsByDateRangeforExportIssues(Request $request)
{
    $columns = [
        [
            'headerName' => 'الوحدة',
            'field' => 'department',
            'sortable' => 'true',
            'width' => 300,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الفئة',
            'field' => 'rank_category',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الرتبة',
            'field' => 'rank',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ر/ع',
            'field' => 'military_number',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الاسم',
            'field' => 'fullname_ar',
            'sortable' => 'true',
            'width' => 200,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'التاريخ',
            'field' => 'mvdate',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'دخول',
            'field' => 'dakhool',
            'sortable' => 'true',
            'width' => 400,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'خروج',
            'field' => 'khorooj',
            'sortable' => 'true',
            'width' => 400,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ملحوظات',
            'field' => 'notes',
            'sortable' => 'true',
            'width' => 150,
            'headerClass' => 'center-header',
        ]
    ];

    // Initialize the query
    $query = EmployeeSpecificMovementsNotes::query();

    // Add a condition to filter records with either an entry issue or exit issue,
    // and where notes are either NULL or an empty string
    $query->where(function($q) {
        $q->where('entry_issue', 1)
          ->orWhere('exit_issue', 1);
    });

    // Filter by Military Number if provided
    if ($request->filled('military_number')) {
        $query->where('military_number', $request->input('military_number'));
    }

    // Filter by FROM date if provided
    if ($request->filled('from_date') && $request->filled('to_date')) {
        $query->whereBetween('mvdate', [$request->input('from_date'),$request->input('to_date')] );
    }

    // Filter by Department ID if provided
    if ($request->filled('department_id')) {
        $departmentId = $request->input('department_id');
        
        // Get the department IDs and all its child departments
        $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
        $query->whereIn('dep_id', $departmentIds);
    }

    // Filter by Rank IDs if provided
    if ($request->filled('rank_ids')) {
        $rankIds = $request->input('rank_ids'); // This should now be an array
        // Log the rankIds
        //Log::info('Rank IDs provided:', ['rankIds' => $rankIds]);
    
        // Get rank IDs and all their child ranks for each selected rank ID
        $allRankIds = [];
        foreach ($rankIds as $rankId) {
            $allRankIds = array_merge($allRankIds, $this->rankTreeService->getRankAndAllChildrenRankIds($rankId));
        }
    
        // Log allRankIds
        //Log::info('All Rank IDs and their children:', ['rankIds' => $allRankIds]);
                
        $query->whereIn('rank_id', $allRankIds);
    }

    // Filter by Name if provided
    if ($request->filled('fullname_ar')) {
        $query->where('fullname_ar', 'LIKE', '%' . $request->input('fullname_ar') . '%');
    }
        
    // Filter by Gender if provided
    if ($request->filled('gender')) {
        $query->where('gender', $request->input('gender'));
    }
        
    // Filter by Base IDs if provided
    if ($request->filled('base_ids')) {
        $baseIds = $request->input('base_ids'); // This should now be an array
        
        // Log the baseIds
        // Log::info('Base IDs provided:', ['baseIds' => $baseIds]);
        
        // Search for the base IDs in both first_base_id and last_base_id columns
        $query->where(function ($query) use ($baseIds) {
            $query->whereIn('first_base_id', $baseIds)
                ->orWhereIn('last_base_id', $baseIds);
        });
    }
        
        
    // Filter by Gate IDs if provided
    if ($request->filled('gate_ids')) {
        $gateIds = $request->input('gate_ids'); // This should now be an array
        
        // Log the gateIds
        // Log::info('Gate IDs provided:', ['gateIds' => $gateIds]);
        
        // Search for the gate IDs in both first_gate_id and last_gate_id columns
        $query->where(function ($query) use ($gateIds) {
            $query->whereIn('first_gate_id', $gateIds)
                ->orWhereIn('last_gate_id', $gateIds);
        });
    }
        
        
    $mvtype = null;
    // Filter by MvType if provided
    if ($request->filled('mvtype')) {
        $mvtype = $request->input('mvtype');

        // Filter based on mvtype
        if ($mvtype === 'Check-In') {
            // Only include records with entry issues
            $query->where('entry_issue', 1);
        } elseif ($mvtype === 'Check-Out') {
            // Only include records with exit issues
            $query->where('exit_issue', 1);
        }

        // Search for mvtype in both first_mvtype and last_mvtype columns
        $query->where(function ($query) use ($mvtype) {
            $query->where('first_mvtype', $mvtype)
                  ->orWhere('last_mvtype', $mvtype);
        });
    }

    // Order the data by mvdate (defaulting to ascending order)
    $query->orderBy('mvdate', 'asc');  // 'asc' for ascending, 'desc' for descending

    // Pagination
    $perPage = $request->input('per_page', 25);
    $page = $request->input('page', 1);

    // Execute the query with pagination
    $guests = $query->paginate($perPage, ['*'], 'page', $page);

    // Collect unique department, gender, nationality, and rank IDs for efficient querying
    $departmentIds = $guests->pluck('dep_id')->unique()->toArray();
    $genderIds = $guests->pluck('gender_id')->unique()->toArray();
    $nationalityIds = $guests->pluck('nationality_id')->unique()->toArray();
    $rankIds = $guests->pluck('rank_id')->unique()->toArray();

    // Fetch related data for all guests in one go
    $departments = Departments::find($departmentIds)->keyBy('id');
    $genders = Genders::find($genderIds)->keyBy('id');
    $nationalities = Nationalities::find($nationalityIds)->keyBy('id');
    $ranks = Ranks::find($rankIds)->keyBy('id');


    // Map the related data to the guests
    foreach ($guests as &$guest) {
        $guest->department = $departments[$guest->dep_id]->name_ar ?? '';
        $guest->gender = $genders[$guest->gender_id]->name_ar ?? '';
        $guest->nationality = $nationalities[$guest->nationality_id]->name_ar ?? '';
        $guest->rank = $ranks[$guest->rank_id]->name_ar ?? '';

        // Set "dakhool" and "khorooj" based on mvtype
        if ($mvtype === 'Check-In') {
            $guest->dakhool = implode(' | ', array_filter([
                $guest->checkin_mvtime,
                $guest->first_base,
                $guest->first_gate,
                ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
            ]));
            $guest->khorooj = ''; // Set "khorooj" to an empty string
        } elseif ($mvtype === 'Check-Out') {
            $guest->dakhool = ''; // Set "dakhool" to an empty string
            $guest->khorooj = implode(' | ', array_filter([
                $guest->checkout_mvtime,
                $guest->last_base,
                $guest->last_gate,
                ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
            ]));
        } else {
            // If mvtype is not specified, show both "dakhool" and "khorooj"
            $guest->dakhool = implode(' | ', array_filter([
                $guest->checkin_mvtime,
                $guest->first_base,
                $guest->first_gate,
                ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
            ]));
            $guest->khorooj = implode(' | ', array_filter([
                $guest->checkout_mvtime,
                $guest->last_base,
                $guest->last_gate,
                ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
            ]));
        }

        // Check for issues
        $guest->hasEntryIssue = $guest->entry_issue == 1 ? true : false;
        $guest->hasExitIssue = $guest->exit_issue == 1 ? true : false;
    }




    // Prepare the response data
    $data = [
        [
            'guests' => $guests,
            'pagination' => [
                'current_page' => $guests->currentPage(),
                'per_page' => $guests->perPage(),
                'total' => $guests->total(),
            ],
        ]
    ];
    $username = $request->query('userName', 'Unknown');
    $action = $request->query('action', 'Searched EXPORT ISSUES report');
    DB::table('logs')->insert([
        'emp_id'=> 1,
        'task' =>'EXPORT ISSUES  Report - ' . $action . ' - User: ' . $username,
        'created_by' => $username ?? 'Unknown',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    return response()->json(['columns' => $columns, 'data' => $data]);
}


public function getReportsByDateforBasicReport(Request $request)
{

    // Check if the 'date' parameter is provided
    if (!$request->filled('date')) {
         return response()->json([
              'error' => 'Please provide a date.'
        ], 400); // Return a 400 Bad Request with the error message
    }

    $columns = [
        [
            'headerName' => 'الوحدة',
            'field' => 'department',
            'sortable' => 'true',
            'width' => 300,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الفئة',
            'field' => 'rank_category',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الرتبة',
            'field' => 'rank',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ر/ع',
            'field' => 'military_number',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الجنس',
            'field' => 'gender',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الاسم',
            'field' => 'fullname_ar',
            'sortable' => 'true',
            'width' => 200,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'التاريخ',
            'field' => 'mvdate',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'دخول',
            'field' => 'dakhool',
            'sortable' => 'true',
            'width' => 400,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'خروج',
            'field' => 'khorooj',
            'sortable' => 'true',
            'width' => 400,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ملحوظات',
            'field' => 'notes',
            'sortable' => 'true',
            'width' => 150,
            'headerClass' => 'center-header',
        ]
    ];

    // Initialize the query
    $query = EmployeeSpecificMovementsNotes::query();

    // Add a condition to filter records with either an entry issue or exit issue,
    // and where notes are either NULL or an empty string
    //$query->where(function($q) {
    //    $q->where('entry_issue', 1)
    //      ->orWhere('exit_issue', 1);
    //});

    // Filter by Military Number if provided
    if ($request->filled('military_number')) {
        $query->where('military_number', $request->input('military_number'));
    }

    // Filter by a single date if provided
    //if ($request->filled('date')) {
    //    $query->whereDate('mvdate', $request->input('date'));
    //}

     // Filter by the selected date (already checked that date is provided)
     $query->whereDate('mvdate', $request->input('date'));


    // Filter by Department ID if provided
    if ($request->filled('department_id')) {
        $departmentId = $request->input('department_id');
        
        // Get the department IDs and all its child departments
        $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
        $query->whereIn('dep_id', $departmentIds);
    }

    // Filter by Rank IDs if provided
    if ($request->filled('rank_ids')) {
        $rankIds = $request->input('rank_ids'); // This should now be an array
        // Log the rankIds
        //Log::info('Rank IDs provided:', ['rankIds' => $rankIds]);
    
        // Get rank IDs and all their child ranks for each selected rank ID
        $allRankIds = [];
        foreach ($rankIds as $rankId) {
            $allRankIds = array_merge($allRankIds, $this->rankTreeService->getRankAndAllChildrenRankIds($rankId));
        }
    
        // Log allRankIds
        //Log::info('All Rank IDs and their children:', ['rankIds' => $allRankIds]);
                
        $query->whereIn('rank_id', $allRankIds);
    }

    // Filter by Name if provided
    if ($request->filled('fullname_ar')) {
        $query->where('fullname_ar', 'LIKE', '%' . $request->input('fullname_ar') . '%');
    }

    // Filter by Gender if provided
    if ($request->filled('gender')) {
        $query->where('gender', $request->input('gender'));
    }

    // Filter by Base IDs if provided
    if ($request->filled('base_ids')) {
        $baseIds = $request->input('base_ids'); // This should now be an array

        // Log the baseIds
        // Log::info('Base IDs provided:', ['baseIds' => $baseIds]);

        // Search for the base IDs in both first_base_id and last_base_id columns
        $query->where(function ($query) use ($baseIds) {
            $query->whereIn('first_base_id', $baseIds)
                ->orWhereIn('last_base_id', $baseIds);
        });
    }


    // Filter by Gate IDs if provided
    if ($request->filled('gate_ids')) {
        $gateIds = $request->input('gate_ids'); // This should now be an array

        // Log the gateIds
        // Log::info('Gate IDs provided:', ['gateIds' => $gateIds]);

        // Search for the gate IDs in both first_gate_id and last_gate_id columns
        $query->where(function ($query) use ($gateIds) {
            $query->whereIn('first_gate_id', $gateIds)
                ->orWhereIn('last_gate_id', $gateIds);
        });
    }

    $mvtype = null;
    // Filter by MvType if provided
    if ($request->filled('mvtype')) {
        
        $mvtype = $request->input('mvtype');

        // Search for mvtype in both first_mvtype and last_mvtype columns
        $query->where(function ($query) use ($mvtype) {
            $query->where('first_mvtype', $mvtype)
                ->orWhere('last_mvtype', $mvtype);
        });
    }

    // Order the data by mvdate (defaulting to ascending order)
    $query->orderBy('mvdate', 'asc');  // 'asc' for ascending, 'desc' for descending

    // Pagination
    $perPage = $request->input('per_page', 25);
    $page = $request->input('page', 1);

    // Execute the query with pagination
    $guests = $query->paginate($perPage, ['*'], 'page', $page);

    // Collect unique department, gender, nationality, and rank IDs for efficient querying
    $departmentIds = $guests->pluck('dep_id')->unique()->toArray();
    $genderIds = $guests->pluck('gender_id')->unique()->toArray();
    $nationalityIds = $guests->pluck('nationality_id')->unique()->toArray();
    $rankIds = $guests->pluck('rank_id')->unique()->toArray();

    // Fetch related data for all guests in one go
    $departments = Departments::find($departmentIds)->keyBy('id');
    $genders = Genders::find($genderIds)->keyBy('id');
    $nationalities = Nationalities::find($nationalityIds)->keyBy('id');
    $ranks = Ranks::find($rankIds)->keyBy('id');


    // Map the related data to the guests
    foreach ($guests as &$guest) {
        $guest->department = $departments[$guest->dep_id]->name_ar ?? '';
        $guest->gender = $genders[$guest->gender_id]->name_ar ?? '';
        $guest->nationality = $nationalities[$guest->nationality_id]->name_ar ?? '';
        $guest->rank = $ranks[$guest->rank_id]->name_ar ?? '';

        //Log::info('MvTypeFilter provided:', ['mvtypefilter' => $mvtypefilter]);

        if ($mvtype === 'Check-In') {
            $guest->khorooj = '';
        } else {
                // Concatenate خروج data
                $guest->khorooj = implode(' | ', array_filter([
                $guest->checkout_mvtime,
                $guest->last_base,
                $guest->last_gate,
                ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
            ]));
        }

        if ($mvtype === 'Check-Out') {
            $guest->dakhool = '';
        } else {
                // Concatenate دخول data
                $guest->dakhool = implode(' | ', array_filter([
                    $guest->checkin_mvtime,
                    $guest->first_base,
                    $guest->first_gate,
                    ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
                ]));
        }

        // Check for issues
        $guest->hasEntryIssue = $guest->entry_issue == 1 ? true : false;
        $guest->hasExitIssue = $guest->exit_issue == 1 ? true : false;
    }




    // Prepare the response data
    $data = [
        [
            'guests' => $guests,
            'pagination' => [
                'current_page' => $guests->currentPage(),
                'per_page' => $guests->perPage(),
                'total' => $guests->total(),
            ],
        ]
    ];
    $username = $request->query('userName', 'Unknown');
    $action = $request->query('action', 'Daily Basic report');
    DB::table('logs')->insert([
        'emp_id'=> 1,
        'task' =>'Daily Basic Report - ' . $action . ' - User: ' . $username,
        'created_by' => $username ?? 'Unknown',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    return response()->json(['columns' => $columns, 'data' => $data]);
}


public function getReportsByDateforDailyIssuesReport(Request $request)
{

    // Check if the 'date' parameter is provided
    if (!$request->filled('date')) {
         return response()->json([
              'error' => 'Please provide a date.'
        ], 400); // Return a 400 Bad Request with the error message
    }

    $columns = [
        [
            'headerName' => 'الوحدة',
            'field' => 'department',
            'sortable' => 'true',
            'width' => 300,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الفئة',
            'field' => 'rank_category',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الرتبة',
            'field' => 'rank',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ر/ع',
            'field' => 'military_number',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الاسم',
            'field' => 'fullname_ar',
            'sortable' => 'true',
            'width' => 200,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'التاريخ',
            'field' => 'mvdate',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'دخول',
            'field' => 'dakhool',
            'sortable' => 'true',
            'width' => 400,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'خروج',
            'field' => 'khorooj',
            'sortable' => 'true',
            'width' => 400,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ملحوظات',
            'field' => 'notes',
            'sortable' => 'true',
            'width' => 150,
            'headerClass' => 'center-header',
        ]
    ];

    // Initialize the query
    $query = EmployeeSpecificMovementsNotes::query();

    // Add a condition to filter records with either an entry issue or exit issue,
    // and where notes are either NULL or an empty string
    $query->where(function($q) {
        $q->where('entry_issue', 1)
          ->orWhere('exit_issue', 1);
    });

    // Filter by Military Number if provided
    if ($request->filled('military_number')) {
        $query->where('military_number', $request->input('military_number'));
    }

    // Filter by a single date if provided
    //if ($request->filled('date')) {
    //    $query->whereDate('mvdate', $request->input('date'));
    //}

     // Filter by the selected date (already checked that date is provided in vue)
     $query->whereDate('mvdate', $request->input('date'));


    // Filter by Department ID if provided
    if ($request->filled('department_id')) {
        $departmentId = $request->input('department_id');
        
        // Get the department IDs and all its child departments
        $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
        $query->whereIn('dep_id', $departmentIds);
    }

    // Filter by Rank IDs if provided
    if ($request->filled('rank_ids')) {
        $rankIds = $request->input('rank_ids'); // This should now be an array
        // Log the rankIds
        //Log::info('Rank IDs provided:', ['rankIds' => $rankIds]);
    
        // Get rank IDs and all their child ranks for each selected rank ID
        $allRankIds = [];
        foreach ($rankIds as $rankId) {
            $allRankIds = array_merge($allRankIds, $this->rankTreeService->getRankAndAllChildrenRankIds($rankId));
        }
    
        // Log allRankIds
        //Log::info('All Rank IDs and their children:', ['rankIds' => $allRankIds]);
                
        $query->whereIn('rank_id', $allRankIds);
    }

    // Filter by Name if provided
    if ($request->filled('fullname_ar')) {
        $query->where('fullname_ar', 'LIKE', '%' . $request->input('fullname_ar') . '%');
    }
    
    // Filter by Gender if provided
    if ($request->filled('gender')) {
        $query->where('gender', $request->input('gender'));
    }
    
    // Filter by Base IDs if provided
    if ($request->filled('base_ids')) {
        $baseIds = $request->input('base_ids'); // This should now be an array
    
        // Log the baseIds
        // Log::info('Base IDs provided:', ['baseIds' => $baseIds]);
    
        // Search for the base IDs in both first_base_id and last_base_id columns
        $query->where(function ($query) use ($baseIds) {
            $query->whereIn('first_base_id', $baseIds)
                ->orWhereIn('last_base_id', $baseIds);
        });
    }
    
    
    // Filter by Gate IDs if provided
    if ($request->filled('gate_ids')) {
        $gateIds = $request->input('gate_ids'); // This should now be an array
    
        // Log the gateIds
        // Log::info('Gate IDs provided:', ['gateIds' => $gateIds]);
    
        // Search for the gate IDs in both first_gate_id and last_gate_id columns
        $query->where(function ($query) use ($gateIds) {
            $query->whereIn('first_gate_id', $gateIds)
                ->orWhereIn('last_gate_id', $gateIds);
        });
    }
    
    $mvtype = null;
    // Filter by MvType if provided
    if ($request->filled('mvtype')) {
        $mvtype = $request->input('mvtype');

        // Filter based on mvtype
        if ($mvtype === 'Check-In') {
            // Only include records with entry issues
            $query->where('entry_issue', 1);
        } elseif ($mvtype === 'Check-Out') {
            // Only include records with exit issues
            $query->where('exit_issue', 1);
        }

        // Search for mvtype in both first_mvtype and last_mvtype columns
        $query->where(function ($query) use ($mvtype) {
            $query->where('first_mvtype', $mvtype)
                  ->orWhere('last_mvtype', $mvtype);
        });
    }

    // Order the data by mvdate (defaulting to ascending order)
    $query->orderBy('mvdate', 'asc');  // 'asc' for ascending, 'desc' for descending

    // Pagination
    $perPage = $request->input('per_page', 25);
    $page = $request->input('page', 1);

    // Execute the query with pagination
    $guests = $query->paginate($perPage, ['*'], 'page', $page);

    // Collect unique department, gender, nationality, and rank IDs for efficient querying
    $departmentIds = $guests->pluck('dep_id')->unique()->toArray();
    $genderIds = $guests->pluck('gender_id')->unique()->toArray();
    $nationalityIds = $guests->pluck('nationality_id')->unique()->toArray();
    $rankIds = $guests->pluck('rank_id')->unique()->toArray();

    // Fetch related data for all guests in one go
    $departments = Departments::find($departmentIds)->keyBy('id');
    $genders = Genders::find($genderIds)->keyBy('id');
    $nationalities = Nationalities::find($nationalityIds)->keyBy('id');
    $ranks = Ranks::find($rankIds)->keyBy('id');


    // Map the related data to the guests
    foreach ($guests as &$guest) {
        $guest->department = $departments[$guest->dep_id]->name_ar ?? '';
        $guest->gender = $genders[$guest->gender_id]->name_ar ?? '';
        $guest->nationality = $nationalities[$guest->nationality_id]->name_ar ?? '';
        $guest->rank = $ranks[$guest->rank_id]->name_ar ?? '';

        // Set "dakhool" and "khorooj" based on mvtype
        if ($mvtype === 'Check-In') {
            $guest->dakhool = implode(' | ', array_filter([
                $guest->checkin_mvtime,
                $guest->first_base,
                $guest->first_gate,
                ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
            ]));
            $guest->khorooj = ''; // Set "khorooj" to an empty string
        } elseif ($mvtype === 'Check-Out') {
            $guest->dakhool = ''; // Set "dakhool" to an empty string
            $guest->khorooj = implode(' | ', array_filter([
                $guest->checkout_mvtime,
                $guest->last_base,
                $guest->last_gate,
                ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
            ]));
        } else {
            // If mvtype is not specified, show both "dakhool" and "khorooj"
            $guest->dakhool = implode(' | ', array_filter([
                $guest->checkin_mvtime,
                $guest->first_base,
                $guest->first_gate,
                ($guest->checkin_mvtime !== null && $guest->checkin_mvtime !== '') ? ($guest->first_automatic == 0 ? ' يدوي' : ($guest->first_automatic === 1 ? ' آلي' : '')) : ''
            ]));
            $guest->khorooj = implode(' | ', array_filter([
                $guest->checkout_mvtime,
                $guest->last_base,
                $guest->last_gate,
                ($guest->checkout_mvtime !== null && $guest->checkout_mvtime !== '') ? ($guest->last_automatic == 0 ? ' يدوي' : ($guest->last_automatic === 1 ? ' آلي' : '')) : ''
            ]));
        }

        // Check for issues
        $guest->hasEntryIssue = $guest->entry_issue == 1 ? true : false;
        $guest->hasExitIssue = $guest->exit_issue == 1 ? true : false;
    }




    // Prepare the response data
    $data = [
        [
            'guests' => $guests,
            'pagination' => [
                'current_page' => $guests->currentPage(),
                'per_page' => $guests->perPage(),
                'total' => $guests->total(),
            ],
        ]
    ];
    $username = $request->query('userName', 'Unknown');
    $action = $request->query('action', 'Searched DAILY ISSUES report');
    DB::table('logs')->insert([
        'emp_id'=> 1,
        'task' =>'DAILY ISSUES  Report - ' . $action . ' - User: ' . $username,
        'created_by' => $username ?? 'Unknown',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    return response()->json(['columns' => $columns, 'data' => $data]);
}




    // Unjustified


   public function getReportsByDay(Request $request)
{
    // Define the columns
    $columns = [
        ['headerName' => 'الوحدة', 'field' => 'department', 
        'sortable' => 'true', 'filter' => 'agSetColumnFilter', 'width' => 260],
        ['headerName' => 'الفئة', 'field' => 'rank_category', 
        'sortable' => 'true','filter' => 'agSetColumnFilter', 'width' => 110],
        ['headerName' => 'الرتبة', 'field' => 'rank', 
        'sortable' => 'true','filter' => 'agSetColumnFilter', 'width' => 130],
        ['headerName' => 'ر/ع', 'field' => 'military_number', 'filter' => 'agTextColumnFilter', 'width' => 100],
        ['headerName' => 'الاسم', 'field' => 'fullname_ar', 'filter' => 'agTextColumnFilter', 'width' => 200],
        ['headerName' => 'الجنس', 'field' => 'gender', 'sortable' => 'true','filter' => 'agSetColumnFilter', 'width' => 100],
        ['headerName' => 'دخول', 'field' => 'checkin_msg', 'filter' => 'agTextColumnFilter','sort' => 'desc', 'sortIndex' => 1, 'width' => 325],
        ['headerName' => 'خروج', 'field' => 'checkout_msg', 'filter' => 'agTextColumnFilter','sort' => 'desc', 'sortIndex' => 0, 'width' => 325],
        ['headerName' => 'ملاحظات', 'field' => 'notes', 'sortable' => 'true','filter' => 'agSetColumnFilter','width' => 350]
    ];

    $depId = $request->input('dep_user_id');
    $day = $request->input('day', date('Y-m-d'));

    $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);
    
    $page = $request->input('page', 1); // Get current page or default to 1
    $perPage = 25;  //Specify number of entries to be returned per page

    $guests = Employees::whereIn('dep_id', $departmentIds)
        ->where(['active' => 1, 'is_employee' => 0])
        ->join('movements', 'employees.id', '=', 'movements.emp_id')
        ->where('movements.mvdate', $day)
        ->select('employees.*')
        ->distinct()
        ->paginate($perPage, ['*'], 'page', $page);

    $data = $guests->items(); // Get the current page items

    $data = collect($data)->map(function ($item) use ($day) {
        $dep = Departments::find($item->dep_id);
        $rank = Ranks::find($item->rank_id);
        $rankcategory = RanksCategories::find($rank->rank_id);

        $movements = Movements::where('emp_id', $item->id)
            ->where('mvdate', $day)
            ->whereIn('mvtype', ['Check-In', 'Check-Out'])
            ->get();

        $base = null;
        $gate = null;
        foreach ($movements as $movement) {
            if ($movement->base_id) {
                $base = Bases::find($movement->base_id); 
            }
            if ($movement->gate_id) {
                $gate = Gates::find($movement->gate_id);
            }
        }

        $checkin = $movements->filter(fn($movement) => $movement->mvtype === 'Check-In')
                             ->sortBy('mvtime')->first();

        $checkout = $movements->filter(fn($movement) => $movement->mvtype === 'Check-Out')
                              ->sortBy('mvtime')->last();

        $item->department = $dep ? $dep->name_ar : '';
        $item->rank = $rank ? $rank->name_ar : '';
        $item->rank_category_id = $rankcategory ? $rankcategory->id : '';
        $item->rank_category = $rankcategory ? $rankcategory->name_ar : '';

        $checktimes = CheckTimes::where('dep_id', $item->dep_id)
            ->where('gender_id', $item->gender_id)
            ->where('rank_id', $item->rank_category_id)
            ->first(); 
        
        if (!$checktimes) {
            $checktimes = CheckTimes::where('dep_id', $item->dep_parent_id)
                ->where('gender_id', $item->gender_id)
                ->where('rank_id', $item->rank_category_id)
                ->first();
        }

        $hasEntryIssue = $checkin && $checktimes && $checktimes->start_time < $checkin->mvtime;
        $hasExitIssue = $checkout && $checktimes && $checktimes->end_time > $checkout->mvtime;

        $checkin_msg = $checkin ? $checkin->mvtime . ' | ' . ($checkin->automatic == 0 ? ' يدوي' : ' آلي') . ' | ' . ($gate ? $gate->name_ar : '') . ' | ' . ($base ? $base->name_ar : '') : '';
        $checkout_msg = $checkout ? $checkout->mvtime . ' | ' . ($checkout->automatic == 0 ? ' يدوي' : ' آلي') . ' | ' . ($gate ? $gate->name_ar : '') . ' | ' . ($base ? $base->name_ar : '') : '';

        $note = EmployeeNotes::where('emp_id', $item->id)->where('mvdate', $day)->first();
        $notes = $note ? $note->notes : '';

        return new \App\DTO\EmployeeReportDTO(
            $item, 
            $checkin_msg, 
            $checkout_msg, 
            $notes, 
            $hasEntryIssue, 
            $hasExitIssue
        );
    });

    // Get the last page number
    $lastPage = $guests->lastPage();

    // Determine if there are more pages
    $hasMorePages = $guests->hasMorePages();

    return response()->json([
        'columns' => $columns,
        'data' => $data,
        'pagination' => [
            'current_page' => $guests->currentPage(),
            'per_page' => $guests->perPage(),
            'total' => $guests->total(),
            'last_page' => $lastPage,
            'has_more_pages' => $hasMorePages
        ]
    ]);
}


   

//// Stats

// GetreportsByday

/* public function getReportsByDay(Request $request){
    // Define the columns
    $columns = [
        ['headerName' => 'الوحدة', 'field' => 'department', 
        'sortable' => 'true', 'filter' => 'agSetColumnFilter', 'width' => 260],
        ['headerName' => 'الفئة', 'field' => 'rank_category', 
        'sortable' => 'true','filter' => 'agSetColumnFilter', 'width' => 110],
        ['headerName' => 'الرتبة', 'field' => 'rank', 
        'sortable' => 'true','filter' => 'agSetColumnFilter', 'width' => 130],
        ['headerName' => 'ر/ع', 'field' => 'military_number', 'filter' => 'agTextColumnFilter', 'width' => 100],
        ['headerName' => 'الاسم', 'field' => 'fullname_ar', 'filter' => 'agTextColumnFilter', 'width' => 200],
        ['headerName' => 'الجنس', 'field' => 'gender', 'sortable' => 'true','filter' => 'agSetColumnFilter', 'width' => 100],
        ['headerName' => 'دخول', 'field' => 'checkin_msg', 'filter' => 'agTextColumnFilter','sort' => 'desc', 'sortIndex' => 1, 'width' => 325],
        ['headerName' => 'خروج', 'field' => 'checkout_msg', 'filter' => 'agTextColumnFilter','sort' => 'desc', 'sortIndex' => 0, 'width' => 325],
        ['headerName' => 'ملاحظات', 'field' => 'notes', 'sortable' => 'true','filter' => 'agSetColumnFilter','width' => 350]
    ];

    $depId = isset($_GET['dep_user_id']) ? $_GET['dep_user_id'] : null;
    $day = isset($_GET['day']) ? ($_GET['day'] != '' ? $_GET['day'] : date('Y-m-d')) : date('Y-m-d');

    $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);
    
    $guests = Employees::whereIn('dep_id', $departmentIds)
    //->Where('dep_parent_id', $depId)
    ->where(['active' => 1, 'is_employee' => 0])
    ->join('movements', 'employees.id', '=', 'movements.emp_id')
    ->where('movements.mvdate', $day)
    ->select('employees.*')
    ->distinct()
    ->get();

    
    $data = $guests->map(function ($item) use ($day) {
        $dep = Departments::find($item->dep_id);
        $rank = Ranks::find($item->rank_id);
        $rankcategory = RanksCategories::find($rank->rank_id);
        

        $hasEntryIssue = false;
        $hasExitIssue = false;

        $movements = Movements::where('emp_id', $item->id)
            ->where('mvdate', $day)
            ->whereIn('mvtype', ['Check-In', 'Check-Out'])
            ->get();

        // Find base and gate related to movements
        $base = null;
        $gate = null;
        $auto = '';
        foreach ($movements as $movement) {
            if ($movement->base_id) {
                $base = Bases::find($movement->base_id); 
               
            }
            if ($movement->gate_id) {
                $gate = Gates::find($movement->gate_id);
            }
            
        }
    

        $checkin = $movements->filter(function ($movement) {
            return $movement->mvtype === 'Check-In';
        })->sortBy('mvtime')->first();

        $checkout = $movements->filter(function ($movement) {
            return $movement->mvtype === 'Check-Out';
        })->sortBy('mvtime')->last();

        $item->department = $dep ? $dep->name_ar : '';
        $item->rank = $rank ? $rank->name_ar : '';
        $item->day = $day;
        $item->checkin = $checkin ? $checkin->mvtime : '';
        $item->checkout = $checkout ? $checkout->mvtime : '';
        $item->base = $base ? $base->name_ar : '';
        $item->gate = $base ? $gate->name_ar : '';

        $item->rank_category_id = $rankcategory ? $rankcategory->id : '';
        $item->rank_category = $rankcategory ? $rankcategory->name_ar : '';

        $checktimes = CheckTimes::where('dep_id', $item->dep_id)
        ->where('gender_id', $item->gender_id)
        ->where('rank_id', $item->rank_category_id)
        ->first(); 
        
            if (!$checktimes) 
            {
            $checktimes = CheckTimes::where('dep_id', $item->dep_parent_id)
                ->where('gender_id', $item->gender_id)
                ->where('rank_id', $item->rank_category_id)
                ->first();

            }
            

        if($checkin && $checktimes->start_time < $item->checkin){
            $hasEntryIssue = true;
        }
        if($checkout && $checktimes->end_time > $item->checkout){
            $hasExitIssue = true;

        } 
        $note = EmployeeNotes::where('emp_id', $item->id)->where('mvdate', $day)->first();
        $item->notes = $note ? $note->notes : '';
    
        
        $item->checkin_msg = '';
        $item->checkout_msg = '';
        if($checkin){

            $autoin = $checkin->automatic == 0 ? ' يدوي' : ' آلي';
            $item->checkin_msg = $item->checkin . ' | ' . $autoin . ' | ' . $item->gate . ' | ' . $item->base ;
            //$item->checkout_msg = '';
        }if ($checkout){

            $autoout = $checkout->automatic == 0 ? ' يدوي' : ' آلي';
            $item->checkout_msg = $item->checkout . ' | ' . $autoout . ' | ' . $item->gate . ' | ' . $item->base ;
           // $item->checkin_msg='';
        }
        

        $item->hasEntryIssue = $hasEntryIssue;
        $item->hasExitIssue = $hasExitIssue; 
        $item->gender = $item->gender_id == 1? 'ذكر' : 'أنثى';
        return $item;
    });

    return response()->json([
        'columns' => $columns,
        'data' => $data,
    ]);
}
 */


///

public function getReportsByDateRangeFiltered(Request $request){
   
    //columns
    $columns = [
        [
            'headerName' => 'الوحدة',
            'field' => 'department',
            'filter' => true,
            'width' => 260,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الرتبة',
            'field' => 'rank',
            'filter' => true,
            'width' => 100,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ر/ع',
            'field' => 'military_number',
            'filter' => true,
            'width' => 100,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'الاسم',
            'field' => 'fullname_en',
            'filter' => true,
            'width' => 200,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'التاريخ',
            'field' => 'date',
            'filter' => true,
            'width' => 150,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'دخول',
            'field' => 'checkin',
            'filter' => true,
            'sort' => 'desc',
            'sortIndex' => 1,
            'width' => 325,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'خروج',
            'field' => 'checkout',
            'sort' => 'desc',
            'sortIndex' => 0,
            'filter' => true,
            'width' => 325,
            'headerClass' => 'center-header',
        ],
        [
            'headerName' => 'ملاحظات',
            'field' => 'notes',
            'width' => 350,
            'headerClass' => 'center-header',
        ]
    ];

   $day = isset($_GET['day']) && $_GET['day'] != '' ? $_GET['day'] : date('Y-m-d');
   $end_day = isset($_GET['end_day']) && $_GET['end_day'] != '' ? $_GET['end_day'] : date('Y-m-d'); 

   $depId = $_GET['dep_parent_id'];
   $departmentIds = $this->departmentTree->getAllChildrenDepartmentIds($depId);
   array_unshift($departmentIds, $depId);

   $perPage = $request->input('per_page', 15);
   $page = $request->input('page', 1);

   $data = Employees::where('is_employee', 0)
       ->with(['ranks.rankscateg'])
       ->when(isset($_GET['dep_id']), function ($query) {
           return $query->where('dep_id', $_GET['dep_id']);
       })
       ->when(isset($_GET['military_number']), function ($query) {    // added to filter on the mil_number
        return $query->where('military_number', $_GET['military_number']);
        })
       ->where(function ($query) use ($departmentIds) {
           $query->where('dep_parent_id', $_GET['dep_parent_id'])
               ->orWhereIn('dep_id', $departmentIds);
       })
       ->whereHas('movements', function ($query) use ($day, $end_day) {
           $query->whereBetween('mvdate', [$day, $end_day])
                 ->orderBy('mvdate', 'asc'); // Order by mvdate
       })
       ->paginate($perPage, ['*'], 'page', $page);

   $pag = [
       'current_page' => $data->currentPage(),
       'per_page' => $data->perPage(),
       'total' => $data->total(),
   ];

   $guests = [];

   foreach ($data as $item) {
       $ranksCateg = $item->ranks->rankscateg->id;

       $movements = Movements::where('emp_id', $item->id)
           ->whereBetween('mvdate', [$day, $end_day])
           ->orderBy('mvdate', 'asc'); // Order by mvdate

       if (isset($_GET['mvtype'])) {
           $mvtype = is_array($_GET['mvtype']) ? $_GET['mvtype'] : [$_GET['mvtype']];
           $movements->whereIn('mvtype', $mvtype);
       }

       $movements = $movements->get()->groupBy(function($date) {
           return \Carbon\Carbon::parse($date->mvdate)->format('Y-m-d'); // Group by the date in 'Y-m-d' format
       });

       foreach ($movements as $date => $dateMovements) {
        $in = $dateMovements->filter(function ($mov) {
            return $mov->mvtype === 'Check-In';
        })->sortBy('mvtime')->first();
    
        $out = $dateMovements->filter(function ($mov) {
            return $mov->mvtype === 'Check-Out';
        })->sortBy('mvtime')->last();
    
        $mvti = $in?->automatic == 0 ? ' يدوي' : ' آلي';
        $mvto = $out?->automatic == 0 ? ' يدوي' : ' آلي';
        $mvtidate = $in?->mvdate;
        $mvtodate = $out?->mvdate;
        /*$checktimes = CheckTimes::where('dep_id', $item->dep_parent_id)
            ->where('gender_id', $item->gender_id)
            ->where('rank_id', $ranksCateg)
            ->first();
        */
        $checktimes = CheckTimes::where('dep_id', $item->dep_id)
								->where('gender_id', $item->gender_id)
								->where('rank_id', $item->rank_category_id)
								->first(); 
		if (!$checktimes) 
        {
            $checktimes = CheckTimes::where('dep_id', $item->dep_parent_id)
                                    ->where('gender_id', $item->gender_id)
                                    ->where('rank_id', $item->rank_category_id)
                                    ->first();
                            
        }
        $inpb = $this->issueDetection->getCheckInMessage($checktimes, $in);
        $outpb = $this->issueDetection->getCheckOutMessage($checktimes, $out);
    
        if ($this->issueDetection->hasIssues($in, $out, $checktimes)) {
            $dep = Departments::find($item->dep_id);
            $rank = Ranks::find($item->rank_id);
    
            $ingate = Gates::find($in?->gate_id);
            $inbase = Bases::find($in?->base_id);
    
            $outgate = Gates::find($out?->gate_id);
            $outbase = Bases::find($out?->base_id);
            $cin = ''; $cout = '';
            if($inpb){ $cin =  $inpb . ' | ' . $mvti . ' | ' . $ingate?->name_ar . ' | ' . $inbase?->name_ar ; }
            if($outpb){ $cout =  $outpb . ' | ' . $mvto . ' | ' . $outgate?->name_ar . ' | ' . $outbase?->name_ar ; } 
    
            $inNote = null;
            $outNote = null;
            $notes = '';
            
            try {
                $inNote = EmployeeNotes::where('emp_id', $item->id)->where('mvdate', $in->mvdate)->first();
            } catch (\Exception $e) {
                \Log::error('Error fetching Check-In note: ' . $e->getMessage());
            }
            
            try {
                $outNote = EmployeeNotes::where('emp_id', $item->id)->where('mvdate', $out->mvdate)->first();
            } catch (\Exception $e) {
                \Log::error('Error fetching Check-Out note: ' . $e->getMessage());
            }
            
            if ($inNote) {
                $notes .= $inNote->notes;
            }
            if ($outNote) {
                $notes .= $outNote->notes;
            }
    
            $mvdate = $in ? $in->mvdate : ($out ? $out->mvdate : null);
    
            $guests[] = [
                'id' => $item->id,
                'department' => $dep->name_ar,
                'rank' => $rank->name_ar,
                'military_number' => $item->military_number,
                'fullname_en' => $item->fullname_en,
                'fullname_ar' => $item->fullname_ar,
                'phone' => $item->phone_number,
                'date' => $mvdate,
                'checkin' => $cin,
                'checkout' => $cout,
                'notes' => $notes,
            ];
        }
    }
    
    
   }

   return response()->json(array('columns'=>$columns,'data'=>$guests, 'pagination'=>$pag));
}





    

/////



    public function getIssues(Request $request){  

         // Définir les colonnes de configuration pour la grille
    $columns = [
        ['headerName' => 'الوحدة', 'field' => 'department', 'filter' => 'agTextColumnFilter', 'sortable' => true, 'width' => 260, 'headerClass' => 'center-header'],
        ['headerName' => 'الفئة', 'field' => 'rank_category', 'filter' => 'agTextColumnFilter', 'sortable' => true, 'width' => 120, 'headerClass' => 'center-header'],
        ['headerName' => 'الرتبة', 'field' => 'rank', 'filter' => 'agTextColumnFilter', 'sortable' => true, 'width' => 130, 'headerClass' => 'center-header'],
        ['headerName' => 'ر/ع', 'field' => 'military_number', 'filter' => true, 'width' => 100, 'headerClass' => 'center-header'],
        ['headerName' => 'الاسم', 'field' => 'fullname_ar', 'filter' => true, 'width' => 200, 'headerClass' => 'center-header'],
        ['headerName' => 'الجنس', 'field' => 'gender', 'filter' => true, 'width' => 100, 'headerClass' => 'center-header'],
        ['headerName' => 'التاريخ', 'field' => 'date', 'filter' => true, 'width' => 150, 'headerClass' => 'center-header'],
        ['headerName' => 'دخول', 'field' => 'checkin', 'sortable' => true, 'filter' => 'agSetColumnFilter', 'sort' => 'desc', 'sortIndex' => 1, 'width' => 325, 'headerClass' => 'center-header'],
        ['headerName' => 'خروج', 'field' => 'checkout', 'sortable' => true, 'filter' => 'agSetColumnFilter', 'sort' => 'desc', 'sortIndex' => 0, 'width' => 325, 'headerClass' => 'center-header'],
        ['headerName' => 'ملاحظات', 'sortable' => true, 'filter' => 'agSetColumnFilter', 'field' => 'notes', 'width' => 350, 'headerClass' => 'center-header'],
    ];

    // Obtenir le jour ou utiliser la date du jour par défaut
    $day = $request->query('day', date('Y-m-d'));

    // Déterminer l'ID du département depuis la requête
    $depId = $request->query('dep_id', $request->query('dep_user_id'));

    // Enregistrer l'ID du département sélectionné
    //\Log::info('Selected Department ID:', ['dep_id' => $request->query('dep_id')]);
    //\Log::info('Passed to function with Department ID:', ['dep_id' => $depId]);

    if ($depId !== null) {
        // Obtenir les IDs des départements et de tous les départements enfants
        $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);

        // Construire la requête pour récupérer les mouvements des employés
        $query = Employees::select(
                'employees.id',
                'departments.name_ar as department',
                'departments.id as dep_id',
                'ranks.name_ar as rank',
                'ranks_categories.name_ar as rank_category',
                'employees.military_number',
                'employees.fullname_en',
                'employees.fullname_ar',
                'employees.phone_number',
                'employees.gender_id as gender_id',
                'employees.rank_id as rank_id',
                'ranks.rank_id as rank_category_id',
                'employees.dep_parent_id as dep_parent_id',
                'movements.mvdate',
                'movements.mvtime',
                'movements.mvtype',
                'movements.automatic',
                'movements.gate_id',
                'movements.base_id'
            )
            ->join('movements', 'employees.id', '=', 'movements.emp_id')
            ->join('departments', 'employees.dep_id', '=', 'departments.id')
            ->join('ranks', 'employees.rank_id', '=', 'ranks.id')
            ->join('ranks_categories', 'ranks_categories.id', '=', 'ranks.rank_id')
            ->where('employees.is_employee', 0)
            ->whereIn('employees.dep_id', $departmentIds)
            ->where('movements.mvdate', $day);

        // Filtrer par type de mouvement si spécifié
        if ($request->has('mvtype')) {
            $mvtype = is_array($request->query('mvtype')) ? $request->query('mvtype') : [$request->query('mvtype')];
            $query->whereIn('movements.mvtype', $mvtype);
        }

        // Enregistrer la requête finale pour le débogage
        //\Log::info('SQL Query', ['query' => $query->toSql(), 'bindings' => $query->getBindings()]);

        // Exécuter la requête et trier les résultats
        $movements = $query->orderBy('movements.mvdate', 'asc')->get();

        //\Log::info('Movements Data', ['movements' => $movements]);

        // Grouper les mouvements par ID d'employé et date
        $groupedMovements = $movements->groupBy(function ($item) {
            return $item->id . '_' . $item->mvdate;
        });

        // Traitement supplémentaire peut être effectué ici
        $guests = [];


       foreach ($groupedMovements as $key => $group) {

        
        $firstItem = $group->first();

        $in = $group->filter(function ($mov) {
            return $mov->mvtype === 'Check-In';
        })->sortBy('mvtime')->first();

        $out = $group->filter(function ($mov) {
            return $mov->mvtype === 'Check-Out';
        })->sortBy('mvtime')->last();


        $mvti = $in?->automatic == 0 ? ' يدوي' : ' آلي';
        $mvto = $out?->automatic == 0 ? ' يدوي' : ' آلي';
        $mvtidate = $in?->mvdate;
        $mvtodate = $out?->mvdate;
    
        /*$checktimes = CheckTimes::where('dep_id', $firstItem->dep_parent_id)
            ->where('gender_id', $firstItem->gender_id)
            ->where('rank_id', $firstItem->rank_category_id)
            ->first();*/
            $checktimes = CheckTimes::where('dep_id', $firstItem->dep_id)
								->where('gender_id', $firstItem->gender_id)
								->where('rank_id', $firstItem->rank_category_id)
								->first(); 
            if (!$checktimes) 
            {
                $checktimes = CheckTimes::where('dep_id', $firstItem->dep_parent_id)
                                        ->where('gender_id', $firstItem->gender_id)
                                        ->where('rank_id', $firstItem->rank_category_id)
                                        ->first();
                                
            }

        


        $inpb = $this->issueDetection->getCheckInMessage($checktimes, $in);
        $outpb = $this->issueDetection->getCheckOutMessage($checktimes, $out);



        if ($this->issueDetection->hasIssues($in, $out, $checktimes)) {

            $hasEntryIssue=false;
            $hasExitIssue=false;

        

            if($checktimes && $in && $checktimes->start_time < $in->mvtime)
            {
            $hasEntryIssue=true;
            }
            if($checktimes && $out && $checktimes->end_time > $out->mvtime)
            {
            $hasExitIssue=true;
            }
            

            $dep = Departments::find($firstItem->dep_id);
            $rank = Ranks::find($firstItem->rank_id);

            $ingate = Gates::find($in?->gate_id);
            $inbase = Bases::find($in?->base_id);

            $outgate = Gates::find($out?->gate_id);
            $outbase = Bases::find($out?->base_id);
            $cin = ''; $cout = '';
            if($inpb){ $cin =  $inpb . ' | ' . $mvti . ' | ' . $ingate?->name_ar . ' | ' . $inbase?->name_ar ; }
            if($outpb){ $cout =  $outpb . ' | ' . $mvto . ' | ' . $outgate?->name_ar . ' | ' . $outbase?->name_ar ; } 

            $inNote = null;
            $outNote = null;
            $notes = '';

            try {
                $inNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $in->mvdate)->first();
            } catch (\Exception $e) {
                \Log::error('Error fetching Check-In note: ' . $e->getMessage());
            }

            try {
                $outNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $out->mvdate)->first();
            } catch (\Exception $e) {
                \Log::error('Error fetching Check-Out note: ' . $e->getMessage());
            }

            if ($inNote) {
                $notes .= $inNote->notes;
            }
            if ($outNote) {
                $notes .= $outNote->notes;
            }

            $mvdate = $in ? $in->mvdate : ($out ? $out->mvdate : null);

            $guests[] = [
                'id' => $firstItem->id,
                'department' => $dep->name_ar,
                'rank' => $rank->name_ar,
                'rank_category' => $firstItem->rank_category,
                'military_number' => $firstItem->military_number,
                'fullname_en' => $firstItem->fullname_en,
                'fullname_ar' => $firstItem->fullname_ar,
                'gender' => $firstItem->gender_id == 1? 'ذكر' : 'أنثى',
                'phone' => $firstItem->phone_number,
                'date' => $mvdate,
                'checkin' => $cin,
                'checkout' => $cout,
                'notes' => $notes,
                'hasEntryIssue' =>$hasEntryIssue,
                'hasExitIssue' => $hasExitIssue
            ];
        }
    }
    }
    return response()->json(['columns' => $columns, 'data' => $guests]);
        
    }


    public function getUnjustifiedIssues(Request $request){  

        //columns
        $columns = [
          [
              'headerName' => 'الوحدة',
              'field' => 'department',
              'filter' => 'agTextColumnFilter',
              'sortable' => 'true',
              'width' => 260,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'الفئة',
              'field' => 'rank_category',
              'filter' => 'agTextColumnFilter',
              'sortable' => 'true',
              'width' => 120,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'الرتبة',
              'field' => 'rank',
              'filter' => 'agTextColumnFilter',
              'sortable' => 'true',
              'width' => 130,
              'headerClass' => 'center-header',
          ],
          
          [
              'headerName' => 'ر/ع',
              'field' => 'military_number',
              'filter' => true,
              'width' => 100,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'الاسم',
              'field' => 'fullname_ar',
              'filter' => true,
              'width' => 200,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'الجنس',
              'field' => 'gender',
              'filter' => true,
              'width' => 100,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'التاريخ',
              'field' => 'date',
              'filter' => true,
              'width' => 150,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'دخول',
              'field' => 'checkin',
              'filter' => true,
              'sort' => 'desc',
              'sortIndex' => 1,
              'width' => 325,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'خروج',
              'field' => 'checkout',
              'sort' => 'desc',
              'sortIndex' => 0,
              'filter' => true,
              'width' => 325,
              'headerClass' => 'center-header',
          ],
          [
              'headerName' => 'ملاحظات',
              'field' => 'notes',
              'width' => 350,
              'headerClass' => 'center-header',
          ]
      ];
  
      $day = isset($_GET['day']) && $_GET['day'] != '' ? $_GET['day'] : date('Y-m-d');
      
  
      $depId = $_GET['dep_id'] ?? $_GET['dep_user_id'];
  
      // Log the selected and determined department ID
      //\Log::info('Selected Department ID:', ['dep_id' => $_GET['dep_id'] ?? null]);
     // \Log::info('Passed to function with Department ID:', ['dep_id' => $depId]);
  
      if ($depId !== null) {
      $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);
  
     
      //array_unshift($departmentIds, $depId);
  
  
      $query = Employees::select(
          'employees.id',
          'departments.name_ar as department',
          'departments.id as dep_id',
          'ranks.name_ar as rank',
          'ranks_categories.name_ar as rank_category',
          'employees.military_number',
          'employees.fullname_en',
          'employees.fullname_ar',
          'employees.phone_number',
          'employees.gender_id as gender_id',
          'employees.rank_id as rank_id',
          'ranks.rank_id as rank_category_id',
          'employees.dep_parent_id as dep_parent_id',
          'movements.mvdate',
          'movements.mvtime',
          'movements.mvtype',
          'movements.automatic',
          'movements.gate_id',
          'movements.base_id'
      )
      ->join('movements', 'employees.id', '=', 'movements.emp_id')
      ->join('departments', 'employees.dep_id', '=', 'departments.id')
      ->join('ranks', 'employees.rank_id', '=', 'ranks.id')
      ->join('ranks_categories', 'ranks_categories.id', '=', 'ranks.rank_id')
      ->leftJoin('employee_notes', function($join) use ($day) {
          $join->on('employees.id', '=', 'employee_notes.emp_id')
               ->where('employee_notes.mvdate', '=', $day);
      })
      ->whereNull('employee_notes.id') // Exclude employees with notes on the chosen date
      ->where('employees.is_employee', 0)
      ->where(function ($query) use ($departmentIds) {
          $query->WhereIn('employees.dep_id', $departmentIds);
      })
      ->where('movements.mvdate', $day);
  
          
  
  
      if (isset($_GET['mvtype'])) {
          $mvtype = is_array($_GET['mvtype']) ? $_GET['mvtype'] : [$_GET['mvtype']];
          $query->whereIn('movements.mvtype', $mvtype);
      }
  
      // Log the final query for debugging
      //\Log::info('SQL Query', ['query' => $query->toSql(), 'bindings' => $query->getBindings()]);
  
      $movements = $query->orderBy('movements.mvdate', 'asc')->get();
  
      //\Log::info('Movements Data', ['movements' => $movements]);
  
      $groupedMovements = $movements->groupBy(function ($item) {
          return $item->id . '_' . $item->mvdate;
      });
  
      
      $guests = [];
  
  
      foreach ($groupedMovements as $key => $group) {
  
          
          $firstItem = $group->first();
  
          $in = $group->filter(function ($mov) {
              return $mov->mvtype === 'Check-In';
          })->sortBy('mvtime')->first();
  
          $out = $group->filter(function ($mov) {
              return $mov->mvtype === 'Check-Out';
          })->sortBy('mvtime')->last();
  
  
          $mvti = $in?->automatic == 0 ? ' يدوي' : ' آلي';
          $mvto = $out?->automatic == 0 ? ' يدوي' : ' آلي';
          $mvtidate = $in?->mvdate;
          $mvtodate = $out?->mvdate;
      
          $checktimes = CheckTimes::where('dep_id', $firstItem->dep_id)
								->where('gender_id', $firstItem->gender_id)
								->where('rank_id', $firstItem->rank_category_id)
								->first(); 
								
            if (!$checktimes) {
            $checktimes = CheckTimes::where('dep_id', $firstItem->dep_parent_id)
                                        ->where('gender_id', $firstItem->gender_id)
                                        ->where('rank_id', $firstItem->rank_category_id)
                                        ->first();
                                
                }
  
          
  
  
          $inpb = $this->issueDetection->getCheckInMessage($checktimes, $in);
          $outpb = $this->issueDetection->getCheckOutMessage($checktimes, $out);
  
  
  
          if ($this->issueDetection->hasIssues($in, $out, $checktimes)) {
  
              $hasEntryIssue=false;
              $hasExitIssue=false;
  
          
  
              if($checktimes && $in && $checktimes->start_time < $in->mvtime)
              {
              $hasEntryIssue=true;
              }
              if($checktimes && $out && $checktimes->end_time > $out->mvtime)
              {
              $hasExitIssue=true;
              }
              
  
              $dep = Departments::find($firstItem->dep_id);
              $rank = Ranks::find($firstItem->rank_id);
  
              $ingate = Gates::find($in?->gate_id);
              $inbase = Bases::find($in?->base_id);
  
              $outgate = Gates::find($out?->gate_id);
              $outbase = Bases::find($out?->base_id);
              $cin = ''; $cout = '';
              if($inpb){ $cin =  $inpb . ' | ' . $mvti . ' | ' . $ingate?->name_ar . ' | ' . $inbase?->name_ar ; }
              if($outpb){ $cout =  $outpb . ' | ' . $mvto . ' | ' . $outgate?->name_ar . ' | ' . $outbase?->name_ar ; } 
  
              $inNote = null;
              $outNote = null;
              $notes = '';
  
              try {
                  $inNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $in->mvdate)->first();
              } catch (\Exception $e) {
                  \Log::error('Error fetching Check-In note: ' . $e->getMessage());
              }
  
              try {
                  $outNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $out->mvdate)->first();
              } catch (\Exception $e) {
                  \Log::error('Error fetching Check-Out note: ' . $e->getMessage());
              }
  
              if ($inNote) {
                  $notes .= $inNote->notes;
              }
              if ($outNote) {
                  $notes .= $outNote->notes;
              }
  
              $mvdate = $in ? $in->mvdate : ($out ? $out->mvdate : null);
  
              $guests[] = [
                  'id' => $firstItem->id,
                  'department' => $dep->name_ar,
                  'rank' => $rank->name_ar,
                  'rank_category' => $firstItem->rank_category,
                  'military_number' => $firstItem->military_number,
                  'fullname_en' => $firstItem->fullname_en,
                  'fullname_ar' => $firstItem->fullname_ar,
                  'gender' => $firstItem->gender_id == 1? 'ذكر' : 'أنثى',
                  'phone' => $firstItem->phone_number,
                  'date' => $mvdate,
                  'checkin' => $cin,
                  'checkout' => $cout,
                  'notes' => $notes,
                  'hasEntryIssue' =>$hasEntryIssue,
                  'hasExitIssue' => $hasExitIssue
              ];
          }
      }
      }
      return response()->json(['columns' => $columns, 'data' => $guests]);
          
      }



// Justified


public function getJustifiedIssues(Request $request){  

     //columns
     $columns = [
        [
            'headerName' => 'ملاحظات',
            'field' => 'notes',
            'width' => 200,
            'headerClass' => 'text-right',
            'cellClass' => 'text-right',
        ],
        
        [
            'headerName' => 'خروج',
            'field' => 'checkout',
            'sort' => 'desc',
            'sortIndex' => 0,
            'filter' => true,
            'width' => 325,
            'headerClass' => 'text-right',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'دخول',
            'field' => 'checkin',
            'filter' => true,
            'sort' => 'desc',
            'sortIndex' => 1,
            'width' => 325,
            'headerClass' => 'text-right',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'التاريخ',
            'field' => 'date',
            'filter' => true,
            'width' => 150,
            'headerClass' => 'text-right',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'الجنس',
            'field' => 'gender',
            'filter' => true,
            'width' => 100,
            'headerClass' => 'text-right',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'الاسم',
            'field' => 'fullname_ar',
            'filter' => true,
            'width' => 200,
            'headerClass' => 'center-header',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'الفئة',
            'field' => 'rank_category',
            'filter' => 'agTextColumnFilter',
            'sortable' => 'true',
            'width' => 120,
            'headerClass' => 'center-header',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'الرتبة',
            'field' => 'rank',
            'filter' => 'agTextColumnFilter',
            'sortable' => 'true',
            'width' => 130,
            'headerClass' => 'center-header',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'ر/ع',
            'field' => 'military_number',
            'filter' => true,
            'width' => 100,
            'headerClass' => 'center-header',
            'cellClass' => 'text-right',
        ],
        [
            'headerName' => 'الوحدة',
            'field' => 'department',
            'filter' => 'agTextColumnFilter',
            'sortable' => 'true',
            'width' => 260,
            'headerClass' => 'center-header',
            'cellClass' => 'text-right',
        ]
        
    ];

    $day = isset($_GET['day']) && $_GET['day'] != '' ? $_GET['day'] : date('Y-m-d');
    

    $depId = $_GET['dep_id'] ?? $_GET['dep_user_id'];

    if ($depId !== null) {
    $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);

   
    //array_unshift($departmentIds, $depId);


    $query = Employees::select(
        'employees.id',
        'departments.name_ar as department',
        'departments.id as dep_id',
        'ranks.name_ar as rank',
        'ranks_categories.name_ar as rank_category',
        'employees.military_number',
        'employees.fullname_en',
        'employees.fullname_ar',
        'employees.phone_number',
        'employees.gender_id as gender_id',
        'employees.rank_id as rank_id',
        'ranks.rank_id as rank_category_id',
        'employees.dep_parent_id as dep_parent_id',
        'movements.mvdate',
        'movements.mvtime',
        'movements.mvtype',
        'movements.automatic',
        'movements.gate_id',
        'movements.base_id'
    )
    ->join('movements', 'employees.id', '=', 'movements.emp_id')
    ->join('departments', 'employees.dep_id', '=', 'departments.id')
    ->join('ranks', 'employees.rank_id', '=', 'ranks.id')
    ->join('ranks_categories', 'ranks_categories.id', '=', 'ranks.rank_id')
    ->leftJoin('employee_notes', function($join) use ($day) {
        $join->on('employees.id', '=', 'employee_notes.emp_id')
             ->where('employee_notes.mvdate', '=', $day);
    })
    ->whereNotNull('employee_notes.id') // Exclude employees with notes on the chosen date
    ->where('employees.is_employee', 0)
    ->where(function ($query) use ($departmentIds) {
        $query->WhereIn('employees.dep_id', $departmentIds);
    })
    ->where('movements.mvdate', $day);

        


    if (isset($_GET['mvtype'])) {
        $mvtype = is_array($_GET['mvtype']) ? $_GET['mvtype'] : [$_GET['mvtype']];
        $query->whereIn('movements.mvtype', $mvtype);
    }

    // Log the final query for debugging
    //\Log::info('SQL Query', ['query' => $query->toSql(), 'bindings' => $query->getBindings()]);

    $movements = $query->orderBy('movements.mvdate', 'asc')->get();

    //\Log::info('Movements Data', ['movements' => $movements]);

    $groupedMovements = $movements->groupBy(function ($item) {
        return $item->id . '_' . $item->mvdate;
    });

    
    $guests = [];


    foreach ($groupedMovements as $key => $group) {

        
        $firstItem = $group->first();

        $in = $group->filter(function ($mov) {
            return $mov->mvtype === 'Check-In';
        })->sortBy('mvtime')->first();

        $out = $group->filter(function ($mov) {
            return $mov->mvtype === 'Check-Out';
        })->sortBy('mvtime')->last();


        $mvti = $in?->automatic == 0 ? ' يدوي' : ' آلي';
        $mvto = $out?->automatic == 0 ? ' يدوي' : ' آلي';
        $mvtidate = $in?->mvdate;
        $mvtodate = $out?->mvdate;
    
        $checktimes = CheckTimes::where('dep_id', $firstItem->dep_id)
                              ->where('gender_id', $firstItem->gender_id)
                              ->where('rank_id', $firstItem->rank_category_id)
                              ->first(); 
                              
          if (!$checktimes) {
          $checktimes = CheckTimes::where('dep_id', $firstItem->dep_parent_id)
                                      ->where('gender_id', $firstItem->gender_id)
                                      ->where('rank_id', $firstItem->rank_category_id)
                                      ->first();
                              
              }

        


        $inpb = $this->issueDetection->getCheckInMessage($checktimes, $in);
        $outpb = $this->issueDetection->getCheckOutMessage($checktimes, $out);



        if ($this->issueDetection->hasIssues($in, $out, $checktimes)) {

            $hasEntryIssue=false;
            $hasExitIssue=false;

        

            if($checktimes && $in && $checktimes->start_time < $in->mvtime)
            {
            $hasEntryIssue=true;
            }
            if($checktimes && $out && $checktimes->end_time > $out->mvtime)
            {
            $hasExitIssue=true;
            }
            

            $dep = Departments::find($firstItem->dep_id);
            $rank = Ranks::find($firstItem->rank_id);

            $ingate = Gates::find($in?->gate_id);
            $inbase = Bases::find($in?->base_id);

            $outgate = Gates::find($out?->gate_id);
            $outbase = Bases::find($out?->base_id);
            $cin = ''; $cout = '';
            if($inpb){ $cin =  $inpb . ' | ' . $mvti . ' | ' . $ingate?->name_ar . ' | ' . $inbase?->name_ar ; }
            if($outpb){ $cout =  $outpb . ' | ' . $mvto . ' | ' . $outgate?->name_ar . ' | ' . $outbase?->name_ar ; } 

            $inNote = null;
            $outNote = null;
            $notes = '';

            try {
                $inNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $in->mvdate)->first();
            } catch (\Exception $e) {
                \Log::error('Error fetching Check-In note: ' . $e->getMessage());
            }

            try {
                $outNote = EmployeeNotes::where('emp_id', $firstItem->id)->where('mvdate', $out->mvdate)->first();
            } catch (\Exception $e) {
                \Log::error('Error fetching Check-Out note: ' . $e->getMessage());
            }

            if ($inNote) {
                $notes = $inNote->notes;
            }
            if ($outNote) {
                $notes = $outNote->notes;
            }

            $mvdate = $in ? $in->mvdate : ($out ? $out->mvdate : null);

            $guests[] = [
                'id' => $firstItem->id,
                'department' => $dep->name_ar,
                'rank' => $rank->name_ar,
                'rank_category' => $firstItem->rank_category,
                'military_number' => $firstItem->military_number,
                'fullname_en' => $firstItem->fullname_en,
                'fullname_ar' => $firstItem->fullname_ar,
                'gender' => $firstItem->gender_id == 1? 'ذكر' : 'أنثى',
                'phone' => $firstItem->phone_number,
                'date' => $mvdate,
                'checkin' => $cin,
                'checkout' => $cout,
                'notes' => $notes,
                'hasEntryIssue' =>$hasEntryIssue,
                'hasExitIssue' => $hasExitIssue
            ];
        }
    }
    }
    return response()->json(['columns' => $columns, 'data' => $guests]);
        
    }


    
   
   //////// Stats


    public function getCompaniesReports(Request $request){  

        //columns
        $columns = [
            [
            'headerName' => 'Company',
            'field' => 'department',
            'width'=>300,
            ],
            [
            'headerName' => 'Photo',
            'field' => 'photo',
            'width'=>120,
            ],
            [
            'headerName' => 'Full Name',
            'field' => 'fullname_en',
            'width'=>250,
            ],
            [
            'headerName' => 'Nationality',
            'field' => 'nationality',
            'width'=>200,
            ],
            [
            'headerName' => 'Phone',
            'field' => 'phone_number',
            'width'=>200,
            ],
            [
            'headerName' => 'Check-In',
            'field' => 'checkin',
            'sort' => 'desc',
            'sortIndex'=> 1,
            'width'=>250,
            ],
            [
            'headerName' => 'Check-Out',
            'field' => 'checkout',
            'sort' => 'desc',
            'sortIndex'=> 0,
            'width'=>250,
            ]
            ];

       
        $depId = isset($_GET['dep_id']) ? $_GET['dep_id'] : null;
        $day = isset($_GET['day']) ? ($_GET['day'] != '' ? $_GET['day'] : date('Y-m-d')) : date('Y-m-d');

        $perPage = $request->input('per_page', 25);
        $page = $request->input('page', 1);

                $depId = $_GET['dep_id'];
                $departmentIds = $this->departmentTree->getAllChildrenDepartmentIds($depId);
                array_unshift($departmentIds, $depId);

        $guests = Employees::where('is_employee',1)
            ->whereIn('dep_id', $departmentIds)
            ->where('active', 1)
            ->latest('updated_at')
            ->paginate($perPage, ['*'], 'page', $page);

           

            return response()->json([
                'columns'=>$columns,
                'data' => $guests->map(function ($item) use ($day) {
                    $dep = Departments::find($item->dep_id);
                    $nationality = Nationalities::find($item->nationality_id);
    
                    
                    $movements = Movements::where('emp_id', $item->id)
                        ->where('mvdate', $day)
                        ->whereIn('mvtype', ['Check-In', 'Check-Out'])
                        ->get();
    
                        $checkin = $movements->filter(function ($movement) {
                            return $movement->mvtype === 'Check-In';
                        })->sortBy('mvtime')->first();

                        $checkout = $movements->filter(function ($movement) {
                            return $movement->mvtype === 'Check-Out';
                        })->sortBy('mvtime')->last();
    
                    $item->department = $dep ? $dep->name_ar : '';
                    $item->nationality = $nationality ? $nationality->name_ar : '';
                    $item->day = $day;
                    $item->checkin = $checkin ? date('d M, Y', strtotime($checkin->mvdate)) . ' - ' . $checkin->mvtime : '';
                    $item->checkout = $checkout ? date('d M, Y', strtotime($checkout->mvdate)) . ' - ' . $checkout->mvtime : '';
                    $item->notes = '';
    
                    return $item;
                }),
                'pagination' => [
                    'current_page' => $guests->currentPage(),
                    'per_page' => $guests->perPage(),
                    'total' => $guests->total(),
                ],
            ]);

    }


    public function getCompaniesIssues(Request $request){  

        //columns
        $columns = [
            [
            'headerName' => 'Company',
            'field' => 'department',
            'filter' => true,
            'width'=>300,
            ],
            [
            'headerName' => 'Full Name',
            'field' => 'fullname_en',
            'filter' => true,
            'width'=>220,
            ], 
            [
            'headerName' => 'Nationality',
            'field' => 'nationality',
            'width'=>150,
            ],
            [
            'headerName' => 'Phone',
            'field' => 'phone',
            'width'=>150,
            ],
            [
            'headerName' => 'Check In',
            'field' => 'checkin',
            'filter' => true,
            'sort' => 'desc',
            'sortIndex'=> 1,
            'width'=>380,
            ],
            [
            'headerName' => 'Check Out',
            'field' => 'checkout',
            'sort' => 'desc',
            'sortIndex'=> 0,
            'filter' => true,
            'width'=>380,
            ]
            ];

                    $day = isset($_GET['day']) && $_GET['day'] != '' ? $_GET['day'] : date('Y-m-d');

                    $depId = $_GET['dep_parent_id'];
                    $departmentIds = $this->departmentTree->getAllChildrenDepartmentIds($depId);
                    array_unshift($departmentIds, $depId);

                    $perPage = $request->input('per_page', 25);
                    $page = $request->input('page', 1);


                    $data = Employees::where('is_employee',1)
                        ->when(isset($_GET['dep_id']), function ($query) {
                            return $query->where('dep_id', $_GET['dep_id']);
                        })
                        ->where(function ($query) use($departmentIds) {
                            $query->where('dep_parent_id', $_GET['dep_parent_id'])
                                ->orWhereIn('dep_id', $departmentIds);
                        })
                        ->whereHas('movements', function ($query) use ($day) {
                            $query->where('mvdate', $day);
                        })
                        ->paginate($perPage, ['*'], 'page', $page);

                        $pag = [
                            'current_page' => $data->currentPage(),
                            'per_page' => $data->perPage(),
                            'total' => $data->total(),
                    ];

                    $guests = [];

                    foreach ($data as $item) {
                        $ranksCateg = $item->ranks->rankscateg->id;

                        $movements = Movements::where('emp_id', $item->id)
                        ->where('mvdate', $day);
                        if (isset($_GET['mvtype'])) {
                            $mvtype = is_array($_GET['mvtype']) ? $_GET['mvtype'] : [$_GET['mvtype']];
                            $movements->whereIn('mvtype', $mvtype);
                        }
                        $movements = $movements->get();
    
                        $in = $movements->filter(function ($movement) {
                            return $movement->mvtype === 'Check-In';
                        })->sortBy('mvtime')->first();

                        $out = $movements->filter(function ($movement) {
                            return $movement->mvtype === 'Check-Out';
                        })->sortBy('mvtime')->last();

                       $mvti=$in?->automatic == 0 ? 'تسجيل يدوي' : 'تسجيل آلي';
                       $mvto=$out?->automatic == 0 ? 'تسجيل يدوي' : 'تسجيل آلي';

                        $checktimes = CompaniesTimes::where('dep_id', $item->dep_id)
                            ->first();

                        $inpb = $this->issueDetection->getCCheckInMessage($checktimes, $in);
                        $outpb = $this->issueDetection->getCCheckOutMessage($checktimes, $out);

                        if ($this->issueDetection->hasCompIssues($in, $out, $checktimes)) {
                            $dep = Departments::find($item->dep_id);
                            $nationality = Nationalities::find($item->nationality_id);

                            $ingate = Gates::find($in?->gate_id);
                            $inbase = Bases::find($in?->base_id);

                            $outgate = Gates::find($out?->gate_id);
                            $outbase = Bases::find($out?->base_id);
                            $cin=''; $cout='';
                            if($inpb){$cin=$inpb.' ** '.$mvti.' ** '.$ingate?->name_ar.' ** '.$inbase?->name_ar;}
                            if($outpb){$cout=$outpb.' ** '.$mvto.' ** '.$outbase?->name_ar.' ** '.$outgate?->name_ar;}

                           $guests[] = [
                                'id' => $item->id,
                                'department' => $dep->name_en,
                                'nationality' => $nationality->name_ar,
                                'fullname_en' => $item->fullname_en,
                                'fullname_ar' => $item->fullname_ar,
                                'remarks' => $item->remarks,
                                'bloodtype' => $item->bloodtype,
                                'phone' => $item->phone_number,
                                'checkin' => $cin,
                                'checkout' => $cout,
                            ];

                        }

                            
                        
                    }

        return response()->json(array('columns'=>$columns,'data'=>$guests, 'pagination'=>$pag));
    }


    public function getIndividualReport(Request $request) {
    
        // Columns definition
        $columns = [
            [
                'headerName' => 'الوحدة',
                'field' => 'department',
                'sortable' => 'true',
                'width' => 300,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الفئة',
                'field' => 'rank_category',
                'sortable' => 'true',
                'width' => 120,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الرتبة',
                'field' => 'rank',
                'sortable' => 'true',
                'width' => 130,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'ر/ع',
                'field' => 'military_number',
                'sortable' => 'true',
                'width' => 100,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الاسم',
                'field' => 'fullname_ar',
                'sortable' => 'true',
                'width' => 200,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الجنس',
                'field' => 'gender',
                'sortable' => 'true',
                'width' => 100,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'التاريخ',
                'field' => 'mvdate',
                'sortable' => 'true',
                'width' => 160,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'الوقت',
                'field' => 'mvtime',
                'sortable' => 'true',
                'width' => 160,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'النوع',
                'field' => 'mvtype',
                'sortable' => 'true',
                'width' => 160,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'البوابة',
                'field' => 'gate',
                'sortable' => 'true',
                'width' => 260,
                'headerClass' => 'center-header',
            ],
            [
                'headerName' => 'القاعدة',
                'field' => 'base',
                'sortable' => 'true',
                'width' => 260,
                'headerClass' => 'center-header',
            ]
        ];
    
        // Initialize the query
        $query = EmployeeMovement::query();
    
        // Filter by Military Number if provided
        if ($request->filled('military_number')) {
            $query->where('military_number', $request->input('military_number'));
        }

        // Filter by FROM date if provided
        if ($request->filled('from_date') && $request->filled('to_date')) {
            $query->whereBetween('mvdate', [$request->input('from_date'),$request->input('to_date')] );
        }
    
        // Filter by Department ID if provided
        if ($request->filled('department_id')) {
            $departmentId = $request->input('department_id');
            
            // Get the department IDs and all its child departments
            $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($departmentId);
            $query->whereIn('dep_id', $departmentIds);
        }

        // Filter by Rank IDs if provided
        if ($request->filled('rank_ids')) {
            $rankIds = $request->input('rank_ids'); // This should now be an array
            // Log the rankIds
            //Log::info('Rank IDs provided:', ['rankIds' => $rankIds]);

            // Get rank IDs and all their child ranks for each selected rank ID
            $allRankIds = [];
            foreach ($rankIds as $rankId) {
                $allRankIds = array_merge($allRankIds, $this->rankTreeService->getRankAndAllChildrenRankIds($rankId));
            }

            // Log allRankIds
            //Log::info('All Rank IDs and their children:', ['rankIds' => $allRankIds]);
            
            $query->whereIn('rank_id', $allRankIds);
        }

        // Filter by Name if provided
        if ($request->filled('fullname_ar')) {
            $query->where('fullname_ar', 'LIKE', '%' . $request->input('fullname_ar') . '%');
        }

        // Filter by Gender if provided
        if ($request->filled('gender')) {
            $query->where('gender', $request->input('gender'));
        }

        // Filter by Base IDs if provided
        if ($request->filled('base_ids')) {
            $baseIds = $request->input('base_ids'); // This should now be an array
            // Log the baseIds
            // Log::info('Base IDs provided:', ['baseIds' => $baseIds]);

            // Since there are no child bases, we can directly use the base IDs
            $query->whereIn('base_id', $baseIds);
        }

        // Filter by Gate IDs if provided
        if ($request->filled('gate_ids')) {
            $gateIds = $request->input('gate_ids'); // This should now be an array
            // Log the gateIds
            // Log::info('Gate IDs provided:', ['gateIds' => $gateIds]);
        
            // Since there are no child gates, we can directly use the gate IDs
            $query->whereIn('gate_id', $gateIds);
        }

        // Filter by MvType if provided
        if ($request->filled('mvtype')) {
            $query->where('mvtype', $request->input('mvtype'));
        }

        // Order the data by rank and mvdate
        //$query->orderBy('rank');
    
        // Pagination
        $perPage = $request->input('per_page', 25);
        $page = $request->input('page', 1);
    
        // Execute the query with pagination
        $guests = $query->paginate($perPage, ['*'], 'page', $page);
    
        // Collect unique department, gender, nationality, and rank IDs for efficient querying
        $departmentIds = $guests->pluck('dep_id')->unique()->toArray();
        $genderIds = $guests->pluck('gender_id')->unique()->toArray();
        $nationalityIds = $guests->pluck('nationality_id')->unique()->toArray();
        $rankIds = $guests->pluck('rank_id')->unique()->toArray();
    
        // Fetch related data for all guests in one go
        $departments = Departments::find($departmentIds)->keyBy('id');
        $genders = Genders::find($genderIds)->keyBy('id');
        $nationalities = Nationalities::find($nationalityIds)->keyBy('id');
        $ranks = Ranks::find($rankIds)->keyBy('id');

        // Map the related data to the guests
        foreach ($guests as &$guest) {
            $guest->department = $departments->get($guest->dep_id)?->name_ar ?? '';
            $guest->gender = $genders->get($guest->gender_id)?->name_ar ?? '';
            $guest->nationality = $nationalities->get($guest->nationality_id)?->name_ar ?? '';
            $guest->rank = $ranks->get($guest->rank_id)?->name_ar ?? '';
            if ($guest->mvtype === 'Check-In') {
                $guest->mvtype = 'دخول';
            } elseif ($guest->mvtype === 'Check-Out') {
                $guest->mvtype = 'خروج';
            }
        }
    
        // Prepare the response data
        $data = [
            [
                'guests' => $guests,
                'pagination' => [
                    'current_page' => $guests->currentPage(),
                    'per_page' => $guests->perPage(),
                    'total' => $guests->total(),
                ],
            ]
        ];
 
    $username = $request->query('userName', 'Unknown');
    $action = $request->query('action', 'Searched advanced report');
    DB::table('logs')->insert([
        'emp_id'=> 1,
        'task' =>'Advanced Report - ' . $action . ' - User: ' . $username,
        'created_by' => $username ?? 'Unknown',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
        return response()->json(['columns' => $columns, 'data' => $data]);
    }

    public function advanced(Request $request){  

        //columns
        $columns = [
            [
            'headerName' => 'Department',
            'field' => 'department',
            'filter' => true,
            'width'=>200,
            ],
            [
            'headerName' => 'Ranks',
            'field' => 'rank',
            'filter' => true,
            'width'=>150
            ],
            [
            'headerName' => 'Military Nb',
            'field' => 'military_number',
            'filter' => true,
            'width'=>150
            ],
            [
                'headerName' => 'Photo',
                'field' => 'photo',
                'filter' => true,
                'width'=>120,
            ],
            [
            'headerName' => 'Full Name',
            'field' => 'fullname_en',
            'filter' => true,
            'width'=>220,
            ],
            [
            'headerName' => 'الاسم الكامل',
            'field' => 'fullname_ar',
            'filter' => true,
            'width'=>220,
            ],
            [
                'headerName' => 'Phone',
                'field' => 'phone',
                'filter' => true,
                'width'=>150,
            ],
            [
            'headerName' => 'Issues',
            'field' => 'issues',
            'sort' => 'desc',
            'sortIndex'=> 0,
            'filter' => true,
            'width'=>350,
            'tooltipField'=>'issues',
            'tooltipComponent'=> 'CustomTooltip',
            ]
            ];

            $day1 = isset($request->startDate) && $request->startDate !== '' ? $request->startDate : date('Y-m-d');

            $query = Employees::query(); 

            $query->when($request->filled('gender_id'),function($q) use ($request){
                $q->where('gender_id',$request->gender_id); 
            });

            $query->when($request->filled('military_number'),function($q) use ($request){
                $q->where('military_number',$request->military_number); 
            });

            $query->when($request->filled('rank_id'),function($q) use ($request){
                foreach ($request->rank_id as $rankId => $isChecked) {
                    if ($isChecked) {
                        $q->where('rank_id',$rankId); 
                    }
                }
            });

            $query->when($request->filled('dep_id'),function($q) use ($request){
                foreach ($request->dep_id as $depId => $isChecked) {
                    if ($isChecked) {
                        $q->where('dep_id',$depId)->orWhere('dep_parent_id',$depId); 
                    }
                }
            });

          

                $data = $query->whereHas('movements', function ($qry) use($day1){
                    $qry->where('mvdate', $day1);
                })->get();

                

                $guests=[];
                foreach ($data as $item) {
                    $minutes=0; $minutes11=0; $inpb=''; $outpb=''; $issues=''; 
                    //issues

                        $movements = Movements::where('emp_id', $item->id)
                        ->where('mvdate', $day1)
                        ->whereIn('mvtype', ['Check-In', 'Check-Out'])
                        ->get();
    
                        $in = $movements->filter(function ($movement) {
                            return $movement->mvtype === 'Check-In';
                        })->sortBy('mvtime')->first();

                        $out = $movements->filter(function ($movement) {
                            return $movement->mvtype === 'Check-Out';
                        })->sortBy('mvtime')->last();

                           
                            if($in){$checkintime=$in->mvtime;}else{$checkintime=null;}

                           
                            if($out){$checkouttime=$out->mvtime;}else{$checkouttime=null;}

                            $rank=Ranks::find($item->rank_id);

                         

                            $checktimes=CheckTimes::where('dep_id',$item->dep_parent_id)->where('gender_id',$item->gender_id)->where('rank_id',$rank->rank_id)->first();

                            if($checktimes){

                                if($checkintime!=null)
                                {
                                    if($checktimes->start_time < $checkintime)
                                    {
                                        // $time1=new DateTime($checktimes->start_time);
                                        // $time2=new DateTime($checkintime);
                                        // $diff1=$time1->diff($time2);
                                        // $minutes=$diff1->h * 60 + $diff1->i;

                                        $timestamp11 = strtotime($checktimes->start_time);
                                        $timestamp12 = strtotime($checkintime);

                                        $minutes = ($timestamp12 - $timestamp11) / 60;
                                    }    
                                        if($minutes>0){$inpb='Check-In delay : '.$minutes.' minutes'; $issues.='['.date('d F, Y', strtotime($day1)).'] Check-In delay : '.$minutes.' minutes<br>';}else{$inpb=$checkintime;}
                                           
                                    
                                    
                                }


                                if($checkouttime!=null)
                                {
                                    if($checktimes->end_time > $checkouttime)
                                    {
                                        // $time11=new DateTime($checktimes->end_time);
                                        // $time22=new DateTime($checkouttime);
                                        // $diff11=$time11->diff($time22);
                                        // $minutes11=$diff11->h * 60 + $diff11->i;

                                        $timestp11 = strtotime($checktimes->end_time);
                                        $timestp12 = strtotime($checkouttime);

                                        $minutes11 = ($timestp11 - $timestp12) / 60;
                                    }

                                    if($minutes11>0){ $outpb='Check-Out early : '.$minutes11.' minutes'; $issues.='['.date('d F, Y', strtotime($day1)).'] Check-Out early : '.$minutes11.' minutes<br>'; }else{$outpb=$checkouttime;}
                                    
                                }

                            }
                    //array
                    $dep=Departments::find($item->dep_id);
                    $rank=Ranks::find($item->rank_id);
                    if($minutes>0 ||$minutes11>0 ){
                       $guests[]=array('id'=>$item->id,'department'=>$dep->name_en,'rank'=>$rank->name_en,'military_number'=>$item->military_number,'photo'=>$item->photo,'fullname_en'=>$item->fullname_en,'fullname_ar'=>$item->fullname_ar,'phone'=>$item->phone_number,'checkin'=>$inpb,'checkout'=>$outpb,'issues'=>$issues); 
                    }
                    
                }

        

     return response()->json(array('depid'=>$request->dep_id,'columns'=>$columns,'data'=>$guests));
    }



   public function getLateEmployeesPercentage(Request $request)
   {
       $startDate = $request->input('start_date', date('Y-m-d'));
       $endDate = $request->input('end_date', date('Y-m-d'));
       $depId = $request->input('dep_parent_id');
   
       /*\Log::info('getLateEmployeesPercentage called', [
           'start_date' => $startDate,
           'end_date' => $endDate,
           'dep_parent_id' => $depId
       ]);*/
   
       if (!$startDate || !$endDate || !$depId) {
           return response()->json([
               'error' => 'Invalid input parameters'
           ], 400);
       }
   
       $departmentIds = $this->departmentTree->getAllChildrenDepartmentIds($depId);
       array_unshift($departmentIds, $depId);
   
       $totalEmployees = Employees::where('is_employee', 0)
           ->where(function ($query) use ($departmentIds) {
               $query->where('dep_parent_id', $departmentIds[0])
                   ->orWhereIn('dep_id', $departmentIds);
           })
           ->count();
   
       if ($totalEmployees === 0) {
           return response()->json([
               'percentage_late' => 0
           ]);
       }
   
       $movements = Movements::whereBetween('mvdate', [$startDate, $endDate])
           ->whereIn('dep_id', $departmentIds)
           ->get();
   
       $lateEmployees = $movements->filter(function ($movement) {
           $checktimes = CheckTimes::where('dep_id', $movement->dep_id)->first();
           return $this->issueDetection->hasIssues($movement->checkin, $movement->checkout, $checktimes);
       });
   
       $lateEmployeeDetails = $lateEmployees->map(function ($movement) {
           $employee = $movement->employee;
           $dep = Department::find($movement->dep_id);
           $rank = $employee->rank;
   
           return [
               'id' => $employee->id,
               'department' => $dep->name_ar,
               'rank' => $rank->name_ar,
               'military_number' => $employee->military_number,
               'fullname_en' => $employee->fullname_en,
               'fullname_ar' => $employee->fullname_ar,
               'phone' => $employee->phone_number,
               'date' => $movement->mvdate,
               'checkin' => $movement->checkin,
               'checkout' => $movement->checkout,
               'notes' => $movement->notes,
           ];
       });
   
       $lateEmployeesCount = $lateEmployeeDetails->count();
       $percentageLateEmployees = $totalEmployees > 0 ? ($lateEmployeesCount / $totalEmployees) * 100 : 0;
   
       return response()->json([
           'total_employees' => $totalEmployees,
           'late_employees' => $lateEmployeesCount,
           'percentage_late' => $percentageLateEmployees,
           'data' => $lateEmployeeDetails
       ]);
   }
   
}
