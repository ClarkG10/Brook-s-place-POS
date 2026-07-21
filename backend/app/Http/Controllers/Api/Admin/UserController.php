<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Staff account management. Owner-only (gated by `role:owner` on the routes).
 */
class UserController extends Controller
{
    public function index(): JsonResponse
    {
        // Order by role rank then name, DB-agnostic (no MySQL-only FIELD()).
        $rank = array_flip(User::ROLES);

        $users = User::query()->get()
            ->sortBy(fn (User $u) => [$rank[$u->role] ?? 99, strtolower($u->name)])
            ->values()
            ->map(fn (User $u) => $this->present($u));

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('users', 'username')],
            'role' => ['required', Rule::in(User::ROLES)],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create($data); // 'hashed' cast handles the password

        return response()->json(['data' => $this->present($user)], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('users', 'username')->ignore($user->id)],
            'role' => ['required', Rule::in(User::ROLES)],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        // Don't let the last owner be demoted out of ownership (would lock everyone out of settings/users).
        if ($user->isOwner() && $data['role'] !== 'owner' && User::where('role', 'owner')->count() <= 1) {
            throw ValidationException::withMessages([
                'role' => ['You cannot demote the only remaining owner.'],
            ]);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json(['data' => $this->present($user->fresh())]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own account.'],
            ]);
        }

        if ($user->isOwner() && User::where('role', 'owner')->count() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete the only remaining owner.'],
            ]);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account deleted.']);
    }

    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'username' => $user->username,
            'role' => $user->role,
            'is_owner' => $user->isOwner(),
            'created_at' => $user->created_at,
        ];
    }
}
