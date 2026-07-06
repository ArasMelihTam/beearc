import { Tabs } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/useTheme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function TabsLayout() {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  const icon =
    (name: IconName) =>
    ({ color, size }: { color: string; size: number }) => (
      <MaterialCommunityIcons name={name} size={size} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.textMuted,
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.today'), tabBarIcon: icon('calendar-check') }}
      />
      <Tabs.Screen
        name="hives"
        options={{ title: t('tabs.hives'), tabBarIcon: icon('beehive-outline') }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: t('tabs.map'), tabBarIcon: icon('map-outline') }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t('tabs.more'), tabBarIcon: icon('dots-horizontal') }}
      />
    </Tabs>
  );
}
