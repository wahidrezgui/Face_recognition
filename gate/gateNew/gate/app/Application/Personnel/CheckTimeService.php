<?php

namespace App\Application\Personnel;

use App\Domain\Personnel\Models\CheckTime;
use Illuminate\Support\Collection;

class CheckTimeService
{
    /**
     * @return Collection<int, CheckTime>
     */
    public function listForDepartment(int $depId): Collection
    {
        return CheckTime::with(['gender', 'rankCategory'])
            ->where('dep_id', $depId)
            ->orderBy('gender_id')
            ->orderBy('rank_id')
            ->get();
    }

    public function create(array $data): CheckTime
    {
        return CheckTime::create($data);
    }

    public function update(CheckTime $checkTime, array $data): CheckTime
    {
        $checkTime->update($data);

        return $checkTime;
    }

    public function delete(CheckTime $checkTime): void
    {
        $checkTime->delete();
    }
}
