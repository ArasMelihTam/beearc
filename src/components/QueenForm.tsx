import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Queen, QueenInput } from '@/src/db/repos/queensRepo';
import { QUEEN_ORIGINS, type QueenOrigin } from '@/src/db/schema';
import { parseMarkColor, type QueenMarkColor } from '@/src/logic/queens';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';
import { ChipPicker } from './ChipPicker';
import { FormField } from './FormField';
import { MarkColorPicker } from './MarkColorPicker';
import { MonthYearPicker } from './MonthYearPicker';
import { PrimaryButton } from './PrimaryButton';
import { StarRating } from './StarRating';

/** Shared create/edit form for a queen. Same pattern as HiveForm. */
export function QueenForm({
  initial,
  onSubmit,
}: {
  initial?: Queen;
  onSubmit: (input: QueenInput) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [introducedAt, setIntroducedAt] = useState(
    initial?.introducedAt ?? new Date().toISOString()
  );
  const [origin, setOrigin] = useState<QueenOrigin>(initial?.origin ?? 'bought');
  // No color is preselected (user decision 2026-08-08): the app does not
  // guess a marking color from the year.
  const [markColor, setMarkColor] = useState<QueenMarkColor | null>(
    initial ? parseMarkColor(initial.markColor) : null
  );
  const [score, setScore] = useState<number | null>(initial?.productivityScore ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('queens.introduced')}
        </Text>
        <MonthYearPicker value={introducedAt} onChange={setIntroducedAt} />

        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('queens.origin')}
        </Text>
        <ChipPicker<QueenOrigin>
          options={QUEEN_ORIGINS}
          value={origin}
          onChange={(v) => {
            if (v !== null) setOrigin(v); // origin is required — no clearing
          }}
          getLabel={(v) => t(`queenOrigin.${v}`)}
        />

        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('queens.markColor')}
        </Text>
        <MarkColorPicker value={markColor} onChange={setMarkColor} />

        <StarRating label={t('queens.productivity')} value={score} onChange={setScore} />

        <FormField label={t('queens.notes')} value={notes} onChangeText={setNotes} multiline />
      </ScrollView>
      <PrimaryButton
        label={t('common.save')}
        icon="check"
        onPress={() =>
          onSubmit({
            introducedAt,
            origin,
            markColor,
            productivityScore: score,
            notes: notes || null,
          })
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: sp(4) },
  sectionLabel: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
    marginBottom: sp(2),
  },
  hint: { fontSize: sizes.fontLabel, lineHeight: 21, marginTop: sp(2) },
});
