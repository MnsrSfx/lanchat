import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Mail, Lock, Eye, EyeOff, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

export default function LoginScreen() {
  const { 
    login, 
    isLoginLoading, 
    loginError, 
    loginWithGoogle, 
    isGoogleLoading, 
    googleError,
    isAuthenticated,
    needsProfileSetup,
    resetPassword,
    isResetPasswordLoading,
    resetPasswordError,
    resetPasswordSuccess
  } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailError, setResetEmailError] = useState('');

  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = () => {
    if (validateForm()) {
      login({ email: email.trim(), password });
    }
  };

  const handleGoogleLogin = async () => {
    console.log('Google login button pressed');
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const handleResetPassword = () => {
    setResetEmailError('');
    if (!resetEmail.trim()) {
      setResetEmailError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetEmailError('Please enter a valid email');
      return;
    }
    resetPassword(resetEmail.trim());
  };

  useEffect(() => {
    if (resetPasswordSuccess) {
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
      }, 2000);
    }
  }, [resetPasswordSuccess]);

  useEffect(() => {
    if (isAuthenticated && !isLoginLoading && !isGoogleLoading) {
      console.log('Login successful, redirecting...', { needsProfileSetup });
      if (needsProfileSetup) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(tabs)/community');
      }
    }
  }, [isAuthenticated, isLoginLoading, isGoogleLoading, needsProfileSetup, router]);

  return (
    <LinearGradient
      colors={['#0EA5E9', '#0284C7', '#0369A1']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MessageCircle size={48} color="#fff" strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>LanChat</Text>
            <Text style={styles.subtitle}>Connect. Learn. Grow.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.descriptionText}>
              Sign in to continue your language journey
            </Text>

            {(loginError || googleError) && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  {loginError || googleError}
                </Text>
                <Text style={styles.errorHintText}>
                  Make sure you have an account registered with this email. Try signing up first if you don&apos;t have an account.
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Mail size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="email-input"
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Lock size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="password-input"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.light.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.light.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => {
                setShowResetModal(true);
                setResetEmail(email);
              }}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoginLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoginLoading}
              testID="login-button"
            >
              {isLoginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading || isLoginLoading}
              testID="google-login-button"
              activeOpacity={0.7}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              {isGoogleLoading ? (
                <ActivityIndicator color={Colors.light.text} />
              ) : (
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don&apos;t have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => setShowResetModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </Text>

            {resetPasswordSuccess && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>
                  Password reset email sent! Check your inbox.
                </Text>
              </View>
            )}

            {resetPasswordError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{resetPasswordError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputContainer, resetEmailError && styles.inputError]}>
                <Mail size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={resetEmail}
                  onChangeText={(text) => {
                    setResetEmail(text);
                    setResetEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!resetPasswordSuccess}
                />
              </View>
              {resetEmailError ? <Text style={styles.errorText}>{resetEmailError}</Text> : null}
            </View>

            <TouchableOpacity
              style={[
                styles.resetButton,
                (isResetPasswordLoading || resetPasswordSuccess) && styles.resetButtonDisabled
              ]}
              onPress={handleResetPassword}
              disabled={isResetPasswordLoading || resetPasswordSuccess}
            >
              {isResetPasswordLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>
                  {resetPasswordSuccess ? 'Email Sent!' : 'Send Reset Link'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
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
    fontWeight: '600',
  },
  errorHintText: {
    color: Colors.light.error,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    marginLeft: 12,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: Colors.light.tint,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    color: Colors.light.textSecondary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 24,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  signupText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: Colors.light.tint,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#059669',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});