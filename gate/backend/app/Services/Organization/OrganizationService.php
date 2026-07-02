<?php

namespace App\Services\Organization;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\Departments;
use App\Models\Bases;
use App\Models\Gates;
use App\Models\Zones;
use App\Models\DepartmentBases;
use App\Models\Employees;
use App\Models\CompaniesTimes;
use App\Models\User;
use App\Support\Tree\DepartmentTreeService;
use Illuminate\Support\Facades\Hash;

class OrganizationService
{
    public function __construct(private DepartmentTreeService $departmentTree) {}
        public function departments(){
            if(isset($_GET['idparent']))
            {
                $dep=Departments::find($_GET['idparent']);
                $list=Departments::where('is_superadmin',0)->where('parent_id',$_GET['idparent'])->with('children')->get();
                return response()->json(array('name_en'=>$dep->name_en,'children'=>$list));
            }
            else
            {
                $list=Departments::where('is_superadmin',0)->where('parent_id',0)->with('children')->get();
                return response()->json(array('name_en'=>'Super Admin','children'=>$list));
            }            
        }


        public function departmentInfo($id){
            $dep=Departments::find($id);

            if (! $dep) {
                return response()->json(['message' => 'Department not found'], 404);
            }

            $user=User::where('dep_id',$id)
                    ->whereHas('roles', function ($query) {
                        $query->where('name', 'Reporting');
                    })->get()->first();
            if($user)
            {
             $dep->user=$user;   
            }
            else
            {
                $dep->user=array('firstname'=>'','lastname'=>'','email'=>'','password'=>'','id'=>0);
            }
            
            return response()->json($dep);
        }


        public function newDepartments(Request $request){
            $input = $request->all();
            $dep=Departments::create($input);
            $id=$dep->id;

            //create default user
            $user = User::create([
                'firstname' => $request->firstname,
                'lastname'  => $request->lastname ?? $request->latname,
                'email'      => $request->email,
                'password'   => Hash::make($request->password),
                'dep_id' =>$id,
                'default_base'=>0
              ]);
              if($request->parent_id==0){$user->assignRole('Admin');}else{$user->assignRole('Reporting');}
              

            //create default badge
            DB::table('badges')->insert([
                'width' => 90,
                'heigth' =>140,
                'content' =>'<table style="border-collapse: collapse; width: 100%;" border="0">
                <tbody>
                <tr>
                <td style="text-align: left;">{{qrcode}}</td>
                <td style="text-align: right;">{{guest_photo_circle}}</td>
                </tr>
                <tr>
                <td style="text-align: center;" colspan="2">{{full_name}}</td>
                </tr>
                </tbody>
                </table>',
                'dep_id'=>$id,
                'created_at'=>date('Y-m-d H:i:s'),
              'updated_at'=>date('Y-m-d H:i:s'),
                ]);

        }


        public function editDepartments(Request $request){
            $input = $request->all();
            $item = Departments::find($request->id);
            $item->update($input);

            $data = $request->user;
            if($data['id']==0)
            {
                    //create default user
                    $user = User::create([
                    'firstname' => $data['firstname'],
                    'lastname'  => $data['lastname'],
                    'email'      => $data['email'],
                    'password'   => Hash::make($data['password']),
                    'dep_id' =>$request->id,
                    'default_base'=>0
                    ]);
                    $user->assignRole('Reporting');
            }
            else
            {
                if($data['password']!=''){
                    DB::table('users')->where('id', $data['id'])->update([
                        'firstname' => $data['firstname'],
                        'lastname'  => $data['lastname'],
                        'email'      => $data['email'],
                        'password'   => Hash::make($data['password']),
                    ]);
                }
                else
                {
                    DB::table('users')->where('id', $data['id'])->update([
                        'firstname' => $data['firstname'],
                        'lastname'  => $data['lastname'],
                        'email'      => $data['email'],
                    ]);
                }
                
            }

        }


        public function delDepartments(Request $request){
            Departments::find($request->id)->delete();
        }


