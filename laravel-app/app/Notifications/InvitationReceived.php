<?php

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\User;
use App\Support\NotificationPresenter;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Someone invited the user to a game. Also emailed to players who keep
 * email notifications on.
 */
class InvitationReceived extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Invitation $invitation)
    {
        parent::__construct();

        $invitation->loadMissing(['game', 'fromUser']);
        $this->params = [
            'invitation_id' => $invitation->id,
            'game_code' => $invitation->game->code,
            'game_title' => $invitation->game->title,
            'game_type' => $invitation->game->game_type->value,
            'from_codename' => $invitation->fromUser->codename,
        ];
    }

    public function kind(): string
    {
        return 'invitation';
    }

    public function params(): array
    {
        return $this->params;
    }

    public function via(object $notifiable): array
    {
        $channels = parent::via($notifiable);

        if ($notifiable instanceof User && $notifiable->email_notifications) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $presented = NotificationPresenter::present($this->toArray($notifiable));

        return (new MailMessage)
            ->subject($presented['body'])
            ->line($presented['body'])
            ->line(__('Invite code: :code', ['code' => $this->params['game_code']]))
            ->action(__('Open your invitations'), url($presented['link']))
            ->line(__('You can turn these emails off in your profile settings.'));
    }
}
