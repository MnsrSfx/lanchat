import { Stack } from 'expo-router/stack';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { ArrowLeft, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: true,
        headerTintColor: '#000000',
      }}
    >
      <Stack.Screen
        name="index"  // veya chat ekranın index.tsx ise
        options={({ route }) => {
          // route.params'tan karşı taraf bilgilerini al (sen chat'e giderken params geçeceksin)
          const { otherUserName, otherUserPhoto, otherUserId } = route.params || {};

          return {
            headerTitle: () => (
              <TouchableOpacity
                onPress={() => {
                  if (otherUserId) {
                    router.push(`/profile/${otherUserId}`);  // veya edit-profile'e yönlendir
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={{
                    uri: otherUserPhoto || 'https://via.placeholder.com/150?text=User',
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 12,
                  }}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#000',
                  }}
                >
                  {otherUserName || 'Sohbet'}
                </Text>
              </TouchableOpacity>
            ),
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                <ArrowLeft size={28} color="#000" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={() => {
                  if (otherUserId) {
                    router.push(`/profile/${otherUserId}`);
                  }
                }}
                style={{ marginRight: 16 }}
              >
                <Info size={28} color="#000" />
              </TouchableOpacity>
            ),
          };
        }}
      />
    </Stack>
  );
}
