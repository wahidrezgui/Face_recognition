<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Organization\OrganizationService;
use App\Support\Access\DataScopeResolver;
use App\Support\Tree\DepartmentTreeService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function __construct(
        private OrganizationService $organization,
        private DepartmentTreeService $departmentTreeService,
        private DataScopeResolver $dataScope,
    ) {
    }

    public function departments()
    {
        return $this->organization->departments();
    }

    public function allDepartments(Request $request)
    {
        $user = $request->user();
        $scope = $this->dataScope->resolveForUser($user, 'departments');

        if ($scope !== 'global') {
            throw new AuthorizationException('Global department access required.');
        }

        return response()->json(['departments' => $this->departmentTreeService->getNestedTree()]);
    }

    public function departmentTree(int $parentId, Request $request)
    {
        $user = $request->user();
        $scope = $this->dataScope->resolveForUser($user, 'departments');
        $userDepId = $this->dataScope->userDepartmentId($user);

        if ($scope === 'global') {
            return response()->json([
                'departments' => $this->departmentTreeService->getParentAndNestedDepartments($parentId),
            ]);
        }

        if ($userDepId <= 0) {
            throw new AuthorizationException('User department is not configured.');
        }

        if ($parentId !== $userDepId) {
            $this->dataScope->assertDepartmentInScope($user, 'departments', $parentId);
        }

        if ($scope === 'self') {
            return response()->json([
                'departments' => $this->departmentTreeService->getSingleDepartment($userDepId),
            ]);
        }

        return response()->json([
            'departments' => $this->departmentTreeService->getParentAndNestedDepartments($userDepId),
        ]);
    }

    public function departmentInfo(string|int $id)
    {
        $departmentId = (int) $id;
        if ($departmentId <= 0) {
            return response()->json(['message' => 'Invalid department id'], 422);
        }

        $user = auth()->user();
        if ($user) {
            $this->dataScope->assertDepartmentInScope($user, 'departments', $departmentId);
        }

        return $this->organization->departmentInfo($departmentId);
    }

    public function storeDepartment(Request $request)
    {
        $user = $request->user();
        $scope = $this->dataScope->resolveForUser($user, 'departments');
        $parentId = (int) ($request->input('parent_id') ?? 0);

        if ($scope === 'self') {
            throw new AuthorizationException('Cannot create departments in self scope.');
        }

        if ($scope !== 'global') {
            if ($parentId <= 0) {
                throw new AuthorizationException('Parent department is required.');
            }
            $this->dataScope->assertDepartmentInScope($user, 'departments', $parentId);
        }

        return $this->organization->newDepartments($request);
    }

    public function updateDepartment(Request $request)
    {
        $departmentId = (int) ($request->input('id') ?? 0);
        $this->dataScope->assertDepartmentInScope($request->user(), 'departments', $departmentId);

        return $this->organization->editDepartments($request);
    }

    public function destroyDepartment(Request $request)
    {
        $user = $request->user();
        if ($this->dataScope->resolveForUser($user, 'departments') !== 'global') {
            throw new AuthorizationException('Global department scope required to delete.');
        }

        $departmentId = (int) ($request->input('id') ?? 0);
        $this->dataScope->assertDepartmentInScope($user, 'departments', $departmentId);

        return $this->organization->delDepartments($request);
    }

    public function companies(int $parentId)
    {
        return response()->json(['companies' => $this->departmentTreeService->getNestedCompanies($parentId)]);
    }

    public function storeCompany(Request $request)
    {
        return $this->organization->newCompany($request);
    }

    public function updateCompany(Request $request)
    {
        return $this->organization->editCompany($request);
    }

    public function companyInfo(string|int $id, Request $request)
    {
        $companyId = (int) $id;
        if ($companyId <= 0) {
            return response()->json(['message' => 'Invalid company id'], 422);
        }

        return $this->organization->CompanyInfo($companyId, $request);
    }

    public function companySummary(string|int $id)
    {
        $companyId = (int) $id;
        if ($companyId <= 0) {
            return response()->json(['message' => 'Invalid company id'], 422);
        }

        return $this->organization->compInfo($companyId);
    }

    public function assignBase(Request $request)
    {
        $depId = (int) ($request->input('dep_id') ?? 0);
        $this->dataScope->assertDepartmentInScope($request->user(), 'departments', $depId);

        return $this->organization->assignBase($request);
    }

    public function bases()
    {
        return $this->organization->bases();
    }

    public function baseInfo(int $id)
    {
        return $this->organization->baseInfo($id);
    }

    public function storeBase(Request $request)
    {
        return $this->organization->storeBase($request);
    }

    public function updateBase(Request $request)
    {
        return $this->organization->updateBase($request);
    }

    public function destroyBase(Request $request)
    {
        return $this->organization->destroyBase($request);
    }

    public function gates()
    {
        return $this->organization->gates();
    }

    public function gateInfo(int $id)
    {
        return $this->organization->gateInfo($id);
    }

    public function storeGate(Request $request)
    {
        return $this->organization->storeGate($request);
    }

    public function updateGate(Request $request)
    {
        return $this->organization->updateGate($request);
    }

    public function destroyGate(Request $request)
    {
        return $this->organization->destroyGate($request);
    }

    public function storeZone(Request $request)
    {
        return $this->organization->storeZone($request);
    }

    public function updateZone(Request $request)
    {
        return $this->organization->updateZone($request);
    }

    public function destroyZone(Request $request)
    {
        return $this->organization->destroyZone($request);
    }
}
