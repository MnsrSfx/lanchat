import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function ChatsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Chats' }} />
    </Stack>
  );
}
