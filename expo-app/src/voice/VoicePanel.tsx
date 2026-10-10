import {
  AudioSession,
  LiveKitRoom,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
} from '@livekit/react-native';
import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import type { Participant } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import type { VoiceAccess } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormError } from '@/components/FormError';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

/** Joining voice once means joining it automatically next time, on this phone. */
export const AUTO_JOIN_KEY = 'voice.autoJoin';
/** How often the lobby checks who is in voice while you're not. */
const PARTICIPANTS_POLL_MS = 10000;

/**
 * Voice chat for a game's players, in its lobby. Audio flows between the
 * phone and LiveKit; the server only signs the token. Leaving the lobby
 * leaves the call (but not the habit: it rejoins next time).
 */
export function VoicePanel({ code }: { code: string }) {
  const { t } = useI18n();
  const [access, setAccess] = useState<VoiceAccess | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedAutoJoin = useRef(false);

  // Who's talking, seen from outside the room.
  const occupants = useQuery({
    queryKey: ['voice', code],
    queryFn: () => gamesApi.voiceParticipants(code),
    enabled: access === null,
    refetchInterval: access === null ? PARTICIPANTS_POLL_MS : false,
  });

  const join = useCallback(async () => {
    setJoining(true);
    setError(null);
    try {
      const next = await gamesApi.voice(code);
      await AudioSession.startAudioSession();
      setAccess(next);
      void SecureStore.setItemAsync(AUTO_JOIN_KEY, '1');
    } catch (caught) {
      setError(applyServerErrors(caught, () => {}, []) ?? t('Could not join voice chat.'));
    } finally {
      setJoining(false);
    }
  }, [code, t]);

  // Rejoin automatically if this phone was in voice last time.
  useEffect(() => {
    if (triedAutoJoin.current) return;
    triedAutoJoin.current = true;
    void SecureStore.getItemAsync(AUTO_JOIN_KEY).then((remembered) => {
      if (remembered === '1') void join();
    });
  }, [join]);

  /** The call ended (network, or the lobby closed): keep rejoining next time. */
  const disconnected = () => setAccess(null);
  /** Leaving on purpose also stops joining automatically. */
  const leave = () => {
    void SecureStore.deleteItemAsync(AUTO_JOIN_KEY);
    setAccess(null);
  };
  const names = (occupants.data ?? []).map((member) => member.name);

  // Hand the phone's audio back when the call ends or the lobby closes.
  useEffect(() => {
    if (!access) return;
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, [access]);

  return (
    <Card testID="voice-panel">
      <AppText variant="heading">{t('Voice chat')}</AppText>
      {access ? (
        <LiveKitRoom
          serverUrl={access.url}
          token={access.token}
          connect
          audio
          video={false}
          onDisconnected={disconnected}
          onError={() => {
            setError(t('Could not join voice chat.'));
            disconnected();
          }}
        >
          <VoiceRoom onLeave={leave} />
        </LiveKitRoom>
      ) : (
        <>
          {names.length > 0 ? (
            <AppText testID="voice-occupants">
              🎙 {t(':count in voice: :names', { count: names.length, names: names.join(', ') })}
            </AppText>
          ) : (
            <AppText variant="muted">{t('Talk with the other players while you play.')}</AppText>
          )}
          <FormError message={error} />
          <Button
            testID="btn-voice-join"
            label={joining ? t('Connecting…') : t('Join voice')}
            loading={joining}
            onPress={() => void join()}
          />
        </>
      )}
    </Card>
  );
}

function VoiceRoom({ onLeave }: { onLeave(): void }) {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  return (
    <>
      <View testID="voice-members" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {participants.map((participant) => (
          <Member
            key={participant.identity}
            participant={participant}
            isMe={participant.identity === localParticipant.identity}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            testID="btn-voice-mic"
            label={isMicrophoneEnabled ? t('Mute') : t('Unmute')}
            variant="secondary"
            onPress={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button testID="btn-voice-leave" label={t('Leave voice')} variant="secondary" onPress={onLeave} />
        </View>
      </View>
      <AppText variant="muted">{t("You'll rejoin voice automatically on this device. Leave voice to stop.")}</AppText>
    </>
  );
}

function Member({ participant, isMe }: { participant: Participant; isMe: boolean }) {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const speaking = useIsSpeaking(participant);
  const muted = !participant.isMicrophoneEnabled;

  return (
    <View
      testID={`voice-member-${participant.identity}`}
      style={{
        borderWidth: speaking ? 2 : 1,
        borderColor: speaking ? colors.online : colors.border,
        borderRadius: 999,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <AppText variant={muted ? 'muted' : 'body'}>
        {muted ? '🔇 ' : ''}
        {participant.name || participant.identity}
        {isMe ? ` (${t('you')})` : ''}
      </AppText>
    </View>
  );
}
