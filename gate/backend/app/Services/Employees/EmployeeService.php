<?php

namespace App\Services\Employees;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\Employees;
use App\Models\EmployeeCars;
use App\Models\EmployeeNotes;
use App\Models\EmployeeZones;
use App\Models\Badges;
use App\Models\Badges2;
use App\Models\Departments;
use App\Models\Ranks;
use App\Models\Genders;
use App\Models\Nationalities;
use App\Models\Bases;
use App\Models\CheckTimes;
use App\Models\Gates;
use App\Models\Movements;
use App\Support\Tree\DepartmentTreeService;
use App\Support\Tree\RankTreeService;

class EmployeeService
{
    public function __construct(
        private DepartmentTreeService $departmentTree,
        private RankTreeService $rankTreeService,
    ) {}
    public function getemployees(Request $request){

        function getStatusText($status) {
            $statusMapping = [
                0 => 'Pending',
                1 => 'Approved',
                2 => 'Printed',
                3 => 'Collected',
                4 => 'Canceled',
            ];
        
            return $statusMapping[$status] ?? 'unknown';
          }    

        //columns
        $columns = [
            [
                'headerName' => 'الرقم القاعدي',
                'field' => 'id',
                'sortable' => true,
                'width'=>150,
                'headerCheckboxSelection' => true,
                'headerCheckboxSelectionFilteredOnly' => true,
                'checkboxSelection' => true,
                'headerCheckboxSelectionCurrentPageOnly' => true
                ],
            [
            'headerName' => 'الصورة',
            'field' => 'photo',
            'sortable' => true,
            'width'=>100,
            ],
            [
            'headerName' => 'الحالة',
            'field' => 'status',
            'sortable' => 'true','filter' => 'agSetColumnFilter',
            'width'=>130,
            ],
            [
            'headerName' => 'الوحدة',
            'field' => 'department',
            'sortable' => 'true','filter' => 'agSetColumnFilter',
            'width'=>300,
            ],
            [
            'headerName' => 'الرتبة',
            'field' => 'rank',
            'sortable' => 'true','filter' => 'agSetColumnFilter',
            'width'=>120
            ],
            [
            'headerName' => 'ر/ع',
            'field' => 'military_number',
            'sortable' => 'true','filter' => 'agSetColumnFilter',
            'width'=>120
            ],
            [
            'headerName' => 'الكود',
            'field' => 'qrcode',
            'sortable' => 'true','filter' => 'agSetColumnFilter',
            'width'=>120
            ],
            [
            'headerName' => 'الجنسية',
            'field' => 'nationality',
            'sortable' => 'true',
            'filter' => 'agSetColumnFilter',
            'width'=>130
            ],
            [
            'headerName' => 'الجنس',
            'field' => 'gender',
            'sortable' => 'true','filter' => 'agSetColumnFilter',
            'width'=>100
            ],
            [
            'headerName' => 'الاسم',
            'field' => 'fullname_ar',
            'sortable' => 'true','filter' => 'agSetColumnFilter',
            'width'=>200,
            ],
            [
                'headerName' => 'ملاحظات',
                'field' => 'remarks',
                'sortable' => true,
                'width'=>200,
                ],
                [
                    'headerName' => 'فصيلةالدم',
                    'field' => 'bloodtype',
                    'sortable' => true,
                    'width'=>200,
                    ],
            [
            'headerName' => 'الصلوحية',
            'field' => 'expiry_date',
            'sortable' => true,
            'width'=>120,
            ]
            ];

            //check if dep_id is QAF All employees
            $departmentIds = $this->departmentTree->getAllChildrenDepartmentIds($request->dep_id);
            if($request->dep_id==1)
            {   $baseQuery = Employees::query()
                ->select(DB::raw("COUNT(*) as count"), DB::raw("status"))
                ->where('employees.active', 1);
                 
            }
            else
            /*{
                $baseQuery = Employees::query()
                ->select(DB::raw("COUNT(*) as count"), DB::raw("status"))
                ->where('employees.active', 1)
                ->where('dep_parent_id', $request->dep_id);
            }*/
            {//under the QAF user
                $baseQuery = Employees::query()
                ->select(DB::raw("COUNT(*) as count"), DB::raw("status"))
                ->where('employees.active', 1)
                ->whereIn('dep_id', $departmentIds);
            } 

                // Initialize base query
                /*$baseQuery = Employees::query()
                    ->select(DB::raw("COUNT(*) as count"), DB::raw("status"))
                    ->where('employees.active', 1)
                    ->where('dep_parent_id', $request->dep_id);
            */
                // Apply filters independently
                if ($request->has('military_number') && $request->military_number) {
                    $baseQuery->where('military_number', $request->military_number);
                }
if ($request->filled('fullname_ar')) {
    $name = trim($request->fullname_ar);

    $baseQuery->where(function ($query) use ($name) {
        $query->where('fullname_ar', 'LIKE', "%{$name}%")
              ->orWhere('fullname_en', 'LIKE', "%{$name}%");
    });
}

            
if (!empty(trim($request->plate_number))) {

    $search = trim($request->plate_number);

    $baseQuery->join('employee_cars', 'employees.id', '=', 'employee_cars.emp_id')
        ->where('employee_cars.active', 1)
        ->whereRaw('employee_cars.plate_number LIKE ?', ["%{$search}%"]);
}
                // Log the base query
                //\Log::info('Base Query', ['query' => $baseQuery->toSql(), 'bindings' => $baseQuery->getBindings()]);
            
                // Get records
                $records = $baseQuery->groupBy('status')
                    ->orderBy('status', 'asc')
                    ->get();
            
               // \Log::info('Records Found', ['records' => $records]);
            
                $data = [];
                $departmentIds = [];
                $genderIds = [];
                $nationalityIds = [];
                $rankIds = [];
                
                foreach ($records as $row) {
                   // \Log::info('Processing Row', ['row' => $row]);
            $departmentIds = $this->departmentTree->getAllChildrenDepartmentIds($request->dep_id);
            
                    $perPage = $request->input('per_page', 25);
                    $page = $request->input('page', 1);
            
                    // Initialize guests query
                    /*$guestsQuery = Employees::query()
                        ->where('employees.active', 1)
                        ->where('status', $row->status)
                        ->where('dep_parent_id', $request->dep_id);*/
                        if($request->dep_id==1)//allqaf
                        {
                            $guestsQuery = Employees::query()
                                    ->where('employees.active', 1)
                                    ->where('status', $row->status);
                        }
                        else
                        {
                                $guestsQuery = Employees::query()
                                    ->where('employees.active', 1)
                                    ->where('status', $row->status)
                                    ->wherein('dep_id', $departmentIds);
                        }
                        $carsearch = !empty($request->plate_number); 
                    // Apply filters independently
                    if ($request->has('military_number') && $request->military_number) {
                        $guestsQuery->where('military_number', $request->military_number);
                    }
if ($request->filled('fullname_ar')) {
    $name = trim($request->fullname_ar);

    $guestsQuery->where(function ($query) use ($name) {
        $query->where('fullname_ar', 'LIKE', "%{$name}%")
              ->orWhere('fullname_en', 'LIKE', "%{$name}%");
    });
}
            
                    if ($request->has('plate_number') && $request->plate_number) {
                        $guestsQuery->join('employee_cars', 'employees.id', '=', 'employee_cars.emp_id')
                        ->whereRaw('employee_cars.plate_number LIKE ?', ["%{$request->plate_number}%"])
                                    ->where('employee_cars.active', 1);
                        $carsearch = 1;
                    }
                    
            
                    // Log the guests query
                    //\Log::info('Guests Query', ['query' => $guestsQuery->toSql(), 'bindings' => $guestsQuery->getBindings()]);
            
                    // Get guests
                    $guests = $guestsQuery->latest('employees.created_at')->paginate($perPage, ['*'], 'page', $page);
            
                    //\Log::info('Guests Found', ['guests' => $guests]);
            
                    // Collect unique department, gender, nationality, and rank IDs for efficient querying
                    $departmentIds = array_merge($departmentIds, $guests->pluck('dep_id')->unique()->toArray());
                    $genderIds = array_merge($genderIds, $guests->pluck('gender_id')->unique()->toArray());
                    $nationalityIds = array_merge($nationalityIds, $guests->pluck('nationality_id')->unique()->toArray());
                    $rankIds = array_merge($rankIds, $guests->pluck('rank_id')->unique()->toArray());
            
                    $data[] = [
                        'id' => $row->status,
                        'status' => getStatusText($row->status),
                        'count' => $row->count,
                        'guests' => $guests,
                        'pagination' => [
                            'current_page' => $guests->currentPage(),
                            'per_page' => $guests->perPage(),
                            'total' => $guests->total(),
                        ],
                    ];
                }
            
                // Fetch related data for all guests in one go
                $departments = Departments::find($departmentIds)->keyBy('id');
                $genders = Genders::find($genderIds)->keyBy('id');
                $nationalities = Nationalities::find($nationalityIds)->keyBy('id');
                $ranks = Ranks::find($rankIds)->keyBy('id');
            
                foreach ($data as &$item) {
                    if (!isset($item['guests'])) { // Ensure 'guests' key exists
                        $item['guests'] = [];
                    }
                    foreach ($item['guests'] as &$guest) {
                        $guest->department = $departments[$guest->dep_id]->name_ar ?? '';
                        $guest->gender = $genders[$guest->gender_id]->name_ar ?? '';
                        $guest->nationality = $nationalities[$guest->nationality_id]->name_ar ?? '';
                        $guest->rank = $ranks[$guest->rank_id]->name_ar ?? '';
                        if($carsearch == 1){
                            $guest->id = $guest->emp_id; //faza bhima ema mrigla (condition on the cars search)
                        }
                        
                        
                    }
                }
            
               // \Log::info('Final Data', ['data' => $data]);
            
                return response()->json(['columns' => $columns, 'data' => $data]);
            }


