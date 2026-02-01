import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Trash2, AlertTriangle, Shield, MessageCircle, User, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function DeleteAccountScreen() {
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
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Text style={styles.appName}>LanChat</Text>
          <Text style={styles.tagline}>Account Deletion</Text>
        </View>

        <View style={styles.warningCard}>
          <AlertTriangle size={32} color={Colors.light.error} />
          <Text style={styles.warningTitle}>Important Information</Text>
          <Text style={styles.warningText}>
            Deleting your account is permanent and cannot be undone. Please read the information below carefully before proceeding.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Delete Your Account</Text>
          <Text style={styles.sectionText}>
            You can delete your LanChat account directly from the app by following these steps:
          </Text>
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Open the LanChat app and log in to your account</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Go to the Profile tab (bottom right)</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Scroll down and tap "Delete Account"</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Confirm your decision twice to permanently delete your account</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Data Will Be Deleted</Text>
          <Text style={styles.sectionText}>
            When you delete your account, the following data will be permanently removed:
          </Text>
          <View style={styles.dataList}>
            <View style={styles.dataItem}>
              <User size={20} color={Colors.light.tint} />
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Profile Information</Text>
                <Text style={styles.dataDesc}>Name, email, profile photos, bio, and language preferences</Text>
              </View>
            </View>
            <View style={styles.dataItem}>
              <MessageCircle size={20} color={Colors.light.tint} />
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Messages & Conversations</Text>
                <Text style={styles.dataDesc}>All your chat history and message content</Text>
              </View>
            </View>
            <View style={styles.dataItem}>
              <Shield size={20} color={Colors.light.tint} />
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Account Credentials</Text>
                <Text style={styles.dataDesc}>Your login credentials and authentication data</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <View style={styles.retentionCard}>
            <Clock size={24} color={Colors.light.tint} />
            <View style={styles.retentionInfo}>
              <Text style={styles.retentionTitle}>Immediate Deletion</Text>
              <Text style={styles.retentionDesc}>
                Your data is deleted immediately upon account deletion. We do not retain any personal data after your account is deleted.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alternative: Contact Support</Text>
          <Text style={styles.sectionText}>
            If you're unable to delete your account through the app, or if you have any questions, you can contact our support team:
          </Text>
          <Text style={styles.contactEmail}>support@lanchat.app</Text>
          <Text style={styles.contactNote}>
            Please include your registered email address in your request. We will process your deletion request within 48 hours.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before You Go</Text>
          <Text style={styles.sectionText}>
            We're sorry to see you leave. If you're experiencing any issues with the app, please consider reaching out to our support team first. We'd love to help resolve any problems you may be facing.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: February 2026</Text>
          <Text style={styles.footerText}>© 2025 LanChat. All rights reserved.</Text>
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
  warningCard: {
    backgroundColor: Colors.light.errorLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.light.error,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.error,
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 12,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    paddingTop: 3,
  },
  dataList: {
    gap: 16,
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
  retentionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.light.tintLight,
    padding: 16,
    borderRadius: 12,
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
  contactEmail: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.tint,
    marginBottom: 8,
  },
  contactNote: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
