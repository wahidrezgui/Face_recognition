<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Keycloak SSO (optional second login path via BFF)
    |--------------------------------------------------------------------------
    |
    | When enabled, users can sign in through Keycloak while the app keeps
    | the same Sanctum session model as password login.
    |
    */

    'enabled' => filter_var(env('KEYCLOAK_ENABLED', false), FILTER_VALIDATE_BOOL),

    'base_url' => rtrim((string) env('KEYCLOAK_BASE_URL', ''), '/'),

    'realm' => (string) env('KEYCLOAK_REALM', ''),

    'client_id' => (string) env('KEYCLOAK_CLIENT_ID', ''),

    'client_secret' => (string) env('KEYCLOAK_CLIENT_SECRET', ''),

    'redirect_uri' => env('KEYCLOAK_REDIRECT_URI'),

    'scopes' => array_values(array_filter(array_map(
        'trim',
        explode(' ', (string) env('KEYCLOAK_SCOPES', 'openid profile email'))
    ))),

    'federated_logout' => filter_var(env('KEYCLOAK_FEDERATED_LOGOUT', true), FILTER_VALIDATE_BOOL),

    'post_logout_redirect_uri' => env('KEYCLOAK_POST_LOGOUT_REDIRECT_URI'),

    // Forces account picker on each SSO start (login, select_account). Empty = Keycloak default.
    'prompt' => env('KEYCLOAK_PROMPT', 'login'),

    'verify_id_token' => filter_var(env('KEYCLOAK_VERIFY_ID_TOKEN', true), FILTER_VALIDATE_BOOL),

    'id_token_leeway' => (int) env('KEYCLOAK_ID_TOKEN_LEEWAY', 60),

    'jwks_cache_ttl' => (int) env('KEYCLOAK_JWKS_CACHE_TTL', 3600),

];
