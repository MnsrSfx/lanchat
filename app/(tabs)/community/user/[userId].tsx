import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MapPin, MessageCircle, Phone, Video, Shield, Clock } from 'lucide-react-native';
import { MOCK_USERS } from '@/mocks/users';
import Colors from '@/constants/colors';
import PhotoGalleryModal from '@/components/PhotoGalleryModal';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const user = MOCK_USERS.find(u => u.id === userId);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const photos = user?.photos && user.photos.length > 0 ? user.photos : user?.avatar ? [user.avatar] : [];

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>User not found</Text>
      </View>
    );
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: '' }} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => {
            if (photos.length > 0) {
              setSelectedPhotoIndex(0);
              setGalleryVisible(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <View style={[styles.onlineIndicator, user.isOnline ? styles.online : styles.offline]} />
        </TouchableOpacity>

        {photos.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.photoStrip}
            contentContainerStyle={styles.photoStripContent}
          >
            {photos.slice(1).map((photo, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setSelectedPhotoIndex(index + 1);
                  setGalleryVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: photo }} style={styles.photoStripItem} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            {user.isVerified && (
              <Shield size={20} color={Colors.light.accent} />
            )}
          </View>
          <Text style={styles.age}>{user.age} years old</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.light.textSecondary} />
            <Text style={styles.location}>{user.city}, {user.country}</Text>
          </View>
          {!user.isOnline && (
            <View style={styles.lastSeenRow}>
              <Clock size={12} color={Colors.light.textSecondary} />
              <Text style={styles.lastSeen}>Last seen {formatLastSeen(user.lastSeen)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push(`/chat/${user.id}`)}
        >
          <MessageCircle size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Send Message</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push(`/call/${user.id}?type=voice`)}
          >
            <Phone size={22} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push(`/call/${user.id}?type=video`)}
          >
            <Video size={22} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{user.bio || 'No bio yet'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Languages</Text>
        
        <View style={styles.languageCard}>
          <View style={styles.languageHeader}>
            <Text style={styles.languageFlag}>{user.nativeLanguage.flag}</Text>
            <View style={styles.languageInfo}>
              <Text style={styles.languageName}>{user.nativeLanguage.name}</Text>
              <Text style={styles.languageLevel}>Native</Text>
            </View>
            <View style={styles.nativeBadge}>
              <Text style={styles.nativeBadgeText}>Native</Text>
            </View>
          </View>
        </View>

        <Text style={styles.subSectionTitle}>Learning</Text>
        {user.learningLanguages.map(lang => (
          <View key={lang.code} style={styles.languageCard}>
            <View style={styles.languageHeader}>
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{lang.name}</Text>
                <Text style={styles.languageLevel}>{lang.level}</Text>
              </View>
              <View style={styles.levelIndicator}>
                <View style={[styles.levelDot, styles.levelDotFilled]} />
                <View style={[styles.levelDot, lang.level !== 'beginner' && styles.levelDotFilled]} />
                <View style={[styles.levelDot, lang.level === 'advanced' && styles.levelDotFilled]} />
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>

    <PhotoGalleryModal
      visible={galleryVisible}
      photos={photos}
      initialIndex={selectedPhotoIndex}
      onClose={() => setGalleryVisible(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.light.surface,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: Colors.light.background,
  },
  online: {
    backgroundColor: Colors.light.online,
  },
  offline: {
    backgroundColor: Colors.light.offline,
  },
  nameSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  age: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  location: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  lastSeenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lastSeen: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    height: 48,
    borderRadius: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  languageCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  languageLevel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  nativeBadge: {
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nativeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.accent,
  },
  levelIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.border,
  },
  levelDotFilled: {
    backgroundColor: Colors.light.tint,
  },
  photoStrip: {
    maxHeight: 80,
    marginTop: 8,
  },
  photoStripContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  photoStripItem: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
});
