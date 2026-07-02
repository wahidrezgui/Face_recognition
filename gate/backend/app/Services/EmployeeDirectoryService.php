<?php

namespace App\Services;

use App\Models\Employees;

class EmployeeDirectoryService
{
    public function gateDirectory(): array
    {
        $versionRow = Employees::query()
            ->where('active', 1)
            ->selectRaw('MAX(updated_at) as max_updated, COUNT(*) as total')
            ->first();

        $maxUpdated = $versionRow?->max_updated;
        $version = $maxUpdated
            ? (is_string($maxUpdated) ? $maxUpdated : $maxUpdated->toIso8601String())
            : now()->toIso8601String();

        $employees = Employees::query()
            ->where('active', 1)
            ->with([
                'department' => fn ($q) => $q->select('id', 'name_ar'),
                'ranks' => fn ($q) => $q->select('id', 'name_ar'),
            ])
            ->orderBy('military_number')
            ->orderBy('fullname_ar')
            ->get([
                'id',
                'military_number',
                'fullname_ar',
                'fullname_en',
                'photo',
                'dep_id',
                'rank_id',
            ])
            ->map(fn (Employees $employee) => [
                'id' => $employee->id,
                'military_number' => $employee->military_number,
                'fullname_ar' => $employee->fullname_ar,
                'fullname_en' => $employee->fullname_en,
                'photo' => $employee->photo,
                'department' => $employee->department?->name_ar,
                'rank_name_ar' => $employee->ranks?->name_ar,
            ])
            ->values()
            ->all();

        return [
            'version' => $version,
            'count' => count($employees),
            'employees' => $employees,
        ];
    }
}
