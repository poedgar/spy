import { act, fireEvent, screen, within } from 'expo-router/testing-library';

/** Presses a button in the app's open confirmation dialog, by its label. */
export async function answerDialog(label: string): Promise<void> {
  const dialog = await screen.findByTestId('dialog');
  await act(async () => {
    fireEvent.press(within(dialog).getByRole('button', { name: label }));
  });
}
