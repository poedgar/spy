<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;

/**
 * A user's notifications as the clients show them: newest first, each
 * presented in the current request's language.
 */
class NotificationFeed
{
    /**
     * @return array{unread_count: int, notifications: list<array<string, mixed>>}
     */
    public static function for(User $user, int $limit = 30): array
    {
        $notifications = $user->notifications()->latest()->limit($limit)->get();

        return [
            'unread_count' => $user->unreadNotifications()->count(),
            'notifications' => array_values($notifications->map(fn (DatabaseNotification $notification) => [
                'id' => $notification->id,
                ...NotificationPresenter::present($notification->data),
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ])->all()),
        ];
    }
}
