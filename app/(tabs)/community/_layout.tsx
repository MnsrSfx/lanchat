import { Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
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
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Community',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : null}
              style={{ marginLeft: 8 }}
            >
              <ChevronLeft size={24} color={Colors.light.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <Stack.Screen name="user/[userId]" options={{ title: 'Profile' }} />
    </Stack>
  );
}
