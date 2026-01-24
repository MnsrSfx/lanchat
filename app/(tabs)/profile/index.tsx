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
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { X, Mail, MessageCircle, ExternalLink, ChevronLeft, Check } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import Avatar from '@/components/Avatar';
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
import { useNotifications } from '@/contexts/NotificationContext';
import Colors from '@/constants/colors';
import PhotoGalleryModal from '@/components/PhotoGalleryModal';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { hasPermission, isSupported, requestPermission } = useNotifications();
  const [notificationsEnabled, setNotificationsEnabled] = useState(hasPermission);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus !== false);
  const [showReadReceipts, setShowReadReceipts] = useState(user?.showReadReceipts !== false);
  const [profileVisibility, setProfileVisibility] = useState<'everyone' | 'contacts'>(user?.profileVisibility || 'everyone');

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

  const handleToggleNotifications = async (value: boolean) => {
    if (value && !hasPermission) {
      await requestPermission();
      setNotificationsEnabled(hasPermission);
    } else {
      setNotificationsEnabled(value);
      updateProfile({ notificationsEnabled: value });
    }
  };

  const menuItems = [
    { 
      icon: <Bell size={20} color={Colors.light.tint} />, 
      title: 'Notifications', 
      subtitle: isSupported ? (hasPermission ? 'Enabled' : 'Enable to receive alerts') : 'Not available on this browser',
      onPress: () => {},
      hasSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: handleToggleNotifications,
      disabled: !isSupported,
    },
    { 
      icon: <Lock size={20} color={Colors.light.tint} />, 
      title: 'Privacy', 
      subtitle: 'Control your privacy settings',
      onPress: () => setPrivacyModalVisible(true) 
    },
    { 
      icon: <Globe size={20} color={Colors.light.tint} />, 
      title: 'Language', 
      subtitle: 'App language preferences',
      onPress: () => setLanguageModalVisible(true) 
    },
    { 
      icon: <HelpCircle size={20} color={Colors.light.tint} />, 
      title: 'Help & Support', 
      subtitle: 'Get help and contact us',
      onPress: () => setHelpModalVisible(true) 
    },
    { 
      icon: <Shield size={20} color={Colors.light.tint} />, 
      title: 'Terms & Privacy', 
      subtitle: 'Read our policies',
      onPress: () => setTermsModalVisible(true) 
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
          <Avatar uri={user?.avatar} name={user?.name || 'User'} size={100} />
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
            style={[styles.menuItem, item.disabled && styles.menuItemDisabled]}
            onPress={item.onPress}
            disabled={item.hasSwitch || item.disabled}
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
                disabled={item.disabled}
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

    {/* Privacy Modal */}
    <Modal
      visible={privacyModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setPrivacyModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitleCenter}>Privacy Settings</Text>
          <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Online Status</Text>
              <Text style={styles.settingDesc}>Let others see when you're online</Text>
            </View>
            <Switch
              value={showOnlineStatus}
              onValueChange={(value) => {
                setShowOnlineStatus(value);
                updateProfile({ showOnlineStatus: value });
              }}
              trackColor={{ false: Colors.light.border, true: Colors.light.tint }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Read Receipts</Text>
              <Text style={styles.settingDesc}>Let others know when you've read their messages</Text>
            </View>
            <Switch
              value={showReadReceipts}
              onValueChange={(value) => {
                setShowReadReceipts(value);
                updateProfile({ showReadReceipts: value });
              }}
              trackColor={{ false: Colors.light.border, true: Colors.light.tint }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.settingSectionTitle}>Profile Visibility</Text>
          <TouchableOpacity
            style={[styles.visibilityOption, profileVisibility === 'everyone' && styles.visibilityOptionActive]}
            onPress={() => {
              setProfileVisibility('everyone');
              updateProfile({ profileVisibility: 'everyone' });
            }}
          >
            <Text style={[styles.visibilityText, profileVisibility === 'everyone' && styles.visibilityTextActive]}>Everyone</Text>
            <Text style={styles.visibilityDesc}>Anyone can see your profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visibilityOption, profileVisibility === 'contacts' && styles.visibilityOptionActive]}
            onPress={() => {
              setProfileVisibility('contacts');
              updateProfile({ profileVisibility: 'contacts' });
            }}
          >
            <Text style={[styles.visibilityText, profileVisibility === 'contacts' && styles.visibilityTextActive]}>Contacts Only</Text>
            <Text style={styles.visibilityDesc}>Only people you've chatted with can see your profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>

    {/* Language Modal */}
    <Modal
      visible={languageModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setLanguageModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Language</Text>
          <TouchableOpacity onPress={() => setLanguageModalVisible(false)} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.infoText}>
            The app language is currently set to your device's default language.
          </Text>
          <View style={styles.languageInfoCard}>
            <Globe size={24} color={Colors.light.tint} />
            <View style={styles.languageInfoContent}>
              <Text style={styles.languageInfoTitle}>System Language</Text>
              <Text style={styles.languageInfoDesc}>LanChat automatically uses your device's language settings</Text>
            </View>
          </View>
          <Text style={styles.noteText}>
            To change the app language, please update your device's language settings.
          </Text>
        </ScrollView>
      </View>
    </Modal>

    {/* Help & Support Modal */}
    <Modal
      visible={helpModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setHelpModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Help & Support</Text>
          <TouchableOpacity onPress={() => setHelpModalVisible(false)} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.helpSectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I start a conversation?</Text>
            <Text style={styles.faqAnswer}>Go to the Community tab, find a user you'd like to chat with, and tap on their profile. Then tap the "Message" button to start a conversation.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I make voice calls?</Text>
            <Text style={styles.faqAnswer}>Open a chat with the user you want to call, then tap the phone icon in the top right corner to start a voice call.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I change my profile picture?</Text>
            <Text style={styles.faqAnswer}>Go to Profile, tap "Edit Profile", then tap on your profile picture to upload a new photo.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I add learning languages?</Text>
            <Text style={styles.faqAnswer}>Go to Profile → Edit Profile, scroll down to "Learning Languages" and add the languages you're learning.</Text>
          </View>

          <Text style={[styles.helpSectionTitle, { marginTop: 24 }]}>Contact Us</Text>
          
          <TouchableOpacity 
            style={styles.contactOption}
            onPress={() => Linking.openURL('mailto:support@lanchat.app')}
          >
            <View style={styles.contactIcon}>
              <Mail size={20} color={Colors.light.tint} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDesc}>support@lanchat.app</Text>
            </View>
            <ExternalLink size={18} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>

    {/* Terms & Privacy Modal */}
    <Modal
      visible={termsModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setTermsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Terms & Privacy</Text>
          <TouchableOpacity onPress={() => setTermsModalVisible(false)} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.termsTitle}>Terms of Service</Text>
          <Text style={styles.termsText}>
            By using LanChat, you agree to these terms. LanChat is a language learning platform that connects people worldwide to practice languages through conversations.
          </Text>
          <Text style={styles.termsText}>
            • You must be at least 18 years old to use this app{"\n"}
            • You are responsible for your account security{"\n"}
            • You agree to treat other users with respect{"\n"}
            • Harassment, hate speech, and inappropriate content are prohibited{"\n"}
            • We may suspend accounts that violate these terms
          </Text>

          <Text style={[styles.termsTitle, { marginTop: 24 }]}>Privacy Policy</Text>
          <Text style={styles.termsText}>
            Your privacy is important to us. Here's how we handle your data:
          </Text>
          <Text style={styles.termsText}>
            • We collect only necessary information to provide our services{"\n"}
            • Your messages are private between you and the recipient{"\n"}
            • We do not sell your personal data to third parties{"\n"}
            • You can delete your account and data at any time{"\n"}
            • We use Firebase for secure data storage
          </Text>

          <Text style={[styles.termsTitle, { marginTop: 24 }]}>Data Collection</Text>
          <Text style={styles.termsText}>
            We collect:{"\n"}
            • Account information (name, email, profile photo){"\n"}
            • Language preferences{"\n"}
            • Messages and call logs{"\n"}
            • Usage analytics to improve the app
          </Text>

          <View style={styles.termsFooter}>
            <Text style={styles.termsFooterText}>Last updated: January 2025</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
  menuItemDisabled: {
    opacity: 0.5,
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  doneButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalTitleCenter: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  settingDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  settingSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginTop: 24,
    marginBottom: 12,
  },
  visibilityOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  visibilityOptionActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  visibilityText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  visibilityTextActive: {
    color: Colors.light.tint,
  },
  visibilityDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  infoText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  languageInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  languageInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  languageInfoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  languageInfoDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  contactDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  termsFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'center',
  },
  termsFooterText: {
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
