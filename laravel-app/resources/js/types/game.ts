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
    ended_at: string | null;
    my_word: string | null;
    my_position: number | null;
    question_round: number;
    asker_user_id: number | null;
    turn_order: number[];
    scoring: { win: number; wrong_guess: number };
    guesses: { user_id: number; guess: string; correct: boolean }[];
    result: {
        ending: 'guessed' | 'abandoned';
        winner_user_id: number | null;
        phrase: string;
        words: { position: number; word: string; user_id: number | null }[];
    } | null;
}

export interface Game {
    id: number;
    code: string;
    title: string;
    game_type: 'spy' | 'phrase';
    game_mode: GameMode;
    phrase_language: 'en' | 'uk' | null;
    max_allowed_players: number;
    age_tier: AgeTier;
    max_players: number;
    min_players: number;
    mission_briefing: string;
    status: GameStatus;
    host_id: number;
    player_count: number;
    spy_count: number;
    host: Operative;
    players: Player[];
    requires_approval: boolean;
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
}

export type Categories = Record<string, Localized>;
