<?php

namespace App\Services\Movements;

use App\Support\EmployeeGateAlerts;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Employees;
use App\Models\Departments;
use App\Models\Ranks;
use App\Models\RanksParents;
use App\Models\Nationalities;
use App\Models\Bases;
use App\Models\EmployeeZones;
use App\Models\CompaniesTimes;
use App\Models\Movements;

class MovementCheckService
{
    private const PLATE_NUMBER_MAX_LENGTH = 20;

    private function movementValidationMessages(): array
    {
        return [
            'platenumber.max' => 'رقم السيارة طويل جداً — الحد الأقصى '.self::PLATE_NUMBER_MAX_LENGTH.' حرفاً',
        ];
    }

    private function resolveCreatedbyId(Request $request, ?int $payloadId = null): ?int
    {
        return $request->user()?->id ?? $payloadId;
    }

    private function createdbyIdRules(): array
    {
        return ['createdby_id' => ['nullable', 'integer', 'exists:users,id']];
    }

    private function clientRequestIdRules(): array
    {
        return ['client_request_id' => ['required', 'uuid']];
    }

    /**
     * @return array{movement: ?Movements, duplicate: bool}
     */
    private function createMovement(array $attrs): array
    {
        if (! empty($attrs['client_request_id'])) {
            $existing = Movements::where('client_request_id', $attrs['client_request_id'])->first();
            if ($existing) {
                return ['movement' => $existing, 'duplicate' => true];
            }
        }

        $empId = $attrs['emp_id'] ?? null;
        if (! $empId) {
            throw new \InvalidArgumentException('emp_id is required');
        }

        try {
            $movement = DB::transaction(function () use ($attrs, $empId) {
                $movement = Movements::create($attrs);
                DB::table('employees')->where('id', $empId)->update(['updated_at' => now()]);

                return $movement;
            });

            return ['movement' => $movement, 'duplicate' => false];
        } catch (QueryException $e) {
            if (! $this->isDuplicateKeyException($e)) {
                throw $e;
            }

            return ['movement' => $this->findExistingMovement($attrs), 'duplicate' => true];
        }
    }

    private function findExistingMovement(array $attrs): ?Movements
    {
        if (! empty($attrs['client_request_id'])) {
            $byClient = Movements::where('client_request_id', $attrs['client_request_id'])->first();
            if ($byClient) {
                return $byClient;
            }
        }

        if (
            ! empty($attrs['emp_id'])
            && ! empty($attrs['mvtype'])
            && ! empty($attrs['mvdate'])
            && ! empty($attrs['mvtime'])
        ) {
            return Movements::where('emp_id', $attrs['emp_id'])
                ->where('mvtype', $attrs['mvtype'])
                ->where('mvdate', $attrs['mvdate'])
                ->where('mvtime', $attrs['mvtime'])
                ->first();
        }

        return null;
    }

