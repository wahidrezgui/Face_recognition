<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Identity\AuthService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Identity\UpdateProfilePasswordRequest;
use App\Http\Requests\Identity\UpdateProfileRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    public function edit(Request $request): Response
    {
        // Nothing beyond `auth.user`, already shared app-wide by
        // HandleInertiaRequests — no extra props needed for this page.
        return Inertia::render('profile/Edit');
    }

    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        $this->authService->updateProfile(
            $request->user(),
            (string) $request->validated('firstname'),
            (string) $request->validated('lastname'),
        );

        return back();
    }

    public function updatePassword(UpdateProfilePasswordRequest $request): RedirectResponse
    {
        $this->authService->changePassword($request->user(), (string) $request->validated('password'));

        return back();
    }
}
