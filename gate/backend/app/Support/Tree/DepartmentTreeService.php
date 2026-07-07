<?php

namespace App\Support\Tree;

use App\Models\Departments;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DepartmentTreeService
{
  /** @var array<int, Collection<int, Departments>>|null */
    private ?array $departmentChildrenIndex = null;

    /** @var array<int, array<int, array{id: int, name_ar: string, name_en: string}>>|null */
    private ?array $departmentBasesIndex = null;

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
            ->first(['id', 'parent_id', 'name_ar', 'name_en', 'is_company']);

        if (! $parentDepartment) {
            return [];
        }

        return [[
            'id' => $parentDepartment->id,
            'key' => $parentDepartment->id,
            'label' => $parentDepartment->name_ar,
            'name_ar' => $parentDepartment->name_ar,
            'name_en' => $parentDepartment->name_en,
            'parent_id' => (int) $parentDepartment->parent_id,
            'is_company' => (int) $parentDepartment->is_company,
            'type' => 'department',
            'icon' => 'pi pi-server',
            'children' => $this->buildTreeNodes($parentDepartment->id, true),
        ]];
    }

    public function getSingleDepartment(int $departmentId): array
    {
        $department = Departments::query()
            ->where('id', $departmentId)
            ->where('is_company', 0)
            ->first(['id', 'parent_id', 'name_ar', 'name_en', 'is_company']);

        if (! $department) {
            return [];
        }

        return [$this->buildDepartmentNode($department, [])];
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
            ->get(['id', 'name_ar', 'name_en']);

        return $companies->map(function (Departments $item) {
            return [
                'id' => $item->id,
                'key' => $item->id,
                'name_ar' => $item->name_ar,
                'name_en' => $item->name_en,
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

        $this->departmentChildrenIndex = $query
            ->get(['id', 'parent_id', 'name_ar', 'name_en', 'is_company', 'is_superadmin'])
            ->groupBy('parent_id')
            ->all();

        return $this->departmentChildrenIndex;
    }

    private function buildDepartmentNode(Departments $department, array $childNodes): array
    {
        $isCompany = (int) $department->is_company === 1;

        $node = [
            'id' => $department->id,
            'key' => $department->id,
            'label' => $department->name_ar,
            'name_ar' => $department->name_ar,
            'name_en' => $department->name_en,
            'parent_id' => (int) $department->parent_id,
            'is_company' => (int) $department->is_company,
            'type' => $isCompany ? 'company' : 'department',
            'icon' => $isCompany ? 'pi pi-building' : 'pi pi-server',
        ];

        if ($childNodes !== []) {
            $node['children'] = $childNodes;
        }

        $bases = $this->departmentBasesIndex()[(int) $department->id] ?? [];
        if ($bases !== []) {
            $node['bases'] = $bases;
        }

        return $node;
    }

    /**
     * @return array<int, array<int, array{id: int, name_ar: string, name_en: string}>>
     */
    private function departmentBasesIndex(): array
    {
        if ($this->departmentBasesIndex !== null) {
            return $this->departmentBasesIndex;
        }

        $rows = DB::table('department_bases')
            ->join('bases', 'bases.id', '=', 'department_bases.base_id')
            ->orderBy('bases.name_ar')
            ->get([
                'department_bases.dep_id',
                'bases.id',
                'bases.name_ar',
                'bases.name_en',
            ]);

        $index = [];

        foreach ($rows as $row) {
            $depId = (int) $row->dep_id;
            $index[$depId] ??= [];
            $index[$depId][] = [
                'id' => (int) $row->id,
                'name_ar' => (string) $row->name_ar,
                'name_en' => (string) $row->name_en,
            ];
        }

        $this->departmentBasesIndex = $index;

        return $this->departmentBasesIndex;
    }

    private function buildTreeNodes(int $parentId, bool $includeCompanies): array
    {
        $nodes = [];
        $children = $this->departmentChildrenIndex($includeCompanies)[$parentId] ?? collect();

        foreach ($children as $department) {
            if (! $includeCompanies && (int) $department->is_company === 1) {
                continue;
            }

            // Keep parent_id=0 roots visible; hoist superadmin only under nested levels.
            if ((int) $department->is_superadmin === 1 && $parentId !== 0) {
                $nodes = array_merge($nodes, $this->buildTreeNodes($department->id, $includeCompanies));

                continue;
            }

            $childNodes = $this->buildTreeNodes($department->id, $includeCompanies);

            $nodes[] = $this->buildDepartmentNode($department, $childNodes);
        }

        return $nodes;
    }
}
