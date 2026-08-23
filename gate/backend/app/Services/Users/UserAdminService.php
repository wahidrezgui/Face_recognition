<?php

namespace App\Services\Users;

use App\Models\Bases;
use App\Models\Departments;
use App\Models\User;
use App\Support\Access\AccessCatalog;
use App\Support\Access\DataScopeResolver;
use App\Support\Tree\DepartmentTreeService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class UserAdminService
{
    public function __construct(
        private DepartmentTreeService $departmentTree,
        private DataScopeResolver $dataScope,
    ) {
    }

    public function users()
    {
        $actor = auth()->user();
        $scope = $this->dataScope->resolveForUser($actor, 'users');

        $query = User::query()
            ->select([
                'id',
                'firstname',
                'lastname',
                'username',
                'dep_id',
                'default_base',
                'created_at',
                'keycloak_sub',
                'keycloak_pending_sub',
            ])
            ->with('roles');

        if ($scope === 'global') {
            if (isset($_GET['depId'])) {
                $depId = (int) $_GET['depId'];
                $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($depId);
                $query->where(function ($builder) use ($departmentIds) {
                    $builder->whereIn('dep_id', $departmentIds)
                        ->orWhere(function ($pending) {
                            $pending->whereNull('keycloak_sub')
                                ->whereNotNull('keycloak_pending_sub');
                        });
                });
                $emptyBase = '';
            } else {
                $query->latest('id');
                $emptyBase = '-';
            }
        } else {
            $allowedIds = $this->dataScope->resolveDepartmentIds($actor, 'users');
            if ($allowedIds === []) {
                return response()->json([]);
            }

            $filterIds = $allowedIds;
            if (isset($_GET['depId'])) {
                $requested = (int) $_GET['depId'];
                $requestedIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds($requested);
                $filterIds = array_values(array_intersect($allowedIds, $requestedIds));
            }

            $query->where(function ($builder) use ($filterIds) {
                $builder->whereIn('dep_id', $filterIds)
                    ->orWhere(function ($pending) {
                        $pending->whereNull('keycloak_sub')
                            ->whereNotNull('keycloak_pending_sub');
                    });
            });
            $emptyBase = '';
        }

        return response()->json($this->mapUsersForList($query->get(), $emptyBase));
    }

    public function assignableRoles(): JsonResponse
    {
        $actor = auth()->user();
        $names = AccessCatalog::assignableRoleNamesForActor($actor);

        $roles = Role::query()
            ->where('guard_name', AccessCatalog::GUARD)
            ->whereIn('name', $names)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'requires_department' => AccessCatalog::roleRequiresDepartment($role->name),
            ])
            ->values()
            ->all();

        return response()->json(['roles' => $roles]);
    }

    private function mapUsersForList(Collection $users, string $emptyBase): array
    {
        $baseIds = $users->pluck('default_base')->filter(fn ($id) => (int) $id > 0)->unique();
        $depIds = $users->pluck('dep_id')->filter(fn ($id) => (int) $id > 0)->unique();

        $bases = Bases::whereIn('id', $baseIds)->pluck('name_en', 'id');
        $departments = Departments::whereIn('id', $depIds)->get()->keyBy('id');

        return $users->map(function (User $user) use ($bases, $departments, $emptyBase) {
            $baseId = (int) $user->default_base;
            $department = $departments->get($user->dep_id);

            return [
                'id' => $user->id,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'username' => $user->username,
                'dep_id' => $user->dep_id,
                'default_base' => $baseId > 0 ? $baseId : null,
                'base' => $baseId > 0 ? ($bases[$baseId] ?? $emptyBase) : $emptyBase,
                'department' => $department
                    ? ($department->name_ar ?: $department->name_en)
                    : '',
                'created' => $user->created_at?->format('d F, Y') ?? '',
                'role' => $user->roles->first()?->name ?? '',
                'sso_linked' => filled($user->keycloak_sub),
                'sso_pending' => filled($user->keycloak_pending_sub) && ! filled($user->keycloak_sub),
            ];
        })->values()->all();
    }

    public function userInfo($id)
    {
        $user = User::with('roles')->find($id);

        if (! $user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $this->assertUserInScope($user);

        return response()->json([
            'id' => $user->id,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'username' => $user->username,
            'dep_id' => $user->dep_id,
            'default_base' => ((int) $user->default_base) > 0 ? (int) $user->default_base : null,
            'base' => ((int) $user->default_base) > 0
                ? (Bases::where('id', (int) $user->default_base)->value('name_en') ?? '-')
                : '-',
            'roles' => $user->roles,
            'role' => $user->roles->first()?->name ?? '',
            'sso_linked' => filled($user->keycloak_sub),
            'sso_pending' => filled($user->keycloak_pending_sub) && ! filled($user->keycloak_sub),
        ]);
    }

    public function newUser(Request $request)
    {
        $input = $request->all();
        $input['password'] = Hash::make($request->passwd);
        $input['default_base'] = $this->normalizeDefaultBase($request->input('default_base'));
        if ($request->has('dep_id')) {
            $input['dep_id'] = $request->dep_id;
        } else {
            $input['dep_id'] = $request->depid;
        }

        if (isset($input['dep_id'])) {
            $this->dataScope->assertDepartmentInScope(auth()->user(), 'users', (int) $input['dep_id']);
        }

        $user = User::create($input);

        if (! $request->filled('role')) {
            throw ValidationException::withMessages([
                'role' => ['اختر الدور'],
            ]);
        }

        $this->assertRoleAssignable($request->role);
        $user->assignRole($request->role);

        return response()->json(['status' => 'success']);
    }

    public function editUser(Request $request): JsonResponse
    {
        $item = User::with('roles')->find($request->id);

        if (! $item) {
            return response()->json(['message' => 'المستخدم غير موجود'], 404);
        }

        $this->assertUserInScope($item);

        $activateSso = $request->boolean('activate_sso');

        if ($activateSso) {
            $this->assertCanActivateSso($request, $item);
        }

        $updates = [
            'firstname' => $request->input('firstname', $item->firstname),
            'lastname' => $request->input('lastname', $item->lastname),
            'username' => $request->input('username', $item->username),
            'default_base' => $request->has('default_base')
                ? $this->normalizeDefaultBase($request->input('default_base'))
                : (int) ($item->default_base ?? 0),
        ];

        if ($request->has('dep_id')) {
            $depId = (int) $request->input('dep_id');
            $this->dataScope->assertDepartmentInScope(auth()->user(), 'users', $depId);
            $updates['dep_id'] = $depId;
        }

        if ($request->filled('passwd')) {
            $updates['password'] = Hash::make($request->passwd);
        }

        if ($activateSso) {
            $sub = $item->keycloak_pending_sub;

            if (User::query()->where('keycloak_sub', $sub)->where('id', '!=', $item->id)->exists()) {
                return response()->json([
                    'message' => 'حساب مرسال هذا مرتبط بمستخدم آخر في النظام',
                ], 422);
            }

            $updates['keycloak_sub'] = $sub;
            $updates['keycloak_pending_sub'] = null;
        }

        DB::transaction(function () use ($item, $updates, $request) {
            $item->update($updates);

            if ($request->filled('role')) {
                $this->assertRoleAssignable($request->role);
                $currentRole = $item->roles->first();
                if ($currentRole) {
                    $item->removeRole($currentRole);
                }
                $item->assignRole($request->role);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => $activateSso ? 'تم تفعيل حساب مرسال بنجاح' : 'تم تحديث المستخدم',
            'sso_linked' => $activateSso || filled($item->fresh()->keycloak_sub),
            'sso_pending' => ! $activateSso && filled($item->fresh()->keycloak_pending_sub),
        ]);
    }

    /** Store 0 when no base is selected — the column is NOT NULL in MySQL. */
    private function normalizeDefaultBase(mixed $value): int
    {
        if ($value === null || $value === '' || $value === false) {
            return 0;
        }

        $parsed = (int) $value;

        return $parsed > 0 ? $parsed : 0;
    }

    private function assertCanActivateSso(Request $request, User $user): void
    {
        if (! filled($user->keycloak_pending_sub)) {
            throw ValidationException::withMessages([
                'activate_sso' => ['لا يوجد طلب مرسال معلق لهذا المستخدم'],
            ]);
        }

        if (filled($user->keycloak_sub)) {
            throw ValidationException::withMessages([
                'activate_sso' => ['حساب مرسال مفعّل مسبقاً'],
            ]);
        }

        if (! $request->filled('role')) {
            throw ValidationException::withMessages([
                'role' => ['اختر الدور لتفعيل حساب مرسال'],
            ]);
        }

        if (! $request->filled('dep_id')) {
            throw ValidationException::withMessages([
                'dep_id' => ['اختر القسم لتفعيل حساب مرسال'],
            ]);
        }
    }

    public function deleteUser(Request $request)
    {
        $actor = auth()->user();
        if ($this->dataScope->resolveForUser($actor, 'users') !== 'global') {
            throw new AuthorizationException('Only global user scope may delete users.');
        }

        $target = User::find($request->id);
        if ($target) {
            $this->assertUserInScope($target);
            $target->delete();
        }

        return response()->json(['status' => 'success']);
    }

    private function assertUserInScope(User $target): void
    {
        $actor = auth()->user();
        if (! $actor) {
            return;
        }

        if ($this->dataScope->resolveForUser($actor, 'users') === 'global') {
            return;
        }

        if ((int) $target->dep_id <= 0) {
            return;
        }

        $this->dataScope->assertDepartmentInScope($actor, 'users', (int) $target->dep_id);
    }

    public function assertRoleAssignable(string $roleName): void
    {
        $actor = auth()->user();
        if (! $actor || ! AccessCatalog::actorCanAssignRole($actor, $roleName)) {
            throw ValidationException::withMessages([
                'role' => ['لا يمكنك تعيين هذا الدور'],
            ]);
        }

        if (! Role::query()->where('guard_name', AccessCatalog::GUARD)->where('name', $roleName)->exists()) {
            throw ValidationException::withMessages([
                'role' => ['الدور غير موجود'],
            ]);
        }
    }

    public function getUsername()
    {
        return response()->json(['username' => auth()->user()->name]);
    }
}
