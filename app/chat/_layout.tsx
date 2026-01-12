import { Stack } from 'expo-router/stack';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { ArrowLeft, Phone, Video, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native'; // Alert için eklendi

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#000000',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="index"
        options={({ route }) => {
          const router = useRouter(); // router'ı burada tanımlıyoruz
          const { otherUserId, otherUserName = 'Sohbet', otherUserPhoto } = route.params || {};

          return {
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ marginLeft: 10, padding: 8 }}
              >
                <ArrowLeft size={28} color="#000" />
              </TouchableOpacity>
            ),

            headerTitle: () => (
              <TouchableOpacity
                onPress={() => {
                  if (otherUserId) {
                    router.push(`/profile/${otherUserId}`);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Image
                  source={{
                    uri: otherUserPhoto || 'https://via.placeholder.com/40?text=User',
                  }}
                  style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                />
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>
                    {otherUserName}
                  </Text>
                  {/* Online durumu varsa buraya ekleyebilirsin */}
                </View>
              </TouchableOpacity>
            ),

            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => Alert.alert('Info', 'Profil bilgileri açılıyor...')}
                  style={{ marginRight: 16 }}
                >
                  <Info size={24} color="#000" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => Alert.alert('Sesli Arama', 'Çağrı başlatılıyor...')}
                  style={{ marginRight: 16 }}
                >
                  <Phone size={24} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => Alert.alert('Görüntülü Arama', 'Video çağrı başlatılıyor...')}
                >
                  <Video size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ),
          };
        }}
      />
    </Stack>
  );
}
