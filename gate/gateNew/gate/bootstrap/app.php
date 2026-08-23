<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // abort(403)/404/etc. raised while resolving an Inertia page (e.g. permission
        // checks in controllers) would otherwise fall through to Laravel's raw HTML
        // error view. That response has no X-Inertia header, so on a client-side
        // visit Inertia can't swap the page and instead dumps the raw page into its
        // "non-Inertia response" modal. Rendering an Inertia page here keeps it inside
        // the app shell instead. 500/503 stay untouched in debug mode so the local
        // stack trace is still visible for real bugs.
        $exceptions->respond(function (SymfonyResponse $response, Throwable $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return $response;
            }

            $status = $response->getStatusCode();

            if (app()->hasDebugModeEnabled() && in_array($status, [500, 503], true)) {
                return $response;
            }

            if (in_array($status, [403, 404, 419, 500, 503], true)) {
                return Inertia::render('errors/Error', ['status' => $status])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();
