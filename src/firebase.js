import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAda2d_dvWcM2DZshoG4ner2UbJcbLslHo",
  authDomain: "lanchat5.firebaseapp.com",
  projectId: "lanchat5",
  storageBucket: "lanchat5.firebasestorage.app",
  messagingSenderId: "631860647802",
  appId: "1:631860647802:web:04ea48b7a0b918ce7128c3",
  measurementId: "G-X4K39ZS1Q8",
};

let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app);

if (!auth || !db) {
  console.error('Firebase auth veya db nesnesi yüklenmedi! firebase.js\'yi kontrol et.');
  throw new Error('Firebase initialization failed: auth or db is null');
}

console.log('Firebase auth and db initialized:', { auth: !!auth, db: !!db });

let analytics = null;
if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    } catch (error) {
      console.warn("Analytics initialization failed:", error);
    }
  });
}

export { analytics };
export default app;