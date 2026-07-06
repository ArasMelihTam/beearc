import '@/src/i18n'; // initialize translations before anything renders
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/src/theme/useTheme';

export default function RootLayout() {
  const { scheme, tokens } = useTheme();
  return (
    <>
      {/* Status bar text flips color so it stays readable in both themes */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.background },
        }}
      />
    </>
  );
}
