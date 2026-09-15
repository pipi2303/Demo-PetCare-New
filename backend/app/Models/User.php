<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;

#[Fillable([
    'username', 'email', 'password', 'first_name', 'last_name', 'display_name',
    'phone', 'status',
])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * @var Collection<int, string>|null
     */
    private ?Collection $permissionCodesCache = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'locked_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function accessScopes(): HasMany
    {
        return $this->hasMany(UserAccessScope::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(UserInvitation::class);
    }

    public function preferences(): HasMany
    {
        return $this->hasMany(UserPreference::class);
    }

    /**
     * Effective permissions: the union of every role's permissions (§7.2 —
     * a user with multiple roles gets the union, not an intersection).
     * Cached on the instance since a single request may check several
     * permissions across guards/controllers.
     *
     * @return Collection<int, string>
     */
    public function permissionCodes(): Collection
    {
        return $this->permissionCodesCache ??= $this->roles()
            ->join('role_permissions', 'roles.id', '=', 'role_permissions.role_id')
            ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
            ->distinct()
            ->pluck('permissions.code');
    }

    public function hasPermission(string $code): bool
    {
        return $this->permissionCodes()->contains($code);
    }

    public function hasAnyPermission(array $codes): bool
    {
        return $this->permissionCodes()->intersect($codes)->isNotEmpty();
    }

    public function hasAllPermissions(array $codes): bool
    {
        return collect($codes)->diff($this->permissionCodes())->isEmpty();
    }
}
