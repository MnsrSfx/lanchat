import React, { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, FlatList } from 'react-native';
import { trpc, trpcClient } from '../lib/trpc';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { MOCK_USERS, MOCK_CHATS, MOCK_MESSAGES } from '../mocks/users';
import { LANGUAGES } from '../constants/languages';
import Colors from '../constants/colors';
import type { User, Chat, Message } from '../types';

const queryClient = new QueryClient();

function LoginScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { login, isLoginLoading, loginError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

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
      login({ email, password });
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authHeader}>
        <Text style={styles.logoIcon}>💬</Text>
        <Text style={styles.logoTitle}>LanChat</Text>
        <Text style={styles.logoSubtitle}>Connect. Learn. Grow.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.descriptionText}>Sign in to continue your language journey</Text>

        {loginError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{loginError}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Enter your email"
            placeholderTextColor={Colors.light.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Enter your password"
            placeholderTextColor={Colors.light.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isLoginLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoginLoading}
        >
          <Text style={styles.primaryButtonText}>{isLoginLoading ? 'Signing In...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>{"Don't have an account? "}</Text><TouchableOpacity onPress={() => onNavigate('register')}><Text style={styles.signupLink}>Sign Up</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function RegisterScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { register, isRegisterLoading, registerError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = () => {
    if (name && email && password.length >= 6) {
      register({ email, password, name });
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authHeader}>
        <Text style={styles.logoIcon}>💬</Text>
        <Text style={styles.logoTitle}>LanChat</Text>
        <Text style={styles.logoSubtitle}>Join our community</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.welcomeText}>Create Account</Text>
        <Text style={styles.descriptionText}>Start your language learning journey</Text>

        {registerError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{registerError}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={Colors.light.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={Colors.light.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password (min 6 characters)"
            placeholderTextColor={Colors.light.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isRegisterLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isRegisterLoading}
        >
          <Text style={styles.primaryButtonText}>{isRegisterLoading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>{"Already have an account? "}</Text><TouchableOpacity onPress={() => onNavigate('login')}><Text style={styles.signupLink}>Sign In</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function CommunityScreen({ onNavigate }: { onNavigate: (screen: string, params?: any) => void }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  const filteredUsers = useMemo(() => {
    let users = MOCK_USERS;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.country.toLowerCase().includes(query) ||
        u.city.toLowerCase().includes(query)
      );
    }
    if (selectedLanguage) {
      users = users.filter(u =>
        u.nativeLanguage.code === selectedLanguage ||
        u.learningLanguages.some(l => l.code === selectedLanguage)
      );
    }
    if (showOnlineOnly) {
      users = users.filter(u => u.isOnline);
    }
    return users;
  }, [searchQuery, selectedLanguage, showOnlineOnly]);

  return (
    <View style={styles.screenContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location..."
          placeholderTextColor={Colors.light.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filtersRow}><TouchableOpacity
          style={[styles.filterChip, showOnlineOnly && styles.filterChipActive]}
          onPress={() => setShowOnlineOnly(!showOnlineOnly)}
        ><View style={[styles.onlineDot, showOnlineOnly && styles.onlineDotActive]} /><Text style={[styles.filterChipText, showOnlineOnly && styles.filterChipTextActive]}>Online</Text></TouchableOpacity><ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {LANGUAGES.slice(0, 8).map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.filterChip, selectedLanguage === lang.code && styles.filterChipActive]}
              onPress={() => setSelectedLanguage(selectedLanguage === lang.code ? null : lang.code)}
            >
              <Text style={styles.filterFlag}>{lang.flag}</Text>
              <Text style={[styles.filterChipText, selectedLanguage === lang.code && styles.filterChipTextActive]}>
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.resultsCount}>{filteredUsers.length} members found</Text>

      <ScrollView style={styles.usersList}>
        {filteredUsers.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.userCard}
            onPress={() => onNavigate('userProfile', { userId: item.id })}
          >
            <View style={styles.avatarContainer}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={[styles.onlineIndicator, item.isOnline ? styles.online : styles.offline]} />
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameRow}><Text style={styles.userName}>{item.name}</Text>{item.isVerified && (<View style={styles.verifiedBadge}><Text style={styles.verifiedText}>Verified</Text></View>)}</View>

              <Text style={styles.locationText}>📍 {item.city}, {item.country}</Text>

              <View style={styles.languagesRow}><Text style={styles.nativeFlag}>{item.nativeLanguage.flag}</Text><Text style={styles.languageArrow}>{"→"}</Text>{item.learningLanguages.slice(0, 3).map(lang => (<Text key={lang.code} style={styles.learningFlag}>{lang.flag}</Text>))}</View>
            </View>

            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => onNavigate('chat', { userId: item.id })}
            >
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function ChatsScreen({ onNavigate }: { onNavigate: (screen: string, params?: any) => void }) {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Chats</Text>
      <ScrollView style={styles.chatsList}>
        {MOCK_CHATS.map(chat => {
          const otherUser = chat.participants.find(p => p.id !== 'current');
          if (!otherUser) return null;
          
          return (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              onPress={() => onNavigate('chat', { userId: otherUser.id })}
            >
              <View style={styles.avatarContainer}>
                <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                <View style={[styles.onlineIndicator, otherUser.isOnline ? styles.online : styles.offline]} />
              </View>
              
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{otherUser.name}</Text>
                <Text style={styles.chatLastMessage} numberOfLines={1}>
                  {chat.lastMessage?.content}
                </Text>
              </View>
              
              {chat.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ChatScreen({ userId, onNavigate }: { userId: string; onNavigate: (screen: string) => void }) {
  const [message, setMessage] = useState('');
  const user = MOCK_USERS.find(u => u.id === userId);
  const messages = MOCK_MESSAGES.filter(m => m.chatId === 'chat1');

  if (!user) {
    return (
      <View style={styles.screenContainer}>
        <Text>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => onNavigate('chats')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Image source={{ uri: user.avatar }} style={styles.chatHeaderAvatar} />
        <View>
          <Text style={styles.chatHeaderName}>{user.name}</Text>
          <Text style={styles.chatHeaderStatus}>{user.isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.senderId === 'current' ? styles.myMessage : styles.theirMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              msg.senderId === 'current' ? styles.myMessageText : styles.theirMessageText
            ]}>
              {msg.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.light.textSecondary}
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProfileScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.screenContainer}>
      <View style={styles.profileHeader}>
        <Image source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }} style={styles.profileAvatar} />
        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
        <Text style={styles.profileLocation}>📍 {user?.city || 'Unknown'}, {user?.country || 'Unknown'}</Text>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Native Language</Text>
        <View style={styles.languageTag}>
          <Text>{user?.nativeLanguage?.flag} {user?.nativeLanguage?.name}</Text>
        </View>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Learning</Text>
        <View style={styles.languagesContainer}>
          {user?.learningLanguages?.map(lang => (
            <View key={lang.code} style={styles.languageTag}>
              <Text>{lang.flag} {lang.name} ({lang.level})</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Bio</Text>
        <Text style={styles.profileBio}>{user?.bio || 'No bio yet'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

function TabBar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'community' && styles.activeTab]}
        onPress={() => onTabChange('community')}
      >
        <Text style={styles.tabIcon}>👥</Text>
        <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>Community</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
        onPress={() => onTabChange('chats')}
      >
        <Text style={styles.tabIcon}>💬</Text>
        <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>Chats</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
        onPress={() => onTabChange('profile')}
      >
        <Text style={styles.tabIcon}>👤</Text>
        <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function MainApp() {
  const { isAuthenticated, isLoading, needsEmailVerification } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('community');
  const [screenParams, setScreenParams] = useState<any>({});

  useEffect(() => {
    if (isAuthenticated && !needsEmailVerification) {
      setCurrentScreen('main');
    } else if (!isAuthenticated && !isLoading) {
      setCurrentScreen('login');
    }
  }, [isAuthenticated, isLoading, needsEmailVerification]);

  const navigate = (screen: string, params?: any) => {
    if (params) setScreenParams(params);
    if (['community', 'chats', 'profile'].includes(screen)) {
      setActiveTab(screen);
      setCurrentScreen('main');
    } else {
      setCurrentScreen(screen);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (currentScreen === 'login') {
    return <LoginScreen onNavigate={navigate} />;
  }

  if (currentScreen === 'register') {
    return <RegisterScreen onNavigate={navigate} />;
  }

  if (currentScreen === 'chat') {
    return <ChatScreen userId={screenParams.userId} onNavigate={navigate} />;
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LanChat</Text>
      </View>

      <View style={styles.content}>
        {activeTab === 'community' && <CommunityScreen onNavigate={navigate} />}
        {activeTab === 'chats' && <ChatsScreen onNavigate={navigate} />}
        {activeTab === 'profile' && <ProfileScreen onNavigate={navigate} />}
      </View>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );
}

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    padding: 24,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  logoTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  logoSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 12,
    marginTop: 4,
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
  primaryButton: {
    backgroundColor: Colors.light.tint,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
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
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.tint,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    padding: 16,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterFlag: {
    fontSize: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.online,
  },
  onlineDotActive: {
    backgroundColor: '#fff',
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  online: {
    backgroundColor: Colors.light.online,
  },
  offline: {
    backgroundColor: Colors.light.offline,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  verifiedBadge: {
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.accent,
  },
  locationText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  languagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  nativeFlag: {
    fontSize: 18,
  },
  languageArrow: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginHorizontal: 4,
  },
  learningFlag: {
    fontSize: 16,
  },
  chatButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  chatsList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chatLastMessage: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: Colors.light.tint,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  backButton: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.tint,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  messageText: {
    fontSize: 15,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: Colors.light.text,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  profileLocation: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  profileSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  profileSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  languageTag: {
    backgroundColor: Colors.light.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginRight: 8,
    marginBottom: 8,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  profileBio: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  logoutButton: {
    margin: 16,
    backgroundColor: Colors.light.error,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: Colors.light.tint,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
});
