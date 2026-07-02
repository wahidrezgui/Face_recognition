<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function login(array $credentials): array
    {
        if (! Auth::guard('web')->attempt($credentials)) {
            return [
                'status' => 'error',
                'message' => 'Invalid credentials',
                'http_status' => 401,
            ];
        }

        $user = Auth::guard('web')->user();
        $this->establishSession($user, 'password');

        return [
            'status' => 'success',
            'user' => $user->load('roles'),
            'http_status' => 200,
        ];
    }

    public function establishSession(User $user, string $provider = 'password'): void
    {
        Auth::guard('web')->login($user);

        DB::table('users')->where('id', $user->id)->update(['cnx' => 1]);

        session(['auth_provider' => $provider]);
    }

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
}
