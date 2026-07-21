<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate a route to one or more roles, e.g. ->middleware('role:owner').
 * Assumes an upstream auth middleware has already resolved the user.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if ($roles && ! $user->hasRole(...$roles)) {
            abort(403, 'You do not have permission to perform this action.');
        }

        return $next($request);
    }
}
