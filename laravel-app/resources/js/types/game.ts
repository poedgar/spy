import type { Localized } from '@/composables/useTrans';

export type GameStatus = 'recruiting' | 'active' | 'voting' | 'completed';
export type GameMode = 'mole' | 'codebreaker' | 'counterintel';
export type AgeTier = 'children' | 'teens' | 'adults';
export type Team = 'spies' | 'loyalists';

export interface Operative {
    id: number;
    name: string;
    codename: string;
}

export interface Player {
    id: number;
    user: Operative;
    is_host: boolean;
    status: 'ready' | 'pending';
    score: number;
    joined_at: string;
}

export interface Place extends Localized {
    id: number;
    category: string;
}

export interface RoundResult {
    ending: 'vote' | 'spy_guess' | 'abandoned';
    winning_team: Team | null;
    spy_user_ids: number[];
    accused_user_id: number | null;
    guessed_by_user_id: number | null;
    guessed_location: Place | null;
    votes: { voter_id: number; suspect_id: number }[];
    vote_counts: Record<number, number>;
}

export interface Round {
    number: number;
    spy_count: number;
    started_at: string;
    ends_at: string | null;
    voting_started_at: string | null;
    ended_at: string | null;
    my_role: 'spy' | 'loyalist' | null;
    location: Place | null;
    voted_user_ids: number[];
    my_vote: number | null;
    result: RoundResult | null;
}

export interface PhraseRound {
    number: number;
    language: 'en' | 'uk';
    word_count: number;
    started_at: string;
    ends_at: string | null;
    ended_at: string | null;
    my_word: string | null;
    my_position: number | null;
    question_round: number;
    asker_user_id: number | null;
    turn_order: number[];
    scoring: { win: number; wrong_guess: number };
    guesses: { user_id: number; guess: string; correct: boolean }[];
    result: {
        ending: 'guessed' | 'revealed' | 'time_up' | 'abandoned';
        winner_user_id: number | null;
        phrase: string;
        words: { position: number; word: string; user_id: number | null }[];
    } | null;
}

/** The games on offer. */
export type GameType =
    | 'spy'
    | 'phrase'
    | 'song'
    | 'finish'
    | 'meaning'
    | 'emotion'
    | 'meme';

/** The six basic emotions, plus neutral. */
export type Emotion =
    | 'joy'
    | 'sadness'
    | 'anger'
    | 'fear'
    | 'surprise'
    | 'disgust'
    | 'neutral';

/** Name the Emotion's levels: 1 easy, 2 medium, 3 hard. */
export type EmotionLevel = 1 | 2 | 3;

/** One player's view of a Name the Emotion round. */
export interface EmotionRound {
    number: number;
    level: EmotionLevel;
    image_url: string;
    options: Emotion[];
    answered_user_ids: number[];
    my_answer: Emotion | null;
    scoring: { win: number };
    started_at: string;
    ended_at: string | null;
    /** The right emotion and everyone's picks, after the reveal. */
    result: {
        ending: 'revealed' | 'abandoned';
        emotion: Emotion;
        variant: string;
        answers: { user_id: number; emotion: Emotion; correct: boolean }[];
        /** Across all games so far: share of answers naming this face right. */
        hit_rate: number | null;
        answers_so_far: number;
    } | null;
}

/** One player's view of a Sing It Out round. */
export interface SongRound {
    number: number;
    /** The YouTube player for the clip's stretch of the video. */
    clip_url: string | null;
    turn_order: number[];
    singer_user_id: number | null;
    sung_count: number;
    voted_user_ids: number[];
    my_vote: number | null;
    scoring: { win: number };
    started_at: string;
    voting_started_at: string | null;
    ended_at: string | null;
    /** The song's name stays hidden until the round ends. */
    result: {
        ending: 'voted' | 'abandoned';
        title: string | null;
        artist: string | null;
        winner_user_ids: number[];
        votes: { user_id: number; votes: number }[];
    } | null;
}

/** An ending in the vote: nameless until the round ends. */
export interface FinishAnswer {
    position: number;
    text: string;
    mine: boolean;
    user_id: number | null;
    votes: number | null;
}

/** One player's view of a written round (Finish or Interpret the Phrase). */
export interface FinishRound {
    number: number;
    prompt: string;
    max_length: number;
    min_answers: number;
    /** Meme It: the picture to caption, and the credit its licence asks for. */
    image_url: string | null;
    credit: string | null;
    source_url: string | null;
    answered_user_ids: number[];
    my_answer: string | null;
    /** Shuffled, once the vote opens. */
    answers: FinishAnswer[] | null;
    voted_user_ids: number[];
    /** The position of the ending I voted for. */
    my_vote: number | null;
    scoring: { win: number };
    started_at: string;
    voting_started_at: string | null;
    ended_at: string | null;
    result: {
        ending: 'voted' | 'abandoned';
        /** What an interpreted phrase really means, when known. */
        meaning: string | null;
        winner_user_ids: number[];
    } | null;
}

export interface Game {
    id: number;
    code: string;
    title: string;
    game_type: GameType;
    game_mode: GameMode;
    phrase_language: 'en' | 'uk' | null;
    emotion_level?: EmotionLevel | null;
    max_allowed_players: number;
    age_tier: AgeTier;
    max_players: number;
    min_players: number;
    mission_briefing: string | null;
    status: GameStatus;
    host_id: number;
    player_count: number;
    spy_count: number;
    host: Operative;
    players: Player[];
    requires_approval: boolean;
    is_listed: boolean;
    /** LiveKit is configured, so the lobby offers voice chat. */
    voice_enabled: boolean;
    /** The viewer is the host and no round has started yet. */
    can_rename?: boolean;
    /** Host only. */
    join_requests?: { id: number; user: Operative; created_at: string }[];
    /** Host only: invitations not (yet) accepted. */
    invitations?: {
        id: number;
        status: 'pending' | 'declined';
        user: Operative;
        updated_at: string;
    }[];
    round: Round | null;
    phrase?: PhraseRound | null;
    song?: SongRound | null;
    finish?: FinishRound | null;
    emotion?: EmotionRound | null;
    /** Seconds per round, or null for no timer. */
    round_seconds: number | null;
    /** Earlier rounds, newest first (the one on show is left out). */
    history?: {
        number: number;
        ending: string;
        ended_at: string | null;
        // Spy
        winning_team?: Team | null;
        location?: Place | null;
        spy_user_ids?: number[];
        // Phrase
        phrase?: string;
        winner_user_id?: number | null;
        // Sing It Out
        song?: string | null;
        artist?: string | null;
        winner_user_ids?: number[];
        // Name the Emotion
        emotion?: Emotion;
        image_url?: string;
        // Finish the Phrase
        prompt?: string;
        best_answer?: string | null;
    }[];
}

export type Categories = Record<string, Localized>;

/** A game looking for players, as listed to someone not in it. */
export interface OpenGame {
    id: number;
    code: string;
    title: string;
    game_type: GameType;
    game_mode: GameMode | null;
    age_tier: AgeTier;
    phrase_language: 'en' | 'uk' | null;
    emotion_level?: EmotionLevel | null;
    player_count: number;
    max_players: number;
    host_codename: string;
    my_request: 'pending' | 'accepted' | 'declined' | null;
}
