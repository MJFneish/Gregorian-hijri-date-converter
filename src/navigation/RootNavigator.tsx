import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from './MainTabs';
import OnboardingScreen from '../screens/OnboardingScreen';
import BirthdayScreen from '../screens/tools/BirthdayScreen';
import CompareOfficesScreen from '../screens/tools/CompareOfficesScreen';
import CrescentScreen from '../screens/tools/CrescentScreen';
import DaysBetweenScreen from '../screens/tools/DaysBetweenScreen';
import FastingScreen from '../screens/tools/FastingScreen';
import OccasionsScreen from '../screens/tools/OccasionsScreen';
import { useDirection } from '../hooks/useDirection';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../theme/useTheme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Native headers are off everywhere (custom headers + JS-driven RTL, same as the sibling apps).
 * Mounted only after the settings store has hydrated, so `initialRouteName` sees the real
 * onboarding flag. Tool pages slide in from the reading direction's end (right in English,
 * left in Arabic), since native RTL is off and the stack doesn't mirror on its own. */
export function RootNavigator() {
  const onboardingDone = useSettingsStore(s => s.onboardingDone);
  const { colors } = useTheme();
  const { isRTL } = useDirection();
  const toolPage = { animation: isRTL ? 'slide_from_left' : 'slide_from_right' } as const;
  return (
    <Stack.Navigator
      initialRouteName={onboardingDone ? 'Main' : 'Onboarding'}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade' }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="CompareOffices" component={CompareOfficesScreen} options={toolPage} />
      <Stack.Screen name="Occasions" component={OccasionsScreen} options={toolPage} />
      <Stack.Screen name="Birthday" component={BirthdayScreen} options={toolPage} />
      <Stack.Screen name="Fasting" component={FastingScreen} options={toolPage} />
      <Stack.Screen name="Crescent" component={CrescentScreen} options={toolPage} />
      <Stack.Screen name="DaysBetween" component={DaysBetweenScreen} options={toolPage} />
    </Stack.Navigator>
  );
}
