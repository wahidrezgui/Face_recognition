<?php

namespace App\Application\Personnel;

use App\Domain\Audit\Models\AppLog;
use App\Domain\Gate\Models\Base;
use App\Domain\Identity\Models\User;
use App\Domain\Personnel\Models\Badge;
use App\Domain\Personnel\Models\Badge2;
use App\Domain\Personnel\Models\BadgeLog;
use App\Domain\Personnel\Models\Department;
use App\Domain\Personnel\Models\Employee;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AccessCardService
{
    public function buildForEmployee(Employee $employee, ?int $baseId = null): array
    {
        $employee->loadMissing(['department', 'rank', 'nationality', 'defaultBase', 'zones', 'cars']);

        // A selected base scopes both the zones shown and the base photo token; with no
        // selection this falls back to today's behavior (all zones, employee's default base).
        // `default_base` and `selected_base` are kept as independent text tokens below —
        // `default_base` always reflects the employee's own record, `selected_base` only
        // the print-time pick — so a template can show either regardless of which one
        // ends up driving the photo/zones.
        $selectedBase = $baseId ? Base::find($baseId) : null;
        $base = $selectedBase ?? $employee->defaultBase;
        $zones = $baseId ? $employee->zones->where('base_id', $baseId) : $employee->zones;

        // Front/back templates are keyed by the employee's *parent* department, matching
        // the legacy lookup (`guestbadge`/`guestbadge2` use dep_parent_id, not dep_id).
        $front = Badge::where('dep_id', $employee->dep_parent_id)->first();
        $back = Badge2::where('dep_id', $employee->dep_parent_id)->first();

        return [
            'front' => $front ? ['content' => $front->content, 'width' => (int) $front->width, 'height' => (int) $front->heigth] : null,
            'back' => $back ? ['content' => $back->content, 'width' => (int) $back->width, 'height' => (int) $back->height] : null,
            'values' => $this->textValues($employee, $selectedBase),
            'zones' => $zones->map(fn ($zone) => [
                'id' => $zone->id,
                'name_ar' => $zone->name_ar,
                'name_en' => $zone->name_en,
                'color' => $zone->color,
                'pattern_type' => $zone->pattern_type,
                'pattern_color' => $zone->pattern_color,
            ])->values(),
            'qrcode' => $employee->qrcode,
            'photoPath' => $employee->photo,
            'basePhotoPath' => $base?->base_photo,
            'badgeLogs' => BadgeLog::with(['createdByUser', 'returnedByUser', 'base'])
                ->where('emp_id', $employee->id)
                ->orderByDesc('date_printed')
                ->get()
                ->map(fn (BadgeLog $log) => [
                    'id' => $log->id,
                    'date_printed' => $log->date_printed->toDateTimeString(),
                    'badge_expiry_date' => $log->badge_expiry_date?->format('Y-m-d'),
                    'printed_by' => $log->createdByUser
                        ? trim("{$log->createdByUser->firstname} {$log->createdByUser->lastname}") ?: $log->createdByUser->username
                        : null,
                    'base' => $log->base ? [
                        'id' => $log->base->id,
                        'name_ar' => $log->base->name_ar,
                        'name_en' => $log->base->name_en,
                    ] : null,
                    'returned_at' => $log->returned_at?->toDateTimeString(),
                    'returned_by' => $log->returnedByUser?->displayName(),
                ])
                ->values(),
        ];
    }

    /**
     * Records a print event to the shared `badge_log` audit table (same table legacy
     * writes to on every badge print).
     */
    public function recordPrint(Employee $employee, User $actor, ?int $baseId = null): void
    {
        BadgeLog::create([
            'emp_id' => $employee->id,
            'base_id' => $baseId,
            'badge_expiry_date' => $employee->expiry_date,
            'date_printed' => now(),
            'created_by' => $actor->id,
        ]);
    }

    /**
     * Builds the printable payload for several employees at once (bulk print from the
     * Employees list). Reuses {@see buildForEmployee} per row — bulk print jobs are an
     * admin-driven, moderate-size action (a page of selected rows), not a hot path.
     *
     * @param  int[]  $employeeIds
     * @return array<int, array> one AccessCardResponse-shaped array per employee, each
     *                           carrying its own `employeeId` key
     */
    public function buildForEmployees(array $employeeIds, ?int $baseId = null): array
    {
        return Employee::whereIn('id', $employeeIds)
            ->get()
            ->map(fn (Employee $employee) => [
                'employeeId' => $employee->id,
                ...$this->buildForEmployee($employee, $baseId),
            ])
            ->values()
            ->all();
    }

    /**
     * Bulk counterpart to {@see recordPrint} — one `badge_log` row per employee. Pending
     * employees must already be filtered out by the caller (mirrors the single-print
     * `markPrinted` guard, just applied before the loop instead of via `abort_if`).
     *
     * @param  iterable<Employee>  $employees
     */
    public function recordPrintForEmployees(iterable $employees, User $actor, ?int $baseId = null): void
    {
        foreach ($employees as $employee) {
            $this->recordPrint($employee, $actor, $baseId);
        }
    }

    /**
     * Marks a previously-printed card as returned. A reprint never requires
     * the old card to be returned first — an employee can have several
     * outstanding unreturned cards at once, which is exactly what the
     * "deactivated employees with unreturned cards" report surfaces.
     */
    public function returnCard(BadgeLog $badgeLog, User $actor): void
    {
        if ($badgeLog->returned_at !== null) {
            throw new HttpException(Response::HTTP_UNPROCESSABLE_ENTITY, 'This card has already been marked as returned.');
        }

        $badgeLog->update([
            'returned_at' => now(),
            'returned_by' => $actor->id,
        ]);

        AppLog::create([
            'emp_id' => $badgeLog->emp_id,
            'task' => 'Returned Access Card (printed '.$badgeLog->date_printed->format('Y-m-d').')',
            'created_by_id' => $actor->id,
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Plain string substitutions — safe to drop straight into a `{{token}}` template.
     * Markup-producing tokens (qrcode, photos, zones) are built client-side instead,
     * from the raw data returned alongside this map.
     */
    private function textValues(Employee $employee, ?Base $selectedBase): array
    {
        // {{department}} is the employee's *parent* department (legacy: dep_parent_id),
        // distinct from {{dep_name}}/{{dep3}} which use their own dep_id.
        $parentDepartment = Department::find($employee->dep_parent_id);

        return [
            'fullname_ar' => $employee->fullname_ar ?? '',
            'fullname_en' => $employee->fullname_en ?? '',
            'Job_En' => $employee->Job_En ?? '',
            'Job_Arabic' => $employee->Job_Arabic ?? '',
            'military_number' => (string) ($employee->military_number ?? ''),
            'bloodtype' => $employee->bloodtype ?? '',
            'expiry_date' => $employee->expiry_date?->format('Y-m-d') ?? '',
            'remarks' => $employee->remarks ?? '',
            'Escort' => $employee->Escort ?? '',
            'device' => $employee->device ?? '',
            'StartTime' => $employee->StartTime ?? '',
            'EndTime' => $employee->EndTime ?? '',
            'rank' => $employee->rank?->name_ar ?? '',
            'ranke' => $employee->rank?->name_en ?? '',
            'department' => $parentDepartment?->name_ar ?? '',
            'dep_name' => $employee->department?->name_ar ?? '',
            'dep3' => $employee->department?->name_en ?? '',
            'default_base' => $employee->defaultBase?->name_ar ?? '',
            'selected_base' => $selectedBase?->name_ar ?? '',
            'nationality' => $employee->nationality?->name_ar ?? '',
            'nationalitye' => $employee->nationality?->name_en ?? '',
            'plate_numbers' => $employee->cars->where('active', 1)
                ->map(fn ($car) => trim(e($car->plate_number).($car->car_description ? '  '.e($car->car_description) : '')))
                ->implode('<br>'),
            'idguest' => (string) $employee->id,
        ];
    }
}
