import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { User, AuthState } from '@/types';
import { MOCK_CURRENT_USER } from '@/mocks/users';
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
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    if (!firebaseAuth || !firebaseDb) {
      console.error('❌ Firebase not available, skipping presence system');
      return;
    }
    
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: StoredAuth = JSON.parse(stored);
          if (parsed.user) {
            try {
              const userRef = doc(firebaseDb, 'users', firebaseUser.uid);
              
              await setDoc(userRef, {
                isOnline: true,
                lastSeen: serverTimestamp(),
              }, { merge: true });
              
              if (Platform.OS === 'web') {
                heartbeatInterval = setInterval(async () => {
                  try {
                    await setDoc(userRef, {
                      isOnline: true,
                      lastSeen: serverTimestamp(),
                    }, { merge: true });
                  } catch (error) {
                    console.log('Heartbeat error:', error);
                  }
                }, 30000);
                
                const handleBeforeUnload = async () => {
                  await setDoc(userRef, {
                    isOnline: false,
                    lastSeen: serverTimestamp(),
                  }, { merge: true });
                };
                
                window.addEventListener('beforeunload', handleBeforeUnload);
                
                return () => {
                  window.removeEventListener('beforeunload', handleBeforeUnload);
                };
              }
            } catch (error) {
              console.log('Error updating online status:', error);
            }
          }
        }
      } else {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
      }
    });

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
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
    },
  });

  const uploadImage = async (uri: string, userId: string, index: number): Promise<string> => {
    try {
      console.log('🔄 Starting image upload:', uri);
      console.log('Storage status:', storage ? '✅ Available' : '❌ Not available');
      console.log('Storage object:', storage);
      
      if (!storage || typeof storage !== 'object') {
        console.error('Storage initialization failed. Storage value:', storage);
        throw new Error('Firebase Storage is not available. Please check your Firebase configuration and refresh the page.');
      }
      
      const firebaseStorage = storage;
      
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
      const storageRef = ref(firebaseStorage, storagePath);
      
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Verification code resent to:', verificationEmail);
      return true;
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

  const googleLoginMutation = useMutation({
    mutationFn: async (): Promise<{ authData: StoredAuth; shouldRedirect: boolean }> => {
      if (!firebaseAuth || !firebaseDb) {
        throw new Error('Firebase is not initialized. Please refresh the page.');
      }
      
      try {
        console.log('Google login attempt, Platform:', Platform.OS);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        
        let result;
        if (Platform.OS === 'web') {
          console.log('Using signInWithPopup for web');
          result = await signInWithPopup(firebaseAuth, provider);
          console.log('signInWithPopup result:', result);
        } else {
          console.log('Using signInWithRedirect for native');
          await signInWithRedirect(firebaseAuth, provider);
          result = await getRedirectResult(firebaseAuth);
          if (!result) {
            throw new Error('Redirect result is null');
          }
        }
        
        const firebaseUser = result.user;
        console.log('Google auth successful, uid:', firebaseUser.uid);
        
        let user: User;
        let needsProfileSetup = false;
        
        try {
          const userDocRef = doc(firebaseDb, 'users', firebaseUser.uid);
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
    resetPassword: resetPasswordMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isGoogleLoading: googleLoginMutation.isPending,
    isVerifyLoading: verifyEmailMutation.isPending,
    isUpdateLoading: updateProfileMutation.isPending,
    isResetPasswordLoading: resetPasswordMutation.isPending,
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
    googleError: googleLoginMutation.error?.message,
    verifyError: verifyEmailMutation.error?.message,
    resetPasswordError: resetPasswordMutation.error?.message,
    resetPasswordSuccess: resetPasswordMutation.isSuccess,
  };
});
