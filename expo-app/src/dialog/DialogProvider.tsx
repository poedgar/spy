import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

export interface DialogButton {
  text: string;
  /** "cancel" also answers a tap outside the dialog or the Android back button. */
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

type ShowDialog = (request: DialogRequest) => void;

const DialogContext = createContext<ShowDialog>(() => {});

/**
 * The app's own confirmation dialog, in place of the system alert: themed,
 * translated buttons, and the same shape as Alert.alert's arguments.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();

  const answer = useCallback((button?: DialogButton) => {
    setRequest(null);
    button?.onPress?.();
  }, []);
  const cancel = () => answer(request?.buttons.find((button) => button.style === 'cancel'));
  // Two choices sit side by side; menus with more stack up.
  const inRow = (request?.buttons.length ?? 0) <= 2;

  return (
    <DialogContext.Provider value={setRequest}>
      {children}
      <Modal visible={request !== null} transparent animationType="fade" onRequestClose={cancel}>
        <Pressable
          testID="dialog-backdrop"
          accessibilityLabel={t('Close')}
          onPress={cancel}
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: spacing.xl }}
        >
          {request ? (
            // Taps inside the card must not close it.
            <Pressable
              testID="dialog"
              accessibilityViewIsModal
              onPress={() => {}}
              style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }}
            >
              <AppText variant="heading">{request.title}</AppText>
              {request.message ? <AppText variant="muted">{request.message}</AppText> : null}
              <View style={{ flexDirection: inRow ? 'row' : 'column', gap: spacing.sm }}>
                {request.buttons.map((button, index) => (
                  <View key={index} style={inRow ? { flex: 1 } : undefined}>
                    <Button
                      testID={`dialog-button-${index}`}
                      label={button.text}
                      variant={
                        button.style === 'destructive' ? 'destructive' : button.style === 'cancel' ? 'secondary' : 'primary'
                      }
                      onPress={() => answer(button)}
                    />
                  </View>
                ))}
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

/** Opens the app's dialog: `showDialog({ title, message, buttons })`. */
export function useDialog(): ShowDialog {
  return useContext(DialogContext);
}
