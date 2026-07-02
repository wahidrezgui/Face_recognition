<?php

namespace App\Services;

use App\Models\Employees;
use Illuminate\Http\Request;

class EmployeeSearchService
{
    public function search(Request $request): array
    {
        $query = trim((string) $request->input('q', $request->input('query')));
        $perPage = (int) $request->input('per_page', 50);
        $page = (int) $request->input('page', 1);
        $scope = $request->input('scope', 'all');

        if ($query === '' || strlen($query) < 2) {
            return [
                'data' => [],
                'total' => 0,
                'current_page' => 1,
                'per_page' => $perPage,
                'last_page' => 0,
            ];
        }

        $builder = Employees::query()->where('active', 1);

        if ($scope === 'military') {
            $builder->where(function ($q) use ($query) {
                $q->where('military_number', 'LIKE', "%{$query}%")
                    ->orWhere('fullname_ar', 'LIKE', "%{$query}%")
                    ->orWhere('fullname_en', 'LIKE', "%{$query}%");
            })
                ->orderBy('military_number')
                ->orderBy('fullname_ar');
        } else {
            $builder->where(function ($q) use ($query) {
                $q->where('fullname_en', 'LIKE', "%{$query}%")
                    ->orWhere('fullname_ar', 'LIKE', "%{$query}%")
                    ->orWhere('qid', 'LIKE', "%{$query}%")
                    ->orWhere('military_number', 'LIKE', "%{$query}%")
                    ->orWhere('Job_En', 'LIKE', "%{$query}%")
                    ->orWhere('Job_Arabic', 'LIKE', "%{$query}%")
                    ->orWhere('phone_number', 'LIKE', "%{$query}%")
                    ->orWhere('id', 'LIKE', "%{$query}%");
            })
                ->orderBy('fullname_en');
        }

        $searchResults = $builder
            ->with([
                'department' => fn ($q) => $q->select('id', 'name_en', 'name_ar'),
                'ranks' => fn ($q) => $q->select('id', 'name_en', 'name_ar'),
            ])
            ->paginate($perPage, ['*'], 'page', $page);

        $transformedResults = $searchResults->map(fn ($employee) => [
            'id' => $employee->id,
            'fullname_en' => $employee->fullname_en,
            'fullname_ar' => $employee->fullname_ar,
            'qid' => $employee->qid,
            'military_number' => $employee->military_number,
            'Job_En' => $employee->Job_En,
            'Job_Arabic' => $employee->Job_Arabic,
            'photo' => $employee->photo,
            'status' => $employee->status,
            'dep_id' => $employee->dep_id,
            'department' => $employee->department?->name_ar,
            'department_en' => $employee->department?->name_en,
            'company_name' => $employee->department?->name_en ?? 'N/A',
            'rank_name_ar' => $employee->ranks?->name_ar,
            'rank_name_en' => $employee->ranks?->name_en,
            'expiry_date' => $employee->expiry_date,
            'remarks' => $employee->remarks,
        ]);

        return [
            'data' => $transformedResults,
            'total' => $searchResults->total(),
            'current_page' => $searchResults->currentPage(),
            'per_page' => $searchResults->perPage(),
            'last_page' => $searchResults->lastPage(),
        ];
    }
}
