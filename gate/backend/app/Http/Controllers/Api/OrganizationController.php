<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Organization\OrganizationService;
use App\Support\Tree\DepartmentTreeService;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function __construct(
        private OrganizationService $organization,
        private DepartmentTreeService $departmentTreeService,
    ) {
    }

    public function departments()
    {
        return $this->organization->departments();
    }

    public function allDepartments()
    {
        return response()->json(['departments' => $this->departmentTreeService->getNestedTree()]);
    }

    public function departmentTree(int $parentId)
    {
        return response()->json(['departments' => $this->departmentTreeService->getParentAndNestedDepartments($parentId)]);
    }

    public function departmentInfo(int $id)
    {
        return $this->organization->departmentInfo($id);
    }

    public function storeDepartment(Request $request)
    {
        return $this->organization->newDepartments($request);
    }

    public function updateDepartment(Request $request)
    {
        return $this->organization->editDepartments($request);
    }

    public function destroyDepartment(Request $request)
    {
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

    public function companyInfo(int $id)
    {
        return $this->organization->CompanyInfo($id, request());
    }

    public function companySummary(int $id)
    {
        return $this->organization->compInfo($id);
    }

    public function assignBase(Request $request)
    {
        return $this->organization->assignbase($request);
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
        return $this->organization->newBase($request);
    }

    public function updateBase(Request $request)
    {
        return $this->organization->editBase($request);
    }

    public function destroyBase(Request $request)
    {
        return $this->organization->deleteBase($request);
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
        return $this->organization->newGate($request);
    }

    public function updateGate(Request $request)
    {
        return $this->organization->editGate($request);
    }

    public function destroyGate(Request $request)
    {
        return $this->organization->deleteGate($request);
    }

    public function storeZone(Request $request)
    {
        return $this->organization->newZone($request);
    }

    public function updateZone(Request $request)
    {
        return $this->organization->editZone($request);
    }

    public function destroyZone(Request $request)
    {
        return $this->organization->deleteZone($request);
    }
}
