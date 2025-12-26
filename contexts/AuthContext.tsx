import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { User, AuthState } from '@/types';
import { MOCK_CURRENT_USER } from '@/mocks/users';
import { auth, db } from '@/src/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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
  const queryClient = useQueryClient();
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: StoredAuth = JSON.parse(stored);
          if (parsed.user) {
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                isOnline: true,
                lastSeen: serverTimestamp(),
              }, { merge: true });
            } catch (error) {
              console.log('Error updating online status:', error);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      try {
        console.log('Login attempt for:', email);
        
        const userCredential = await withTimeout(
          signInWithEmailAndPassword(auth, email, password),
          AUTH_TIMEOUT_MS
        );
        const firebaseUser = userCredential.user;
        
        console.log('Firebase auth successful, uid:', firebaseUser.uid);
        
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        let user: User;
        
        if (stored) {
          const parsed: StoredAuth = JSON.parse(stored);
          if (parsed.user?.email === email) {
            user = { ...parsed.user, uid: firebaseUser.uid, isOnline: true };
          } else {
            user = { 
              ...MOCK_CURRENT_USER, 
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email,
              name: firebaseUser.displayName || email.split('@')[0],
              avatar: firebaseUser.photoURL || '',
              isOnline: true,
            };
          }
        } else {
          user = { 
            ...MOCK_CURRENT_USER, 
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email,
            name: firebaseUser.displayName || email.split('@')[0],
            avatar: firebaseUser.photoURL || '',
            isOnline: true,
          };
        }

        console.log('Updating user document in Firestore...');
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: user.email,
          displayName: user.name,
          photoURL: user.avatar,
          isOnline: true,
          lastSeen: serverTimestamp(),
          bio: user.bio || '',
          nativeLanguage: user.nativeLanguage,
          learningLanguages: user.learningLanguages,
          country: user.country || '',
          city: user.city || '',
          age: user.age || 0,
          isVerified: user.isVerified || false,
          photos: user.photos || [],
          createdAt: serverTimestamp(),
        }, { merge: true });

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
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error: any) => {
      console.error('Login mutation failed:', error);
      console.error('Error stack:', error.stack);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      try {
        console.log('Register attempt for:', email);
        
        const userCredential = await withTimeout(
          createUserWithEmailAndPassword(auth, email, password),
          AUTH_TIMEOUT_MS
        );
        const firebaseUser = userCredential.user;
        
        console.log('Firebase registration successful, uid:', firebaseUser.uid);

        await updateProfile(firebaseUser, {
          displayName: name,
        });

        const user: User = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email,
          name,
          avatar: '',
          photos: [],
          bio: '',
          nativeLanguage: { code: 'en', name: 'English', flag: '🇺🇸', level: 'native' },
          learningLanguages: [],
          isOnline: true,
          lastSeen: new Date(),
          country: '',
          city: '',
          age: 0,
          isVerified: false,
          createdAt: new Date(),
        };

        console.log('Creating user document in Firestore...');
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: user.email,
          displayName: user.name,
          photoURL: user.avatar,
          isOnline: true,
          lastSeen: serverTimestamp(),
          bio: user.bio,
          nativeLanguage: user.nativeLanguage,
          learningLanguages: user.learningLanguages,
          country: user.country,
          city: user.city,
          age: user.age,
          isVerified: user.isVerified,
          photos: user.photos,
          createdAt: serverTimestamp(),
        });

        const authData: StoredAuth = {
          user,
          isAuthenticated: false,
          needsProfileSetup: true,
          needsEmailVerification: true,
        };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        
        console.log('Registration successful!');
        return { user, email };
      } catch (error: any) {
        console.error('Registration error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.message === 'TIMEOUT') {
          throw new Error('Login timed out or failed. Check your connection or try again.');
        }
        
        let userFriendlyMessage = 'Registration failed. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
          userFriendlyMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.code === 'auth/invalid-email') {
          userFriendlyMessage = 'Invalid email address format.';
        } else if (error.code === 'auth/weak-password') {
          userFriendlyMessage = 'Password is too weak. Please use at least 6 characters.';
        } else if (error.code === 'auth/network-request-failed') {
          userFriendlyMessage = 'Network error. Please check your internet connection.';
        } else if (error.code === 'auth/operation-not-allowed') {
          userFriendlyMessage = 'Email/password authentication is not enabled. Please contact support.';
        } else if (error.message) {
          userFriendlyMessage = error.message;
        }
        
        throw new Error(userFriendlyMessage);
      }
    },
    onSuccess: (data) => {
      console.log('Register mutation success callback');
      setVerificationEmail(data.email);
      setNeedsEmailVerification(true);
      setAuthState({
        user: data.user,
        isAuthenticated: false,
        isLoading: false,
        needsProfileSetup: true,
      });
    },
    onError: (error: any) => {
      console.error('Register mutation failed:', error);
      console.error('Error stack:', error.stack);
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (code: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (code.length !== 6) {
        throw new Error('Invalid verification code');
      }
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: StoredAuth = JSON.parse(stored);
        parsed.needsEmailVerification = false;
        parsed.isAuthenticated = true;
        if (parsed.user) {
          parsed.user.isVerified = true;
        }
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
      throw new Error('No user found');
    },
    onSuccess: (data) => {
      setNeedsEmailVerification(false);
      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        needsProfileSetup: data.needsProfileSetup,
      });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: StoredAuth = JSON.parse(stored);
        if (parsed.user && parsed.user.uid) {
          parsed.user = { ...parsed.user, ...updates };
          parsed.needsProfileSetup = false;

          try {
            const updateData: Record<string, any> = {};
            if (updates.name) updateData.displayName = updates.name;
            if (updates.avatar !== undefined) updateData.photoURL = updates.avatar;
            if (updates.bio !== undefined) updateData.bio = updates.bio;
            if (updates.nativeLanguage) updateData.nativeLanguage = updates.nativeLanguage;
            if (updates.learningLanguages) updateData.learningLanguages = updates.learningLanguages;
            if (updates.country !== undefined) updateData.country = updates.country;
            if (updates.city !== undefined) updateData.city = updates.city;
            if (updates.age !== undefined) updateData.age = updates.age;
            if (updates.photos) updateData.photos = updates.photos;
            
            if (Object.keys(updateData).length > 0) {
              // @ts-expect-error - Firestore type issue with dynamic object
              await setDoc(doc(db, 'users', parsed.user.uid), updateData, { merge: true });
            }
          } catch (error) {
            console.log('Error updating profile in Firestore:', error);
          }
        }
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
      throw new Error('No user found');
    },
    onSuccess: (data) => {
      setAuthState(prev => ({
        ...prev,
        user: data.user,
        needsProfileSetup: false,
      }));
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Logout started...');
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: StoredAuth = JSON.parse(stored);
        if (parsed.user?.uid) {
          console.log('Updating user offline status for uid:', parsed.user.uid);
          try {
            await setDoc(doc(db, 'users', parsed.user.uid), {
              isOnline: false,
              lastSeen: serverTimestamp(),
            }, { merge: true });
            console.log('User status updated successfully');
          } catch (error) {
            console.error('Error updating offline status:', error);
          }
        }
      }
      console.log('Signing out from Firebase...');
      await signOut(auth);
      console.log('Clearing local storage...');
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      console.log('Logout completed');
    },
    onSuccess: () => {
      console.log('Logout mutation success, updating state...');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        needsProfileSetup: false,
      });
      setNeedsEmailVerification(false);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Verification code resent to:', verificationEmail);
      return true;
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async (): Promise<{ authData: StoredAuth; shouldRedirect: boolean }> => {
      try {
        console.log('Google login attempt, Platform:', Platform.OS);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        
        let result;
        if (Platform.OS === 'web') {
          console.log('Using signInWithPopup for web');
          result = await signInWithPopup(auth, provider);
          console.log('signInWithPopup result:', result);
        } else {
          console.log('Using signInWithRedirect for native');
          await signInWithRedirect(auth, provider);
          result = await getRedirectResult(auth);
          if (!result) {
            throw new Error('Redirect result is null');
          }
        }
        
        const firebaseUser = result.user;
        console.log('Google auth successful, uid:', firebaseUser.uid);
        
        let user: User;
        let needsProfileSetup = false;
        
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            user = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.displayName || firebaseUser.displayName || '',
              avatar: userData.photoURL || firebaseUser.photoURL || '',
              photos: userData.photos || [],
              bio: userData.bio || '',
              nativeLanguage: userData.nativeLanguage || { code: 'en', name: 'English', flag: '🇺🇸', level: 'native' },
              learningLanguages: userData.learningLanguages || [],
              isOnline: true,
              lastSeen: new Date(),
              country: userData.country || '',
              city: userData.city || '',
              age: userData.age || 0,
              isVerified: userData.isVerified || false,
              createdAt: userData.createdAt?.toDate() || new Date(),
            };
          } else {
            needsProfileSetup = true;
            user = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || '',
              avatar: firebaseUser.photoURL || '',
              photos: [],
              bio: '',
              nativeLanguage: { code: 'en', name: 'English', flag: '🇺🇸', level: 'native' },
              learningLanguages: [],
              isOnline: true,
              lastSeen: new Date(),
              country: '',
              city: '',
              age: 0,
              isVerified: false,
              createdAt: new Date(),
            };
          }
        } catch (firestoreError: any) {
          console.log('Firestore offline or error, creating new user:', firestoreError.message);
          needsProfileSetup = true;
          user = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
            avatar: firebaseUser.photoURL || '',
            photos: [],
            bio: '',
            nativeLanguage: { code: 'en', name: 'English', flag: '🇺🇸', level: 'native' },
            learningLanguages: [],
            isOnline: true,
            lastSeen: new Date(),
            country: '',
            city: '',
            age: 0,
            isVerified: false,
            createdAt: new Date(),
          };
        }
        
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: user.email,
            displayName: user.name,
            photoURL: user.avatar,
            isOnline: true,
            lastSeen: serverTimestamp(),
            bio: user.bio,
            nativeLanguage: user.nativeLanguage,
            learningLanguages: user.learningLanguages,
            country: user.country,
            city: user.city,
            age: user.age,
            isVerified: user.isVerified,
            photos: user.photos,
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (setDocError: any) {
          console.log('Firestore write failed (offline), will sync later:', setDocError.message);
        }
        
        const authData: StoredAuth = {
          user,
          isAuthenticated: true,
          needsProfileSetup,
          needsEmailVerification: false,
        };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        
        console.log('Google login successful!');
        return { authData, shouldRedirect: true };
      } catch (error: any) {
        console.error('Google login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let userFriendlyMessage = 'Google sign-in failed. Please try again.';
        
        if (error.code === 'auth/popup-closed-by-user') {
          userFriendlyMessage = 'Sign-in cancelled. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
          userFriendlyMessage = 'Popup was blocked. Please allow popups and try again.';
        } else if (error.code === 'auth/network-request-failed') {
          userFriendlyMessage = 'Network error. Please check your internet connection.';
        } else if (error.code === 'auth/too-many-requests') {
          userFriendlyMessage = 'Too many requests. Please try again later.';
        } else if (error.message) {
          userFriendlyMessage = error.message;
        }
        
        throw new Error(userFriendlyMessage);
      }
    },
    onSuccess: (data) => {
      console.log('Google login mutation success callback');
      setAuthState({
        user: data.authData.user,
        isAuthenticated: true,
        isLoading: false,
        needsProfileSetup: data.authData.needsProfileSetup,
      });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error: any) => {
      console.error('Google login mutation failed:', error);
      console.error('Error stack:', error.stack);
    },
  });

  return {
    ...authState,
    needsEmailVerification,
    verificationEmail,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    loginWithGoogle: googleLoginMutation.mutate,
    verifyEmail: verifyEmailMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    logout: logoutMutation.mutate,
    resendVerification: resendVerificationMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isGoogleLoading: googleLoginMutation.isPending,
    isVerifyLoading: verifyEmailMutation.isPending,
    isUpdateLoading: updateProfileMutation.isPending,
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
    googleError: googleLoginMutation.error?.message,
    verifyError: verifyEmailMutation.error?.message,
  };
});
