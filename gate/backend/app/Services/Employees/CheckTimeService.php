<?php

namespace App\Services\Employees;

use Illuminate\Http\Request;
use App\Models\CheckTimes;
use App\Models\RanksCategories;
use App\Models\Genders;

class CheckTimeService
{
    public function addTime(Request $request){
        $input = $request->all();
        CheckTimes::create($input);
    }


    public function editTime(Request $request){
        $input = $request->all();

        $item=CheckTimes::find($request->id);
        $item->update($input);
    }


    public function deleteTime(Request $request){
        CheckTimes::find($request->id)->delete();
    }
    

    public function getTimes($id){
        if(isset($_GET['id']))
        {
            $data=CheckTimes::find($_GET['id']);
        }
        else
        {
          $data=CheckTimes::where('dep_id',$id)->get()->map(function($item) {
            $rank=RanksCategories::find($item->rank_id);
            $gender=Genders::find($item->gender_id);
            $item->rank=$rank->name_en;
            $item->gender=$gender->name_en;
            return $item;
        });  
        }
        

        return response()->json($data);
    }

}