        public function newCompany(Request $request){
            $input = $request->all();
            $input['is_company']=1;
            $dep=Departments::create($input);
            $id=$dep->id;

            //create start & End Time
            DB::table('companies_times')->insert([
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'dep_id'=>$id,
                'created_at'=>now(),
                'updated_at'=>now(),
                ]);

            //create default badge
            DB::table('badges')->insert([
                'width' => 90,
                'heigth' =>140,
                'content' =>'<table style="border-collapse: collapse; width: 100%; border-spacing: 0px; margin-left: auto; margin-right: auto; height: 309.516px;" border="0">
                <tbody>
                <tr style="height: 22.375px; text-align: left;">
                <td style="padding: 20px 15px 0px; width: 100%; height: 22.375px; line-height: 1; text-align: center;" colspan="2"><span style="font-size: 10pt; color: black;"><strong>القوات الجوية الأميرية القطرية </strong></span></td>
                </tr>
                <tr style="height: 21.375px; text-align: left;">
                <td style="text-align: center; padding: 1px 15px 2px; width: 100%; height: 21.375px; line-height: 1; vertical-align: top;" colspan="2"><span style="font-size: 10pt; color: black;"><strong>{{default_base}}</strong></span></td>
                </tr>
                <tr style="height: 120px; text-align: left;">
                <td style="padding: 5px; width: 50%; border: 1px solid #ccc; height: 120px;"><center>{{guest_photo_square}}</center></td>
                <td style="padding: 5px; width: 50%; border: 1px solid #ccc; height: 120px;"><center>{{qrcode}}</center></td>
                </tr>
                <tr style="height: 22.375px; text-align: left;">
                <td style="text-align: center;  height: 22.375px;  width: 100%; line-height: 1;" colspan="2">
                <span style="font-size: 12pt;"><strong>{{zones}}</strong></span></td>
                </tr>
                <tr style="height: 33px;text-align: center;  ">
                <td style=" background-color: #FFD700; font-size: 22pt; color: BLACK; height:33px; width: 100%; text-align: center; position: relative;" colspan="2">
                <div style="position: absolute; top: 0%; left: 50%; transform: translate(-50%, -50%);">
                <strong>{{idguest}}</strong></td>
                </div>
                </tr>
                
                
                
                <tr style="height: 16px; text-align: left;">
                <td style="text-align: left; padding: 0px 15px; line-height: 1; height: 16px; width: 50%;"><span style="font-size: 8pt; padding: 0 8px;"><strong>{{Job_En}}</strong></span></td>
                <td style="text-align: right; padding: 0px 15px; line-height: 1; height: 16px; width: 50%;"><span style="font-size: 8pt; padding: 0 8px;"><strong>{{Job_Arabic}}</strong></span></td>
                </tr>
                
                <tr style="height: 16px; text-align: center;">
                <td style="padding: 0px 15px; line-height: 1; height: 16px; width: 100%; white-space: nowrap;" colspan="2"><span style="font-size: 10pt;"><strong>{{fullname_ar}}</strong></span></td>
                </tr>
                <tr style="height: 16px; text-align: center;">
                <td style="padding: 0px 15px; line-height: 1; height: 16px; width: 100%; white-space: nowrap;" colspan="2"><span style="font-size: 10pt;"><strong>{{fullname_en}}</strong></span></td>
                </tr>
                
                </tbody>
                </table>',
                'dep_id'=>$id,
                'created_at'=>now(),
                'updated_at'=>now(),
                ]);
                DB::table('badges2')->insert([
                    'width' => 54,
                    'height' =>85,
                    'content' =>'<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Card Layout</title>
                        <style>
                    body {
                                font-family: times new roman;
                            }
                            .card {
                                width: 60mm;
                                padding-top: 20mm;
                                padding-left: 10mm;
                                padding-right: 0mm;
                                padding-bottom: 0mm;
                       
                            }
                            .box.large {
                                height: 14mm;
                            }
                            .box.extra-large {
                                height: 17mm;
                    
                            
                            }
                            .box2.small-height {
                                height: 6.8mm; /* Reduced height for specific boxes */
                            }
                            .box {
                                border: 1px solid #000;
                                padding: 2mm;
                                font-weight: bold;
                                margin-bottom: 2mm;
                                position: relative;
                                display: flex;
                                align-items: center;
                            }
                            .box3 {
                                border: 0.5px solid #000;
                                padding: 0.5mm;
                                font-weight: bold;
                               
                                position: relative;
                                display: flex;
                                align-items: center;
                            }
                            .box2 {
                                border: 1px solid #000;
                                padding-top:0px;
                                margin-bottom: 1.5mm;
                                font-weight: bold;
                                position: relative;
                                display: flex;
                                align-items: top;
                                justify-content: space-between; 
                            }
                            .box3:last-child {
                                margin-bottom: 0;
                                height: 10mm; /* Increased height for the last box */
                                width: 30mm; /* Centered and smaller width */
                                margin: 0 auto; /* Center horizontally */
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                align-items: center;
                                background: #fff;
                            }
                            .label-vertical {
                                transform: rotate(-90deg);
                                margin-left: -4.9mm;
                                text-align: left;
                                padding-left: 4.0px;
                                padding-right: 4.0px;
                                font-weight: bold;
                                font-size: 9px;
                                background: #fff;
                                padding-bottom: 12px;
                                padding-top: 1px;
                                border: 1px solid #000;
                                height: 100%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .label-for2ver {
                                transform: rotate(-90deg);
                                margin-left: -7.5mm;
                                text-align: center;
                                font-weight: bold;
                                font-size: 9px;
                                background: #fff;
                                padding-bottom: 10.6px;
                                padding-top: 0.1px;
                                padding-left: 16.2px;
                                padding-right: 16.2px;
                                border: 1px solid #000;
                                height: 48%;
                                
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .label-forright1 {
                                transform: rotate(90deg);
                                margin-right: -5mm;
                                text-align: center;
                                font-weight: bold;
                                font-size: 9px;
                                background: #fff;
                                padding-bottom: 12.0px;
                                padding-top: 2.6px;
                                padding-left: 12.8px;
                                padding-right: 14.8px;
                                border: 1px solid #000;
                                height: 100%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .label-forright2 {
                                transform: rotate(90deg);
                                margin-right: -7.5mm;
                                text-align: center;
                                font-weight: bold;
                                font-size: 9px;
                                background: #fff;
                                padding-bottom: 10.0px;
                                padding-top: 1.6px;
                                padding-left: 21.1px;
                                padding-right: 21.1px;
                                border: 1px solid #000;
                                height: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .label {
                                font-size: 10px;
                                margin-top: 3.5px;
                                margin-bottom: 2px; /* Added margin to prevent overlap */
                                padding: 0 1mm; /* Added padding for better spacing */
                            }
                            .content {
                                text-align: center;
                                font-size: 10px;
                                flex-grow: 1;
                                padding-right: 0px;
                                padding-top: 0; /* Remove top padding */
                                position: relative;
                            }
                            .contentsec {
                                text-align: center;
                                font-size: 8px;
                                flex-grow: 1;
                                padding-right: 0px;
                                padding-top: 0; /* Remove top padding */
                                position: relative;
                            }
                            .content.first-box div, .content.second-box div {
                                margin: 0; /* Reset margin */
                                padding: 1mm 0; /* Add padding to separate lines */
                            }
                            .content.first-box::after {
                                content: "";
                                position: absolute;
                                top: 50%;
                                left: -9.5%;
                                right: -18%;
                                border-top: 1px solid #000; /* Increased border width */
                            }
                            .content.second-box::after {
                                content: "";
                                position: absolute;
                                top: 58%;
                                left: -20.2%;
                                right: -19%;
                                border-top: 1px solid #000; /* Increased border width */
                            }
                            .content small {
                                font-size: 8px;
                            }
                            .content.smaller {
                                font-size: 8px;
                            }
                            .content .dep3 {
                                font-size: 6px; /* Decreased font size for dep3 */
                      text-align: top;
                            }
                            .content .large-bloodtype {
                                font-size: 19px; /* Increased font size for bloodtype */
                            }
                            .signature {
                                text-align: center;
                                font-size: 8px;
                                border-top: 1px solid #000;
                                margin-top: 3mm;
                            }
                            .small-text {
                                text-align: center;
                                font-size: 8px;
                                position: absolute;
                                bottom: -6px;
                                width: 100%;
                            }
                            .signature span {
                                display: block;
                                margin-top: 1mm;
                            }
                            .small-labels .label {
                                font-size: 8px;
                              
                            }
                            .large-bloodtype {
                        font-size: 12px;
                      text-align: top; 
                    }
                    .plate-number { font-size: 8.5px;
                    font-weight: bold;
                    line-height: 1.1;}
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="box2 small-labels small-height">
                                <span class="label">nationality :</span>
                             <div class="content small large-bloodtype">{{nationalitye}}</div>
                                <span class="label">الجنسية</span>
                            </div>
                            <div class="box2 small-labels small-height">
                                <span class="label"> company :</span>
                             <div class="content small large-bloodtype">{{department}} </div>
                                <span class="label">: الشركة</span>
                            </div>
                            <div class="box2 small-labels small-height">
                                <span class="label">time :</span>
                             <div class="content small large-bloodtype">{{StartTime}} => {{EndTime}}</div>
                                <span class="label">: وقت العمل</span>
                            </div>
                            <div class="box2 small-labels small-height">
                                <span class="label">Escort :</span>
                             <div class="content small large-bloodtype">{{Escort}}</div>
                                <span class="label">: مرافق</span>
                            </div>
                    
                            <div class="box2 small-labels small-height">
                                <span class="label">Device Allowed :</span>
                             <div class="content small plate-number">{{device}}</div>
                                <span class="label">: الأجهزة المسموح بها</span>
                            </div>
                            <div class="box2 small-labels small-height">
                                <span class="label">Expire :</span>
                                <div class="content small large-bloodtype">{{expiry_date}}</div>
                                <span class="label">: الصلاحية</span>
                            </div>
                            <div class="box2 small-labels small-height">
                                <span class="label">Car Num :</span>
                                <div class="content small large-bloodtype">{{plate_numbers}}</div>
                                <span class="label">: رقم السيارة </span>
                            </div>
                            <div class="box3">
                                <div>{{guest_photo_squareb}}</div>
                                <div class="small-text">التوقيع الأمني</div>
                            </div>
                        </div>
                    </body>
                    </html>',
                    'dep_id'=>$id,
                    'created_at'=>now(),
                    'updated_at'=>now(),
                    ]);
        }


        public function editCompany(Request $request){
            $input = $request->all();
            $item = Departments::find($request->id);
            $item->update($input);

            $record = CompaniesTimes::where('dep_id',$request->id)->get()->first();
            if ($record) {
                    DB::table('companies_times')->where('dep_id', $request->id)->update([
                        'start_time' => $request->start_time,
                        'end_time'  => $request->end_time,
                        'updated_at'      => now()
                    ]);
             }
             else
             {
                    DB::table('companies_times')->insert([
                        'start_time' => $request->start_time,
                        'end_time' => $request->end_time,
                        'dep_id'=>$request->id,
                        'created_at'=>now(),
                        'updated_at'=>now(),
                        ]);
             }

        }


    public function CompanyInfo($id, Request $request){
        $info=Departments::find($id);

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
            'headerName' => 'رقم التصريح',
            'field' => 'id',
            'sortable' => true,
            'width'=>140,
            'headerCheckboxSelection' => true,
            'headerCheckboxSelectionFilteredOnly' => true,
            'checkboxSelection' => true,
            'headerCheckboxSelectionCurrentPageOnly' => true
            ],
            [
            'headerName' => 'Photo',
            'field' => 'photo',
            'sortable' => true,
            'width'=>90,
            ],
          
           
            [
            'headerName' => 'بطاقة شخصي',
            'field' => 'qid',
            'sortable' => true,
            'width'=>180
            ],
         
            [
            'headerName' => 'اسم',
            'field' => 'fullname_ar',
            'sortable' => true,
            'width'=>280,
            ],
            [
            'headerName' => 'تاريخ انتهاء الصلاحية',
            'field' => 'expiry_date',
            'sortable' => true,
            'width'=>220,
            ]
            ];

            $perPage = $request->input('per_page', 125);
            $page = $request->input('page', 1);

            $employees=Employees::where('dep_id',$id)
                            ->latest()
                            ->paginate($perPage, ['*'], 'page', $page);

            $data = [
                'data' => $employees,
                'pagination' => [
                    'current_page' => $employees->currentPage(),
                    'per_page' => $employees->perPage(),
                    'total' => $employees->total(),
                ],
            ];

            
        
        return response()->json(array('info'=>$info,'columns'=>$columns,'guests'=>$data));
    }

    public function compInfo($id){
        $info=Departments::find($id);
        $time=CompaniesTimes::where('dep_id',$id)->get()->first();
        if($time){
            $info['start_time']=$time->start_time;
            $info['end_time']=$time->end_time;
        }
        else
        {
            $info['start_time']='';
            $info['end_time']='';
        }
        
        return response()->json($info);
    }


        public function assignbase(Request $request){

            DepartmentBases::where('dep_id',$request->dep_id)->delete();
            foreach($request->selectedBases as $item)
            {
              DB::table('department_bases')->insert([
                'dep_id' => $request->dep_id,
                'base_id' =>$item,
                'created_at' =>date('Y-m-d H:i:s'),
                'updated_at' =>date('Y-m-d H:i:s'),
              ]);
            }
        }
    ################################################### Static Data


    public function bases(){
        if(isset($_GET['depId'])){
        $base=DepartmentBases::where('dep_id',$_GET['depId']);
        $list=Bases::whereIn('id', function ($query) {
            $query->select('base_id')
                ->from('department_bases')
                ->where('dep_id',$_GET['depId']);
        })->with('Gates')->with('Zones')->get(); 
        }
        else
        {
        $list=Bases::with('Gates')->with('Zones')->get();    
        }
        
        return response()->json($list);
    }


    public function baseInfo($id){
        $dep=Bases::find($id);
        $dep->Gates;
        return response()->json($dep);
    }


    public function newBase(Request $request)
    {
        $input = $request->all();
        if ($request->hasFile('base_photo')) {
            $base_photo = $request->file('base_photo');
            $filename = time() . '.' . $base_photo->getClientOriginalExtension();
            $filepath = 'uploads/' . $filename;
            move_uploaded_file($base_photo, $filepath); // Use $base_photo instead of $photo
            $input['base_photo'] = $filepath;
        }
    
        Bases::create($input);
    }
    

    public function editBase(Request $request)
    {
        $input = $request->all();
        $item = Bases::find($request->id);
        if ($request->hasFile('base_photo')) {
            $base_photo = $request->file('base_photo');
            $filename = time() . '.' . $base_photo->getClientOriginalExtension();
            $filepath = 'uploads/' . $filename;
            move_uploaded_file($base_photo, $filepath);
            $input['base_photo'] = $filepath;
        }
    
        $item->update($input);
    }


    public function deleteBase(Request $request){
        Bases::find($request->id)->delete();
    }

    ################################################### Gates


    public function gates(){
        $list=Gates::all();
        return response()->json($list);
    }


    public function gateInfo($id){
        $dep=Gates::find($id);
        return response()->json($dep);
    }


    public function newGate(Request $request){
        $input = $request->all();
        Gates::create($input);

    }


    public function editGate(Request $request){
        $input = $request->all();
        $item = Gates::find($request->id);
        $item->update($input);
    }


    public function deleteGate(Request $request){
        Gates::find($request->id)->delete();
    }

    ################################################### Zones


    public function newZone(Request $request){
        $input = $request->all();
        Zones::create($input);

    }


    public function editZone(Request $request){
        $input = $request->all();
        $item = Zones::find($request->id);
        $item->update($input);
    }


    public function deleteZone(Request $request){
        Zones::find($request->id)->delete();
    }

    ############################################## Employees


 public function getDepartments($parentId)
{
    $departments = $this->departmentTree->getParentAndNestedDepartments($parentId);

    return response()->json(['departments' => $departments]);
}


    public function getCompanies($parentId)
    {
        $departments = $this->departmentTree->getNestedCompanies($parentId);

        return response()->json(['companies' => $departments]);
    }


    public function getAllDepartments()
    {
        $departments = $this->departmentTree->getNestedDepartments();

        return response()->json(['departments' => $departments]);
    }

}
