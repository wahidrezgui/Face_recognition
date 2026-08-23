<?php

namespace App\Application\Gate;

use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Gate\Models\Base;
use App\Domain\Gate\Models\Gate;
use App\Domain\Gate\Models\Zone;
use App\Domain\Personnel\Models\Department;
use App\Domain\Personnel\Models\Employee;
use Illuminate\Support\Facades\DB;

/**
 * Global-scope dashboard stats — ported from the legacy StatsService::allStats().
 * Department-scoped variants (StatsService::stats()) aren't ported yet; this
 * always computes institution-wide numbers regardless of the caller's scope.
 */
class DashboardStatsService
{
    public function __construct(private readonly DataScopeResolver $scopeResolver) {}

    /**
     * @return array<string, mixed>
     */
    public function globalStats(): array
    {
        $employees = Employee::where('active', 1)->count();
        $departments = Department::count();
        $gates = Gate::count();
        $bases = Base::count();
        $zones = Zone::count();

        $pending = Employee::where('active', 1)->where('status', 0)->count();
        $printed = Employee::where('active', 1)->where('status', 2)->count();
        $collected = Employee::where('active', 1)->where('status', 3)->count();

        return [
            'departments' => $departments,
            'bases' => $bases,
            'gates' => $gates,
            'zones' => $zones,
            'employees' => $employees,
            'pending' => $pending,
            'printed' => $printed,
            'collected' => $collected,
            'checkInsToday' => $this->countCheckInsToday(),
            'checkOutsToday' => $this->countCheckOutsToday(),
            'scope' => 'global',
            'scopeLabel' => $this->scopeResolver->scopeLabel('global'),
        ];
    }

    private function countCheckInsToday(): int
    {
        return (int) DB::table('movements')
            ->join('employees', 'employees.id', '=', 'movements.emp_id')
            ->where('employees.active', 1)
            ->whereDate('movements.mvdate', now()->toDateString())
            ->where('movements.mvtype', 'Check-In')
            ->distinct('movements.emp_id')
            ->count('movements.emp_id');
    }

    private function countCheckOutsToday(): int
    {
        return (int) DB::table('movements')
            ->join('employees', 'employees.id', '=', 'movements.emp_id')
            ->where('employees.active', 1)
            ->whereDate('movements.mvdate', now()->toDateString())
            ->where('movements.mvtype', 'Check-Out')
            ->distinct('movements.emp_id')
            ->count('movements.emp_id');
    }
}
