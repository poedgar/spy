<?php

namespace App\Support;

/**
 * Turns a stored notification (its kind and parameters) into what people
 * see: a title and body in the reader's language, a link for the web app,
 * and the data the mobile app routes a push tap on. The one place each
 * kind's wording lives.
 *
 * @phpstan-type Presented array{kind: string, title: string, body: string, link: string, game_code: string|null, game_type: string|null, push_data: array<string, mixed>}
 */
class NotificationPresenter
{
    /**
     * @param  array<string, mixed>  $data
     * @return Presented
     */
    public static function present(array $data, ?string $locale = null): array
    {
        $kind = (string) ($data['kind'] ?? '');
        $code = isset($data['game_code']) ? (string) $data['game_code'] : null;
        $type = isset($data['game_type']) ? (string) $data['game_type'] : null;
        $title = (string) ($data['game_title'] ?? '');
        $home = match ($type) {
            'phrase' => '/games/phrase',
            'song' => '/games/song',
            'finish' => '/games/finish',
            'meaning' => '/games/meaning',
            'emotion' => '/games/emotion',
            'meme' => '/games/meme',
            default => '/games/spy',
        };
        $lobby = $code ? "/games/{$code}" : $home;
        $t = fn (string $key, array $replace = []) => __($key, $replace, $locale);

        [$heading, $body, $link, $pushData] = match ($kind) {
            'invitation' => [
                $t('New operation invite'),
                $t(':codename invited you to :title', ['codename' => $data['from_codename'] ?? '', 'title' => $title]),
                $home,
                ['type' => 'invitation', 'invitation_id' => $data['invitation_id'] ?? null, 'code' => $code, 'game_type' => $type],
            ],
            'join_request' => [
                $t('Someone wants to join'),
                $t(':codename asked to join :title', ['codename' => $data['from_codename'] ?? '', 'title' => $title]),
                $lobby,
                ['type' => 'join_request', 'code' => $code],
            ],
            'join_answered' => ! empty($data['approved']) ? [
                $t('You are in!'),
                $t('The host let you into :title.', ['title' => $title]),
                $lobby,
                ['type' => 'round', 'code' => $code],
            ] : [
                $t('Request declined'),
                $t('The host of :title turned down your request.', ['title' => $title]),
                $home,
                ['type' => 'home', 'game_type' => $type],
            ],
            'invitation_answered' => [
                ! empty($data['accepted']) ? $t('Invitation accepted') : $t('Invitation declined'),
                ! empty($data['accepted'])
                    ? $t(':codename accepted your invitation to :title.', ['codename' => $data['from_codename'] ?? '', 'title' => $title])
                    : $t(':codename declined your invitation to :title.', ['codename' => $data['from_codename'] ?? '', 'title' => $title]),
                $lobby,
                ['type' => 'game', 'code' => $code],
            ],
            'your_turn' => [
                $t('Your turn to ask'),
                $t('Ask another player a question about their word in :title.', ['title' => $title]),
                $lobby,
                ['type' => 'game', 'code' => $code],
            ],
            'round_ended' => [
                $t('Round :number is over', ['number' => $data['number'] ?? 1]),
                match (true) {
                    $type === 'song' && filled($data['song_winners'] ?? null) => $t(':names sang best in :title!', ['names' => $data['song_winners'], 'title' => $title]),
                    $type === 'song' => $t('Nobody got a vote in :title.', ['title' => $title]),
                    $type === 'finish' && filled($data['finish_winners'] ?? null) => $t(':names wrote the best ending in :title!', ['names' => $data['finish_winners'], 'title' => $title]),
                    $type === 'finish' => $t('Nobody got a vote in :title.', ['title' => $title]),
                    $type === 'meaning' && filled($data['finish_winners'] ?? null) => $t(':names gave the best interpretation in :title!', ['names' => $data['finish_winners'], 'title' => $title]),
                    $type === 'meaning' => $t('Nobody got a vote in :title.', ['title' => $title]),
                    $type === 'meme' && filled($data['finish_winners'] ?? null) => $t(':names made the best meme in :title!', ['names' => $data['finish_winners'], 'title' => $title]),
                    $type === 'meme' => $t('Nobody got a vote in :title.', ['title' => $title]),
                    $type === 'emotion' && filled($data['emotion_winners'] ?? null) => $t(':names named the emotion in :title.', ['names' => $data['emotion_winners'], 'title' => $title]),
                    $type === 'emotion' => $t('Nobody named the emotion in :title.', ['title' => $title]),
                    ($data['winning_team'] ?? null) === 'spies' => $t('The spies won in :title.', ['title' => $title]),
                    ($data['winning_team'] ?? null) === 'loyalists' => $t('The loyalists won in :title.', ['title' => $title]),
                    ($data['phrase_ending'] ?? null) === 'guessed' => $t(':codename guessed the phrase in :title!', ['codename' => $data['winner_codename'] ?? '', 'title' => $title]),
                    ($data['phrase_ending'] ?? null) === 'time_up' => $t("Time's up in :title. Nobody guessed the phrase.", ['title' => $title]),
                    default => $t('The host revealed the phrase in :title.', ['title' => $title]),
                },
                $lobby,
                ['type' => 'game', 'code' => $code],
            ],
            'your_turn_sing' => [
                $t('Your turn to sing'),
                $t('Sing how the clip goes on in :title.', ['title' => $title]),
                $lobby,
                ['type' => 'game', 'code' => $code],
            ],
            'ready_to_start' => [
                $t('Ready to start'),
                $t(':count players are in :title. You can start.', ['count' => $data['count'] ?? 0, 'title' => $title]),
                $lobby,
                ['type' => 'game', 'code' => $code],
            ],
            'player_left' => [
                $t('A player left'),
                $t(':codename left :title.', ['codename' => $data['from_codename'] ?? '', 'title' => $title]),
                $lobby,
                ['type' => 'game', 'code' => $code],
            ],
            'round_started' => [
                $t('Round :number has begun', ['number' => $data['number'] ?? 1]),
                match ($type) {
                    'phrase' => $t('Open :title to see your word.', ['title' => $title]),
                    'song' => $t('Open :title to hear the clip.', ['title' => $title]),
                    'finish' => $t('Open :title and finish the phrase.', ['title' => $title]),
                    'meaning' => $t('Open :title and interpret the phrase.', ['title' => $title]),
                    'emotion' => $t('Open :title and name the emotion.', ['title' => $title]),
                    'meme' => $t('Open :title and caption the picture.', ['title' => $title]),
                    default => $t('Open :title to see your role.', ['title' => $title]),
                },
                $lobby,
                ['type' => 'round', 'code' => $code],
            ],
            'removed' => [
                $t('Removed from a game'),
                $t('The host removed you from :title.', ['title' => $title]),
                $home,
                ['type' => 'home', 'game_type' => $type],
            ],
            'game_closed' => [
                $t('Game closed'),
                $t('The host closed :title.', ['title' => $title]),
                $home,
                ['type' => 'home', 'game_type' => $type],
            ],
            'became_host' => [
                $t('You are the host now'),
                $t('You now host :title.', ['title' => $title]),
                $lobby,
                ['type' => 'game', 'code' => $code],
            ],
            default => [$title, '', $home, ['type' => 'home']],
        };

        return [
            'kind' => $kind,
            'title' => $heading,
            'body' => $body,
            'link' => $link,
            'game_code' => $code,
            'game_type' => $type,
            'push_data' => $pushData,
        ];
    }
}
