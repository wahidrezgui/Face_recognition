<?php

namespace App\Domain\Identity\Exceptions;

use App\Domain\Identity\Models\User;
use RuntimeException;

class KeycloakAccountNotLinkedException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $claims
     */
    public function __construct(
        public readonly array $claims,
        public readonly ?string $idToken = null,
        public readonly ?User $pendingUser = null,
    ) {
        parent::__construct('Keycloak account is not linked to a local user.');
    }

    /**
     * @return array{sub: ?string, preferred_username: ?string, email: ?string, name: ?string, user_id: ?int, login_username: ?string}
     */
    public function pendingProfile(): array
    {
        $name = null;
        if (! empty($this->claims['name']) && is_string($this->claims['name'])) {
            $name = $this->claims['name'];
        } else {
            $parts = array_filter([
                $this->claims['given_name'] ?? null,
                $this->claims['family_name'] ?? null,
            ], fn ($value) => is_string($value) && $value !== '');
            if ($parts !== []) {
                $name = implode(' ', $parts);
            }
        }

        return [
            'sub' => isset($this->claims['sub']) && is_string($this->claims['sub']) ? $this->claims['sub'] : null,
            'preferred_username' => isset($this->claims['preferred_username']) && is_string($this->claims['preferred_username'])
                ? $this->claims['preferred_username']
                : (isset($this->claims['username']) && is_string($this->claims['username']) ? $this->claims['username'] : null),
            'email' => isset($this->claims['email']) && is_string($this->claims['email']) ? $this->claims['email'] : null,
            'name' => $name,
            'user_id' => $this->pendingUser?->id,
            'login_username' => $this->pendingUser?->username,
            'created' => $this->pendingUser?->wasRecentlyCreated ?? false,
        ];
    }
}
