import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import type { ChatMessage } from '@/api/types';
import { useSignedInUser } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormError } from '@/components/FormError';
import { TextField } from '@/components/TextField';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { useGameEvent, useRealtimeConnected } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/useTheme';

/** How often to check for messages while live updates are down. */
const FALLBACK_POLL_MS = 5000;
const MAX_LENGTH = 500;

const chatKey = (code: string) => ['chat', code] as const;

/** Adds messages the list doesn't have yet, keeping them in order. */
function merge(current: ChatMessage[] | undefined, incoming: ChatMessage[]): ChatMessage[] {
  const known = new Set((current ?? []).map((message) => message.id));
  return [...(current ?? []), ...incoming.filter((message) => !known.has(message.id))].sort((a, b) => a.id - b.id);
}

/** Text chat for the game's players, in the lobby. */
export function ChatPanel({ code, gameId }: { code: string; gameId: number }) {
  const { t } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const me = useSignedInUser();
  const queryClient = useQueryClient();
  const connected = useRealtimeConnected();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messages = useQuery({
    queryKey: chatKey(code),
    queryFn: () => gamesApi.messages(code),
    refetchInterval: connected ? false : FALLBACK_POLL_MS,
  });

  useGameEvent<{ message: ChatMessage }>(gameId, '.chat.message', ({ message }) =>
    queryClient.setQueryData<ChatMessage[]>(chatKey(code), (current) => merge(current, [message])),
  );

  const send = useMutation({
    mutationFn: (body: string) => gamesApi.postMessage(code, body),
    onSuccess: (message) => {
      setDraft('');
      queryClient.setQueryData<ChatMessage[]>(chatKey(code), (current) => merge(current, [message]));
    },
    onError: (caught) => setError(applyServerErrors(caught, () => {}, []) ?? t('Something went wrong.')),
  });

  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setError(null);
    send.mutate(body);
  };

  const list = messages.data ?? [];

  return (
    <Card testID="chat-panel">
      <AppText variant="heading">{t('Chat')}</AppText>
      <View testID="chat-messages" style={{ gap: spacing.sm }}>
        {list.length === 0 ? <AppText variant="muted">{t('No messages yet. Say hello!')}</AppText> : null}
        {list.map((message) => {
          const mine = message.user.id === me.id;
          return (
            <View
              key={message.id}
              testID={`chat-message-${message.id}`}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                backgroundColor: mine ? colors.secondary : colors.muted,
                borderRadius: radius.lg,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <AppText style={{ fontWeight: '600' }}>{message.user.codename}</AppText>
              <AppText>{message.body}</AppText>
            </View>
          );
        })}
      </View>
      <TextField
        testID="input-chat"
        label={t('Write a message')}
        value={draft}
        onChangeText={setDraft}
        maxLength={MAX_LENGTH}
        returnKeyType="send"
        onSubmitEditing={submit}
        submitBehavior="submit"
      />
      <FormError message={error} />
      <Button
        testID="btn-chat-send"
        label={t('Send')}
        loading={send.isPending}
        disabled={!draft.trim()}
        onPress={submit}
      />
    </Card>
  );
}
