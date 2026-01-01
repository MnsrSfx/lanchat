import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "",
  authDomain: "lanchat5.firebaseapp.com",
  projectId: "lanchat5",
  storageBucket: "lanchat5.firebasestorage.app",
  messagingSenderId: "631860647802",
  appId: "1:631860647802:web:04ea48b7a0b918ce7128c3",
  measurementId: "G-X4K39ZS1Q8",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
  console.log('🔄 Initializing Firebase...');
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app initialized successfully');
  
  auth = getAuth(app);
  db = getFirestore(app);
  
  if (!auth) {
    console.error('❌ Failed to initialize Firebase Auth');
  }
  if (!db) {
    console.error('❌ Failed to initialize Firestore');
  }
  
  if (auth && db) {
    console.log('✅ Firebase auth and db initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.error('Config used:', { ...firebaseConfig, apiKey: firebaseConfig.apiKey.substring(0, 10) + '...' });
}

export { auth, db };

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
