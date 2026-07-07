<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EmployeeDirectoryService;
use App\Services\EmployeeSearchService;
use App\Services\Employees\CheckTimeService;
use App\Services\Employees\EmployeeService;
use App\Services\Movements\MovementCheckService;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(
        private EmployeeService $employees,
        private CheckTimeService $checkTimes,
        private MovementCheckService $movements,
        private EmployeeSearchService $employeeSearchService,
        private EmployeeDirectoryService $employeeDirectoryService,
    ) {
    }

    public function index(Request $request)
    {
        return $this->employees->getemployees($request);
    }

    public function byDepartment()
    {
        return $this->employees->getEmployeesByDep();
    }

    public function latest()
    {
        return $this->employees->getlatestemployees();
    }

    public function search(Request $request)
    {
        return response()->json($this->employeeSearchService->search($request));
    }

    public function gateDirectory()
    {
        return response()->json($this->employeeDirectoryService->gateDirectory());
    }

    public function gatePreview(int $id, Request $request)
    {
        return $this->movements->gatePreview($id, $request);
    }

    public function show(int $id, Request $request)
    {
        if ($request->filled('day')) {
            return $this->employees->guestInfo($id);
        }

        return $this->employees->employeeInfo($id);
    }

    public function guest(int $id)
    {
        return $this->employees->guestInfo($id);
    }

    public function store(Request $request)
    {
        return $this->employees->addemployee($request);
    }

    public function update(Request $request)
    {
        return $this->employees->editemployee($request);
    }

    public function destroy(Request $request)
    {
        return $this->employees->delemployee($request);
    }

    public function approve(Request $request)
    {
        return $this->employees->approvalemployee($request);
    }

    public function import(Request $request)
    {
        return $this->employees->importData($request);
    }

    public function searchMilitary(Request $request)
    {
        return $this->employees->searchByMilitaryNumber($request);
    }

    public function addNote(Request $request)
    {
        return $this->employees->addNote($request);
    }

    public function deleteNote(Request $request)
    {
        return $this->employees->deleteNote($request);
    }

    public function storeCar(Request $request)
    {
        return $this->employees->addCar($request);
    }

    public function updateCar(Request $request)
    {
        return $this->employees->updateCar($request);
    }

    public function destroyCar(Request $request)
    {
        return $this->employees->delCar($request);
    }

    public function searchPlate(Request $request)
    {
        return $this->movements->searchByPlate($request);
    }

    public function badgeInfo(int $id)
    {
        return $this->employees->badgeInfo($id);
    }

    public function updateBadge(Request $request)
    {
        return $this->employees->editBadge($request);
    }

    public function guestBadge(int $id)
    {
        return $this->employees->guestbadge($id);
    }

    public function badge2Info(int $id)
    {
        return $this->employees->badge2Info($id);
    }

    public function updateBadge2(Request $request)
    {
        return $this->employees->editBadge2($request);
    }

    public function guestBadge2(int $id)
    {
        return $this->employees->guestbadge2($id);
    }

    public function checkTimes(int $id, Request $request)
    {
        return $this->checkTimes->getTimes($id, $request);
    }

    public function storeCheckTime(Request $request)
    {
        return $this->checkTimes->addTime($request);
    }

    public function updateCheckTime(Request $request)
    {
        return $this->checkTimes->editTime($request);
    }

    public function destroyCheckTime(Request $request)
    {
        return $this->checkTimes->deleteTime($request);
    }
}
