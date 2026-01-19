import { Tabs } from 'expo-router';
import React from 'react';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="drinks"
        options={{
          title: '記録',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>📝</Text>,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'イベント',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🎉</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="events/create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="events/[id]/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="events/[id]/invite"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="events/[id]/add-drink"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="events/[id]/approvals"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="events/[id]/ranking"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="drinks/add-personal"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="drinks/add-custom-drink"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
