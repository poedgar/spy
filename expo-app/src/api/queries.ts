import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { gamesApi } from './endpoints';
import type { CreateGameInput, Game } from './types';

export const queryKeys = {
  spyHome: ['spyHome'] as const,
  game: (code: string) => ['game', code] as const,
  invitable: (code: string) => ['invitable', code] as const,
};

export function useSpyHome() {
  return useQuery({ queryKey: queryKeys.spyHome, queryFn: gamesApi.spyHome });
}

export function useGame(code: string) {
  return useQuery({ queryKey: queryKeys.game(code), queryFn: () => gamesApi.show(code) });
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

// mutationFn receives a second context argument in TanStack Query 5, so the
// endpoints are wrapped to pass only the variables through.
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
