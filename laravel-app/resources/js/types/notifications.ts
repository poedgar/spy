export type NotificationKind =
    | 'invitation'
    | 'join_request'
    | 'join_answered'
    | 'round_started'
    | 'removed'
    | 'became_host'
    | 'game_closed'
    | 'invitation_answered'
    | 'round_ended'
    | 'ready_to_start'
    | 'player_left';

/** A notification as the server presents it, in the reader's language. */
export interface AppNotification {
    id: string;
    kind: NotificationKind;
    title: string;
    body: string;
    link: string;
    game_code: string | null;
    game_type: 'spy' | 'phrase' | null;
    read_at: string | null;
    created_at: string | null;
}

export interface NotificationFeed {
    unread_count: number;
    notifications: AppNotification[];
}
