import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const getFirebaseConfig = () => {
  // 1. Production check
  if (typeof window !== 'undefined' && window.__firebase_config) {
    console.log("Using injected Production Config");
    return typeof window.__firebase_config === 'string' 
      ? JSON.parse(window.__firebase_config) 
      : window.__firebase_config;
  }

  // 2. Local Fallback (Your keys are correct here)
  console.log("Using Local Dev Fallback Config");
  return {
    apiKey: "AIzaSyA6hQMpWLHqk73j1gLFwigS5th4qP-9AEI",
    authDomain: "salpointe-prayers.firebaseapp.com",
    projectId: "salpointe-prayers",
    storageBucket: "salpointe-prayers.firebasestorage.app",
    messagingSenderId: "606550957860",
    appId: "1:606550957860:web:082ccacd60d6f75cc21db1"
  };
};

const config = getFirebaseConfig();
const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Sanitize appId for Firestore paths
const rawAppId = (typeof window !== 'undefined' && window.__app_id) 
  ? window.__app_id 
  : 'local-dev-app';
const appId = rawAppId.replace(/\//g, '_');

export { app, auth, db, googleProvider, appId };