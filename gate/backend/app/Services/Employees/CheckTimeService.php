<?php

namespace App\Services\Employees;

use App\Models\CheckTimes;
use App\Models\Genders;
use App\Models\RanksCategories;
use Illuminate\Http\Request;

class CheckTimeService
{
    public function addTime(Request $request)
    {
        $item = CheckTimes::create($request->only([
            'dep_id',
            'gender_id',
            'rank_id',
            'start_time',
            'end_time',
        ]));

        return response()->json($this->formatCheckTime($item), 201);
    }

    public function editTime(Request $request)
    {
        $item = CheckTimes::find($request->id);

        if (! $item) {
            return response()->json(['message' => 'Check time not found'], 404);
        }

        $item->update($request->only([
            'dep_id',
            'gender_id',
            'rank_id',
            'start_time',
            'end_time',
        ]));

        return response()->json($this->formatCheckTime($item->fresh()));
    }

    public function deleteTime(Request $request)
    {
        $item = CheckTimes::find($request->id);

        if (! $item) {
            return response()->json(['message' => 'Check time not found'], 404);
        }

        $item->delete();

        return response()->json(['status' => 'ok']);
    }

    public function getTimes($id, Request $request)
    {
        if ($request->filled('id')) {
            $item = CheckTimes::find($request->input('id'));

            if (! $item) {
                return response()->json(['message' => 'Check time not found'], 404);
            }

            return response()->json($this->formatCheckTime($item));
        }

        $data = CheckTimes::where('dep_id', $id)
            ->get()
            ->map(fn ($item) => $this->formatCheckTime($item));

        return response()->json($data);
    }

    private function formatCheckTime(CheckTimes $item): CheckTimes
    {
        $rank = $item->rank_id ? RanksCategories::find($item->rank_id) : null;
        $gender = $item->gender_id ? Genders::find($item->gender_id) : null;

        $item->rank = $rank?->name_ar ?? $rank?->name_en ?? '—';
        $item->gender = $gender?->name_ar ?? $gender?->name_en ?? '—';
        $item->start_time = $this->formatClock($item->start_time);
        $item->end_time = $this->formatClock($item->end_time);

        return $item;
    }

    private function formatClock(?string $value): string
    {
        if (! $value) {
            return '—';
        }

        return substr($value, 0, 5);
    }
}
