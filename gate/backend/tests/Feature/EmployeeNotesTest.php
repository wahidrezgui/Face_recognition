<?php

namespace Tests\Feature;

use App\Models\Employees;
use App\Models\EmployeeNotes;
use App\Models\Logs;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class EmployeeNotesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_add_note_stores_authenticated_user_id_and_ignores_spoofed_created_by(): void
    {
        $user = $this->actingAsPrivilegedUser(['employees.write']);
        $employee = $this->employeeFixture();
        $day = now()->format('Y-m-d');

        $response = $this->postJson('/api/employees/notes', [
            'emp_id' => $employee->id,
            'day' => $day,
            'notes' => 'test note',
            'created_by_id' => 999999,
            'created_by' => 'Spoofed Name',
        ]);

        $response->assertOk();

        $note = EmployeeNotes::where('emp_id', $employee->id)->where('mvdate', $day)->first();
        $this->assertNotNull($note);
        $this->assertSame($user->id, $note->created_by_id);
    }

    public function test_delete_note_logs_authenticated_user_id_and_ignores_spoofed_created_by(): void
    {
        $user = $this->actingAsPrivilegedUser(['employees.write']);
        $employee = $this->employeeFixture();
        $day = now()->format('Y-m-d');

        EmployeeNotes::create([
            'emp_id' => $employee->id,
            'mvdate' => $day,
            'notes' => 'to be deleted',
            'created_by_id' => $user->id,
        ]);

        $response = $this->deleteJson('/api/employees/notes', [
            'emp_id' => $employee->id,
            'day' => $day,
            'created_by' => 'Spoofed Name',
        ]);

        $response->assertOk();

        $log = Logs::where('emp_id', $employee->id)
            ->where('task', 'like', 'Deleted %')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($user->id, $log->created_by_id);
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
                'username' => 'notes-test-'.Str::uuid(),
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
