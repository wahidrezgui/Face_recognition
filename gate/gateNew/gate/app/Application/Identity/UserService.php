<?php

namespace App\Application\Identity;

use App\Domain\AccessControl\AccessCatalog;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Identity\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserService
{
    /**
     * Columns the users grid is allowed to sort by — a fixed allowlist since the
     * sort field arrives as an untrusted string from the client.
     */
    private const SORTABLE_COLUMNS = ['firstname', 'lastname', 'username', 'military_number', 'created_at'];

    public function __construct(private readonly DataScopeResolver $dataScope) {}

    public function list(User $actor, array $filters, int $perPage = 25): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? $perPage);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 25;

        $query = User::query()->with(['department', 'roles']);
        $this->applyScope($query, $actor);
        $this->applyFilters($query, $filters);

        $sortField = $filters['sort_field'] ?? null;
        if (in_array($sortField, self::SORTABLE_COLUMNS, true)) {
            $query->orderBy($sortField, ($filters['sort_order'] ?? '1') === '-1' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('created_at');
        }

        /** @var LengthAwarePaginator $paginator */
        $paginator = $query->paginate($perPage, ['*'], 'page', $filters['page'] ?? 1);

        return $paginator;
    }

    /**
     * Non-global actors only see users within their department hierarchy — but
     * department-less (pending Keycloak) accounts must stay visible too, or a
     * hierarchy-scoped admin could never find and activate one.
     */
    private function applyScope(Builder $query, User $actor): void
    {
        if ($this->dataScope->resolveForUser($actor, 'users') === 'global') {
            return;
        }

        $ids = $this->dataScope->resolveDepartmentIds($actor, 'users');
        $query->where(fn (Builder $q) => $q->whereIn('dep_id', $ids)->orWhereNull('dep_id'));
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['search'])) {
            $needle = $filters['search'];
            $query->where(function (Builder $q) use ($needle) {
                $q->where('firstname', 'like', "%{$needle}%")
                    ->orWhere('lastname', 'like', "%{$needle}%")
                    ->orWhere('username', 'like', "%{$needle}%")
                    ->orWhereRaw("CONCAT(firstname, ' ', lastname) like ?", ["%{$needle}%"]);
            });
        }

        if (! empty($filters['military_number'])) {
            $query->where('military_number', (int) $filters['military_number']);
        }

        if (! empty($filters['dep_id'])) {
            $query->where('dep_id', (int) $filters['dep_id']);
        }

        if (! empty($filters['role'])) {
            $role = $filters['role'];
            $query->whereHas('roles', fn (Builder $q) => $q->where('name', $role));
        }

        if (! empty($filters['sso_status'])) {
            match ($filters['sso_status']) {
                'linked' => $query->whereNotNull('keycloak_sub'),
                'pending' => $query->whereNull('keycloak_sub')->whereNotNull('keycloak_pending_sub'),
                'unlinked' => $query->whereNull('keycloak_sub')->whereNull('keycloak_pending_sub'),
                default => null,
            };
        }
    }

    /**
     * Lightweight, scoped user lookup for pickers (e.g. the Role Permissions page's
     * "grant a direct permission" search) — reuses the same scoping as list() but
     * returns a small unpaginated result set, not the full paginated grid shape.
     *
     * @return Collection<int, User>
     */
    public function searchLite(User $actor, string $search, int $limit = 20): Collection
    {
        $query = User::query()->select(['id', 'firstname', 'lastname', 'username']);
        $this->applyScope($query, $actor);

        if ($search !== '') {
            $this->applyFilters($query, ['search' => $search]);
        }

        return $query->orderBy('firstname')->orderBy('lastname')->limit($limit)->get();
    }

    public function create(array $data, User $actor): User
    {
        return DB::transaction(function () use ($data) {
            $user = new User($this->prepareFields($data));
            $user->cnx = 0;
            $user->save();
            $user->syncRoles([$data['role']]);

            return $user->fresh(['department', 'roles']);
        });
    }

    public function update(User $user, array $data, User $actor): User
    {
        return DB::transaction(function () use ($user, $data) {
            $user->fill($this->prepareFields($data));

            // SSO activation is atomic with the rest of the save.
            if ((bool) ($data['activate_sso'] ?? false) && $user->isSsoPending) {
                $this->assertSsoSubjectFree($user);
                $user->keycloak_sub = $user->keycloak_pending_sub;
                $user->keycloak_pending_sub = null;
            }

            $user->save();
            $user->syncRoles([$data['role']]);

            return $user->fresh(['department', 'roles']);
        });
    }

    public function delete(User $user): void
    {
        $user->delete();
    }

    /**
     * Self-downgrade + last-Super-Admin-demotion guard. Called from the
     * controller before update() — needs the target's current DB role and an
     * aggregate count, which is out of place in a FormRequest.
     */
    public function assertRoleChangeAllowed(User $actor, User $target, string $newRoleName): void
    {
        $target->loadMissing('roles');
        $currentRoleName = $target->roles->first()?->name ?? '';

        if ($actor->id === $target->id
            && AccessCatalog::roleRank($newRoleName) < AccessCatalog::roleRank($currentRoleName)) {
            throw new AuthorizationException('You cannot lower your own role.');
        }

        if ($currentRoleName === AccessCatalog::superAdminRole()
            && $newRoleName !== AccessCatalog::superAdminRole()
            && User::role(AccessCatalog::superAdminRole())->count() <= 1) {
            throw new AuthorizationException('At least one Super Admin must remain.');
        }
    }

    /**
     * Self-delete + last-Super-Admin-delete guard. Called from the controller
     * before delete(), same reasoning as assertRoleChangeAllowed().
     */
    public function assertDeletable(User $actor, User $target): void
    {
        if ($actor->id === $target->id) {
            throw new AuthorizationException('You cannot delete your own account.');
        }

        $target->loadMissing('roles');
        if ($target->hasRole(AccessCatalog::superAdminRole())
            && User::role(AccessCatalog::superAdminRole())->count() <= 1) {
            throw new AuthorizationException('At least one Super Admin must remain.');
        }
    }

    /**
     * `keycloak_sub` carries a live UNIQUE index — without this check, activating
     * a pending sub already linked to a different user would surface as a raw DB
     * integrity exception instead of a clean, actionable error.
     */
    private function assertSsoSubjectFree(User $user): void
    {
        $alreadyLinked = User::query()
            ->where('keycloak_sub', $user->keycloak_pending_sub)
            ->where('id', '!=', $user->id)
            ->exists();

        if ($alreadyLinked) {
            throw ValidationException::withMessages([
                'activate_sso' => 'This Keycloak account is already linked to another user.',
            ]);
        }
    }

    private function prepareFields(array $data): array
    {
        // 'cnx' (read-only "online" flag) and the Keycloak columns are fillable at
        // the model level but must never be mass-assigned from this form directly
        // — keycloak_sub/keycloak_pending_sub are only ever touched by update()'s
        // explicit SSO-activation branch above, same "fillable but form-excluded"
        // pattern as EmployeeService::prepareFields() excluding 'photo'.
        $fields = array_diff_key(
            array_intersect_key($data, array_flip((new User)->getFillable())),
            ['cnx' => null, 'keycloak_sub' => null, 'keycloak_pending_sub' => null],
        );

        // Blank password on edit means "leave unchanged" — strip it rather than
        // hashing an empty string. StoreUserRequest requires a password, so this
        // only ever triggers on update.
        if (array_key_exists('password', $fields) && blank($fields['password'])) {
            unset($fields['password']);
        }

        // `default_base` is NOT NULL DEFAULT 0 in the live schema ("no base" = 0,
        // not null) — the FormRequests validate a null-coerced value, so coerce
        // it back to 0 here before persisting.
        if (array_key_exists('default_base', $fields)) {
            $fields['default_base'] = $fields['default_base'] ?? 0;
        }

        return $fields;
    }
}
