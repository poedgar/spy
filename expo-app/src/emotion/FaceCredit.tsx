import { Linking } from 'react-native';
import { AppText } from '@/components/AppText';
import { useI18n } from '@/i18n/I18nProvider';

/** The faces are CC BY: their authors must be credited where they're shown. */
export function FaceCredit() {
  const { t } = useI18n();

  return (
    <AppText
      testID="face-credit"
      variant="muted"
      style={{ fontSize: 12 }}
      onPress={() => void Linking.openURL('https://doi.org/10.1371/journal.pone.0231266')}
    >
      {t('Faces:')} UIBVFED — M. Mascaró Oliver, E. Amengual Alcover (2020), Universitat de les Illes Balears, CC BY.{' '}
      {t(
        'Expressions built from the Facial Action Coding System; levels are checked against how often players name each face right.',
      )}
    </AppText>
  );
}
