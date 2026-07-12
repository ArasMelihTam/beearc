import '@/src/i18n'; // initialize translations before anything renders
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DbProvider } from '@/src/db/DbProvider';
import { useTheme } from '@/src/theme/useTheme';

export default function RootLayout() {
  const { scheme, tokens } = useTheme();
  return (
    // Gesture-handler (swipe-to-delete, M4b) requires this root wrapper once,
    // at the very top of the tree — without it swipes are silently ignored.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DbProvider>
        {/* Status bar text flips color so it stays readable in both themes */}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: tokens.background },
          }}
        />
      </DbProvider>
    </GestureHandlerRootView>
  );
}
