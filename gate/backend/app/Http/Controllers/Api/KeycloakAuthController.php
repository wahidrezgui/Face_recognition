<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\KeycloakAccountNotLinkedException;
use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Services\KeycloakAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class KeycloakAuthController extends Controller
{
    public function __construct(
        private KeycloakAuthService $keycloakAuthService,
        private AuthService $authService,
    ) {
    }

    public function providers(): JsonResponse
    {
        return response()->json([
            'keycloak' => [
                'enabled' => $this->keycloakAuthService->isEnabled(),
                'login_url' => $this->keycloakAuthService->isEnabled()
                    ? url('/api/auth/keycloak/redirect')
                    : null,
            ],
        ]);
    }

    public function redirect(Request $request): RedirectResponse
    {
        if (! $this->keycloakAuthService->isEnabled()) {
            return redirect('/?sso_error='.urlencode('Keycloak sign-in is not configured.'));
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
            return redirect('/?sso_error='.urlencode('Keycloak sign-in is not configured.'));
        }

        if ($request->filled('error')) {
            $message = (string) $request->query('error_description', $request->query('error', 'Keycloak sign-in was cancelled.'));

            return redirect('/?sso_error='.urlencode($message));
        }

        $expectedState = $request->session()->pull('keycloak_oauth_state');
        $receivedState = (string) $request->query('state', '');

        if (! is_string($expectedState) || $expectedState === '' || ! hash_equals($expectedState, $receivedState)) {
            return redirect('/?sso_error='.urlencode('Invalid sign-in state. Please try again.'));
        }

        $code = (string) $request->query('code', '');
        if ($code === '') {
            return redirect('/?sso_error='.urlencode('Keycloak did not return an authorization code.'));
        }

        try {
            $result = $this->keycloakAuthService->resolveUserFromAuthorizationCode($code);
            $this->authService->establishSession($result['user'], 'keycloak');

            if ($result['id_token']) {
                $request->session()->put('keycloak_id_token', $result['id_token']);
            }

            $request->session()->regenerate();

            return redirect('/auth/callback');
        } catch (KeycloakAccountNotLinkedException $exception) {
            $request->session()->put('keycloak_pending_activation', array_merge(
                $exception->pendingProfile(),
                ['recorded_at' => now()->toIso8601String()]
            ));

            if ($exception->idToken) {
                $request->session()->put('keycloak_pending_id_token', $exception->idToken);
            }

            return redirect('/auth/pending');
        } catch (RuntimeException $exception) {
            Log::warning('Keycloak callback failed', [
                'message' => $exception->getMessage(),
            ]);

            return redirect('/?sso_error='.urlencode($exception->getMessage()));
        } catch (Throwable $exception) {
            Log::error('Unexpected Keycloak callback failure', [
                'message' => $exception->getMessage(),
            ]);

            return redirect('/?sso_error='.urlencode('Unable to complete Keycloak sign-in.'));
        }
    }

    public function pending(Request $request): JsonResponse
    {
        $pending = $request->session()->get('keycloak_pending_activation');

        if (! is_array($pending) || empty($pending['sub'])) {
            return response()->json(['status' => 'empty'], 404);
        }

        return response()->json([
            'status' => 'pending',
            'profile' => $pending,
        ]);
    }

    public function dismissPending(Request $request): JsonResponse
    {
        $request->session()->forget([
            'keycloak_pending_activation',
            'keycloak_pending_id_token',
        ]);

        return response()->json(['status' => 'success']);
    }
}
