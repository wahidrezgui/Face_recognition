<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Movements\MovementCheckService;
use Illuminate\Http\Request;

class MovementController extends Controller
{
    public function __construct(private MovementCheckService $movements)
    {
    }

    public function check(Request $request)
    {
        return $this->movements->check($request);
    }

    public function checkManual(Request $request)
    {
        return $this->movements->checkManuel($request);
    }

    public function checkSubmit(Request $request)
    {
        return $this->movements->checkSubmit($request);
    }

    public function syncOffline(Request $request)
    {
        return $this->movements->syncOffline($request);
    }

    public function latestForEmployee(int $id)
    {
        return $this->movements->lastMovements($id);
    }

    public function companyCheckInOut(int $id)
    {
        return $this->movements->CompanyCheckin($id);
    }
}
