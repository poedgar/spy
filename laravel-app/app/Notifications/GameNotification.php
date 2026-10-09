<?php

namespace App\Notifications;

use App\Models\User;
use App\Notifications\Channels\ExpoPushChannel;
use App\Notifications\Channels\LiveChannel;
use App\Support\NotificationPresenter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Something a player should hear about. Every kind is stored (the bell in
 * the app), delivered live, and pushed to their phones. Only the kind and
 * its parameters are stored; NotificationPresenter turns them into text
 * and links in whatever language the reader uses.
 */
abstract class GameNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        // Senders often run inside a transaction: wait for it to commit.
        $this->afterCommit();
    }

    /**
     * A short identifier for the client: "invitation", "join_request", …
     */
    abstract public function kind(): string;

    /**
     * What the presenter needs to describe and link this notification.
     *
     * @return array<string, mixed>
     */
    abstract public function params(): array;

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database', LiveChannel::class, ExpoPushChannel::class];
    }

    /**
     * The bell must never wait on a queue worker: store right away, and
     * queue only the deliveries that call out (live, push, mail).
     *
     * @return array<string, string>
     */
    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return ['kind' => $this->kind(), ...$this->params()];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage(NotificationPresenter::present($this->toArray($notifiable), $this->localeFor($notifiable)));
    }

    /**
     * The push payload. Its data keeps the shapes the mobile app already
     * routes on (type + code / invitation_id).
     *
     * @return array<string, mixed>|null
     */
    public function toExpoPush(User $notifiable): ?array
    {
        $presented = NotificationPresenter::present($this->toArray($notifiable), $notifiable->preferredLocale());

        return [
            'title' => $presented['title'],
            'body' => $presented['body'],
            'sound' => 'default',
            // Must match a channel the app creates (expo-app/src/notifications/channels.ts),
            // or Android drops the push.
            'channelId' => $this->kind() === 'invitation' ? 'invitations' : 'game',
            'data' => $presented['push_data'],
        ];
    }

    protected function localeFor(object $notifiable): string
    {
        return $notifiable instanceof User ? $notifiable->preferredLocale() : app()->getLocale();
    }
}
