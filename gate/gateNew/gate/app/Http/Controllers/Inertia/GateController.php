<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Gate\BaseService;
use App\Application\Gate\EmployeeDirectoryService;
use App\Application\Gate\MovementService;
use App\Domain\AccessControl\AccessCatalog;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gate\SubmitMovementRequest;
use App\Http\Requests\Gate\SyncMovementsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class GateController extends Controller
{
    public function __construct(
        private readonly BaseService $baseService,
        private readonly EmployeeDirectoryService $directory,
        private readonly MovementService $movements,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can(AccessCatalog::routePermission('gate')), 403);

        return Inertia::render('gate/GateKiosk', [
            'bases' => $this->baseService->list()->map(fn ($base) => [
                'id' => $base->id,
                'name_ar' => $base->name_ar,
                'name_en' => $base->name_en,
                'gates' => $base->gates->map(fn ($gate) => [
                    'id' => $gate->id,
                    'name_ar' => $gate->name_ar,
                    'name_en' => $gate->name_en,
                ])->values(),
            ])->values(),
        ]);
    }

    public function directory(Request $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('employees')), 403);

        return response()->json(['employees' => $this->directory->activeRoster()]);
    }

    public function lookup(Request $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('employees')), 403);

        $validated = $request->validate([
            'qrcode' => ['required_without:employee_id', 'nullable', 'string'],
            'employee_id' => ['required_without:qrcode', 'nullable', 'integer'],
            'base_id' => ['nullable', 'integer', 'exists:bases,id'],
        ]);

        $employee = ! empty($validated['qrcode'])
            ? $this->directory->findByQrcode($validated['qrcode'])
            : $this->directory->findById((int) $validated['employee_id']);

        if (! $employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        return response()->json($this->directory->preview($employee, $validated['base_id'] ?? null));
    }

    public function submit(SubmitMovementRequest $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('employees')), 403);

        try {
            $result = $this->movements->createMovement([
                ...$request->validated(),
                'createdby_id' => $request->user()->id,
            ]);
        } catch (InvalidArgumentException) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        return response()->json(['success' => true, 'duplicate' => $result['duplicate']]);
    }

    public function sync(SyncMovementsRequest $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('employees')), 403);

        $items = array_map(
            fn (array $item) => [...$item, 'createdby_id' => $request->user()->id],
            $request->validated('items'),
        );

        return response()->json(['results' => $this->movements->syncBatch($items)]);
    }
}
