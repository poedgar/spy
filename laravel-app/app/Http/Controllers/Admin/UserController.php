<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Response;

/**
 * Every account, for site administrators: who signed up, how, and whether
 * they're around. Read-only.
 */
class UserController extends Controller
{
    public const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $search = trim($request->string('q')->toString());
        $onlineSince = now()->subMinutes(User::ONLINE_MINUTES);

        $users = User::query()
            ->withCount('gamePlayers as games_count')
            ->when(mb_strlen($search) >= 2, function ($query) use ($search) {
                $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
                $query->where(fn ($query) => $query
                    ->whereRaw("lower(name) like ? escape '\\'", [$like])
                    ->orWhereRaw("lower(email) like ? escape '\\'", [$like])
                    ->orWhereRaw("lower(codename) like ? escape '\\'", [$like]));
            })
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'codename' => $user->codename,
                'email' => $user->email,
                'verified' => $user->hasVerifiedEmail(),
                'google' => $user->firebase_uid !== null,
                'two_factor' => $user->hasEnabledTwoFactorAuthentication(),
                'admin' => $user->is_admin,
                'locale' => $user->locale->value,
                'games_count' => (int) $user->getAttribute('games_count'),
                'created_at' => $user->created_at?->toIso8601String(),
                'last_seen_at' => $user->last_seen_at?->toIso8601String(),
                'online' => $user->isOnline(),
            ]);

        return inertia('admin/Users', [
            'users' => $users,
            'search' => $search,
            'stats' => [
                'total' => User::count(),
                'verified' => User::whereNotNull('email_verified_at')->count(),
                'online' => User::where('last_seen_at', '>=', $onlineSince)->count(),
                'new_this_week' => User::where('created_at', '>=', now()->subWeek())->count(),
            ],
        ]);
    }
}
