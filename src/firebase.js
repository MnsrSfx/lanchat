import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Analytics sadece tarayıcı ortamında çalışır (SSR uyumlu olsun diye)
let analytics = null;
if (typeof window !== "undefined") {
  // Next.js gibi SSR ortamlarında analytics import'u sadece client'ta yapılmalı
  import("firebase/analytics").then(({ getAnalytics }) => {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    } catch (error) {
      console.warn("Analytics initialization failed:", error);
    }
  });
}

const firebaseConfig = {
  apiKey: "AIzaSyAda2d_dvWcM2DZshoG4ner2UbJcbLslHo",
  authDomain: "lanchat5.firebaseapp.com",
  projectId: "lanchat5",
  storageBucket: "lanchat5.firebasestorage.app",
  messagingSenderId: "631860647802",
  appId: "1:631860647802:web:04ea48b7a0b918ce7128c3",
  measurementId: "G-X4K39ZS1Q8",
};

// Firebase app'i başlat
const app = initializeApp(firebaseConfig);

// Auth export et
export const auth = getAuth(app);

// Firestore'u persistence ile başlat (web'de IndexedDB)
export const db = (() => {
  if (typeof window !== "undefined") {
    try {
      const firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
      console.log("Firestore initialized with persistent cache");
      return firestore;
    } catch (error) {
      console.warn("Persistence setup failed, using default cache:", error);
      return initializeFirestore(app, {});
    }
  } else {
    return initializeFirestore(app, {});
  }
})();

console.log("Firebase initialized successfully");

// Analytics export et (null olabilir ama hata vermez)
export { analytics };

export default app;