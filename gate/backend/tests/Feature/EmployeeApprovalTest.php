<?php

namespace Tests\Feature;

use App\Models\BadgeLog;
use App\Models\Employees;
use App\Models\Logs;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EmployeeApprovalTest extends TestCase
{
    use DatabaseTransactions;

    public function test_approve_logs_authenticated_user_id_and_ignores_spoofed_by(): void
    {
        $user = $this->actingAsPrivilegedUser(['employees.write']);
        $employee = $this->employeeFixture();

        $response = $this->postJson('/api/employees/approve', [
            'guests' => [$employee->id],
            'status' => 2,
            'by' => 'Spoofed Name',
            'created_by_id' => 999999,
        ]);

        $response->assertOk()->assertJsonPath('success', true);

        $log = Logs::where('emp_id', $employee->id)->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertSame($user->id, $log->created_by_id);

        $badgeLog = BadgeLog::where('emp_id', $employee->id)->latest('id')->first();
        $this->assertNotNull($badgeLog);
        $this->assertSame($user->id, $badgeLog->created_by);
    }

    private function employeeFixture(): Employees
    {
        $employee = Employees::query()->first();
        if (! $employee) {
            $this->markTestSkipped('Test database needs an employee');
        }

        return $employee;
    }

    private function actingAsPrivilegedUser(array $permissions): User
    {
        $user = User::query()->first();
        if (! $user) {
            $depId = DB::table('departments')->value('id');
            if (! $depId) {
                $depId = DB::table('departments')->insertGetId([
                    'name_en' => 'Test Dept',
                    'name_ar' => 'قسم تجريبي',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $userId = DB::table('users')->insertGetId([
                'dep_id' => $depId,
                'firstname' => 'Test',
                'lastname' => 'User',
                'username' => 'approval-test-'.Str::uuid(),
                'password' => bcrypt('password'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $user = User::findOrFail($userId);
        }

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->givePermissionTo($permissions);

        Sanctum::actingAs($user);

        return $user;
    }
}
