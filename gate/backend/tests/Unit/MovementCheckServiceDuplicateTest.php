<?php

namespace Tests\Unit;

use App\Services\Movements\MovementCheckService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class MovementCheckServiceDuplicateTest extends TestCase
{
    public function test_check_submit_validates_required_client_request_id(): void
    {
        $service = new MovementCheckService();
        $request = Request::create('/api/movements/check/submit', 'POST', [
            'emp_id' => 1,
            'mvtype' => 'Check-In',
            'base_id' => 1,
            'gate_id' => 1,
        ]);

        try {
            $service->checkSubmit($request);
            $this->fail('Expected validation exception');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('client_request_id', $e->errors());
        }
    }

    public function test_duplicate_key_exception_detection_matches_mysql_error_code(): void
    {
        $service = new MovementCheckService();
        $method = new \ReflectionMethod($service, 'isDuplicateKeyException');
        $method->setAccessible(true);

        $duplicate = new QueryException(
            'mysql',
            'insert into movements ...',
            [],
            new \Exception('Duplicate entry', 1062)
        );
        $duplicate->errorInfo = ['23000', 1062, 'Duplicate entry'];

        $this->assertTrue($method->invoke($service, $duplicate));
    }
}
