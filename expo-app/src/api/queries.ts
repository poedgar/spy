import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { gamesApi } from './endpoints';
import type { AgeTier, CreateGameInput, Game } from './types';

export const queryKeys = {
  spyHome: ['spyHome'] as const,
  game: (code: string) => ['game', code] as const,
  invitable: (code: string) => ['invitable', code] as const,
  locations: (tier: AgeTier) => ['locations', tier] as const,
};

export function useSpyHome() {
  return useQuery({ queryKey: queryKeys.spyHome, queryFn: gamesApi.spyHome });
}

export function useGame(code: string) {
  return useQuery({ queryKey: queryKeys.game(code), queryFn: () => gamesApi.show(code) });
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

export function useInvitableUsers(code: string) {
  return useQuery({ queryKey: queryKeys.invitable(code), queryFn: () => gamesApi.invitableUsers(code) });
}

function useCacheLobby() {
  const queryClient = useQueryClient();
  return (game: Game) => {
    queryClient.setQueryData(queryKeys.game(game.code), game);
    void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
  };
}

export function useCreateGame() {
  return useMutation({ mutationFn: (input: CreateGameInput) => gamesApi.create(input), onSuccess: useCacheLobby() });
}

export function useJoinGame() {
  return useMutation({ mutationFn: (code: string) => gamesApi.join(code), onSuccess: useCacheLobby() });
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

export function useInvite(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toUserId: number) => gamesApi.invite(code, toUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitable(code) }),
  });
}

type LobbyAction =
  | { type: 'ready' | 'start' | 'voting' | 'tally' | 'reset' }
  | { type: 'vote'; suspectId: number };

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

export function useLeaveGame(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gamesApi.leave(code),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.game(code) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
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
