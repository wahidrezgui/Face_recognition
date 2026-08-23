<?php

namespace Tests\Feature;

use App\Models\Logs;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ReportAuditLogTest extends TestCase
{
    use DatabaseTransactions;

    public function test_individual_report_logs_authenticated_user_id_not_spoofed_username(): void
    {
        $user = $this->actingAsPrivilegedUser(['reports.read']);

        $response = $this->getJson('/api/reports/individual?userName=Spoofed+Name');

        $response->assertOk();

        $log = Logs::where('task', 'like', 'Advanced Report%')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertSame($user->id, $log->created_by_id);
        $this->assertStringNotContainsString('Spoofed Name', $log->task);
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
                'username' => 'report-test-'.Str::uuid(),
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