    private function isDuplicateKeyException(QueryException $e): bool
    {
        $errorCode = $e->errorInfo[1] ?? null;

        return $errorCode === 1062 || (string) $e->getCode() === '23000';
    }

public function check(Request $request){
    $guest = Employees::where('qrcode', $request->qrcode)->first();

    if (! $guest) {
        return response()->json(['message' => 'لم يتم العثور على البطاقة'], 404);
    }

    return response()->json($this->buildCardPayload($guest, $request->integer('base_id') ?: null));
}

public function gatePreview(int $employeeId, Request $request)
{
    $guest = Employees::find($employeeId);

    if (! $guest) {
        return response()->json(['message' => 'لم يتم العثور على الموظف'], 404);
    }

    return response()->json($this->buildCardPayload($guest, $request->integer('base_id') ?: null));
}

private function buildCardPayload(Employees $guest, ?int $baseId): array
{
    $dep = Departments::find($guest->dep_id);
    $rank = Ranks::find($guest->rank_id);
    $rankCategory = null;
    if ($rank?->ranks_parents_id) {
        $rankParent = RanksParents::with('rankCategory')->find($rank->ranks_parents_id);
        $rankCategory = $rankParent?->rankCategory?->name_ar;
    }
    $base = Bases::find($guest->default_base);

    $lastMovement = Movements::where('emp_id', $guest->id)
        ->orderByDesc('mvdate')
        ->orderByDesc('mvtime')
        ->first();
    $lastMovementType = match ($lastMovement?->mvtype) {
        'Check-In' => 'in',
        'Check-Out' => 'out',
        default => null,
    };

    $access = $baseId
        ? EmployeeZones::where('base_id', $baseId)->where('emp_id', $guest->id)->count()
        : 0;

    $timing = 1;
    $checktimes = CompaniesTimes::where('dep_id', $guest->dep_id)->first();
    if ($guest->is_employee == 1 && $checktimes && (date('H:i:s') < $checktimes->start_time || date('H:i:s') > $checktimes->end_time)) {
        $timing = $checktimes->start_time.' - '.$checktimes->end_time;
    }

    $alerts = EmployeeGateAlerts::build($guest->expiry_date, $guest->remarks);

    return [
        'emp_id' => $guest->id,
        'military_number' => $guest->military_number,
        'qrcode' => $guest->qrcode,
        'photo' => $guest->photo,
        'fullname_en' => $guest->fullname_en,
        'fullname_ar' => $guest->fullname_ar,
        'remarks' => $guest->remarks,
        'bloodtype' => $guest->bloodtype,
        'department' => $dep?->name_ar,
        'rank' => $rank?->name_ar,
        'rank_name_ar' => $rank?->name_ar,
        'rank_category' => $rankCategory,
        'base' => $base?->name_ar,
        'expiry_date' => $guest->expiry_date,
        'last_movement_type' => $lastMovementType,
        'access' => $access,
        'timing' => $timing,
        'alerts' => $alerts,
        'is_expired' => EmployeeGateAlerts::isExpired($guest->expiry_date),
    ];
}

public function checkManuel(Request $request){
    $validated = $request->validate(array_merge([
        'empl_id' => ['required', 'integer', 'exists:employees,id'],
        'mvtype' => ['required', 'in:Check-In,Check-Out'],
        'base_id' => ['required', 'integer', 'exists:bases,id'],
        'gate_id' => ['required', 'integer', 'exists:gates,id'],
        'mvdate' => ['required', 'date'],
        'mvtime' => ['required', 'string'],
        'platenumber' => ['nullable', 'string', 'max:'.self::PLATE_NUMBER_MAX_LENGTH],
    ], $this->createdbyIdRules(), $this->clientRequestIdRules()), $this->movementValidationMessages());

    $mvtime = $validated['mvtime'];
    if (preg_match('/^\d{2}:\d{2}$/', $mvtime)) {
        $mvtime .= ':00';
    }

    $result = $this->createMovement([
        'client_request_id' => $validated['client_request_id'],
        'emp_id' => $validated['empl_id'],
        'gate_id' => $validated['gate_id'],
        'base_id' => $validated['base_id'],
        'mvtype' => $validated['mvtype'],
        'mvtime' => $mvtime,
        'mvdate' => $validated['mvdate'],
        'automatic' => false,
        'platenumber' => $validated['platenumber'] ?? '',
        'createdby_id' => $this->resolveCreatedbyId($request, $validated['createdby_id'] ?? null),
    ]);

    if ($result['duplicate']) {
        return response()->json(['success' => true, 'duplicate' => true]);
    }

    return response()->json(['success' => true]);
}

    ############################################################# Settings


    public function checkSubmit(Request $request){
        $validated = $request->validate(array_merge([
            'emp_id' => ['required', 'integer', 'exists:employees,id'],
            'mvtype' => ['required', 'in:Check-In,Check-Out'],
            'base_id' => ['required', 'integer', 'exists:bases,id'],
            'gate_id' => ['required', 'integer', 'exists:gates,id'],
            'platenumber' => ['nullable', 'string', 'max:'.self::PLATE_NUMBER_MAX_LENGTH],
            'qrcode' => ['nullable', 'string'],
            'mvdate' => ['nullable', 'date'],
            'mvtime' => ['nullable', 'string'],
        ], $this->createdbyIdRules(), $this->clientRequestIdRules()), $this->movementValidationMessages());

        $input = $validated;
        $input['mvtime'] = $validated['mvtime'] ?? date('H:i:s');
        $input['mvdate'] = $validated['mvdate'] ?? date('Y-m-d');
        $input['automatic'] = true;
        $input['createdby_id'] = $this->resolveCreatedbyId($request, $validated['createdby_id'] ?? null);

        $result = $this->createMovement($input);

        if ($result['duplicate']) {
            return response()->json(['success' => true, 'duplicate' => true]);
        }

        return response()->json(['success' => true]);
}

public function syncOffline(Request $request)
{
    $request->validate([
        'items' => ['required', 'array'],
        'items.*.client_request_id' => ['required', 'uuid'],
        'items.*.mvtype' => ['required', 'string'],
        'items.*.base_id' => ['required'],
        'items.*.gate_id' => ['required'],
        'items.*.platenumber' => ['nullable', 'string', 'max:'.self::PLATE_NUMBER_MAX_LENGTH],
        'items.*.createdby_id' => ['nullable', 'integer', 'exists:users,id'],
    ], $this->movementValidationMessages());

    $results = [];

    foreach ($request->items as $item) {
        $clientRequestId = $item['client_request_id'];

        try {
            $empId = $item['emp_id'] ?? null;

            if (! $empId && ! empty($item['qrcode'])) {
                $empId = Employees::where('qrcode', $item['qrcode'])->value('id');
            }

            if (! $empId && ! empty($item['empl_id'])) {
                $empId = $item['empl_id'];
            }

            if (! $empId) {
                $results[] = ['client_request_id' => $clientRequestId, 'status' => 'failed', 'message' => 'Employee not found'];
                continue;
            }

            $mvdate = $item['mvdate'] ?? date('Y-m-d', strtotime($item['queued_at'] ?? 'now'));
            $mvtime = $item['mvtime'] ?? date('H:i:s', strtotime($item['queued_at'] ?? 'now'));

            $result = $this->createMovement([
                'client_request_id' => $clientRequestId,
                'emp_id' => $empId,
                'mvtype' => $item['mvtype'],
                'base_id' => $item['base_id'],
                'gate_id' => $item['gate_id'],
                'platenumber' => $item['platenumber'] ?? null,
                'mvdate' => $mvdate,
                'mvtime' => $mvtime,
                'automatic' => ($item['mode'] ?? 'auto') === 'auto',
                'createdby_id' => $this->resolveCreatedbyId($request, isset($item['createdby_id']) ? (int) $item['createdby_id'] : null),
            ]);

            $results[] = [
                'client_request_id' => $clientRequestId,
                'status' => $result['duplicate'] ? 'duplicate' : 'synced',
            ];
        } catch (\Throwable $e) {
            $results[] = [
                'client_request_id' => $clientRequestId,
                'status' => 'failed',
                'message' => $e->getMessage(),
            ];
        }
    }

    return response()->json(['results' => $results]);
}


