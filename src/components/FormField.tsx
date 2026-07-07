import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** Labeled text input: 48dp+ tall, 17pt text, themed for sunlight. */
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            color: tokens.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: sp(4) },
  label: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: sp(2),
  },
  input: {
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
    fontSize: sizes.fontBody,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
});
