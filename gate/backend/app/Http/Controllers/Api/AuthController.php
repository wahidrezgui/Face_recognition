<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuthService;
use App\Services\KeycloakAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private AuthService $authService,
        private KeycloakAuthService $keycloakAuthService,
    ) {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->only('email', 'password'));

        if ($result['status'] === 'error') {
            return response()->json([
                'status' => $result['status'],
                'message' => $result['message'],
            ], $result['http_status']);
        }

        $request->session()->regenerate();

        return response()->json([
            'status' => $result['status'],
            'user' => $result['user'],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $provider = (string) $request->session()->get('auth_provider', 'password');
        $idToken = $request->session()->get('keycloak_id_token');

        $this->authService->logout($request->user(), $provider);

        $redirectUrl = null;
        if ($provider === 'keycloak') {
            $redirectUrl = $this->keycloakAuthService->createLogoutUrl(
                is_string($idToken) ? $idToken : null
            );
        }

        $request->session()->forget('keycloak_id_token');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'status' => 'success',
            'redirect_url' => $redirectUrl,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('roles'));
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->authService->changePassword($request->user(), $request->password);

        return response()->json([
            'status' => 'success',
            'message' => 'Password changed successfully',
        ]);
    }
}
