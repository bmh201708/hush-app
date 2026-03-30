import { Tabs } from 'expo-router';
import React from 'react';

import { HushTabBar } from '@/components/hush/ui';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <HushTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Breath',
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Trends',
        }}
      />
      <Tabs.Screen
        name="device"
        options={{
          title: 'Device',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Zen',
        }}
      />
    </Tabs>
  );
}
