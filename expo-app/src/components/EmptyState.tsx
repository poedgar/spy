import { AppText } from './AppText';

export function EmptyState({ message }: { message: string }) {
  return <AppText variant="muted">{message}</AppText>;
}
