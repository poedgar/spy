import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { BannerProvider, useBanner } from '@/banner/BannerProvider';

function Trigger({ onPress }: { onPress: () => void }) {
  const { showBanner } = useBanner();
  return (
    <Pressable testID="trigger" onPress={() => showBanner({ message: 'SHADOW_FOX invited you', onPress })}>
      <Text>trigger</Text>
    </Pressable>
  );
}

test('shows a banner, runs its action on press, and auto-dismisses', () => {
  jest.useFakeTimers();
  const onPress = jest.fn();
  render(
    <BannerProvider>
      <Trigger onPress={onPress} />
    </BannerProvider>,
  );

  fireEvent.press(screen.getByTestId('trigger'));
  fireEvent.press(screen.getByText('SHADOW_FOX invited you'));
  expect(onPress).toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('trigger'));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.queryByText('SHADOW_FOX invited you')).toBeNull();
  jest.useRealTimers();
});
