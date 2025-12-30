import { Tabs } from 'expo-router';
import { Users, MessageCircle, User } from 'lucide-react-native';
import React from 'react';

import Colors from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.light.surface,
          borderTopColor: Colors.light.border,
        },
      }}
    >
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
