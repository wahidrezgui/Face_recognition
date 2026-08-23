<?php

namespace App\Application\Personnel;

use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Identity\Models\User;
use App\Domain\Personnel\Models\CompanyTime;
use App\Domain\Personnel\Models\Department;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class CompanyService
{
    public function __construct(
        private readonly DepartmentService $departmentService,
        private readonly DataScopeResolver $dataScope,
    ) {}

    public function list(User $actor, array $filters, int $perPage = 25): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? $perPage);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 25;

        $query = Department::query()->where('is_company', 1)->with('bases');
        $this->applyScope($query, $actor);

        if (! empty($filters['search'])) {
            $needle = $filters['search'];
            $query->where(fn (Builder $q) => $q->where('name_en', 'like', "%{$needle}%")->orWhere('name_ar', 'like', "%{$needle}%"));
        }

        $query->orderBy('name_en');

        /** @var LengthAwarePaginator $paginator */
        $paginator = $query->paginate($perPage, ['*'], 'page', $filters['page'] ?? 1);

        $times = CompanyTime::whereIn('dep_id', $paginator->pluck('id'))->get()->keyBy('dep_id');
        $paginator->getCollection()->transform(function (Department $company) use ($times) {
            $company->setAttribute('start_time', $times[$company->id]->start_time ?? null);
            $company->setAttribute('end_time', $times[$company->id]->end_time ?? null);

            return $company;
        });

        return $paginator;
    }

    private function applyScope(Builder $query, User $actor): void
    {
        if ($this->dataScope->resolveForUser($actor, 'departments') === 'global') {
            return;
        }

        $query->whereIn('id', $this->dataScope->resolveDepartmentIds($actor, 'departments'));
    }

    public function create(array $data, User $actor): Department
    {
        $department = Department::create([
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? '',
            'parent_id' => (int) ($data['parent_id'] ?? 0),
            'is_company' => 1,
        ]);

        $this->departmentService->seedDefaultBadge($department);
        $department->bases()->sync($data['selected_bases'] ?? []);
        $this->syncCompanyTime($department, $data);

        return $department;
    }

    public function update(Department $company, array $data): Department
    {
        $company->update([
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? '',
            'parent_id' => (int) ($data['parent_id'] ?? 0),
        ]);

        $company->bases()->sync($data['selected_bases'] ?? []);
        $this->syncCompanyTime($company, $data);

        return $company;
    }

    public function delete(Department $company): void
    {
        CompanyTime::where('dep_id', $company->id)->delete();
        $company->delete();
    }

    private function syncCompanyTime(Department $company, array $data): void
    {
        $startTime = $data['start_time'] ?? null;
        $endTime = $data['end_time'] ?? null;

        if (blank($startTime) && blank($endTime)) {
            CompanyTime::where('dep_id', $company->id)->delete();

            return;
        }

        CompanyTime::updateOrCreate(
            ['dep_id' => $company->id],
            ['start_time' => $startTime, 'end_time' => $endTime],
        );
    }
}