    public function getEmployeesByDep(){
        if($_GET['dep_id']==1)
        {
            $guests = Employees::where('active',1)->latest()->get()->map(function($item) {
           
                $rank=Ranks::find($item->rank_id);
                $item->rank=$rank->name_ar;
                $item->empl=$rank->name_ar.' / '.$item->fullname_ar;
                return $item;
                });
        }
        else 
        {
            $guests = Employees::where('active',1)->where('dep_parent_id',$_GET['dep_id'])->orWhere('dep_id', $_GET['dep_id'])->latest()->get()->map(function($item) {
           
            $rank=Ranks::find($item->rank_id);
            $item->rank=$rank->name_ar;
            $item->empl=$rank->name_ar.' / '.$item->fullname_ar;
            return $item;
            });
        }
        return response()->json($guests);
    }

    public function getlatestemployees(){
        if(isset($_GET['dep_id'])){
            $depId = $_GET['dep_id'];
            $guests = Employees::where('active',1)
                ->where('is_employee',0)
                ->where(function ($query) use ($depId) {
                    $query->where('dep_parent_id', $depId)
                        ->orWhere('dep_id', $depId);
                })
                ->latest()
                ->take(20)
                ->get()
                ->map(fn ($item) => $this->mapLatestEmployee($item));
        }
        else{
            $guests = Employees::where('active',1)->latest()->take(20)->get()->map(fn ($item) => $this->mapLatestEmployee($item));
        }

        return response()->json(array('data'=>$guests));
    }

