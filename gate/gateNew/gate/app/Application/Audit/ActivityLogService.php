<?php

namespace App\Application\Audit;

use App\Domain\Audit\Models\AppLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class ActivityLogService
{
    public function search(array $filters, int $perPage = 25): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? $perPage);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 25;

        $query = AppLog::query()->with(['createdBy', 'employee']);
        $this->applyFilters($query, $filters);

        /** @var LengthAwarePaginator $paginator */
        $paginator = $query->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $filters['page'] ?? 1);

        return $paginator;
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['created_by_id'])) {
            $query->where('created_by_id', (int) $filters['created_by_id']);
        }

        if (! empty($filters['task'])) {
            $query->where('task', 'like', '%'.$filters['task'].'%');
        }

        if (! empty($filters['ip_address'])) {
            $query->where('ip_address', 'like', '%'.$filters['ip_address'].'%');
        }

        if (! empty($filters['employee_search'])) {
            $needle = $filters['employee_search'];
            $query->whereHas('employee', function (Builder $q) use ($needle) {
                $q->where('fullname_ar', 'like', "%{$needle}%")
                    ->orWhere('fullname_en', 'like', "%{$needle}%")
                    ->orWhere('military_number', 'like', "%{$needle}%");
            });
        }

        if (! empty($filters['from_date']) && ! empty($filters['to_date'])) {
            $query->whereBetween('created_at', [
                $filters['from_date'].' 00:00:00',
                $filters['to_date'].' 23:59:59',
            ]);
        }
    }
}
