import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAda2d_dvWcM2DZshoG4ner2UbJcbLslHo",
  authDomain: "lanchat5.firebaseapp.com",
  projectId: "lanchat5",
  storageBucket: "lanchat5.firebasestorage.app",
  messagingSenderId: "631860647802",
  appId: "1:631860647802:web:04ea48b7a0b918ce7128c3",
  measurementId: "G-X4K39ZS1Q8",
};

let app: FirebaseApp;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Firebase app initialization error:', error);
  throw new Error('Failed to initialize Firebase app');
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

console.log('Firebase auth and db initialized successfully');
console.log('Auth object:', auth);
console.log('DB object:', db);

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