    private function mapLatestEmployee($item)
    {
        $dep = Departments::find($item->dep_id);
        $gender = Genders::find($item->gender_id);
        $nationality = Nationalities::find($item->nationality_id);
        $rank = Ranks::find($item->rank_id);
        $item->department = $dep?->name_en ?? '';
        $item->gender = $gender?->name_en ?? '';
        $item->nationality = $nationality?->name_en ?? '';
        $item->rank = $rank?->name_en ?? '';
        $item->created = date('d F, Y - H:i:s', strtotime($item->created_at));

        return $item;
    }


    public function employeeInfo($id){
        // Fetch employee data including related cars, then process each employee
        $data = Employees::where('id', $id)->with('cars')->get()->map(function($item) {
            
            // Fetch employee zones and add to the employee item
            $zones = EmployeeZones::where('emp_id', $item->id)->get();
            $z = [];
            foreach($zones as $zone) {
                $z[] = $zone->zone_id;
            }
            $item->selectedZones = $z;
    
            // Employee movement history (all dates) for the database panel
            $movements = Movements::where('emp_id', $item->id)
                ->orderBy('mvdate', 'desc')
                ->orderBy('mvtime', 'desc')
                ->get();
            $m = [];
            foreach ($movements as $movement) {
                $base = Bases::find($movement->base_id);
                $gate = Gates::find($movement->gate_id);
                $mvtype_ar = $movement->mvtype === 'Check-In'
                    ? 'دخول'
                    : ($movement->mvtype === 'Check-Out' ? 'خروج' : $movement->mvtype);

                $m[] = [
                    'mvtype' => $mvtype_ar,
                    'mvtime' => $movement->mvtime,
                    'mvdate' => $movement->mvdate,
                    'base_name_ar' => $base->name_ar ?? '',
                    'gate_name_ar' => $gate->name_ar ?? '',
                ];
            }
            $item->movements = $m;
    
            // Return the modified employee item
            return $item;
        });
    
        // Return the processed data as a JSON response
        return response()->json($data);
    }
	


