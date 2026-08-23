<?php

namespace App\Http\Controllers\Inertia\Auth;

use App\Application\Identity\AuthService;
use App\Domain\AccessControl\AccessCatalog;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Infrastructure\Keycloak\KeycloakAuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly KeycloakAuthService $keycloakAuthService,
    ) {}

    public function create(Request $request): Response
    {
        // A fresh visit to the login page always clears any stale Keycloak
        // pending-activation state left over from a previous SSO attempt.
        $request->session()->forget(['keycloak_pending_activation', 'keycloak_pending_id_token']);

        return Inertia::render('auth/Login', [
            'keycloak' => [
                'enabled' => $this->keycloakAuthService->isEnabled(),
                'loginUrl' => $this->keycloakAuthService->isEnabled() ? route('keycloak.redirect') : null,
            ],
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate($this->authService);

        $request->session()->regenerate();

        AccessCatalog::discardHomeIntendedUrl($request->session());

        return redirect()->intended(AccessCatalog::defaultRedirectUrlForUser($request->user()));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $provider = session('auth_provider', 'password');
        $idToken = session('keycloak_id_token');

        $this->authService->logout($request->user(), $provider);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($provider === 'keycloak') {
            $logoutUrl = $this->keycloakAuthService->createLogoutUrl($idToken);
            if ($logoutUrl) {
                return redirect()->away($logoutUrl);
            }
        }

        return redirect('/');
    }
}
