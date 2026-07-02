<?php

namespace App\Services\Users;

use App\Models\Bases;
use App\Models\Departments;
use App\Models\User;
use App\Support\Tree\DepartmentTreeService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserAdminService
{
    public function __construct(private DepartmentTreeService $departmentTree)
    {
    }

    public function users()
    {
        $query = User::query()
            ->select([
                'id',
                'firstname',
                'lastname',
                'email',
                'dep_id',
                'default_base',
                'created_at',
                'keycloak_sub',
                'keycloak_pending_sub',
            ])
            ->with('roles');

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

        return response()->json($this->mapUsersForList($query->get(), $emptyBase));
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
                'email' => $user->email,
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

        return response()->json([
            'id' => $user->id,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
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
        if ($request->has('dep_id')) {
            $input['dep_id'] = $request->dep_id;
        } else {
            $input['dep_id'] = $request->depid;
        }

        $user = User::create($input);

        if ($request->has('role')) {
            $user->assignRole($request->role);
        } else {
            $user->assignRole('Admin');
        }

        return response()->json(['status' => 'success']);
    }

    public function editUser(Request $request): JsonResponse
    {
        $item = User::with('roles')->find($request->id);

        if (! $item) {
            return response()->json(['message' => 'المستخدم غير موجود'], 404);
        }

        $activateSso = $request->boolean('activate_sso');

        if ($activateSso) {
            $this->assertCanActivateSso($request, $item);
        }

        $updates = [
            'firstname' => $request->input('firstname', $item->firstname),
            'lastname' => $request->input('lastname', $item->lastname),
            'email' => $request->input('email', $item->email),
            'default_base' => $request->input('default_base', $item->default_base),
        ];

        if ($request->has('dep_id')) {
            $updates['dep_id'] = $request->input('dep_id');
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
        User::find($request->id)?->delete();

        return response()->json(['status' => 'success']);
    }

    public function getUsername()
    {
        return response()->json(['username' => auth()->user()->name]);
    }
}