    public function guestInfo($id){

        $day = isset($_GET['day']) && $_GET['day'] != '' ? $_GET['day'] : date('Y-m-d');

            $data = Employees::with(['ranks.rankscateg'])->where('id',$id)->get()->map(function($item) use ($day) {

                $inpb=''; $outpb=''; $minutes=0; $minutes11=0;

                $dep=Departments::find($item->dep_id);
                $gender=Genders::find($item->gender_id);
                $nationality=Nationalities::find($item->nationality_id);
                $rank=Ranks::find($item->rank_id);

                $zones=EmployeeZones::where('emp_id',$item->id)->get();
                $z=[];
                foreach($zones as $zone){
                    $z[]=$zone->zone_id;
                }

               

                $item->day=date('d M, Y', strtotime($day));

                $movements=Movements::with('createdBy')->where('emp_id',$item->id)->where('mvdate',$day)->latest()->get();
                $m=[];
                foreach($movements as $mov){
                    $base=Bases::find($mov->base_id);
                    $gate=Gates::find($mov->gate_id);
                    $m[]=array(
                        'base'=>$base->name_en,
                        'gate'=>$gate->name_en,
                        'mvtype'=>$mov->mvtype,
                        'created_at'=>date('d M, Y H:i:s', strtotime($mov->created_at)),
                        'createdby_id'=>$mov->createdby_id,
                        'operator_name'=>$mov->operatorLabel(),
                    );
                }

                $allMovements=Movements::with('createdBy')->where('emp_id',$item->id)->orderBy('mvdate','desc')->orderBy('mvtime','desc')->get();
                $all=[];
                foreach($allMovements as $mov){
                    $base=Bases::find($mov->base_id);
                    $gate=Gates::find($mov->gate_id);
                    $all[]=array(
                        'base'=>$base->name_en ?? '',
                        'gate'=>$gate->name_en ?? '',
                        'mvtype'=>$mov->mvtype,
                        'mvdate'=>$mov->mvdate,
                        'mvtime'=>$mov->mvtime,
                        'created_at'=>date('d M, Y H:i:s', strtotime($mov->created_at)),
                        'createdby_id'=>$mov->createdby_id,
                        'operator_name'=>$mov->operatorLabel(),
                    );
                }

               /* $in = $movements::where('emp_id',$item->id)->where('mvdate',$day)->filter(function ($movement) {
                    return $movement->mvtype === 'Check-In';
                })->sortBy('mvtime')->first();*/

                $in=Movements::where('emp_id',$item->id)->where('mvdate',$day)->where('mvtype','Check-In')->first();
                if($in){
                    $item->checkin=$in->mvtime; $checkintime=$in->mvtime;
                }else{$item->checkin=''; $checkintime=null;}
                
                $out=Movements::where('emp_id',$item->id)->where('mvdate',$day)->where('mvtype','Check-Out')->latest('id')->first();
                if($out){$item->checkout=$out->mvtime; $checkouttime=$out->mvtime;}else{$item->checkout=''; $checkouttime=null;}

               $checktimes=CheckTimes::where('dep_id',$item->dep_parent_id)->where('gender_id',$item->gender_id)->where('rank_id',$item->ranks->rankscateg->id)->first();
               $inpb='<ul>';
                if($checktimes){

                        if($checkintime==null)
                        {$inpb.='<li class="text-red">No Check-In</li>';}
                        else
                        {
                            if($checktimes->start_time < $checkintime)
                            {
                                // $time1=new DateTime($checktimes->start_time);
                                // $time2=new DateTime($checkintime);
                                // $diff1=$time1->diff($time2);
                                // $minutes=$diff1->h * 60 + $diff1->i;

                                $time1 = strtotime($checktimes->start_time);
                                $time2 = strtotime($checkintime);

                                $minutes = floor(($time2 - $time1) / 60);

                                if($minutes>0){$inpb.='<li class="text-red">Check-In delay : '.$minutes.' minutes</li>';  }
                            }
                           
                        }
                    

                        if($checkouttime==null)
                        {$inpb.='<li class="text-red">No Check-Out</li>';}
                        else
                        {
                            if($checktimes->end_time > $checkouttime)
                            {
                                // $time11=new DateTime($checktimes->end_time);
                                // $time22=new DateTime($checkouttime);
                                // $diff11=$time11->diff($time22);
                                // $minutes11=$diff11->h * 60 + $diff11->i;

                                $time11 = strtotime($checktimes->end_time);
                                $time22 = strtotime($checkouttime);

                                $minutes11 = floor(($time11 - $time22) / 60);

                               if($minutes11>0){ $inpb.='<li class="text-red">Check-Out early : '.$minutes11.' minutes</li>';}
                            }
                            
                        }
                    
                }
               $inpb.='<ul>';

               $note=EmployeeNotes::where('emp_id',$item->id)->where('mvdate',$day)->first();
               if($note)
               {$notes=$note->notes.'<br><b>by : </b> '.$note->created_by.' <b>at : </b> '.date('d M, Y H:i:s', strtotime($note->created_at));}
               else
               {$notes='';}

                $item->department=$dep->name_ar;
                $item->gender=$gender->name_ar;
                $item->nationality=$nationality->name_en;
                $item->rank=$rank->name_ar;
                $item->selectedZones=$z;
                $item->history=$m;
                $item->all_movements=$all;
                $item->defaut=$inpb;
                $item->notes=$notes;
                return $item;
            });


            return response()->json($data);
    }


    public function addemployee(Request $request){
        $input=$request->all();

        if ($request->hasFile('photo')) {
            $photo = $request->file('photo');
            $filename = time() . '.' . $photo->getClientOriginalExtension();
            $filepath = 'uploads/'.$filename;
            move_uploaded_file($photo, $filepath);
            $input['photo']=$filepath;
        }

        $input['qrcode']=uniqid();
        $input['active']=1;

        $employee=Employees::create($input);
        $id=$employee->id;

        if ($request->has('zoning')) {

                foreach($request->zoning as $item)
                    {
                    $base=Zones::find($item);
                    DB::table('employee_zones')->insert([
                        'emp_id' => $id,
                        'base_id' =>$base->base_id,
                        'zone_id' =>$item,
                        'created_at' =>now(),
                        'updated_at' =>now(),
                    ]);
                    }
        }
        //logs
        DB::table('logs')->insert([
            'emp_id' => $id,
            'task' =>'Registration',
            'created_by' =>$request->created_by,
            'created_at' =>now(),
            'updated_at' =>now(),
          ]);
        
    }


