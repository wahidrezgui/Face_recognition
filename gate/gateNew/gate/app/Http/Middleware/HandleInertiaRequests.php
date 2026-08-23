<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                // withAuthPayload() overwrites the `permissions` attribute on the model it's
                // called on, which shadows Spatie's real `permissions` relation of the same
                // name — breaking any later $user->can()/hasPermissionTo() on that instance.
                // Mutate a clone for the Inertia payload so $request->user() (reused by the
                // rest of the request, e.g. authorization checks in controllers) stays intact.
                'user' => $request->user() ? (clone $request->user())->withAuthPayload() : null,
            ],
            'locale' => $locale,
            'direction' => $locale === 'ar' ? 'rtl' : 'ltr',
            'flash' => [
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
