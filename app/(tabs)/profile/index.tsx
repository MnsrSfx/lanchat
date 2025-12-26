import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { 
  Edit, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Globe,
  Bell,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import PhotoGalleryModal from '@/components/PhotoGalleryModal';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const photos = user?.photos && user.photos.length > 0 ? user.photos : user?.avatar ? [user.avatar] : [];

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    updateProfile({ notificationsEnabled: value });
  };

  const menuItems = [
    { 
      icon: <Bell size={20} color={Colors.light.tint} />, 
      title: 'Notifications', 
      subtitle: 'Manage notification preferences',
      onPress: () => {},
      hasSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: handleToggleNotifications,
    },
    { 
      icon: <Lock size={20} color={Colors.light.tint} />, 
      title: 'Privacy', 
      subtitle: 'Control your privacy settings',
      onPress: () => {} 
    },
    { 
      icon: <Globe size={20} color={Colors.light.tint} />, 
      title: 'Language', 
      subtitle: 'App language preferences',
      onPress: () => {} 
    },
    { 
      icon: <HelpCircle size={20} color={Colors.light.tint} />, 
      title: 'Help & Support', 
      subtitle: 'Get help and contact us',
      onPress: () => {} 
    },
    { 
      icon: <Shield size={20} color={Colors.light.tint} />, 
      title: 'Terms & Privacy', 
      subtitle: 'Read our policies',
      onPress: () => {} 
    },
  ];

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: 'Profile' }} />

      <View style={styles.profileSection}>
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
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.onlineIndicator} />
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

        <Text style={styles.name}>{user?.name || 'User'}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}

        {user?.isVerified && (
          <View style={styles.verifiedBadge}>
            <Shield size={14} color={Colors.light.accent} />
            <Text style={styles.verifiedText}>Verified Member</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/edit-profile')}
        >
          <Edit size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.languageSection}>
        <Text style={styles.sectionTitle}>Languages</Text>
        
        <View style={styles.languageCard}>
          <View style={styles.languageRow}>
            <Text style={styles.languageFlag}>{user?.nativeLanguage?.flag || '🌍'}</Text>
            <View style={styles.languageInfo}>
              <Text style={styles.languageName}>{user?.nativeLanguage?.name || 'Not set'}</Text>
              <Text style={styles.languageLevel}>Native</Text>
            </View>
          </View>
        </View>

        {user?.learningLanguages && user.learningLanguages.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Learning</Text>
            {user.learningLanguages.map(lang => (
              <View key={lang.code} style={styles.languageCardSmall}>
                <Text style={styles.languageFlagSmall}>{lang.flag}</Text>
                <Text style={styles.languageNameSmall}>{lang.name}</Text>
                <Text style={styles.languageLevelSmall}>{lang.level}</Text>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            disabled={item.hasSwitch}
          >
            <View style={styles.menuIcon}>{item.icon}</View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            {item.hasSwitch ? (
              <Switch
                value={item.switchValue}
                onValueChange={item.onSwitchChange}
                trackColor={{ false: Colors.light.border, true: Colors.light.tint }}
                thumbColor="#fff"
              />
            ) : (
              <ChevronRight size={20} color={Colors.light.textSecondary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={Colors.light.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.versionText}>LanChat v1.0.0</Text>
      </View>
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '600' as const,
    color: Colors.light.tint,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.online,
    borderWidth: 3,
    borderColor: Colors.light.background,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.accent,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  languageSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 16,
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
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 32,
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
    marginTop: 2,
  },
  languageCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  languageFlagSmall: {
    fontSize: 22,
    marginRight: 10,
  },
  languageNameSmall: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  languageLevelSmall: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textTransform: 'capitalize',
  },
  menuSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.errorLight,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.error,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  photoStrip: {
    maxHeight: 80,
    marginTop: 12,
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
