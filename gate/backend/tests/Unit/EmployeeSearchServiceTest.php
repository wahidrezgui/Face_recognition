<?php

namespace Tests\Unit;

use App\Services\EmployeeSearchService;
use Illuminate\Http\Request;
use Tests\TestCase;

class EmployeeSearchServiceTest extends TestCase
{
    public function test_short_query_returns_empty_results(): void
    {
        $service = new EmployeeSearchService();
        $request = Request::create('/api/employees/search', 'GET', [
            'query' => 'a',
            'scope' => 'company',
        ]);

        $result = $service->search($request);

        $this->assertSame([], $result['data']);
        $this->assertSame(0, $result['total']);
    }
}
