import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

export default function VerifyEmailScreen() {
  const { verifyEmail, resendVerification, verificationEmail, isVerifyLoading, verifyError } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    
    if (text.length > 1) {
      const pastedCode = text.slice(0, 6).split('');
      pastedCode.forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });
      setCode(newCode);
      inputRefs.current[5]?.focus();
    } else {
      newCode[index] = text;
      setCode(newCode);
      
      if (text && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      verifyEmail(fullCode);
    }
  };

  const handleResend = () => {
    if (canResend) {
      resendVerification();
      setResendTimer(60);
      setCanResend(false);
    }
  };

  const isCodeComplete = code.every(digit => digit !== '');

  return (
    <LinearGradient
      colors={['#0EA5E9', '#0284C7', '#0369A1']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Mail size={48} color="#fff" strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a 6-digit verification code to
          </Text>
          <Text style={styles.email}>{verificationEmail || 'your email'}</Text>

          <View style={styles.card}>
            {verifyError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{verifyError}</Text>
              </View>
            )}

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { if (ref) inputRefs.current[index] = ref; }}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                  testID={`code-input-${index}`}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isCodeComplete || isVerifyLoading) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!isCodeComplete || isVerifyLoading}
              testID="verify-button"
            >
              {isVerifyLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Email</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
              {canResend ? (
                <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
                  <RefreshCw size={14} color={Colors.light.tint} />
                  <Text style={styles.resendLink}>Resend</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
              )}
            </View>
          </View>

          <Text style={styles.hint}>
            For demo purposes, enter any 6 digits to verify
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  email: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  errorBanner: {
    backgroundColor: Colors.light.errorLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: Colors.light.error,
    fontSize: 14,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  codeInput: {
    width: 46,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.light.surfaceSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center',
    color: Colors.light.text,
  },
  codeInputFilled: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  verifyButton: {
    backgroundColor: Colors.light.tint,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendLink: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  timerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 24,
    textAlign: 'center',
  },
});