    public function editemployee(Request $request){

        $input=$request->all();
        $employee=Employees::find($request->id);
        if ($request->hasFile('photo')) {
            $photo = $request->file('photo');
            $filename = time() . '.' . $photo->getClientOriginalExtension();
            $filepath = 'uploads/'.$filename;
            move_uploaded_file($photo, $filepath);
            $input['photo']=$filepath;
        }
        $employee->update($input);

        if($request->zoning){
           EmployeeZones::where('emp_id',$request->id)->delete();
        foreach($request->zoning as $item)
            {
              $base=Zones::find($item);
              DB::table('employee_zones')->insert([
                'emp_id' => $request->id,
                'base_id' =>$base->base_id,
                'zone_id' =>$item,
                'created_at' =>now(),
                'updated_at' =>now(),
              ]);
            } 
        }
        

        //logs
        DB::table('logs')->insert([
            'emp_id' => $request->id,
            'task' =>'Edit Information',
            'created_by' =>$request->created_by,
            'created_at' =>now(),
            'updated_at' =>now(),
          ]);
        
    }


    public function delemployee(Request $request){
        foreach($request->guests as $item)
        {
        Employees::where('id', $item)->delete();
        }
    }


    public function approvalemployee(Request $request)
    {
        $status = $request->status;
    
        $statusText = [
            0 => 'PENDING',
            1 => 'APPROVED',
            2 => 'PRINTED',
            3 => 'COLLECTED'
        ];
    
        foreach ($request->guests as $item)
        {
            // 1. Update employee status
            DB::table('employees')
                ->where('id', $item)
                ->update([
                    'status' => $status
                ]);
    
            // 2. Get employee
            $employee = Employees::find($item);
    
            // 3. Base name
            $baseName = '';
            if ($employee && $employee->default_base) {
                $base = Bases::find($employee->default_base);
                $baseName = $base->name_en ?? '';
            }
    
            // 4. Zones (FIXED using relationship)
            $zoneText = EmployeeZones::where('emp_id', $item)
                ->with('zone')
                ->get()
                ->pluck('zone.name_en')
                ->filter()
                ->implode(', ');
    
            $zoneText = $zoneText ?: 'None';
    
            // 5. Build task text
            $task = '' . ($statusText[$status] ?? 'UNKNOWN');
            $task .= ' | Base: ' . ($baseName ?: 'None');
            $task .= ' | Zones: ' . $zoneText;
    
            // 6. Insert log
            DB::table('logs')->insert([
                'emp_id' => $item,
                'task' => $task,
                'created_by' => $request->by,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }



    public function importData(Request $request){
        $data = $request->getContent(); 
        $jsonData = json_decode($data, true);
      
        $dep_id=$_GET['dep_id']; $by=$_GET['by']; 
      
        $labels=array("fullname_en","fullname_ar","remarks","bloodtype","military_number","phone_number","rank_id","nationality_id","qid","dep_parent_id","gender_id","qrcode");
      
          if (count($jsonData) === 1 && isset($jsonData[''])) {
            $dataArray = $jsonData[''];
            } else {
                $dataArray = $jsonData;
            }
      
          if ($dataArray) { 
              foreach ($dataArray as $entry) {
                
                $fullname_en=''; $fullname_ar=''; $remarks=''; $bloodtype=''; $military_number=null; $phone_number=null; $rank_id=3; $nationality_id=1; $qid=null; $photo=null; $qrcode=uniqid(); $gender_id=1;
                  foreach ($entry as $key => $value) {
                            if (in_array($key, $labels)) 
                            {
                                if($key=='fullname_en'){$fullname_en=$value;}
                                if($key=='fullname_ar'){$fullname_ar=$value;}
                                if($key=='remarks'){$remarks=$value;}
                                if($key=='bloodtype'){$bloodtype=$value;}
                                if($key=='military_number'){$military_number=$value;}
                                if($key=='phone_number'){$phone_number=$value;}
                                if($key=='rank_id'){$rank_id=$value;}
                               // if($key=='gender_id'){$gender_id=$value;}
                                if($key=='nationality_id'){$nationality_id=$value;}
                                if($key=='qid'){$qid=$value;}
                                if($key=='photo'){$photo=$value;}
                            }
                            else
                            {
                              $options[$key]=$value;
                            }
                  }
                  //insert data
                  $guestId=DB::table('employees')->insertGetId([
                    'dep_id' => $dep_id,
                    'dep_parent_id' => $dep_id,
                    'qrcode' =>$qrcode,
                    'photo' =>$photo,
                    'fullname_en'=>$fullname_en,
                    'fullname_ar'=>$fullname_ar,
                    'remarks'=>$remarks,
                    'bloodtype'=>$bloodtype,
                    'military_number'=>$military_number,
                    'phone_number'=>$phone_number,
                    'rank_id'=>$rank_id,
                    'nationality_id'=>$nationality_id,
                    'gender_id'=>$gender_id,
                    'qid'=>$qid,
                    'status'=>0,
                    'created_by'=>$by,
                    'created_at' =>now(),
                    'updated_at' =>now()
                  ]);
              
                  //logs
                  DB::table('logs')->insert([
                    'task' =>'Import Data',
                    'emp_id' =>$guestId,
                    'created_by'=>$by,
                    'created_at' =>now(),
                    'updated_at' =>now()
                  ]);
              }
            }
            
        }


        public function searchByMilitaryNumber(Request $request)
        {
            $mil = $request->military_number;
        
            $logs = \DB::table('logs')
                ->join('employees', 'logs.emp_id', '=', 'employees.id')
                ->where('employees.military_number', $mil)
                ->where('logs.task', 'like', '%PRINTED%')
                ->select(
                    'logs.*',
                    'employees.fullname_en',
                    'employees.fullname_ar',
                    'employees.military_number'
                )
                ->get();
        
            if ($logs->count() == 0) {
                return response()->json(['message' => 'No printed logs found']);
            }
        
            return response()->json([
                'logs' => $logs
            ]);
        }
        

    public function addNote(Request $request){
        $input = $request->all();
        $day=$request->day;
        $input['mvdate']=date('Y-m-d', strtotime(str_replace(',',' ',$day)));
        EmployeeNotes::create($input);
    }


    public function deleteNote(Request $request)
    {
        // Validate the incoming request
        $request->validate([
            'emp_id' => 'required|integer|exists:employees,id', // Assuming there's an employees table
            'day' => 'required|date', // Validate that day is a date
        ]);

        // Get emp_id and day from the request
        $empId = $request->input('emp_id');
        $day = $request->input('day');

        // Find the note by emp_id and day
        $note = EmployeeNotes::where('emp_id', $empId)
                            ->where('mvdate', $day)
                            ->first();

        // Check if the note exists
        if (!$note) {
            return response()->json(['message' => 'Note not found'], 404);
        }

        // Get the note content before deleting
        $noteContent = $note->notes; // Assuming 'notes' is the column where the note text is stored

        // Log the ID of the note instead of deleting it
        //\Log::info('Note ID to be deleted:', ['id' => $note->id]);

        // Delete the note
        $note->delete();

        // Log the deletion in the logs table
        DB::table('logs')->insert([
            'emp_id' => $empId,
            //'task' => 'Deleted Note: ' . '"' . $noteContent . '"' . ' - Note Date: ' . $day,
            'task' => 'Deleted ' . $day . ' Note: ' . '"' . $noteContent . '"',
            'created_by' => $request->created_by, // Make sure to send created_by in the request
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Return a success response
        return response()->json(['message' => 'Note found, ID logged successfully', 'note_id' => $note->id]);
    }


    public function addCar(Request $request){
        $input = $request->all();
        $car = EmployeeCars::create($input);
        return response()->json(array(
            'guest_id' => $request->emp_id,
            'car' => $car
        ));
    }
    

    public function updateCar(Request $request){
        $car = EmployeeCars::find($request->id);
        
        if (!$car) {
            return response()->json(['status' => 'error', 'message' => 'Car not found.'], 404);
        }
        
        $car->plate_number = $request->plate_number;
        $car->active = $request->active ?? $car->active;
        $car->save();
        
        return response()->json([
            'status' => 'success', 
            'message' => 'Car updated successfully.',
            'car' => $car
        ]);
    }
    

    public function delCar(Request $request) {
        $car = EmployeeCars::find($request->id);
        if ($car) {
            $car->delete();
            return response()->json(['status' => 'success', 'message' => 'Car deleted successfully.']);
        } else {
            return response()->json(['status' => 'error', 'message' => 'Car not found.'], 404);
        }
    }

      public function badgeInfo($id){
        $badge2=Badges::where('dep_id',$id)->get()->first();
        return response()->json($badge2);
      }

    public function editBadge(Request $request){
        $input = $request->all();
    
        $item = Badges::find($request->id);
        $item->update($input);
        
      }


      public function guestbadge($id)
      {
          $guest = Employees::where('id', $id)->firstOrFail();
          $Job_Arabic =Employees::find($guest->Job_Arabic);
          $Job_En =Employees::find($guest->Job_En);
          $base = Bases::find($guest->default_base);
          $photo = Employees::find($guest->photo);
          $dep = Departments::find($guest->dep_parent_id);
          $rank = Ranks::find($guest->rank_id);
          $ranke = Ranks::find($guest->rank_id);
          $badge2 = Badges::where('dep_id', $guest->dep_parent_id)->first();
      
          $zones = EmployeeZones::where('emp_id', $guest->id)->get();
          $ZoneColors = [];
          foreach ($zones as $zone) {
              $z = Zones::find($zone->zone_id);
              $ZoneColors[] = ['color' => $z->color];
          }
      
          // Retrieve the associated EmployeeCars
          $empCars = EmployeeCars::where('emp_id', $id)->get();
          $plateNumbers = $empCars->pluck('plate_number')->toArray();
      
          $info = [
              'qrcode' => $guest->qrcode,
              'status' => $guest->status,
              'idguest' => $guest->id,
              'military_number' => $guest->military_number,
              'dep_id' => $guest->dep_id,
              'photo' => $guest->photo, // Maintain employee photo retrieval
              'photot' => $guest->photot, 
              'fullname_en' => $guest->fullname_en,
              'fullname_ar' => $guest->fullname_ar,
              'Job_Arabic' => $guest->Job_Arabic ?: '',
              'Job_En' => $guest->Job_En,
              'department' => $dep->name_ar,
              'rank' => $rank->name_ar,
              'ranke' => $rank->name_en,
              'Escort' => $guest->Escort,
              'default_base' => $base->name_ar,
              'badge2' => $badge2,
              'ZoneColor' => $ZoneColors,
              'expiry_date' => $guest->expiry_date ?: '', // Replace null with empty string
              'plate_numbers' => $plateNumbers, // Include all plate numbers
              'base_photo' => null, // Initialize base_photo to null
          ];
      
          // Check if employee's base has photo
          if ($guest->default_base && isset($base->base_photo)) {
              $info['base_photo'] = $base->base_photo;
          }
      
          return response()->json($info);
      }

     /*  public function guestbadge($id)
      {
          $guest = Employees::where('id', $id)->firstOrFail();
          $base = Bases::find($guest->default_base);
          $dep = Departments::find($guest->dep_parent_id);
          $rank = Ranks::find($guest->rank_id);
          $ranke = Ranks::find($guest->rank_id);
          $badge2 = Badges::where('dep_id', $guest->dep_parent_id)->first();
      
          $zones = EmployeeZones::where('emp_id', $guest->id)->get();
          $ZoneColors = [];
          foreach ($zones as $zone) {
              $z = Zones::find($zone->zone_id);
              $ZoneColors[] = ['color' => $z->color];
          }
      
          // Retrieve the associated EmployeeCars
          $empCars = EmployeeCars::where('emp_id', $id)->get();
          $plateNumbers = $empCars->pluck('plate_number')->toArray();
      
          $info = [
              'qrcode' => $guest->qrcode,
              'status' => $guest->status,
              'idguest' => $guest->id,
              'military_number' => $guest->military_number,
              'dep_id' => $guest->dep_id,
              'photo' => $guest->photo, // Maintain employee photo retrieval
              'photot' => $guest->photot, 
              'fullname_en' => $guest->fullname_en,
              'fullname_ar' => $guest->fullname_ar,
              'department' => $dep->name_ar,
              'rank' => $rank->name_ar,
              'ranke' => $rank->name_en,
              'default_base' => $base->name_ar,
              'badge2' => $badge2,
              'ZoneColor' => $ZoneColors,
              'expiry_date' => $guest->expiry_date ?: '', // Replace null with empty string
              'plate_numbers' => $plateNumbers, // Include all plate numbers
              'base_photo' => null, // Initialize base_photo to null
          ];
      
          // Check if employee's base has photo
          if ($guest->default_base && isset($base->base_photo)) {
              $info['base_photo'] = $base->base_photo;
          }
      
          return response()->json($info);
      } */

    public function badge2Info($id){
        $badge2=Badges2::where('dep_id',$id)->get()->first();
        return response()->json($badge2);
      }

    public function editBadge2(Request $request){
        $input = $request->all();
    
        $item = Badges2::find($request->id);
        $item->update($input);
        
      }

      public function guestbadge2($id)
      {
          $guest = Employees::where('id', $id)->firstOrFail();
          $base = Bases::find($guest->default_base);
          $dep = Departments::find($guest->dep_parent_id);
          $dep2 = Departments::find($guest->dep_id);
          $dep3 = Departments::find($guest->dep_id);
          $StartTime = Employees::find($guest->StartTime);
          $EndTime = Employees::find($guest->EndTime);
          $Escort = Employees::find($guest->Escort);
          $device = Employees::find($guest->device);
          $rank = Ranks::find($guest->rank_id);
          $badge2 = Badges2::where('dep_id', $guest->dep_parent_id)->first();
          $badge23 = Badges2::where('dep_id', $guest->dep_id)->first();
          $nationality = Nationalities::find($guest->nationality_id);
          $nationalitye = Nationalities::find($guest->nationality_id);
          $zones = EmployeeZones::where('emp_id', $guest->id)->get();
          $ZoneColors = [];
          foreach ($zones as $zone) {
              $z = Zones::find($zone->zone_id);
              $ZoneColors[] = ['color' => $z->color];
          }
      
          // Retrieve the associated EmployeeCars
          $empCars = EmployeeCars::where('emp_id', $id)->get();
          $plateNumbers = $empCars->pluck('plate_number')->toArray();
      
          $info = [

            
              'qrcode' => $guest->qrcode,
              'status' => $guest->status,
              'idguest' => $guest->id,
              'dep_id' => $guest->dep_id,
              'military_number' => $guest->military_number,
              'bloodtype' => $guest->bloodtype ?: '',
              'dep_id' => $guest->dep_id,
              'dep_name' => $dep2->name_ar, 
              'dep3' => $dep3->name_en, 
              'photo' => $guest->photo, // Maintain employee photo retrieval
              'photot' => $guest->photot, 
              'fullname_en' => $guest->fullname_en,
              'fullname_ar' => $guest->fullname_ar,
              'Job_Arabic' => $guest->Job_Arabic,
              'Job_En' => $guest->Job_En ?: '',
              'device' => $guest->device,
              'Escort' => $guest->Escort,
              'StartTime'  =>  $guest->StartTime,
              'EndTime'  => $guest->EndTime,
              'department' => $dep->name_ar,
              'rank' => $rank->name_ar,
              'default_base' => $base->name_ar,
              'badge2' => $badge2,
             'badge23' =>  $badge23,
              'ZoneColor' => $ZoneColors,
              'expiry_date' => $guest->expiry_date ?: '', // Replace null with empty string
              'plate_numbers' => $plateNumbers, // Include all plate numbers
              'base_photo' => null, // Initialize base_photo to null
              'nationality' => $nationality ? $nationality->name_ar : null,
              'nationalitye' => $nationality->name_en,
          ];
      
          // Check if employee's base has photo
          if ($guest->default_base && isset($base->base_photo)) {
              $info['base_photo'] = $base->base_photo;
          }
      
          return response()->json($info);
      }





      /* public function guestbadge2($id)
      {
          $guest = Employees::where('id', $id)->firstOrFail();
          $base = Bases::find($guest->default_base);
          $dep = Departments::find($guest->dep_parent_id);
          $dep2 = Departments::find($guest->dep_id);
          $dep3 = Departments::find($guest->dep_id);
          $rank = Ranks::find($guest->rank_id);
          $badge2 = Badges2::where('dep_id', $guest->dep_parent_id)->first();
          $badge23 = Badges2::where('dep_id', $guest->dep_id)->first();
          $nationality = Nationalities::find($guest->nationality_id);
          $nationalitye = Nationalities::find($guest->nationality_id);
          $zones = EmployeeZones::where('emp_id', $guest->id)->get();
          $ZoneColors = [];
          foreach ($zones as $zone) {
              $z = Zones::find($zone->zone_id);
              $ZoneColors[] = ['color' => $z->color];
          }
      
          // Retrieve the associated EmployeeCars
          $empCars = EmployeeCars::where('emp_id', $id)->get();
          $plateNumbers = $empCars->pluck('plate_number')->toArray();
      
          $info = [

            
              'qrcode' => $guest->qrcode,
              'status' => $guest->status,
              'idguest' => $guest->id,
              'dep_id' => $guest->dep_id,
              'military_number' => $guest->military_number,
              'bloodtype' => $guest->bloodtype,
              'dep_id' => $guest->dep_id,
              'dep_name' => $dep2->name_ar, 
              'dep3' => $dep3->name_en, 
              'photo' => $guest->photo, // Maintain employee photo retrieval
              'photot' => $guest->photot, 
              'fullname_en' => $guest->fullname_en,
              'fullname_ar' => $guest->fullname_ar,
              'department' => $dep->name_ar,
              'rank' => $rank->name_ar,
              'default_base' => $base->name_ar,
              'badge2' => $badge2,
             'badge23' =>  $badge23,
              'ZoneColor' => $ZoneColors,
              'expiry_date' => $guest->expiry_date ?: '', // Replace null with empty string
              'plate_numbers' => $plateNumbers, // Include all plate numbers
              'base_photo' => null, // Initialize base_photo to null
              'nationality' => $nationality ? $nationality->name_ar : null,
              'nationalitye' => $nationality->name_en,
          ];
      
          // Check if employee's base has photo
          if ($guest->default_base && isset($base->base_photo)) {
              $info['base_photo'] = $base->base_photo;
          }
      
          return response()->json($info);
      } */
 /*    public function badgeInfo($id){
        $badge=Badges::where('dep_id',$id)->get()->first();
        return response()->json($badge);
      } */
    
}
