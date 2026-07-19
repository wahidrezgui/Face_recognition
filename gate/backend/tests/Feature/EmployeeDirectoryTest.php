<?php

namespace Tests\Feature;

use App\Models\Employees;
use App\Models\Movements;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeDirectoryTest extends TestCase
{
    use DatabaseTransactions;

    public function test_gate_directory_requires_authentication(): void
    {
        $this->getJson('/api/employees/gate-directory')
            ->assertUnauthorized();
    }

    public function test_gate_directory_includes_offline_fields(): void
    {
        $user = $this->actingAsGateUser();
        unset($user);

        $employee = Employees::query()->first();
        if (! $employee) {
            $this->markTestSkipped('Test database needs an employee');
        }

        Movements::query()->create([
            'emp_id' => $employee->id,
            'base_id' => DB::table('bases')->value('id') ?? 1,
            'gate_id' => DB::table('gates')->value('id') ?? 1,
            'mvtype' => 'Check-In',
            'mvdate' => now()->toDateString(),
            'mvtime' => now()->format('H:i:s'),
            'client_request_id' => (string) Str::uuid(),
        ]);

        $response = $this->getJson('/api/employees/gate-directory');

        $response->assertOk()
            ->assertJsonStructure([
                'version',
                'count',
                'employees' => [
                    '*' => [
                        'id',
                        'military_number',
                        'qrcode',
                        'fullname_ar',
                        'fullname_en',
                        'photo',
                        'department',
                        'rank_name_ar',
                        'expiry_date',
                        'remarks',
                        'last_movement_type',
                        'is_expired',
                        'alerts',
                    ],
                ],
            ]);

        $match = collect($response->json('employees'))
            ->firstWhere('id', $employee->id);

        $this->assertNotNull($match);
        $this->assertArrayHasKey('qrcode', $match);
        $this->assertArrayHasKey('alerts', $match);
        $this->assertIsArray($match['alerts']);
    }

    private function actingAsGateUser(): User
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
                'email' => 'directory-test-'.Str::uuid().'@test.local',
                'password' => bcrypt('password'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $user = User::findOrFail($userId);
        }

        Sanctum::actingAs($user);

        return $user;
    }
}
