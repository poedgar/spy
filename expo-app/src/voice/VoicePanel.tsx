import {
  AudioSession,
  LiveKitRoom,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
} from '@livekit/react-native';
import type { Participant } from 'livekit-client';
import { useEffect, useState } from 'react';
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

/**
 * Voice chat for a game's players, in its lobby. Audio flows between the
 * phone and LiveKit; the server only signs the token. Leaving the lobby
 * leaves the call.
 */
export function VoicePanel({ code }: { code: string }) {
  const { t } = useI18n();
  const [access, setAccess] = useState<VoiceAccess | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setJoining(true);
    setError(null);
    try {
      const next = await gamesApi.voice(code);
      await AudioSession.startAudioSession();
      setAccess(next);
    } catch (caught) {
      setError(applyServerErrors(caught, () => {}, []) ?? t('Could not join voice chat.'));
    } finally {
      setJoining(false);
    }
  };

  const leave = () => setAccess(null);

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
          onDisconnected={leave}
          onError={() => {
            setError(t('Could not join voice chat.'));
            leave();
          }}
        >
          <VoiceRoom onLeave={leave} />
        </LiveKitRoom>
      ) : (
        <>
          <AppText variant="muted">{t('Talk with the other players while you play.')}</AppText>
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
