import { View, Text, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Video, Info } from 'lucide-react-native';
import { useState } from 'react';

// ... diğer import'lar (FlatList, input vs. senin chat UI'n)

export default function ChatScreen() {
  const router = useRouter();
  const { otherUserId, otherUserName = 'Novi Yulianti', otherUserPhoto } = useLocalSearchParams();

  const [showFullImage, setShowFullImage] = useState(false);

  const goToProfile = () => {
    if (otherUserId) router.push(`/profile/${otherUserId}`);
    else Alert.alert('Uyarı', 'Kullanıcı profili bulunamadı.');
  };

  const handleVoiceCall = () => {
    Alert.alert('Sesli Arama', 'Çağrı başlatılıyor... (Agora/WebRTC entegrasyonu ekle)');
  };

  const handleVideoCall = () => {
    Alert.alert('Görüntülü Arama', 'Video çağrı başlatılıyor...');
  };

  return (
    <>
      {/* Custom Header - Default'u tamamen kapatıyoruz */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 50, // Notch/status bar için
          paddingBottom: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#ddd',
        }}
      >
        {/* Sol üst: Geri butonu (her zaman görünür) */}
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <ArrowLeft size={28} color="#000" />
        </TouchableOpacity>

        {/* Orta: Profil resmi + İsim */}
        <TouchableOpacity
          onPress={goToProfile}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
        >
          <TouchableOpacity onPress={() => setShowFullImage(true)}>
            <Image
              source={{ uri: otherUserPhoto || 'https://via.placeholder.com/50' }}
              style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
            />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{otherUserName}</Text>
            <Text style={{ fontSize: 12, color: 'green' }}>Online</Text>
          </View>
        </TouchableOpacity>

        {/* Sağ: Info + Telefon + Kamera (çalışır halde) */}
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={goToProfile} style={{ padding: 8, marginRight: 12 }}>
            <Info size={26} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVoiceCall} style={{ padding: 8, marginRight: 12 }}>
            <Phone size={26} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVideoCall} style={{ padding: 8 }}>
            <Video size={26} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Senin chat içeriği (mesajlar, input vs.) buraya devam */}
      {/* ... FlatList mesajlar, alt input alanı ... */}

      {/* Resim büyütme modal */}
      <Modal visible={showFullImage} transparent onRequestClose={() => setShowFullImage(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowFullImage(false)}
        >
          <Image
            source={{ uri: otherUserPhoto || 'https://via.placeholder.com/500' }}
            style={{ width: '90%', height: '90%', resizeMode: 'contain' }}
          />
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// Eğer Expo Router default header'ı hâlâ çıkıyorsa, dosyanın altına ekle:
ChatScreen.navigationOptions = {
  headerShown: false,
};
