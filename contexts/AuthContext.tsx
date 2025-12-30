import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { User, AuthState } from '@/types';
import { MOCK_CURRENT_USER } from '@/mocks/users';
import { supabase } from '@/lib/supabaseClient';
import { Platform } from 'react-native';

const AUTH_STORAGE_KEY = 'lanchat_auth';
const AUTH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    )
  ]);
}

interface StoredAuth {
  user: User | null;
  isAuthenticated: boolean;
  needsProfileSetup: boolean;
  needsEmailVerification: boolean;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    needsProfileSetup: false,
  });
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const authQuery = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: StoredAuth = JSON.parse(stored);
        return parsed;
      }
      return null;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (authQuery.data !== undefined) {
      if (authQuery.data) {
        setAuthState({
          user: authQuery.data.user,
          isAuthenticated: authQuery.data.isAuthenticated,
          isLoading: false,
          needsProfileSetup: authQuery.data.needsProfileSetup,
        });
        setNeedsEmailVerification(authQuery.data.needsEmailVerification || false);
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          needsProfileSetup: false,
        });
      }
    }
  }, [authQuery.data]);

  useEffect(() => {
    const unsubscribe = supabase.auth.onAuthStateChange(async (event, session) => {
      const supabaseUser = session?.user ?? null;
      if (supabaseUser) {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: StoredAuth = JSON.parse(stored);
          if (parsed.user) {
            try {
              await supabase
                .from('users')
                .update({
                  is_online: true,
                  last_seen: new Date().toISOString(),
                })
                .eq('id', supabaseUser.id);
            } catch (error) {
              console.log('Error updating online status:', error);
            }
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      try {
        console.log('Login attempt for:', email);
        
        const { data: userCredential, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          AUTH_TIMEOUT_MS
        );
        
        if (error) throw error;
        
        const supabaseUser = userCredential.user;
        
        console.log('Supabase auth successful, id:', supabaseUser.id);
        
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        let user: User;
        
        if (stored) {
          const parsed: StoredAuth = JSON.parse(stored);
          if (parsed.user?.email === email) {
            user = { ...parsed.user, id: supabaseUser.id, isOnline: true };
          } else {
            user = { 
              ...MOCK_CURRENT_USER, 
              id: supabaseUser.id,
              uid: supabaseUser.id,
              email,
              name: supabaseUser.user_metadata?.full_name || email.split('@')[0],
              avatar: supabaseUser.user_metadata?.avatar_url || '',
              isOnline: true,
            };
          }
        } else {
          user = { 
            ...MOCK_CURRENT_USER, 
            id: supabaseUser.id,
            uid: supabaseUser.id,
            email,
            name: supabaseUser.user_metadata?.full_name || email.split('@')[0],
            avatar: supabaseUser.user_metadata?.avatar_url || '',
            isOnline: true,
          };
        }

        console.log('Updating user document in Supabase...');
        await supabase
          .from('users')
          .upsert({
            id: supabaseUser.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            is_online: true,
            last_seen: new Date().toISOString(),
            bio: user.bio || '',
            native_language: user.nativeLanguage,
            learning_languages: user.learningLanguages,
            country: user.country || '',
            city: user.city || '',
            age: user.age || 0,
            is_verified: user.isVerified || false,
            photos: user.photos || [],
            created_at: new Date().toISOString(),
          });

        console.log('Saving auth data to local storage...');
        const authData: StoredAuth = {
          user,
          isAuthenticated: true,
          needsProfileSetup: false,
          needsEmailVerification: false,
        };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        
        console.log('Login successful!');
        return authData;
      } catch (error: any) {
        console.error('Login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.message === 'TIMEOUT') {
          throw new Error('Login timed out or failed. Check your connection or try again.');
        }
        
        let userFriendlyMessage = 'Login failed. Please try again.';
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          userFriendlyMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.code === 'auth/user-not-found') {
          userFriendlyMessage = 'No account found with this email. Please sign up first.';
        } else if (error.code === 'auth/too-many-requests') {
          userFriendlyMessage = 'Too many failed login attempts. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
          userFriendlyMessage = 'Network error. Please check your internet connection.';
        } else if (error.code === 'auth/user-disabled') {
          userFriendlyMessage = 'This account has been disabled. Please contact support.';
        } else if (error.code === 'auth/invalid-email') {
          userFriendlyMessage = 'Invalid email address format.';
        } else if (error.message) {
          userFriendlyMessage = error.message;
        }
        
        throw new Error(userFriendlyMessage);
      }
    },
    onSuccess: (data) => {
      console.log('Login mutation success callback');
      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        needsProfileSetup: data.needsProfileSetup,
      });
    },
    onError: (error: any) => {
      console.error('Login mutation failed:', error);
      console.error('Error stack:', error.stack);
    },
  });

  // ... diğer mutation'lar aynı şekilde Supabase'e uyarlanmış halde kalıyor

  // Google login için:
  const googleLoginMutation = useMutation({
    mutationFn: async (): Promise<{ authData: StoredAuth; shouldRedirect: boolean }> => {
      try {
        console.log('Google login attempt, Platform:', Platform.OS);
        
        const { data: result, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'https://lanchat.site' // senin site URL'in
          }
        });
        
        if (error) throw error;
        
        const supabaseUser = result.user;
        console.log('Supabase Google auth successful, id:', supabaseUser.id);
        
        // geri kalan kod user oluşturma, upsert vs. aynısı kalıyor

      } catch (error: any) {
        // hata handling aynısı
      }
    },
    // onSuccess, onError aynısı
  });

  // Logout:
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // ... offline status update Supabase ile
      await supabase.auth.signOut();
      // AsyncStorage temizleme aynısı
    },
    // onSuccess aynısı
  });

  // Reset password:
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return true;
    },
    // hata handling aynısı
  });

  // Diğer fonksiyonlar (resendVerification vs.) aynısı kalabilir, çünkü email verification Supabase'te de benzer.

  return {
    // return aynısı
  };
});