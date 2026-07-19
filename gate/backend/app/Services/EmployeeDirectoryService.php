<?php

namespace App\Services;

use App\Models\Employees;
use App\Models\Movements;
use App\Support\EmployeeGateAlerts;

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

        $lastMovements = Movements::query()
            ->select('emp_id', 'mvtype')
            ->whereIn('id', function ($query) {
                $query->selectRaw('MAX(id)')
                    ->from('movements')
                    ->groupBy('emp_id');
            })
            ->pluck('mvtype', 'emp_id');

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
                'qrcode',
                'fullname_ar',
                'fullname_en',
                'photo',
                'dep_id',
                'rank_id',
                'expiry_date',
                'remarks',
            ])
            ->map(function (Employees $employee) use ($lastMovements) {
                $mvtype = $lastMovements[$employee->id] ?? null;
                $lastMovementType = match ($mvtype) {
                    'Check-In' => 'in',
                    'Check-Out' => 'out',
                    default => null,
                };

                return [
                    'id' => $employee->id,
                    'military_number' => $employee->military_number,
                    'qrcode' => $employee->qrcode,
                    'fullname_ar' => $employee->fullname_ar,
                    'fullname_en' => $employee->fullname_en,
                    'photo' => $employee->photo,
                    'department' => $employee->department?->name_ar,
                    'rank_name_ar' => $employee->ranks?->name_ar,
                    'expiry_date' => $employee->expiry_date,
                    'remarks' => $employee->remarks,
                    'last_movement_type' => $lastMovementType,
                    'is_expired' => EmployeeGateAlerts::isExpired($employee->expiry_date),
                    'alerts' => EmployeeGateAlerts::build($employee->expiry_date, $employee->remarks),
                ];
            })
            ->values()
            ->all();

        return [
            'version' => $version,
            'count' => count($employees),
            'employees' => $employees,
        ];
    }
}
