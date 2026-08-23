<?php

namespace App\Application\Personnel;

use App\Domain\Gate\Models\Base;
use App\Domain\Personnel\Models\Department;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DepartmentService
{
    public function create(array $data): Department
    {
        $department = Department::create([
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? '',
            'parent_id' => (int) ($data['parent_id'] ?? 0),
        ]);

        $this->seedDefaultBadge($department);

        $department->bases()->sync($data['selected_bases'] ?? []);

        return $department;
    }

    /**
     * Minimal starter front-badge template so a freshly created department isn't
     * blank in the Access Card tab before anyone visits the Badge Designer. Also
     * reused by CompanyService::create() — companies get the same lightweight
     * seed rather than a second hardcoded template, since the Badge Designer is
     * now the real tool for authoring a richer one.
     */
    public function seedDefaultBadge(Department $department): void
    {
        DB::table('badges')->insert([
            'width' => 90,
            'heigth' => 140,
            'content' => '<table style="border-collapse: collapse; width: 100%;" border="0">
            <tbody>
            <tr>
            <td style="text-align: left;">{{qrcode}}</td>
            <td style="text-align: right;">{{guest_photo_circle}}</td>
            </tr>
            <tr>
            <td style="text-align: center;" colspan="2">{{full_name}}</td>
            </tr>
            </tbody>
            </table>',
            'dep_id' => $department->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(Department $department, array $data): Department
    {
        $department->update([
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? '',
            'parent_id' => (int) ($data['parent_id'] ?? 0),
        ]);

        $department->bases()->sync($data['selected_bases'] ?? []);

        return $department;
    }

    public function delete(Department $department): void
    {
        $department->delete();
    }

    /**
     * @return Collection<int, Base>
     */
    public function basesPool(string $scope, int $actorDepId): Collection
    {
        if ($scope === 'global') {
            return Base::query()->orderBy('name_ar')->get(['id', 'name_ar', 'name_en']);
        }

        $linkedBaseIds = DB::table('department_bases')->where('dep_id', $actorDepId)->pluck('base_id');

        return Base::query()
            ->whereIn('id', $linkedBaseIds)
            ->orderBy('name_ar')
            ->get(['id', 'name_ar', 'name_en']);
    }
}
