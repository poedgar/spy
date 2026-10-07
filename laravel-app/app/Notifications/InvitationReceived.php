<?php

namespace App\Notifications;

use App\Enums\GameType;
use App\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emailed to invitees who keep email notifications on. Sent in their saved
 * language (User implements HasLocalePreference).
 */
class InvitationReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Invitation $invitation,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $invitation = $this->invitation->loadMissing(['game', 'fromUser']);
        $home = $invitation->game->game_type === GameType::Phrase ? 'games.phrase' : 'games.spy';
        $summary = __(':codename invited you to :title', [
            'codename' => $invitation->fromUser->codename,
            'title' => $invitation->game->title,
        ]);

        return (new MailMessage)
            ->subject($summary)
            ->line($summary)
            ->line(__('Invite code: :code', ['code' => $invitation->game->code]))
            ->action(__('Open your invitations'), route($home))
            ->line(__('You can turn these emails off in your profile settings.'));
    }
}
