import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import { CustomTabBar } from '../components/CustomTabBar';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ScanTabScreen } from '../screens/scan/ScanTabScreen';
import { VaultScreen } from '../screens/vault/VaultScreen';
import { RemindersScreen } from '../screens/reminders/RemindersScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scan" component={ScanTabScreen} />
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
