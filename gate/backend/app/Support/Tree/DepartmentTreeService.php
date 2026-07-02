<?php

namespace App\Support\Tree;

use App\Models\Departments;
use Illuminate\Support\Collection;

class DepartmentTreeService
{
  /** @var array<int, Collection<int, Departments>>|null */
    private ?array $departmentChildrenIndex = null;

    public function getAllChildrenDepartmentIds(int $departmentId): array
    {
        $ids = [];
        $queue = [$departmentId];

        while ($queue !== []) {
            $current = array_shift($queue);
            $index = $this->departmentChildrenIndex(false);

            foreach ($index[$current] ?? [] as $child) {
                if ((int) $child->is_superadmin === 1) {
                    $queue[] = $child->id;

                    continue;
                }

                $ids[] = $child->id;
                $queue[] = $child->id;
            }
        }

        return $ids;
    }

    public function getDepartmentAndAllChildrenDepartmentIds(int $departmentId): array
    {
        return array_merge([$departmentId], $this->getAllChildrenDepartmentIds($departmentId));
    }

    public function getNestedTree(): array
    {
        return $this->buildTreeNodes(0, false);
    }

    public function getParentAndNestedDepartments(int $parentId): array
    {
        $parentDepartment = Departments::query()
            ->where('id', $parentId)
            ->where('is_company', 0)
            ->first(['id', 'name_ar']);

        if (! $parentDepartment) {
            return [];
        }

        return [[
            'key' => $parentDepartment->id,
            'label' => $parentDepartment->name_ar,
            'icon' => 'pi pi-server',
            'children' => $this->buildTreeNodes($parentDepartment->id, false),
        ]];
    }

    public function getNestedDepartments(int $parentId): array
    {
        return $this->buildTreeNodes($parentId, false);
    }

    public function getNestedCompanies(int $parentId): array
    {
        $companies = Departments::query()
            ->where('parent_id', $parentId)
            ->where('is_company', 1)
            ->get(['id', 'name_ar']);

        return $companies->map(function (Departments $item) {
            return [
                'key' => $item->id,
                'label' => $item->name_ar,
                'icon' => 'pi pi-building',
                'children' => $this->buildTreeNodes($item->id, false),
            ];
        })->values()->all();
    }

    /**
     * @return array<int, Collection<int, Departments>>
     */
    private function departmentChildrenIndex(bool $includeCompanies): array
    {
        if ($this->departmentChildrenIndex !== null) {
            return $this->departmentChildrenIndex;
        }

        $query = Departments::query();

        if (! $includeCompanies) {
            $query->where('is_company', 0);
        }

        $this->departmentChildrenIndex = $query
            ->get(['id', 'parent_id', 'name_ar', 'is_company', 'is_superadmin'])
            ->groupBy('parent_id')
            ->all();

        return $this->departmentChildrenIndex;
    }

    private function buildTreeNodes(int $parentId, bool $includeCompanies): array
    {
        $nodes = [];
        $children = $this->departmentChildrenIndex($includeCompanies)[$parentId] ?? collect();

        foreach ($children as $department) {
            if (! $includeCompanies && (int) $department->is_company === 1) {
                continue;
            }

            if ((int) $department->is_superadmin === 1) {
                $nodes = array_merge($nodes, $this->buildTreeNodes($department->id, $includeCompanies));

                continue;
            }

            $childNodes = $this->buildTreeNodes($department->id, $includeCompanies);

            $node = [
                'key' => $department->id,
                'label' => $department->name_ar,
                'icon' => 'pi pi-server',
            ];

            if ($childNodes !== []) {
                $node['children'] = $childNodes;
            }

            $nodes[] = $node;
        }

        return $nodes;
    }
}
