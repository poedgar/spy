import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { gamesApi } from './endpoints';
import { type AgeTier, type CreateGameInput, type CreatePhraseGameInput, type Game, isJoinRequested } from './types';

export const queryKeys = {
  spyHome: ['spyHome'] as const,
  phraseHome: ['phraseHome'] as const,
  game: (code: string) => ['game', code] as const,
  invitable: (code: string, search = '') => ['invitable', code, search] as const,
  locations: (tier: AgeTier) => ['locations', tier] as const,
};

export function useSpyHome() {
  return useQuery({ queryKey: queryKeys.spyHome, queryFn: gamesApi.spyHome });
}

export function usePhraseHome() {
  return useQuery({ queryKey: queryKeys.phraseHome, queryFn: gamesApi.phraseHome });
}

/** How often a lobby refetches while realtime is unavailable. */
export const FALLBACK_POLL_MS = 5000;

export function useGame(code: string, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.game(code),
    queryFn: () => gamesApi.show(code),
    refetchInterval: options.poll ? FALLBACK_POLL_MS : false,
  });
}

/** The pool never changes during a session, so it is fetched once per tier. */
export function useLocations(tier: AgeTier | undefined) {
  return useQuery({
    queryKey: queryKeys.locations(tier ?? 'adults'),
    queryFn: () => gamesApi.locations(tier ?? 'adults'),
    enabled: tier !== undefined,
    staleTime: Infinity,
  });
}

/** Past teammates by default; a search of 2+ characters reaches anyone. */
export function useInvitableUsers(code: string, search = '') {
  const term = search.trim().length >= 2 ? search.trim() : '';
  return useQuery({
    queryKey: queryKeys.invitable(code, term),
    queryFn: () => gamesApi.invitableUsers(code, term),
    placeholderData: (previous) => previous,
  });
}

function useCacheLobby() {
  const queryClient = useQueryClient();
  return (game: Game) => {
    queryClient.setQueryData(queryKeys.game(game.code), game);
    void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
    void queryClient.invalidateQueries({ queryKey: queryKeys.phraseHome });
  };
}

export function useCreateGame() {
  return useMutation({ mutationFn: (input: CreateGameInput) => gamesApi.create(input), onSuccess: useCacheLobby() });
}

export function useCreatePhraseGame() {
  return useMutation({
    mutationFn: (input: CreatePhraseGameInput) => gamesApi.createPhrase(input),
    onSuccess: useCacheLobby(),
  });
}

/** Resolves to the lobby, or to a pending request when the host approves new players. */
export function useJoinGame() {
  const cacheLobby = useCacheLobby();
  return useMutation({
    mutationFn: (code: string) => gamesApi.join(code),
    onSuccess: (result) => {
      if (!isJoinRequested(result)) cacheLobby(result);
    },
  });
}

export function useAcceptInvitation() {
  return useMutation({ mutationFn: (invitationId: number) => gamesApi.accept(invitationId), onSuccess: useCacheLobby() });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) => gamesApi.decline(invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.spyHome }),
  });
}

/** Asking for (or withdrawing from) a seat in an open game refreshes both homes. */
export function useJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, cancel }: { code: string; cancel?: boolean }): Promise<void> => {
      if (cancel) await gamesApi.cancelJoinRequest(code);
      else await gamesApi.requestToJoin(code);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
      void queryClient.invalidateQueries({ queryKey: queryKeys.phraseHome });
    },
  });
}

export function useInvite(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toUserId: number) => gamesApi.invite(code, toUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitable', code] }),
  });
}

type LobbyAction =
  | { type: 'ready' | 'start' | 'voting' | 'tally' | 'reset' | 'phrase-start' | 'phrase-turn' }
  | { type: 'vote'; suspectId: number }
  | { type: 'approval'; requiresApproval: boolean }
  | { type: 'listing'; isListed: boolean }
  | { type: 'remove-player' | 'make-host'; userId: number }
  | { type: 'answer-request'; requestId: number; approve: boolean }
  | { type: 'cancel-invitation'; invitationId: number }
  | { type: 'reinvite'; userId: number };

/** Every lobby action answers with the caller's fresh view of the game. */
export function useLobbyAction(code: string) {
  return useMutation({
    mutationFn: (action: LobbyAction): Promise<Game> => {
      switch (action.type) {
        case 'ready':
          return gamesApi.toggleReady(code);
        case 'start':
          return gamesApi.startRound(code);
        case 'voting':
          return gamesApi.startVoting(code);
        case 'tally':
          return gamesApi.tally(code);
        case 'reset':
          return gamesApi.reset(code);
        case 'vote':
          return gamesApi.vote(code, action.suspectId);
        case 'phrase-start':
          return gamesApi.startPhrase(code);
        case 'phrase-turn':
          return gamesApi.passTurn(code);
        case 'approval':
          return gamesApi.updateSettings(code, { requires_approval: action.requiresApproval });
        case 'listing':
          return gamesApi.updateSettings(code, { is_listed: action.isListed });
        case 'remove-player':
          return gamesApi.removePlayer(code, action.userId);
        case 'make-host':
          return gamesApi.transferHost(code, action.userId);
        case 'answer-request':
          return gamesApi.answerJoinRequest(code, action.requestId, action.approve);
        case 'cancel-invitation':
          return gamesApi.cancelInvitation(code, action.invitationId);
        case 'reinvite':
          // Re-sending reuses the invitation and notifies the player again.
          return gamesApi.invite(code, action.userId).then(() => gamesApi.show(code));
      }
    },
    onSuccess: useCacheLobby(),
  });
}

export function useGuessLocation(code: string) {
  const cacheLobby = useCacheLobby();
  return useMutation({
    mutationFn: (locationId: number) => gamesApi.guess(code, locationId),
    onSuccess: ({ game }) => cacheLobby(game),
  });
}

export function useGuessPhrase(code: string) {
  const cacheLobby = useCacheLobby();
  return useMutation({
    mutationFn: (guess: string) => gamesApi.guessPhrase(code, guess),
    onSuccess: ({ game }) => cacheLobby(game),
  });
}

export function useLeaveGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gamesApi.leave(code),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.game(code) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
      void queryClient.invalidateQueries({ queryKey: queryKeys.phraseHome });
    },
  });
}

/** Refetch when a screen regains focus (skipping the initial focus, which already fetched). */
export function useRefreshOnFocus(refetch: () => unknown) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}
