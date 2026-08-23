<?php

namespace App\Application\Gate;

use App\Domain\Gate\Models\Movement;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Movement create/query logic — port of legacy's MovementCheckService, with an
 * idempotent create path built on the two unique indexes already live on the
 * shared `movements` table (client_request_id, and the composite
 * emp_id+mvtype+mvdate+mvtime).
 */
class MovementService
{
    private const DUPLICATE_KEY_ERROR_CODE = 1062;

    public function __construct(private readonly EmployeeDirectoryService $directory) {}

    /**
     * Accepts either `emp_id` or `qrcode`, resolves/normalizes, then inserts
     * idempotently. Used identically by the live-submit and batch-sync paths.
     *
     * @param  array<string, mixed>  $item
     * @return array{movement: Movement, duplicate: bool}
     */
    public function createMovement(array $item): array
    {
        $attrs = $this->normalize($item);

        if (! empty($attrs['client_request_id'])) {
            $existing = Movement::where('client_request_id', $attrs['client_request_id'])->first();
            if ($existing) {
                return ['movement' => $existing, 'duplicate' => true];
            }
        }

        try {
            $movement = DB::transaction(function () use ($attrs) {
                $movement = Movement::create($attrs);
                DB::table('employees')->where('id', $attrs['emp_id'])->update(['updated_at' => now()]);

                return $movement;
            });

            return ['movement' => $movement, 'duplicate' => false];
        } catch (QueryException $e) {
            if (! $this->isDuplicateKeyException($e)) {
                throw $e;
            }

            $existing = $this->findExistingMovement($attrs);

            if (! $existing) {
                throw $e;
            }

            return ['movement' => $existing, 'duplicate' => true];
        }
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array{client_request_id: string|null, status: string, message?: string}>
     */
    public function syncBatch(array $items): array
    {
        $results = [];

        foreach ($items as $item) {
            $clientRequestId = $item['client_request_id'] ?? null;

            try {
                $result = $this->createMovement($item);

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

        return $results;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{total: int, lastMovement: array<string, mixed>|null, data: LengthAwarePaginator}
     */
    public function searchByPlate(array $filters): array
    {
        $perPage = (int) ($filters['per_page'] ?? 25);
        $page = (int) ($filters['page'] ?? 1);

        $baseQuery = Movement::query()
            ->leftJoin('employees', 'movements.emp_id', '=', 'employees.id')
            ->leftJoin('gates', 'movements.gate_id', '=', 'gates.id')
            ->leftJoin('bases', 'movements.base_id', '=', 'bases.id')
            ->where('movements.platenumber', $filters['platenumber'])
            ->when(! empty($filters['mvtype']), fn ($q) => $q->where('movements.mvtype', $filters['mvtype']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('movements.mvdate', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('movements.mvdate', '<=', $filters['date_to']))
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
                'employees.fullname_en as employee_en',
                'employees.military_number',
                'gates.name_ar as gate_ar',
                'gates.name_en as gate_en',
                'bases.name_ar as base_ar',
                'bases.name_en as base_en',
            );

        $total = (clone $baseQuery)->count();
        $lastMovement = (clone $baseQuery)->first();

        $data = (clone $baseQuery)->paginate($perPage, ['*'], 'page', $page);

        return [
            'total' => $total,
            'lastMovement' => $lastMovement,
            'data' => $data,
        ];
    }

    /**
     * Resolves emp_id (from qrcode if needed), coerces mvtime to H:i:s, and
     * defaults mvdate/mvtime to app-timezone now() (Asia/Qatar). Offline items
     * with `queued_at` (UTC ISO) are converted; explicit client values win.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function normalize(array $item): array
    {
        $empId = $item['emp_id'] ?? null;
        if (! $empId && ! empty($item['qrcode'])) {
            $empId = $this->directory->findByQrcode($item['qrcode'])?->id;
        }
        if (! $empId) {
            throw new InvalidArgumentException('Employee not found');
        }

        $automatic = (bool) ($item['automatic'] ?? false);

        [$mvdate, $mvtime] = $this->resolveMovementDateTime($item);

        if (preg_match('/^\d{2}:\d{2}$/', (string) $mvtime)) {
            $mvtime .= ':00';
        }

        return [
            'client_request_id' => $item['client_request_id'] ?? null,
            'emp_id' => $empId,
            'base_id' => $item['base_id'],
            'gate_id' => $item['gate_id'],
            'mvtype' => $item['mvtype'],
            'mvdate' => $mvdate,
            'mvtime' => $mvtime,
            'automatic' => $automatic,
            'platenumber' => $item['platenumber'] ?? null,
            'createdby_id' => $item['createdby_id'] ?? null,
        ];
    }

    /**
     * Auto/offline stamps use the app timezone. `queued_at` is an absolute ISO
     * instant (usually UTC `Z`); Carbon converts it before splitting date/time.
     *
     * @param  array<string, mixed>  $item
     * @return array{0: string, 1: string}
     */
    private function resolveMovementDateTime(array $item): array
    {
        $occurredAt = Carbon::parse($item['queued_at'] ?? 'now')
            ->timezone((string) config('app.timezone'));

        return [
            $item['mvdate'] ?? $occurredAt->toDateString(),
            $item['mvtime'] ?? $occurredAt->format('H:i:s'),
        ];
    }

    /**
     * @param  array<string, mixed>  $attrs
     */
    private function findExistingMovement(array $attrs): ?Movement
    {
        if (! empty($attrs['client_request_id'])) {
            $byClient = Movement::where('client_request_id', $attrs['client_request_id'])->first();
            if ($byClient) {
                return $byClient;
            }
        }

        if (! empty($attrs['emp_id']) && ! empty($attrs['mvtype']) && ! empty($attrs['mvdate']) && ! empty($attrs['mvtime'])) {
            return Movement::where('emp_id', $attrs['emp_id'])
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

        return $errorCode === self::DUPLICATE_KEY_ERROR_CODE || (string) $e->getCode() === '23000';
    }
}
