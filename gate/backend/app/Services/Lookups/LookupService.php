<?php

namespace App\Services\Lookups;

use App\Models\Nationalities;
use App\Models\Ranks;
use App\Models\RanksCategories;
use App\Models\Zones;
use Illuminate\Http\Request;

class LookupService
{
    public function ranks(){
        $list=RanksCategories::all()->map(function($item) {
            $item->key=$item->id;
            $item->label=$item->name_ar;
            $childrens=Ranks::where('rank_id',$item->id)->get()->map(function($rk) {
                $rk->key=$rk->id;
                $rk->label=$rk->name_ar;
                return $rk;
            });
            $item->children=$childrens;
            return $item;
        });
        return response()->json($list);
    }


    public function ranksCateg(){
        $list=RanksCategories::all();
        return response()->json($list);
    }


    public function nationalities(){
        $list=Nationalities::all();
        return response()->json($list);
    }

    ################################################### Bases


    public function zones(){
        $list=Zones::all();
        return response()->json($list);
    }


    public function zoneInfo($id)
    {
        $zone = Zones::find($id);

        if (! $zone) {
            return response()->json(['message' => 'Zone not found'], 404);
        }

        return response()->json($zone);
    }

}