    public function lastMovements($emp_id)
    {
        $movements = Movements::with('createdBy')
            ->where('emp_id', $emp_id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn (Movements $movement) => array_merge($movement->toArray(), [
                'operator_name' => $movement->createdby_id ? $movement->operatorLabel() : null,
            ]));

        return response()->json($movements);
    }


    public function CompanyCheckin($id)
    {
      $stats=[];

    
     $startDateTimestamp = strtotime('-7 days');
     $startDate = date('Y-m-d', $startDateTimestamp);

            $precordsIn = Movements::join('employees', 'movements.emp_id', '=', 'employees.id')
            ->select(
                DB::raw("COUNT(DISTINCT movements.emp_id) as count"),
                DB::raw("DAY(movements.mvdate) as day"),
                DB::raw("MONTH(movements.mvdate) as month"),
                DB::raw("movements.mvdate")
            )
            ->where('movements.mvtype', 'Check-In')
            ->where('employees.is_employee', 1)
            ->whereDate('movements.mvdate', '>=', $startDate)
            ->groupBy('day', 'month', 'movements.mvdate')
            ->orderBy('movements.mvdate', 'asc')
            ->get();
    
            foreach($precordsIn as $row) {
                $nbout=Movements::join('employees', 'movements.emp_id', '=', 'employees.id')->where('employees.is_employee', 1)->where('mvdate',$row->mvdate)->where('mvtype', 'Check-Out')->distinct('emp_id')->count();
                $stats['presence']['dayIn'][] = $row->day.'/'.$row->month;
                $stats['presence']['nbIn'][] = (int) $row->count;
                $stats['presence']['nbOut'][] = (int) $nbout;
            }
    

      return response()->json($stats);
    }


public function searchByPlate(Request $request)
{
    $validated = $request->validate([
        'platenumber' => ['required', 'string', 'max:'.self::PLATE_NUMBER_MAX_LENGTH],
        'mvtype' => ['nullable', 'in:Check-In,Check-Out'],
        'date_from' => ['nullable', 'date'],
        'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        'page' => ['nullable', 'integer', 'min:1'],
        'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
    ], $this->movementValidationMessages());

    $plate = $validated['platenumber'];
    $perPage = (int) ($validated['per_page'] ?? 25);
    $page = (int) ($validated['page'] ?? 1);

    $baseQuery = Movements::query()
        ->leftJoin('employees', 'movements.emp_id', '=', 'employees.id')
        ->leftJoin('gates', 'movements.gate_id', '=', 'gates.id')
        ->leftJoin('bases', 'movements.base_id', '=', 'bases.id')
        ->where('movements.platenumber', $plate)
        ->when($request->filled('mvtype'), fn ($q) => $q->where('movements.mvtype', $request->mvtype))
        ->when($request->filled('date_from'), fn ($q) => $q->whereDate('movements.mvdate', '>=', $request->date_from))
        ->when($request->filled('date_to'), fn ($q) => $q->whereDate('movements.mvdate', '<=', $request->date_to))
        ->orderByDesc('movements.mvdate')
        ->orderByDesc('movements.mvtime')
        ->select(
            'movements.id',
            'movements.platenumber',
            'movements.mvtype',
            'movements.mvdate',
            'movements.mvtime',
            'movements.emp_id',
            'employees.fullname_ar as employee_ar',
            'employees.fullname_en as employee',
            'employees.military_number',
            'gates.name_ar as gate',
            'bases.name_ar as base'
        );

    $total = (clone $baseQuery)->count();

    $lastMovement = (clone $baseQuery)->first();

    if ($request->has('all')) {
        $allMovements = (clone $baseQuery)->get();

        return response()->json([
            'platenumber' => $plate,
            'total' => $total,
            'lastMovement' => $lastMovement,
            'allMovements' => $allMovements,
            'data' => $allMovements,
        ]);
    }

    $data = (clone $baseQuery)
        ->forPage($page, $perPage)
        ->get();

    return response()->json([
        'platenumber' => $plate,
        'total' => $total,
        'page' => $page,
        'per_page' => $perPage,
        'last_page' => (int) max(1, ceil($total / $perPage)),
        'lastMovement' => $lastMovement,
        'data' => $data,
    ]);
}
}
