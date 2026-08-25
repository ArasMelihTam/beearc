import { useRef, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * The app's one swipe gesture, in one place.
 *
 *   swipe RIGHT → edit   (opens straight away, no button)
 *   swipe LEFT  → delete (reveals a red button: destructive gets one
 *                         confirming tap, editing doesn't)
 *
 * WHY THE WIRING LOOKS BACKWARDS. A panel passed to `renderLeftActions` sits
 * on the LEFT of the row, so you expose it by dragging the row RIGHTWARD.
 * And `onSwipeableOpen(direction)` reports the PHYSICAL drag direction, not
 * the panel side — verified in react-native-gesture-handler@2.28.0,
 * `ReanimatedSwipeable.js:86`: `onSwipeableOpen(toValue > 0 ? RIGHT : LEFT)`,
 * where `toValue = leftWidth` (positive) on a rightward drag.
 *
 * So: left panel = edit, and `direction === 'right'` is the drag that opens
 * it. Both halves say "right = edit". Every row in the app goes through this
 * component, so the gesture can never mean one thing on Today and another on
 * a hive screen — which is exactly how the old copy-pasted wiring drifted
 * out of step with its own on-screen hint.
 */
export function SwipeableRow({
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  /**
   * Match the row's own bottom margin, or the panels stand taller than the
   * row they belong to. Lists that space their rows with `gap` pass nothing.
   */
  marginBottom = 0,
  children,
}: {
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  marginBottom?: number;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);

  // Left panel: honey gold. Purely visual feedback under the thumb — the
  // editor opens on release, so there is nothing here to tap.
  const editPanel = () => (
    <View style={[styles.panel, { backgroundColor: tokens.primary, marginBottom }]}>
      <MaterialCommunityIcons name="pencil" size={26} color={tokens.onPrimary} />
      <Text style={[styles.panelLabel, { color: tokens.onPrimary }]}>{editLabel}</Text>
    </View>
  );

  // Right panel: red, and a real button. Nothing is removed until it's tapped.
  const deletePanel = () => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={deleteLabel}
      onPress={onDelete}
      style={[styles.panel, { backgroundColor: tokens.danger, marginBottom }]}
    >
      <MaterialCommunityIcons name="trash-can-outline" size={26} color={tokens.onDanger} />
      <Text style={[styles.panelLabel, { color: tokens.onDanger }]}>{deleteLabel}</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={editPanel}
      renderRightActions={deletePanel}
      leftThreshold={96}
      overshootRight={false}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          swipeRef.current?.close(); // row is back to normal when you return
          onEdit();
        }
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 96,
    borderRadius: sizes.radius,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(1),
  },
  panelLabel: { fontSize: sizes.fontLabel, fontWeight: '700' },
});
