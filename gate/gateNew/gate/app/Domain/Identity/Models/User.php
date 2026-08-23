<?php

namespace App\Domain\Identity\Models;

use App\Domain\AccessControl\AccessCatalog;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Personnel\Models\Department;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property int|null $dep_id
 * @property int $default_base
 * @property string $firstname
 * @property string $lastname
 * @property string $username
 * @property int|null $military_number
 * @property string|null $keycloak_sub
 * @property string|null $keycloak_pending_sub
 * @property string|null $password
 * @property string|null $remember_token
 * @property int $cnx
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'firstname',
        'lastname',
        'username',
        'military_number',
        'password',
        'dep_id',
        'default_base',
        'cnx',
        'keycloak_sub',
        'keycloak_pending_sub',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'keycloak_sub',
        'keycloak_pending_sub',
    ];

    /**
     * @var array<int, string>
     */
    protected $appends = ['is_sso_linked', 'is_sso_pending'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'dep_id');
    }

    public function displayName(): string
    {
        return trim("{$this->firstname} {$this->lastname}") ?: $this->username;
    }

    protected function isSsoLinked(): Attribute
    {
        return Attribute::get(fn () => filled($this->keycloak_sub));
    }

    protected function isSsoPending(): Attribute
    {
        return Attribute::get(fn () => blank($this->keycloak_sub) && filled($this->keycloak_pending_sub));
    }

    /**
     * Attach the current `permissions` (flat string array) and `scopes`
     * (per-resource global|hierarchy|self) to this user for the Inertia
     * auth payload — shared by both password and Keycloak login.
     */
    public function withAuthPayload(): self
    {
        $this->loadMissing('roles');
        $scopeResolver = app(DataScopeResolver::class);

        if ($this->hasRole(AccessCatalog::superAdminRole())) {
            $this->setAttribute('scopes', $scopeResolver->resolveAllForUser($this));
            $this->attachAuthPermissions(AccessCatalog::allPermissionNames());

            return $this;
        }

        $this->setAttribute('scopes', $scopeResolver->resolveAllForUser($this));
        $permissions = $this->getAllPermissions()->pluck('name')->values()->all();

        if ($permissions === []) {
            $roleName = $this->roles->first()?->name;
            if ($roleName) {
                $permissions = AccessCatalog::defaultPermissionsForRole($roleName);
            }
        }

        $this->attachAuthPermissions($permissions);

        return $this;
    }

    /**
     * Spatie loads an empty direct-permissions relation during getAllPermissions().
     * Unset it so JSON serialization uses the string list, not the empty relation.
     *
     * @param  array<int, string>  $permissions
     */
    private function attachAuthPermissions(array $permissions): void
    {
        $this->unsetRelation('permissions');
        $this->setAttribute('permissions', $permissions);
    }
}
