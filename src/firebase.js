import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * FIREBASE CONFIGURATION
 * We use environment variables for local dev and 
 * check for a global config object for production "Artifact" environments.
 */
const getFirebaseConfig = () => {
  // 1. Check for global production config (injected by hosting)
  if (typeof window !== 'undefined' && window.__firebase_config) {
    return typeof window.__firebase_config === 'string' 
      ? JSON.parse(window.__firebase_config) 
      : window.__firebase_config;
  }

  // 2. Use Environment Variables (Vite standard)
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(getFirebaseConfig()) : getApp();

// Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// CONFIGURE GOOGLE AUTH
export const googleProvider = new GoogleAuthProvider();

// Security: Enforce Salpointe domain in the Google Auth window
googleProvider.setCustomParameters({
  hd: "salpointe.org",
  prompt: "select_account" // Forces account picker to ensure they pick the school email
});

/**
 * APP ID LOGIC
 * Determines which "folder" the intentions go into.
 */
const getAppId = () => {
  const rawId = (typeof window !== 'undefined' && window.__app_id) 
    ? window.__app_id 
    : 'salpointe-chapel-v1';
  
  return rawId.replace(/\//g, '_'); // Sanitize for Firestore paths
};

export const appId = getAppId();