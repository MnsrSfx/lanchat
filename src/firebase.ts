import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

try {
  console.log('🔄 Initializing Firebase...');
  console.log('Config check:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
  });
  
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error('Missing Firebase configuration. Please check environment variables.');
  }
  
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app initialized successfully');
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  if (!auth) {
    throw new Error('Failed to initialize Firebase Auth');
  }
  if (!db) {
    throw new Error('Failed to initialize Firestore');
  }
  if (!storage) {
    throw new Error('Failed to initialize Firebase Storage');
  }
  
  console.log('✅ Firebase auth, db, and storage initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.error('Make sure EXPO_PUBLIC_FIREBASE_* environment variables are set');
}

export { auth, db, storage };

let analytics: any = null;
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    try {
      if (app) {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized");
      }
    } catch (error) {
      console.warn("Analytics initialization failed:", error);
    }
  });
}

export { analytics };
export default app;
