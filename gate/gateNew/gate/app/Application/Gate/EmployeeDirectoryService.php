<?php

namespace App\Application\Gate;

use App\Domain\Gate\Models\Movement;
use App\Domain\Personnel\Models\CompanyTime;
use App\Domain\Personnel\Models\Employee;
use App\Domain\Personnel\Models\EmployeeZone;
use Illuminate\Support\Collection;

/**
 * Employee reads for the gate kiosk — deliberately separate from Personnel's
 * EmployeeService (its scoping methods are private and this data isn't scoped
 * the same way: a gate guard must be able to check in any active employee
 * system-wide, not just their own department's).
 */
class EmployeeDirectoryService
{
    /**
     * Lightweight snapshot of every active employee, for the offline IndexedDB seed
     * and the online search fallback. System-wide, unscoped — see plan rationale.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function activeRoster(): Collection
    {
        return Employee::query()
            ->where('active', 1)
            ->with(['department:id,name_ar,name_en', 'rank:id,name_ar,name_en'])
            ->get([
                'id', 'military_number', 'qrcode', 'fullname_ar', 'fullname_en',
                'photo', 'dep_id', 'rank_id', 'status',
            ])
            ->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'military_number' => $employee->military_number,
                'qrcode' => $employee->qrcode,
                'fullname_ar' => $employee->fullname_ar,
                'fullname_en' => $employee->fullname_en,
                'photo' => $employee->photo,
                'dep_id' => $employee->dep_id,
                'department_ar' => $employee->department?->name_ar,
                'department_en' => $employee->department?->name_en,
                'rank_ar' => $employee->rank?->name_ar,
                'rank_en' => $employee->rank?->name_en,
                'status' => $employee->status,
            ]);
    }

    public function findByQrcode(string $qrcode): ?Employee
    {
        return Employee::where('qrcode', $qrcode)->first();
    }

    public function findById(int $id): ?Employee
    {
        return Employee::find($id);
    }

    /**
     * Full scan-result card payload — port of legacy's buildCardPayload().
     *
     * @return array<string, mixed>
     */
    public function preview(Employee $employee, ?int $baseId): array
    {
        $employee->loadMissing(['department', 'rank.category', 'defaultBase']);

        $lastMovement = Movement::where('emp_id', $employee->id)
            ->orderByDesc('mvdate')
            ->orderByDesc('mvtime')
            ->first();

        $lastMovementType = match ($lastMovement?->mvtype) {
            'Check-In' => 'in',
            'Check-Out' => 'out',
            default => null,
        };

        $access = $baseId
            ? EmployeeZone::where('base_id', $baseId)->where('emp_id', $employee->id)->count()
            : 0;

        $timing = null;
        $checkTimes = CompanyTime::where('dep_id', $employee->dep_id)->first();
        if ($employee->is_employee == 1 && $checkTimes) {
            $now = date('H:i:s');
            if ($now < $checkTimes->start_time || $now > $checkTimes->end_time) {
                $timing = ['start_time' => $checkTimes->start_time, 'end_time' => $checkTimes->end_time];
            }
        }

        return [
            'emp_id' => $employee->id,
            'military_number' => $employee->military_number,
            'qrcode' => $employee->qrcode,
            'photo' => $employee->photo,
            'fullname_en' => $employee->fullname_en,
            'fullname_ar' => $employee->fullname_ar,
            'remarks' => $employee->remarks,
            'bloodtype' => $employee->bloodtype,
            'department_ar' => $employee->department?->name_ar,
            'department_en' => $employee->department?->name_en,
            'rank_ar' => $employee->rank?->name_ar,
            'rank_en' => $employee->rank?->name_en,
            'rank_category_ar' => $employee->rank?->category?->name_ar,
            'rank_category_en' => $employee->rank?->category?->name_en,
            'base_ar' => $employee->defaultBase?->name_ar,
            'base_en' => $employee->defaultBase?->name_en,
            'expiry_date' => $employee->expiry_date?->format('Y-m-d'),
            'last_movement_type' => $lastMovementType,
            'access' => $access,
            'timing' => $timing,
            'alerts' => EmployeeGateAlerts::classify($employee->expiry_date?->format('Y-m-d'), $employee->remarks),
            'is_expired' => EmployeeGateAlerts::isExpired($employee->expiry_date?->format('Y-m-d')),
        ];
    }
}
