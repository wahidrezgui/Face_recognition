<?php

namespace App\Application\Identity;

use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    /**
     * Log the given user into the web guard and mark them online.
     * Shared by both local password login and the Keycloak callback.
     */
    public function establishSession(User $user, string $provider = 'password'): void
    {
        Auth::guard('web')->login($user);

        DB::table('users')->where('id', $user->id)->update(['cnx' => 1]);

        session(['auth_provider' => $provider]);
    }

    /**
     * @return array{provider: string}
     */
    public function logout(?User $user, string $provider = 'password'): array
    {
        if ($user) {
            DB::table('users')->where('id', $user->id)->update(['cnx' => 0]);
        }

        Auth::guard('web')->logout();
        session()->forget('auth_provider');

        return [
            'provider' => $provider,
        ];
    }

    public function changePassword(User $user, string $password): void
    {
        $user->password = Hash::make($password);
        $user->save();
    }

    public function updateProfile(User $user, string $firstname, string $lastname): void
    {
        $user->firstname = $firstname;
        $user->lastname = $lastname;
        $user->save();
    }
}
