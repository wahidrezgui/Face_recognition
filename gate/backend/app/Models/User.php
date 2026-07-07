<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\Access\AccessCatalog;
use App\Support\Access\DataScopeResolver;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    use HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'firstname',
        'lastname',
        'email',
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
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

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
