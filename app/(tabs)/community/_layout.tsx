import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function CommunityLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.background,
        },
        headerTintColor: Colors.light.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Community' }} />
      <Stack.Screen name="user/[userId]" options={{ title: 'Profile' }} />
    </Stack>
  );
}
