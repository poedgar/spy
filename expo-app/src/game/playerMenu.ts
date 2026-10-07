import { Alert } from 'react-native';
import type { User } from '@/api/types';

type T = (key: string, replace?: Record<string, string | number>) => string;

/** The host's options for another player: hand over hosting, or remove them. */
export function openPlayerMenu(
  t: T,
  player: User,
  onAction: (action: { type: 'remove-player' | 'make-host'; userId: number }) => void,
): void {
  Alert.alert(player.codename, player.name, [
    { text: t('Make host'), onPress: () => onAction({ type: 'make-host', userId: player.id }) },
    { text: t('Remove from game'), style: 'destructive', onPress: () => onAction({ type: 'remove-player', userId: player.id }) },
    { text: t('Cancel'), style: 'cancel' },
  ]);
}
