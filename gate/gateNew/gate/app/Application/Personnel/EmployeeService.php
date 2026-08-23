<?php

namespace App\Application\Personnel;

use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Audit\Models\AppLog;
use App\Domain\Gate\Models\Base;
use App\Domain\Gate\Models\Movement;
use App\Domain\Gate\Models\Zone;
use App\Domain\Identity\Models\User;
use App\Domain\Personnel\EmployeeStatus;
use App\Domain\Personnel\Models\Employee;
use App\Domain\Personnel\Models\EmployeeCar;
use App\Domain\Personnel\Models\EmployeeZone;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmployeeService
{
    /**
     * Columns the employee grid is allowed to sort by — a fixed allowlist since the
     * sort field arrives as an untrusted string from the client.
     */
    private const SORTABLE_COLUMNS = ['military_number', 'qrcode', 'fullname_ar', 'bloodtype', 'expiry_date', 'status'];

    private const MAX_CARS_PER_EMPLOYEE = 3;

    public function __construct(private readonly DataScopeResolver $dataScope) {}

    public function list(User $actor, array $filters, int $perPage = 25): array
    {
        $perPage = (int) ($filters['per_page'] ?? $perPage);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 25;

        // "Deactivated" employees are archived out of every normal view by default; the
        // deactivated_only filter flips which half of the table is being looked at, rather
        // than adding an extra condition on top (an employee is never both at once).
        $showDeactivated = ! empty($filters['deactivated_only']);
        $baseQuery = Employee::query()->where('active', $showDeactivated ? 0 : 1);
        $this->applyDepartmentScope($baseQuery, $actor);

        $statusCards = (clone $baseQuery)
            ->selectRaw('status, count(*) as total')
            ->whereIn('status', [0, 1, 2, 3])
            ->groupBy('status')
            ->pluck('total', 'status');

        $expiredCount = (clone $baseQuery)->whereDate('expiry_date', '<', now()->toDateString())->count();

        // 'defaultBase' is deliberately not eager-loaded here: Eloquent snake-cases the
        // relation name to 'default_base' in JSON output, which collides with (and would
        // silently overwrite) the raw default_base FK column the frontend form needs.
        $query = (clone $baseQuery)->with(['department', 'rank', 'nationality', 'gender', 'cars', 'zones']);
        $this->applyFilters($query, $filters);

        $sortField = $filters['sort_field'] ?? null;
        if (in_array($sortField, self::SORTABLE_COLUMNS, true)) {
            $query->orderBy($sortField, ($filters['sort_order'] ?? '1') === '-1' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('created_at');
        }

        /** @var LengthAwarePaginator $paginator */
        $paginator = $query->paginate($perPage, ['*'], 'page', $filters['page'] ?? 1);

        return [
            'employees' => $paginator,
            'statusCards' => collect(EmployeeStatus::cases())
                ->filter(fn (EmployeeStatus $status) => $status !== EmployeeStatus::Canceled)
                ->map(fn (EmployeeStatus $status) => [
                    'status' => $status->value,
                    'labelAr' => $status->labelAr(),
                    'labelEn' => $status->labelEn(),
                    'count' => (int) ($statusCards[$status->value] ?? 0),
                ])
                ->values(),
            'expiredCount' => $expiredCount,
        ];
    }

    private function applyDepartmentScope($query, User $actor): void
    {
        if ($this->dataScope->resolveForUser($actor, 'departments') === 'global') {
            return;
        }

        $query->whereIn('dep_id', $this->dataScope->resolveDepartmentIds($actor, 'departments'));
    }

    private function applyFilters($query, array $filters): void
    {
        if (! empty($filters['military_number'])) {
            $query->where('military_number', (int) $filters['military_number']);
        }

        if (! empty($filters['fullname_ar'])) {
            $needle = $filters['fullname_ar'];
            $query->where(function ($q) use ($needle) {
                $q->where('fullname_ar', 'like', "%{$needle}%")
                    ->orWhere('fullname_en', 'like', "%{$needle}%");
            });
        }

        if (! empty($filters['plate_number'])) {
            $needle = $filters['plate_number'];
            $query->whereHas('cars', function ($q) use ($needle) {
                $q->where('active', 1)->where('plate_number', 'like', "%{$needle}%");
            });
        }

        if (! empty($filters['base_id'])) {
            $baseId = (int) $filters['base_id'];
            $query->where(function ($q) use ($baseId) {
                $q->where('default_base', $baseId)
                    ->orWhereHas('zones', fn ($zq) => $zq->where('base_id', $baseId));
            });
        }

        if (! empty($filters['zone_id'])) {
            $zoneId = (int) $filters['zone_id'];
            $query->whereHas('zones', fn ($q) => $q->where('zones.id', $zoneId));
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', (int) $filters['status']);
        }

        if (! empty($filters['nationality_id'])) {
            $query->where('nationality_id', (int) $filters['nationality_id']);
        }

        if (isset($filters['housing']) && $filters['housing'] !== '') {
            $query->where('housing', (bool) (int) $filters['housing']);
        }

        if (! empty($filters['expired_only'])) {
            $query->whereDate('expiry_date', '<', now()->toDateString());
        }

        if (! empty($filters['dep_id'])) {
            $query->where('dep_id', (int) $filters['dep_id']);
        }

        // The standalone Employees page and a company's locked roster share this
        // same query — split them by the linked department's `is_company` flag so
        // company workers never leak into the regular grid (matches legacy's own
        // real scoping rule, which the query didn't previously enforce here).
        if (! empty($filters['company_only'])) {
            $query->whereHas('department', fn ($d) => $d->where('is_company', 1));
        } else {
            $query->whereHas('department', fn ($d) => $d->where('is_company', 0));
        }
    }

    public function create(array $data, ?UploadedFile $photo, User $actor): Employee
    {
        $employee = new Employee($this->prepareFields($data));
        $employee->dep_parent_id = (int) ($data['dep_parent_id'] ?? $data['dep_id']);
        $employee->qrcode = uniqid();
        $employee->active = 1;
        $employee->created_by_id = $actor->id;

        if ($photo) {
            $employee->photo = $this->storePhoto($photo);
        }

        $employee->save();

        $this->syncZones($employee, $data['zoning'] ?? []);

        AppLog::create([
            'emp_id' => $employee->id,
            'task' => 'Registration',
            'created_by_id' => $actor->id,
            'ip_address' => request()->ip(),
        ]);

        return $employee;
    }

    public function update(Employee $employee, array $data, ?UploadedFile $photo, User $actor): Employee
    {
        $employee->fill($this->prepareFields($data));
        $employee->dep_parent_id = (int) ($data['dep_parent_id'] ?? $data['dep_id'] ?? $employee->dep_parent_id);

        if ($photo) {
            $employee->photo = $this->storePhoto($photo);
        }

        $employee->save();

        if (array_key_exists('zoning', $data)) {
            $this->syncZones($employee, $data['zoning'] ?? []);
        }

        AppLog::create([
            'emp_id' => $employee->id,
            'task' => 'Edit Information',
            'created_by_id' => $actor->id,
            'ip_address' => request()->ip(),
        ]);

        return $employee;
    }

    /**
     * @param  int[]  $ids
     */
    public function delete(array $ids): void
    {
        Employee::whereIn('id', $ids)->delete();
    }

    /**
     * @param  int[]  $ids
     */
    public function setStatus(array $ids, int $status, User $actor): void
    {
        $statusEnum = EmployeeStatus::from($status);

        $employees = Employee::with(['defaultBase', 'zones'])->whereIn('id', $ids)->get();

        DB::table('employees')->whereIn('id', $ids)->update(['status' => $status]);

        foreach ($employees as $employee) {
            $zonesLabel = $employee->zones->isEmpty()
                ? '—'
                : $employee->zones->pluck('name_ar')->implode(', ');

            $line = sprintf(
                '%s | Base: %s | Zones: %s',
                $statusEnum->logLabel(),
                $employee->defaultBase?->name_ar ?? '—',
                $zonesLabel,
            );

            AppLog::create([
                'emp_id' => $employee->id,
                'task' => Str::limit($line, 255, ''),
                'created_by_id' => $actor->id,
                'ip_address' => request()->ip(),
            ]);
        }
    }

    /**
     * Activating/deactivating is orthogonal to the Pending/Approved/Printed/Collected
     * `status` workflow — it's the `active` flag that already scopes every list query
     * (`Employee::query()->where('active', ...)` in list()), not a new status value.
     *
     * @param  int[]  $ids
     */
    public function setActive(array $ids, bool $active, User $actor): void
    {
        DB::table('employees')->whereIn('id', $ids)->update(['active' => $active]);

        foreach ($ids as $id) {
            AppLog::create([
                'emp_id' => $id,
                'task' => $active ? 'Activated' : 'Deactivated',
                'created_by_id' => $actor->id,
                'ip_address' => request()->ip(),
            ]);
        }
    }

    public function addCar(Employee $employee, string $plateNumber, ?string $description = null): EmployeeCar
    {
        $this->assertCarLimitNotReached($employee);

        return EmployeeCar::create([
            'emp_id' => $employee->id,
            'plate_number' => $plateNumber,
            'car_description' => $description,
            'active' => 1,
        ]);
    }

    private function assertCarLimitNotReached(Employee $employee): void
    {
        if ($employee->cars()->count() >= self::MAX_CARS_PER_EMPLOYEE) {
            throw ValidationException::withMessages([
                'plate_number' => 'This employee already has the maximum of '.self::MAX_CARS_PER_EMPLOYEE.' registered cars.',
            ]);
        }
    }

    public function updateCarDescription(EmployeeCar $car, ?string $description): void
    {
        $car->update(['car_description' => $description]);
    }

    public function deleteCar(EmployeeCar $car): void
    {
        $car->delete();
    }

    /**
     * @return Collection<int, Base>
     */
    public function basesWithZones()
    {
        return Base::with('zones')->orderBy('name_ar')->get();
    }

    /**
     * @return Collection<int, Movement>
     */
    public function recentMovements(Employee $employee, int $limit = 50)
    {
        return Movement::with(['base', 'gate'])
            ->where('emp_id', $employee->id)
            ->orderByDesc('mvdate')
            ->orderByDesc('mvtime')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  int[]  $zoneIds
     */
    private function syncZones(Employee $employee, array $zoneIds): void
    {
        EmployeeZone::where('emp_id', $employee->id)->delete();

        if ($zoneIds === []) {
            return;
        }

        $zones = Zone::whereIn('id', $zoneIds)->get(['id', 'base_id']);

        $rows = $zones->map(fn (Zone $zone) => [
            'emp_id' => $employee->id,
            'base_id' => $zone->base_id,
            'zone_id' => $zone->id,
            'created_at' => now(),
            'updated_at' => now(),
        ])->all();

        if ($rows !== []) {
            EmployeeZone::insert($rows);
        }
    }

    private function prepareFields(array $data): array
    {
        // 'photo' is always handled separately via the $photo UploadedFile parameter in
        // create()/update(). The edit form always submits photo: null when the user didn't
        // pick a new file (it never pre-fills a file input), and since 'photo' is nullable
        // and fillable, leaving it in here would mass-assign null and wipe the existing photo
        // on every edit that doesn't replace it.
        return array_diff_key(array_intersect_key($data, array_flip((new Employee)->getFillable())), ['photo' => null]);
    }

    private function storePhoto(UploadedFile $file): string
    {
        $filename = time().'_'.Str::random(8).'.'.$file->getClientOriginalExtension();
        $file->move(public_path('uploads'), $filename);

        return 'uploads/'.$filename;
    }
}
