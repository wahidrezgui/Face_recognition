<?php

namespace App\Support\Tree;

use App\Models\Bases;
use App\Models\Gates;
use Illuminate\Http\Request;

class BaseTreeService
{
    public function getAllBasesTree(): array
    {
        return Bases::all()->map(function ($item) {
            $item->key = $item->id;
            $item->label = $item->name_ar;

            return $item;
        })->all();
    }

    public function getGatesByBases(Request $request): array
    {
        if (! $request->filled('base_ids')) {
            return ['gates' => []];
        }

        $baseIds = $request->input('base_ids');

        $gates = Gates::whereIn('base_id', $baseIds)
            ->get()
            ->map(fn ($gate) => [
                'key' => $gate->id,
                'label' => $gate->name_ar,
            ]);

        return ['gates' => $gates];
    }
}
