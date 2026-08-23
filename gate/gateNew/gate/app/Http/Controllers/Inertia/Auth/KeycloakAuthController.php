<?php

namespace App\Http\Controllers\Inertia\Auth;

use App\Application\Identity\AuthService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\Identity\Exceptions\KeycloakAccountNotLinkedException;
use App\Http\Controllers\Controller;
use App\Infrastructure\Keycloak\KeycloakAuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class KeycloakAuthController extends Controller
{
    public function __construct(
        private readonly KeycloakAuthService $keycloakAuthService,
        private readonly AuthService $authService,
    ) {}

    public function redirect(Request $request): RedirectResponse
    {
        if (! $this->keycloakAuthService->isEnabled()) {
            return redirect()->route('login')->with('error', 'Keycloak sign-in is not configured.');
        }

        $request->session()->forget([
            'keycloak_pending_activation',
            'keycloak_pending_id_token',
        ]);

        $state = KeycloakAuthService::generateState();
        $request->session()->put('keycloak_oauth_state', $state);

        return redirect()->away($this->keycloakAuthService->createAuthorizationUrl($state));
    }

    public function callback(Request $request): RedirectResponse
    {
        if (! $this->keycloakAuthService->isEnabled()) {
            return redirect()->route('login')->with('error', 'Keycloak sign-in is not configured.');
        }

        if ($request->filled('error')) {
            $message = (string) $request->query('error_description', $request->query('error', 'Keycloak sign-in was cancelled.'));

            return redirect()->route('login')->with('error', $message);
        }

        $expectedState = $request->session()->pull('keycloak_oauth_state');
        $receivedState = (string) $request->query('state', '');

        if (! is_string($expectedState) || $expectedState === '' || ! hash_equals($expectedState, $receivedState)) {
            return redirect()->route('login')->with('error', 'Invalid sign-in state. Please try again.');
        }

        $code = (string) $request->query('code', '');
        if ($code === '') {
            return redirect()->route('login')->with('error', 'Keycloak did not return an authorization code.');
        }

        try {
            $result = $this->keycloakAuthService->resolveUserFromAuthorizationCode($code);
            $this->authService->establishSession($result['user'], 'keycloak');

            if ($result['id_token']) {
                $request->session()->put('keycloak_id_token', $result['id_token']);
            }

            $request->session()->regenerate();

            AccessCatalog::discardHomeIntendedUrl($request->session());

            return redirect()->intended(AccessCatalog::defaultRedirectUrlForUser($result['user']));
        } catch (KeycloakAccountNotLinkedException $exception) {
            $request->session()->put('keycloak_pending_activation', array_merge(
                $exception->pendingProfile(),
                ['recorded_at' => now()->toIso8601String()]
            ));

            if ($exception->idToken) {
                $request->session()->put('keycloak_pending_id_token', $exception->idToken);
            }

            return redirect()->route('auth.pending');
        } catch (RuntimeException $exception) {
            Log::warning('Keycloak callback failed', [
                'message' => $exception->getMessage(),
            ]);

            return redirect()->route('login')->with('error', $exception->getMessage());
        } catch (Throwable $exception) {
            Log::error('Unexpected Keycloak callback failure', [
                'message' => $exception->getMessage(),
            ]);

            return redirect()->route('login')->with('error', 'Unable to complete Keycloak sign-in.');
        }
    }

    public function pending(Request $request): Response|RedirectResponse
    {
        $pending = $request->session()->get('keycloak_pending_activation');

        if (! is_array($pending) || empty($pending['sub'])) {
            return redirect()->route('login');
        }

        return Inertia::render('auth/AccountPending', [
            'profile' => $pending,
            'keycloak' => [
                'enabled' => $this->keycloakAuthService->isEnabled(),
                'loginUrl' => $this->keycloakAuthService->isEnabled() ? route('keycloak.redirect') : null,
            ],
        ]);
    }
}
