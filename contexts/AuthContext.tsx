import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { User, AuthState } from '@/types';

import { auth, db, storage } from '@/src/firebase';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

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
  console.log('🔍 AuthContext initializing...');
  console.log('Auth status:', auth ? '✅ Loaded' : '❌ Not loaded');
  console.log('DB status:', db ? '✅ Loaded' : '❌ Not loaded');
  
  if (!auth || !db) {
    console.error('❌ Firebase auth veya db nesnesi yüklenmedi!');
    console.error('Auth:', auth);
    console.error('DB:', db);
    console.error('Bu genellikle Firebase config hatası veya network problemi yüzünden olur.');
    console.error('Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.');
  }
  
  const firebaseAuth = auth as Auth | undefined;
  const firebaseDb = db as Firestore | undefined;
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
    if (!firebaseAuth || !firebaseDb || Platform.OS !== 'web') return;
    console.log('🔄 Checking for Google redirect result...');
    getRedirectResult(firebaseAuth).then(async (result) => {
      if (result && result.user) {
        console.log('✅ Got redirect result, user:', result.user.uid);
        const userRef = doc(firebaseDb, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        let user: User;
        let needsSetup = false;
        if (userSnap.exists()) {
          const userData = userSnap.data();
          user = {
            id: result.user.uid,
            uid: result.user.uid,
            email: result.user.email || '',
            name: userData.displayName || result.user.displayName || '',
            avatar: userData.photoURL || result.user.photoURL || '',
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
          needsSetup = true;
          user = {
            id: result.user.uid,
            uid: result.user.uid,
            email: result.user.email || '',
            name: result.user.displayName || '',
            avatar: result.user.photoURL || '',
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
          await setDoc(userRef, {
            uid: result.user.uid,
            email: user.email,
            displayName: user.name,
            photoURL: user.avatar,
            isOnline: true,
            lastSeen: serverTimestamp(),
            bio: '',
            nativeLanguage: user.nativeLanguage,
            learningLanguages: [],
            country: '',
            city: '',
            age: 0,
            isVerified: false,
            photos: [],
            createdAt: serverTimestamp(),
          });
        }
        const authData: StoredAuth = { user, isAuthenticated: true, needsProfileSetup: needsSetup, needsEmailVerification: false };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        console.log('✅ Redirect login successful, setting auth state');
        setAuthState({ user, isAuthenticated: true, isLoading: false, needsProfileSetup: needsSetup });
      } else {
        console.log('No redirect result found (normal if not coming from redirect)');
      }
    }).catch((error) => {
      console.error('❌ Redirect result error:', error);
    });
  }, [firebaseAuth, firebaseDb]);

  useEffect(() => {
    if (!firebaseAuth || !firebaseDb) {
      console.error('❌ Firebase not available, skipping presence system');
      return;
    }
    
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let appStateSubscription: any = null;
    let beforeUnloadHandler: (() => void) | null = null;
    let currentUserId: string | null = null;
    
    const setUserOnlineStatus = async (uid: string, isOnline: boolean) => {
      try {
        const userRef = doc(firebaseDb, 'users', uid);
        await setDoc(userRef, {
          isOnline,
          lastSeen: serverTimestamp(),
        }, { merge: true });
        console.log('✅ User status updated:', isOnline ? 'Online' : 'Offline');
      } catch (error) {
        console.error('❌ Error updating online status:', error);
      }
    };
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
      }
      if (beforeUnloadHandler && Platform.OS === 'web') {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        beforeUnloadHandler = null;
      }
      
      if (firebaseUser) {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: StoredAuth = JSON.parse(stored);
          if (parsed.user) {
            currentUserId = firebaseUser.uid;
            await setUserOnlineStatus(firebaseUser.uid, true);
            
            heartbeatInterval = setInterval(async () => {
              try {
                await setUserOnlineStatus(firebaseUser.uid, true);
              } catch (error) {
                console.log('Heartbeat error:', error);
              }
            }, 30000);
            
            if (Platform.OS === 'web') {
              beforeUnloadHandler = () => {
                const userRef = doc(firebaseDb, 'users', firebaseUser.uid);
                setDoc(userRef, {
                  isOnline: false,
                  lastSeen: serverTimestamp(),
                }, { merge: true }).catch(err => console.error('Offline update error:', err));
              };
              
              window.addEventListener('beforeunload', beforeUnloadHandler);
            } else {
              const handleAppStateChange = async (nextAppState: AppStateStatus) => {
                console.log('📱 App state changed:', nextAppState);
                
                if (nextAppState === 'active') {
                  await setUserOnlineStatus(firebaseUser.uid, true);
                } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                  await setUserOnlineStatus(firebaseUser.uid, false);
                }
              };
              
              appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
            }
          }
        }
      } else {
        currentUserId = null;
      }
    });

    return () => {
      console.log('🧹 Cleaning up presence system');
      
      if (currentUserId && firebaseDb) {
        setUserOnlineStatus(currentUserId, false).catch(err => 
          console.error('Error setting offline on cleanup:', err)
        );
      }
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
      if (beforeUnloadHandler && Platform.OS === 'web') {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebaseAuth, firebaseDb]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!firebaseAuth || !firebaseDb) {
        throw new Error('Firebase is not initialized. Please refresh the page.');
      }
      
      try {
        console.log('Login attempt for:', email);
        
        const userCredential = await withTimeout(
          signInWithEmailAndPassword(firebaseAuth, email, password),
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
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email,
              name: firebaseUser.displayName || email.split('@')[0],
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
        } else {
          user = { 
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email,
            name: firebaseUser.displayName || email.split('@')[0],
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

        console.log('Updating user document in Firestore...');
        await setDoc(doc(firebaseDb, 'users', firebaseUser.uid), {
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
    },
    onError: (error: any) => {
      console.error('Login mutation failed:', error);
      console.error('Error stack:', error.stack);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      if (!firebaseAuth || !firebaseDb) {
        throw new Error('Firebase is not initialized. Please refresh the page.');
      }
      
      try {
        console.log('Register attempt for:', email);
        
        const userCredential = await withTimeout(
          createUserWithEmailAndPassword(firebaseAuth, email, password),
          AUTH_TIMEOUT_MS
        );
        const firebaseUser = userCredential.user;
        
        console.log('Firebase registration successful, uid:', firebaseUser.uid);

        await updateProfile(firebaseUser, {
          displayName: name,
        });

        console.log('Sending email verification...');
        await sendEmailVerification(firebaseUser);
        console.log('Email verification sent successfully');

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
        await setDoc(doc(firebaseDb, 'users', firebaseUser.uid), {
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

  const checkEmailVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!firebaseAuth?.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      await firebaseAuth.currentUser.reload();
      
      if (firebaseAuth.currentUser.emailVerified) {
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
      }
      
      throw new Error('Email is not verified yet');
    },
    onSuccess: (data) => {
      setNeedsEmailVerification(false);
      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        needsProfileSetup: data.needsProfileSetup,
      });
    },
  });

  const uploadImage = async (uri: string, userId: string, index: number): Promise<string> => {
    try {
      console.log('🔄 Starting image upload:', uri);
      console.log('Storage status:', storage ? '✅ Available' : '❌ Not available');
      
      if (!storage) {
        console.error('❌ Storage is not initialized');
        throw new Error('Firebase Storage is not available. Please check your Firebase configuration and refresh the page.');
      }
      
      let blob: Blob;
      
      if (Platform.OS === 'web') {
        console.log('Web platform detected, fetching blob...');
        try {
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          blob = await response.blob();
          console.log('Blob created successfully, size:', blob.size, 'type:', blob.type);
        } catch (fetchError: any) {
          console.error('Fetch error:', fetchError);
          throw new Error('Failed to process image. Please try again.');
        }
      } else {
        console.log('Native platform detected, fetching blob...');
        const response = await fetch(uri);
        blob = await response.blob();
      }
      
      if (!blob || blob.size === 0) {
        throw new Error('Invalid image data');
      }
      
      const filename = `profile_${userId}_${index}_${Date.now()}.jpg`;
      const storagePath = `profile-photos/${userId}/${filename}`;
      
      console.log('Creating storage reference:', storagePath);
      const storageRef = ref(storage, storagePath);
      
      console.log('Uploading to storage...');
      const uploadResult = await uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/jpeg',
      });
      
      console.log('Upload successful, getting download URL...');
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('✅ Upload complete, URL:', downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error('❌ Upload image error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.code === 'storage/unauthorized') {
        throw new Error('Permission denied. Please check Firebase Storage rules.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was cancelled.');
      } else if (error.code === 'storage/unknown') {
        throw new Error('Upload failed. Please check your internet connection.');
      }
      
      throw error;
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: StoredAuth = JSON.parse(stored);
        if (parsed.user && parsed.user.uid) {
          let processedUpdates = { ...updates };
          
          if (updates.photos && updates.photos.length > 0) {
            console.log('Processing photos for upload...');
            const uploadedPhotos: string[] = [];
            
            for (let i = 0; i < updates.photos.length; i++) {
              const photoUri = updates.photos[i];
              if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
                uploadedPhotos.push(photoUri);
              } else {
                try {
                  const downloadURL = await uploadImage(photoUri, parsed.user.uid, i);
                  uploadedPhotos.push(downloadURL);
                } catch (error) {
                  console.error('Error uploading photo:', error);
                  throw new Error('Failed to upload photo. Please try again.');
                }
              }
            }
            
            processedUpdates.photos = uploadedPhotos;
            processedUpdates.avatar = uploadedPhotos[0] || '';
          }
          
          parsed.user = { ...parsed.user, ...processedUpdates };
          parsed.needsProfileSetup = false;

          try {
            const updateData: Record<string, any> = {};
            if (processedUpdates.name) updateData.displayName = processedUpdates.name;
            if (processedUpdates.avatar !== undefined) updateData.photoURL = processedUpdates.avatar;
            if (processedUpdates.bio !== undefined) updateData.bio = processedUpdates.bio;
            if (processedUpdates.nativeLanguage) updateData.nativeLanguage = processedUpdates.nativeLanguage;
            if (processedUpdates.learningLanguages) updateData.learningLanguages = processedUpdates.learningLanguages;
            if (processedUpdates.country !== undefined) updateData.country = processedUpdates.country;
            if (processedUpdates.city !== undefined) updateData.city = processedUpdates.city;
            if (processedUpdates.age !== undefined) updateData.age = processedUpdates.age;
            if (processedUpdates.photos) updateData.photos = processedUpdates.photos;
            
            if (Object.keys(updateData).length > 0 && firebaseDb) {
              // @ts-expect-error - Firestore type issue with dynamic object
              await setDoc(doc(firebaseDb, 'users', parsed.user.uid), updateData, { merge: true });
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
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!firebaseAuth) {
        console.error('❌ Firebase auth not available for logout');
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        return;
      }
      
      console.log('Logout started...');
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: StoredAuth = JSON.parse(stored);
        if (parsed.user?.uid && firebaseDb) {
          console.log('Updating user offline status for uid:', parsed.user.uid);
          try {
            await setDoc(doc(firebaseDb, 'users', parsed.user.uid), {
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
      await signOut(firebaseAuth);
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
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!firebaseAuth?.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      try {
        await sendEmailVerification(firebaseAuth.currentUser);
        console.log('Verification email resent successfully');
        return true;
      } catch (error: any) {
        console.error('Resend verification error:', error);
        
        let userFriendlyMessage = 'Failed to resend verification email.';
        
        if (error.code === 'auth/too-many-requests') {
          userFriendlyMessage = 'Too many requests. Please wait a moment before trying again.';
        } else if (error.message) {
          userFriendlyMessage = error.message;
        }
        
        throw new Error(userFriendlyMessage);
      }
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!firebaseAuth) {
        throw new Error('Firebase is not initialized. Please refresh the page.');
      }
      
      try {
        console.log('Sending password reset email to:', email);
        await sendPasswordResetEmail(firebaseAuth, email);
        console.log('Password reset email sent successfully');
        return true;
      } catch (error: any) {
        console.error('Password reset error:', error);
        let userFriendlyMessage = 'Failed to send password reset email.';
        
        if (error.code === 'auth/user-not-found') {
          userFriendlyMessage = 'No account found with this email.';
        } else if (error.code === 'auth/invalid-email') {
          userFriendlyMessage = 'Invalid email address.';
        } else if (error.code === 'auth/too-many-requests') {
          userFriendlyMessage = 'Too many requests. Please try again later.';
        }
        
        throw new Error(userFriendlyMessage);
      }
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!firebaseAuth?.currentUser || !firebaseDb) {
        throw new Error('No user is currently signed in');
      }
      
      const userId = firebaseAuth.currentUser.uid;
      console.log('Starting account deletion for user:', userId);
      
      try {
        // Delete user's messages
        try {
          const messagesQuery = query(collection(firebaseDb, 'messages'), where('senderId', '==', userId));
          const messagesSnapshot = await getDocs(messagesQuery);
          for (const msgDoc of messagesSnapshot.docs) {
            await deleteDoc(msgDoc.ref);
          }
          console.log('Deleted user messages');
        } catch (e) {
          console.log('Error deleting messages:', e);
        }
        
        // Delete user's chats
        try {
          const chatsQuery = query(collection(firebaseDb, 'chats'), where('participants', 'array-contains', userId));
          const chatsSnapshot = await getDocs(chatsQuery);
          for (const chatDoc of chatsSnapshot.docs) {
            await deleteDoc(chatDoc.ref);
          }
          console.log('Deleted user chats');
        } catch (e) {
          console.log('Error deleting chats:', e);
        }
        
        // Delete user document
        await deleteDoc(doc(firebaseDb, 'users', userId));
        console.log('Deleted user document');
        
        // Delete Firebase Auth user
        await deleteUser(firebaseAuth.currentUser);
        console.log('Deleted Firebase Auth user');
        
        // Clear local storage
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        console.log('Cleared local storage');
        
        return true;
      } catch (error: any) {
        console.error('Delete account error:', error);
        
        let userFriendlyMessage = 'Failed to delete account. Please try again.';
        
        if (error.code === 'auth/requires-recent-login') {
          userFriendlyMessage = 'Please log out and log in again before deleting your account.';
        }
        
        throw new Error(userFriendlyMessage);
      }
    },
    onSuccess: () => {
      console.log('Account deleted successfully');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        needsProfileSetup: false,
      });
      setNeedsEmailVerification(false);
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async (): Promise<{ authData: StoredAuth; shouldRedirect: boolean }> => {
      if (!firebaseAuth || !firebaseDb) {
        throw new Error('Firebase is not initialized. Please refresh the page.');
      }
      
      console.log('========== GOOGLE LOGIN START ==========');
      console.log('Platform:', Platform.OS);
      console.log('Firebase Auth domain:', firebaseAuth.config?.authDomain);
      
      let firebaseUser;
      
      if (Platform.OS === 'web') {
        console.log('🌐 Using signInWithPopup for web');
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        
        console.log('📋 Provider created, attempting signInWithPopup...');
        
        try {
          const result = await signInWithPopup(firebaseAuth, provider);
          console.log('✅ signInWithPopup SUCCESS');
          console.log('  User UID:', result.user.uid);
          console.log('  User email:', result.user.email);
          console.log('  User displayName:', result.user.displayName);
          firebaseUser = result.user;
        } catch (popupError: any) {
          console.error('❌ signInWithPopup FAILED');
          console.error('  Error code:', popupError?.code);
          console.error('  Error message:', popupError?.message);
          console.error('  Full error:', JSON.stringify(popupError, null, 2));
          
          if (popupError?.code === 'auth/popup-closed-by-user' || popupError?.code === 'auth/cancelled-popup-request') {
            throw new Error('Sign-in cancelled. Please try again.');
          }
          if (popupError?.code === 'auth/popup-blocked') {
            throw new Error('Popup was blocked by browser. Please allow popups for this site.');
          }
          if (popupError?.code === 'auth/unauthorized-domain') {
            throw new Error('This domain is not authorized in Firebase. Add it to Authentication > Settings > Authorized domains.');
          }
          if (popupError?.code === 'auth/internal-error') {
            throw new Error('Firebase internal error. Check Google Cloud Console OAuth settings and authorized domains.');
          }
          
          throw popupError;
        }
      } else {
        console.log('📱 Using expo-auth-session for native');
        
        const redirectUri = AuthSession.makeRedirectUri({
          scheme: 'lanchat-app',
          path: 'auth'
        });
        console.log('Redirect URI:', redirectUri);
        
        const discovery = {
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
        };
        
        const authRequest = new AuthSession.AuthRequest({
          clientId: GOOGLE_WEB_CLIENT_ID,
          redirectUri,
          scopes: ['openid', 'profile', 'email'],
          responseType: AuthSession.ResponseType.IdToken,
          extraParams: {
            nonce: Math.random().toString(36).substring(2, 15),
          },
        });
        
        console.log('Starting auth request...');
        const authResult = await authRequest.promptAsync(discovery);
        console.log('Auth result type:', authResult.type);
        
        if (authResult.type !== 'success') {
          if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
            throw new Error('Sign-in cancelled. Please try again.');
          }
          throw new Error('Google sign-in failed. Please try again.');
        }
        
        const idToken = authResult.params?.id_token;
        if (!idToken) {
          console.error('No ID token in response:', authResult);
          throw new Error('No ID token received from Google.');
        }
        
        console.log('Got ID token, signing in with Firebase...');
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(firebaseAuth, credential);
        firebaseUser = userCredential.user;
      }
      
      console.log('🔥 Google auth successful, uid:', firebaseUser.uid);
      console.log('  Processing user data...');
      
      let user: User;
      let needsProfileSetup = false;
      
      try {
        const userDocRef = doc(firebaseDb, 'users', firebaseUser.uid);
        console.log('  Fetching user document from Firestore...');
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          console.log('  ✅ User document found in Firestore');
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
          console.log('  📝 New user, needs profile setup');
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
        console.warn('  ⚠️ Firestore read error:', firestoreError.message);
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
        console.log('  Writing user document to Firestore...');
        await setDoc(doc(firebaseDb, 'users', firebaseUser.uid), {
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
        console.log('  ✅ Firestore write successful');
      } catch (setDocError: any) {
        console.warn('  ⚠️ Firestore write error:', setDocError.message);
      }
      
      const authData: StoredAuth = {
        user,
        isAuthenticated: true,
        needsProfileSetup,
        needsEmailVerification: false,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      
      console.log('✅ Google login COMPLETE');
      console.log('  isAuthenticated:', true);
      console.log('  needsProfileSetup:', needsProfileSetup);
      console.log('========== GOOGLE LOGIN END ==========');
      return { authData, shouldRedirect: true };
    },
    onSuccess: (data) => {
      console.log('🎉 Google login onSuccess callback firing');
      console.log('  Setting isAuthenticated=true, needsProfileSetup=', data.authData.needsProfileSetup);
      setAuthState({
        user: data.authData.user,
        isAuthenticated: true,
        isLoading: false,
        needsProfileSetup: data.authData.needsProfileSetup,
      });
    },
    onError: (error: any) => {
      console.error('❌ Google login onError callback');
      console.error('  Error message:', error?.message);
      console.error('  Error code:', error?.code);
      console.error('  Error stack:', error?.stack);
    },
  });

  return {
    ...authState,
    needsEmailVerification,
    verificationEmail,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    loginWithGoogle: googleLoginMutation.mutate,
    checkEmailVerification: checkEmailVerificationMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    logout: logoutMutation.mutate,
    resendVerification: resendVerificationMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isGoogleLoading: googleLoginMutation.isPending,
    isCheckVerificationLoading: checkEmailVerificationMutation.isPending,
    isUpdateLoading: updateProfileMutation.isPending,
    isResetPasswordLoading: resetPasswordMutation.isPending,
    isResendVerificationLoading: resendVerificationMutation.isPending,
    isDeleteAccountLoading: deleteAccountMutation.isPending,
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
    googleError: googleLoginMutation.error?.message,
    checkVerificationError: checkEmailVerificationMutation.error?.message,
    resendVerificationError: resendVerificationMutation.error?.message,
    resetPasswordError: resetPasswordMutation.error?.message,
    deleteAccountError: deleteAccountMutation.error?.message,
    resetPasswordSuccess: resetPasswordMutation.isSuccess,
    resendVerificationSuccess: resendVerificationMutation.isSuccess,
  };
});
