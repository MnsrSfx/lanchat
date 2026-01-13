import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/firebase'; // firebase config'in yolunu kontrol et

export default function UserProfile() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError('Kullanıcı ID bulunamadı');
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            ...data,
            age: data.age || 'Belirtilmemiş',
            bio: data.bio || 'Bio eklenmemiş',
            displayName: data.displayName || data.email?.split('@')[0] || 'İsimsiz Kullanıcı',
            photoURL: data.photoURL || 'https://via.placeholder.com/150', // varsayılan avatar
          });
        } else {
          setError('Kullanıcı bulunamadı');
        }
      } catch (err: any) {
        console.error('Profil yükleme hatası:', err);
        setError('Profil yüklenemedi: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 16 }}>Profil yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', fontSize: 18 }}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>Kullanıcı bilgisi yok</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Avatar ve İsim */}
      <View style={styles.header}>
        <Image
          source={{ uri: profile.photoURL }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.displayName}</Text>
      </View>

      {/* Temel Bilgiler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
        <Text style={styles.info}>Yaş: {profile.age}</Text>
        <Text style={styles.info}>Ülke: {profile.country || 'Belirtilmemiş'}</Text>
        <Text style={styles.info}>Şehir: {profile.city || 'Belirtilmemiş'}</Text>
        <Text style={styles.info}>Doğrulanmış: {profile.isVerified ? 'Evet' : 'Hayır'}</Text>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
      </View>

      {/* Diller */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diller</Text>
        {profile.nativeLanguage && (
          <Text style={styles.info}>
            Ana Dil: {profile.nativeLanguage.name} ({profile.nativeLanguage.level})
          </Text>
        )}
        {profile.learningLanguages?.length > 0 && (
          <Text style={styles.info}>
            Öğrenilen Diller: {profile.learningLanguages.map((l: any) => l.name).join(', ')}
          </Text>
        )}
      </View>

      {/* Fotoğraflar (eğer varsa) */}
      {profile.photos?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotoğraflar</Text>
          <View style={styles.photoGrid}>
            {profile.photos.map((photo: string, index: number) => (
              <Image key={index} source={{ uri: photo }} style={styles.photo} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12, borderWidth: 3, borderColor: '#4CAF50' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  section: { padding: 20, backgroundColor: '#fff', marginBottom: 12, borderBottomWidth: 1, borderColor: '#eee' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#4CAF50' },
  info: { fontSize: 16, color: '#555', marginBottom: 8 },
  bio: { fontSize: 16, color: '#444', lineHeight: 24 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 110, height: 110, borderRadius: 12 },
});
