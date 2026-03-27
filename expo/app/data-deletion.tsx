import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Trash2, User, MessageCircle, Shield, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function DataDeletionScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Deletion</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Text style={styles.appName}>LanChat</Text>
          <Text style={styles.tagline}>Data Deletion Request</Text>
        </View>

        <View style={styles.introSection}>
          <Text style={styles.introText}>
            LanChat respects your privacy and gives you full control over your personal data. You can request deletion of your data at any time through the methods described below.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trash2 size={24} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>How to Delete Your Data</Text>
          </View>
          <Text style={styles.sectionText}>
            You can delete all your data by deleting your LanChat account. Follow these simple steps:
          </Text>
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Open the App</Text>
                <Text style={styles.stepDesc}>Launch LanChat and log in to your account</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Go to Profile</Text>
                <Text style={styles.stepDesc}>Tap the Profile tab at the bottom right corner</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Find Delete Option</Text>
                <Text style={styles.stepDesc}>Scroll down and tap "Delete Account"</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Confirm Deletion</Text>
                <Text style={styles.stepDesc}>Confirm your decision to permanently delete your account and all associated data</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={24} color={Colors.light.success} />
            <Text style={styles.sectionTitle}>Data That Will Be Deleted</Text>
          </View>
          <Text style={styles.sectionText}>
            When you request data deletion, the following information will be permanently removed from our servers:
          </Text>
          <View style={styles.dataList}>
            <View style={styles.dataItem}>
              <User size={20} color={Colors.light.success} />
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Profile Information</Text>
                <Text style={styles.dataDesc}>Your name, email address, profile photos, bio, country, and language preferences</Text>
              </View>
            </View>
            <View style={styles.dataItem}>
              <MessageCircle size={20} color={Colors.light.success} />
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Messages & Media</Text>
                <Text style={styles.dataDesc}>All your chat messages, shared photos, voice messages, and call history</Text>
              </View>
            </View>
            <View style={styles.dataItem}>
              <Shield size={20} color={Colors.light.success} />
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Account Credentials</Text>
                <Text style={styles.dataDesc}>Your login credentials, authentication tokens, and session data</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <XCircle size={24} color={Colors.light.textSecondary} />
            <Text style={styles.sectionTitle}>Data Retention After Deletion</Text>
          </View>
          <Text style={styles.sectionText}>
            We do not retain any personal data after your account is deleted. Here are the details:
          </Text>
          <View style={styles.retentionList}>
            <View style={styles.retentionItem}>
              <View style={[styles.retentionBadge, styles.immediateDelete]}>
                <Text style={styles.retentionBadgeText}>Immediate</Text>
              </View>
              <View style={styles.retentionInfo}>
                <Text style={styles.retentionTitle}>Personal Data</Text>
                <Text style={styles.retentionDesc}>Profile info, messages, and media are deleted immediately</Text>
              </View>
            </View>
            <View style={styles.retentionItem}>
              <View style={[styles.retentionBadge, styles.immediateDelete]}>
                <Text style={styles.retentionBadgeText}>Immediate</Text>
              </View>
              <View style={styles.retentionInfo}>
                <Text style={styles.retentionTitle}>Authentication Data</Text>
                <Text style={styles.retentionDesc}>Login credentials and tokens are deleted immediately</Text>
              </View>
            </View>
            <View style={styles.retentionItem}>
              <View style={[styles.retentionBadge, styles.noRetention]}>
                <Text style={styles.retentionBadgeText}>None</Text>
              </View>
              <View style={styles.retentionInfo}>
                <Text style={styles.retentionTitle}>Backup Copies</Text>
                <Text style={styles.retentionDesc}>No backup copies are retained after deletion</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={24} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Processing Time</Text>
          </View>
          <View style={styles.timeCard}>
            <Text style={styles.timeTitle}>In-App Deletion</Text>
            <Text style={styles.timeDesc}>Data is deleted immediately when you delete your account through the app.</Text>
          </View>
          <View style={styles.timeCard}>
            <Text style={styles.timeTitle}>Email Request</Text>
            <Text style={styles.timeDesc}>If you request deletion via email, we will process your request within 48 hours.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alternative: Contact Support</Text>
          </View>
          <Text style={styles.sectionText}>
            If you cannot access the app or prefer to request data deletion via email, please contact us:
          </Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactEmail}>support@lanchat.app</Text>
          </View>
          <Text style={styles.contactNote}>
            Please include your registered email address in your request. We will verify your identity and process your deletion request within 48 hours.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Notes</Text>
          <View style={styles.notesList}>
            <Text style={styles.noteItem}>• Data deletion is permanent and cannot be undone</Text>
            <Text style={styles.noteItem}>• Once deleted, you will not be able to recover your account or data</Text>
            <Text style={styles.noteItem}>• Any active subscriptions should be cancelled before deletion</Text>
            <Text style={styles.noteItem}>• Messages you sent to other users may still appear in their chat history</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>LanChat</Text>
          <Text style={styles.footerText}>Language Learning Through Conversation</Text>
          <Text style={styles.footerDate}>Last updated: February 2026</Text>
          <Text style={styles.footerCopyright}>© 2025 LanChat. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.light.tint,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  introSection: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  introText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  sectionText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  dataList: {
    gap: 12,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dataInfo: {
    flex: 1,
  },
  dataTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  dataDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  retentionList: {
    gap: 12,
  },
  retentionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  retentionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  immediateDelete: {
    backgroundColor: Colors.light.successLight,
  },
  noRetention: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  retentionBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  retentionInfo: {
    flex: 1,
  },
  retentionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  retentionDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  timeCard: {
    backgroundColor: Colors.light.tintLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  timeTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  timeDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: Colors.light.tintLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.tint,
  },
  contactNote: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  notesList: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  noteItem: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'center',
    gap: 4,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.tint,
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  footerDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  footerCopyright: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
