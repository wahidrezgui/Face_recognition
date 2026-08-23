<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Personnel\CompanyService;
use App\Application\Personnel\DepartmentService;
use App\Application\Personnel\DepartmentTreeService;
use App\Application\Personnel\EmployeeService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Personnel\Models\Department;
use App\Domain\Personnel\Models\Gender;
use App\Domain\Personnel\Models\Nationality;
use App\Domain\Personnel\Models\Rank;
use App\Http\Controllers\Controller;
use App\Http\Requests\Personnel\StoreCompanyRequest;
use App\Http\Requests\Personnel\UpdateCompanyRequest;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function __construct(
        private readonly CompanyService $companyService,
        private readonly EmployeeService $employeeService,
        private readonly DepartmentTreeService $departmentTree,
        private readonly DepartmentService $departmentService,
        private readonly DataScopeResolver $dataScope,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('companies')), 403);

        $filters = $request->only(['search', 'page', 'per_page']);
        $scope = $this->dataScope->resolveForUser($user, 'departments');
        $userDepId = $this->dataScope->userDepartmentId($user);

        return Inertia::render('companies/Companies', [
            'companies' => $this->companyService->list($user, $filters),
            'filters' => $filters,
            'parentDepartmentOptions' => $this->departmentTree->getNestedTree(),
            'bases' => $this->departmentService->basesPool($scope, $userDepId),
            'scope' => $scope,
            'scopeLabel' => $this->dataScope->scopeLabel($scope),
        ]);
    }

    public function store(StoreCompanyRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('companies')), 403);
        $this->dataScope->assertDepartmentInScope($user, 'departments', (int) $request->validated('parent_id'));

        $this->companyService->create($request->validated(), $user);

        return back();
    }

    public function update(UpdateCompanyRequest $request, Department $company): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('companies')), 403);
        abort_unless($company->is_company, 404);
        $this->dataScope->assertDepartmentInScope($user, 'departments', (int) $request->validated('parent_id'));

        $this->companyService->update($company, $request->validated());

        return back();
    }

    public function destroy(Request $request, Department $company): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('companies')), 403);
        abort_unless($company->is_company, 404);

        if ($this->dataScope->resolveForUser($user, 'departments') !== 'global') {
            throw new AuthorizationException('Global scope required to delete a company.');
        }

        $this->companyService->delete($company);

        return back();
    }

    public function show(Request $request, Department $company): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('companies')), 403);
        abort_unless($company->is_company, 404);
        $this->dataScope->assertDepartmentInScope($user, 'departments', $company->id);

        $filters = $request->only(['military_number', 'fullname_ar', 'plate_number', 'base_id', 'zone_id', 'status', 'nationality_id', 'page', 'per_page', 'sort_field', 'sort_order', 'housing', 'expired_only', 'deactivated_only']);
        $filters['dep_id'] = $company->id;
        $filters['company_only'] = true;

        $result = $this->employeeService->list($user, $filters);

        return Inertia::render('employees/Employees', [
            'employees' => $result['employees'],
            'statusCards' => $result['statusCards'],
            'expiredCount' => $result['expiredCount'],
            'filters' => $filters,
            'departments' => [],
            'bases' => $this->employeeService->basesWithZones(),
            'ranks' => Rank::with('category')->orderBy('ordre')->get(),
            'nationalities' => Nationality::orderBy('name_ar')->get(['id', 'name_ar', 'name_en']),
            'genders' => Gender::orderBy('id')->get(['id', 'name_ar', 'name_en']),
            'lockedCompany' => [
                'id' => $company->id,
                'name_ar' => $company->name_ar,
                'name_en' => $company->name_en,
            ],
        ]);
    }
}
