<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Personnel\AccessCardService;
use App\Application\Personnel\DepartmentTreeService;
use App\Application\Personnel\EmployeeService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Personnel\EmployeeStatus;
use App\Domain\Personnel\Models\BadgeLog;
use App\Domain\Personnel\Models\Employee;
use App\Domain\Personnel\Models\EmployeeCar;
use App\Domain\Personnel\Models\Gender;
use App\Domain\Personnel\Models\Nationality;
use App\Domain\Personnel\Models\Rank;
use App\Http\Controllers\Controller;
use App\Http\Requests\Personnel\StoreEmployeeRequest;
use App\Http\Requests\Personnel\UpdateEmployeeRequest;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function __construct(
        private readonly EmployeeService $employeeService,
        private readonly DepartmentTreeService $departmentTree,
        private readonly DataScopeResolver $dataScope,
        private readonly AccessCardService $accessCardService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('employees')), 403);

        $filters = $request->only([
            'military_number', 'fullname_ar', 'plate_number', 'base_id', 'zone_id', 'status',
            'nationality_id', 'dep_id', 'page', 'per_page', 'sort_field', 'sort_order',
            'housing', 'expired_only', 'deactivated_only',
        ]);
        $result = $this->employeeService->list($user, $filters);

        $scope = $this->dataScope->resolveForUser($user, 'departments');
        $userDepId = $this->dataScope->userDepartmentId($user);

        $departments = match ($scope) {
            'global' => $this->departmentTree->getNestedTree(),
            'self' => $userDepId > 0 ? $this->departmentTree->getSingleDepartment($userDepId) : [],
            default => $userDepId > 0 ? $this->departmentTree->getParentAndNestedDepartments($userDepId) : [],
        };

        return Inertia::render('employees/Employees', [
            'employees' => $result['employees'],
            'statusCards' => $result['statusCards'],
            'expiredCount' => $result['expiredCount'],
            'filters' => $filters,
            'departments' => $departments,
            'bases' => $this->employeeService->basesWithZones(),
            'ranks' => Rank::with('category')->orderBy('ordre')->get(),
            'nationalities' => Nationality::orderBy('name_ar')->get(['id', 'name_ar', 'name_en']),
            'genders' => Gender::orderBy('id')->get(['id', 'name_ar', 'name_en']),
        ]);
    }

    public function store(StoreEmployeeRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);
        $this->dataScope->assertDepartmentInScope($user, 'departments', (int) $request->input('dep_id'));

        $this->employeeService->create($request->validated(), $request->file('photo'), $user);

        return back();
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);
        $this->dataScope->assertDepartmentInScope($user, 'departments', $employee->dep_id);
        $this->dataScope->assertDepartmentInScope($user, 'departments', (int) $request->input('dep_id'));

        $this->employeeService->update($employee, $request->validated(), $request->file('photo'), $user);

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        $ids = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ])['ids'];

        $this->employeeService->delete($ids);

        return back();
    }

    public function approve(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'status' => ['required', 'integer', 'in:0,1,3'],
        ]);

        $this->employeeService->setStatus($validated['ids'], $validated['status'], $user);

        return back();
    }

    public function setActive(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'active' => ['required', 'boolean'],
        ]);

        $this->employeeService->setActive($validated['ids'], $validated['active'], $user);

        return back();
    }

    public function movements(Request $request, Employee $employee): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('employees')), 403);

        return response()->json([
            'movements' => $this->employeeService->recentMovements($employee),
        ]);
    }

    public function accessCard(Request $request, Employee $employee): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('employees')), 403);

        $baseId = $request->integer('base_id') ?: null;

        return response()->json($this->accessCardService->buildForEmployee($employee, $baseId));
    }

    public function accessCards(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('employees')), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'base_id' => ['nullable', 'integer', 'exists:bases,id'],
        ]);

        return response()->json([
            'cards' => $this->accessCardService->buildForEmployees($validated['ids'], $validated['base_id'] ?? null),
        ]);
    }

    public function markPrinted(Request $request, Employee $employee): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);
        abort_if($employee->status === EmployeeStatus::Pending->value, 422, 'Cannot print a badge for a pending employee.');

        $validated = $request->validate([
            'base_id' => ['nullable', 'integer', 'exists:bases,id'],
        ]);

        $this->accessCardService->recordPrint($employee, $user, $validated['base_id'] ?? null);
        $this->employeeService->setStatus([$employee->id], EmployeeStatus::Printed->value, $user);

        return back();
    }

    /**
     * Bulk counterpart to {@see markPrinted} — same two steps (record + transition to
     * Printed), just applied to every selected employee in one request. Employees still
     * Pending are silently skipped rather than failing the whole batch, since a bulk
     * selection routinely spans a filtered view the user has already scoped to
     * printable statuses.
     */
    public function bulkPrintAccessCards(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'base_id' => ['nullable', 'integer', 'exists:bases,id'],
        ]);

        $employees = Employee::whereIn('id', $validated['ids'])
            ->where('status', '!=', EmployeeStatus::Pending->value)
            ->get();

        abort_if($employees->isEmpty(), 422, 'None of the selected employees can be printed.');

        $this->accessCardService->recordPrintForEmployees($employees, $user, $validated['base_id'] ?? null);
        $this->employeeService->setStatus($employees->pluck('id')->all(), EmployeeStatus::Printed->value, $user);

        return back();
    }

    public function returnCard(Request $request, Employee $employee, BadgeLog $badgeLog): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);
        abort_if($badgeLog->emp_id !== $employee->id, 404);

        $this->accessCardService->returnCard($badgeLog, $user);

        return back();
    }

    public function storeCar(Request $request, Employee $employee): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        $validated = $request->validate([
            'plate_number' => ['required', 'string', 'max:255', 'unique:employee_cars,plate_number'],
            'car_description' => ['nullable', 'string', 'max:255'],
        ]);

        $this->employeeService->addCar($employee, $validated['plate_number'], $validated['car_description'] ?? null);

        return back();
    }

    public function updateCar(Request $request, Employee $employee, EmployeeCar $car): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        if ($car->emp_id !== $employee->id) {
            throw new AuthorizationException('Car does not belong to this employee.');
        }

        $validated = $request->validate([
            'car_description' => ['nullable', 'string', 'max:255'],
        ]);

        $this->employeeService->updateCarDescription($car, $validated['car_description'] ?? null);

        return back();
    }

    public function destroyCar(Request $request, Employee $employee, EmployeeCar $car): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('employees')), 403);

        if ($car->emp_id !== $employee->id) {
            throw new AuthorizationException('Car does not belong to this employee.');
        }

        $this->employeeService->deleteCar($car);

        return back();
    }
}
