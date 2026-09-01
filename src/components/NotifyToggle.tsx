import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * The bell (M6d, made icon-only in M6e): should the phone ring on the due
 * date?
 *
 * Muting changes NOTHING about the task itself — it still sits on Today, it
 * still needs checking off, the assistant still tracks it. This is only
 * about being interrupted.
 *
 * It is an icon and nothing else (user request): a paragraph explaining the
 * bell on every single form is noise once you have read it once. The
 * explanation appears on the FIRST tap only, then never again — the same
 * one-time-hint pattern as the swipe hint on Today, stored in settings.
 */
export function NotifyToggle({
  value,
  onChange,
  hintKey,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  /** Which one-time explanation to show: the task one or the treatment one. */
  hintKey: 'notify.taskHint' | 'notify.treatmentHint';
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  // null until read; avoids showing the hint before we know it was seen.
  const [hintSeen, setHintSeen] = useState<boolean | null>(null);

  useEffect(() => {
    settingsRepo.get(SETTING_KEYS.notifyHintSeen).then((v) => setHintSeen(v === '1'));
  }, []);

  const press = () => {
    const next = !value;
    onChange(next);
    // First tap ever: say what the bell does, once. The toggle has already
    // happened, so the message describes the state you are now in.
    if (hintSeen === false) {
      setHintSeen(true);
      void settingsRepo.set(SETTING_KEYS.notifyHintSeen, '1');
      Alert.alert(t(next ? 'notify.on' : 'notify.off'), t(hintKey));
    }
  };

  const color = value ? tokens.primary : tokens.statusWarning;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        // The label carries the words the button no longer shows, so a
        // screen reader still says which state it is in.
        accessibilityLabel={t(value ? 'notify.on' : 'notify.off')}
        accessibilityHint={t(hintKey)}
        onPress={press}
        style={[styles.button, { backgroundColor: tokens.surface, borderColor: color }]}
      >
        <MaterialCommunityIcons
          name={value ? 'bell-outline' : 'bell-off-outline'}
          size={26}
          color={color}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', marginTop: sp(2) },
  button: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
