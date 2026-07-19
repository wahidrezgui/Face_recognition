<?php

namespace Tests\Feature;

use App\Models\Bases;
use App\Models\Employees;
use App\Models\Gates;
use App\Models\Movements;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MovementCheckTest extends TestCase
{
    use DatabaseTransactions;

    public function test_check_endpoint_requires_authentication(): void
    {
        $response = $this->postJson('/api/movements/check', [
            'qrcode' => 'nonexistent-qrcode-xyz',
            'base_id' => 1,
        ]);

        $response->assertUnauthorized();
    }

    public function test_ping_health_check_is_public(): void
    {
        $response = $this->getJson('/api/ping');

        $response->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_check_submit_requires_client_request_id(): void
    {
        $this->actingAsGateUser();

        $response = $this->postJson('/api/movements/check/submit', [
            'emp_id' => 1,
            'mvtype' => 'Check-In',
            'base_id' => 1,
            'gate_id' => 1,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['client_request_id']);
    }

    public function test_check_submit_returns_duplicate_for_same_client_request_id(): void
    {
        $this->actingAsGateUser();
        ['employee' => $employee, 'base' => $base, 'gate' => $gate] = $this->movementFixtures();
        $datetime = $this->uniqueMovementDatetime();
        $clientRequestId = (string) Str::uuid();

        $payload = [
            'client_request_id' => $clientRequestId,
            'emp_id' => $employee->id,
            'mvtype' => 'Check-In',
            'base_id' => $base->id,
            'gate_id' => $gate->id,
            'mvdate' => $datetime['mvdate'],
            'mvtime' => $datetime['mvtime'],
        ];

        $first = $this->postJson('/api/movements/check/submit', $payload);
        $first->assertOk()->assertJsonPath('success', true);

        $second = $this->postJson('/api/movements/check/submit', $payload);
        $second->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('duplicate', true);

        $this->assertSame(
            1,
            Movements::where('client_request_id', $clientRequestId)->count()
        );
    }

    public function test_check_submit_returns_duplicate_for_same_business_key_with_different_client_request_ids(): void
    {
        $this->actingAsGateUser();
        ['employee' => $employee, 'base' => $base, 'gate' => $gate] = $this->movementFixtures();
        $datetime = $this->uniqueMovementDatetime();

        $shared = [
            'emp_id' => $employee->id,
            'mvtype' => 'Check-Out',
            'base_id' => $base->id,
            'gate_id' => $gate->id,
            'mvdate' => $datetime['mvdate'],
            'mvtime' => $datetime['mvtime'],
        ];

        $first = $this->postJson('/api/movements/check/submit', array_merge($shared, [
            'client_request_id' => (string) Str::uuid(),
        ]));
        $first->assertOk()->assertJsonPath('success', true);

        $second = $this->postJson('/api/movements/check/submit', array_merge($shared, [
            'client_request_id' => (string) Str::uuid(),
        ]));
        $second->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('duplicate', true);

        $this->assertSame(
            1,
            Movements::query()
                ->where('emp_id', $employee->id)
                ->where('mvtype', 'Check-Out')
                ->where('mvdate', $datetime['mvdate'])
                ->where('mvtime', $datetime['mvtime'])
                ->count()
        );
    }

    public function test_sync_offline_batch_creates_movements(): void
    {
        $this->actingAsGateUser();
        ['employee' => $employee, 'base' => $base, 'gate' => $gate] = $this->movementFixtures();
        $datetime = $this->uniqueMovementDatetime();
        $clientRequestId = (string) Str::uuid();

        $response = $this->postJson('/api/movements/sync', [
            'items' => [[
                'client_request_id' => $clientRequestId,
                'emp_id' => $employee->id,
                'mvtype' => 'Check-In',
                'base_id' => $base->id,
                'gate_id' => $gate->id,
                'mvdate' => $datetime['mvdate'],
                'mvtime' => $datetime['mvtime'],
                'mode' => 'auto',
                'queued_at' => now()->toIso8601String(),
            ]],
        ]);

        $response->assertOk()
            ->assertJsonPath('results.0.client_request_id', $clientRequestId)
            ->assertJsonPath('results.0.status', 'synced');

        $this->assertSame(
            1,
            Movements::where('client_request_id', $clientRequestId)->count()
        );
    }

    public function test_check_manual_returns_duplicate_for_same_client_request_id(): void
    {
        $this->actingAsGateUser();
        ['employee' => $employee, 'base' => $base, 'gate' => $gate] = $this->movementFixtures();
        $datetime = $this->uniqueMovementDatetime();
        $clientRequestId = (string) Str::uuid();

        $payload = [
            'client_request_id' => $clientRequestId,
            'empl_id' => $employee->id,
            'mvtype' => 'Check-In',
            'base_id' => $base->id,
            'gate_id' => $gate->id,
            'mvdate' => $datetime['mvdate'],
            'mvtime' => $datetime['mvtime'],
        ];

        $first = $this->postJson('/api/movements/check/manual', $payload);
        $first->assertOk()->assertJsonPath('success', true);

        $second = $this->postJson('/api/movements/check/manual', $payload);
        $second->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('duplicate', true);
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
                'email' => 'movement-test-'.Str::uuid().'@test.local',
                'password' => bcrypt('password'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $user = User::findOrFail($userId);
        }

        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * @return array{employee: Employees, base: Bases, gate: Gates}
     */
    private function movementFixtures(): array
    {
        $employee = Employees::query()->first();
        $base = Bases::query()->first();
        $gate = Gates::query()->when($base, fn ($q) => $q->where('base_id', $base->id))->first()
            ?? Gates::query()->first();

        if (! $employee || ! $base || ! $gate) {
            $this->markTestSkipped('Test database needs employee, base, and gate records');
        }

        return [
            'employee' => $employee,
            'base' => $base,
            'gate' => $gate,
        ];
    }

    /**
     * @return array{mvdate: string, mvtime: string}
     */
    private function uniqueMovementDatetime(): array
    {
        $now = now()->subSeconds(random_int(1, 86400));

        return [
            'mvdate' => $now->format('Y-m-d'),
            'mvtime' => $now->format('H:i:s'),
        ];
    }
}
