import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from './MainTabs';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../theme/useTheme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Native headers are off everywhere (custom headers + JS-driven RTL, same as the sibling apps).
 * Mounted only after the settings store has hydrated, so `initialRouteName` sees the real
 * onboarding flag. */
export function RootNavigator() {
  const onboardingDone = useSettingsStore(s => s.onboardingDone);
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName={onboardingDone ? 'Main' : 'Onboarding'}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade' }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
