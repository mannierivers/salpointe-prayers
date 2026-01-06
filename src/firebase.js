import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6hQMpWLHqk73j1gLFwigS5th4qP-9AEI",
  authDomain: "salpointe-prayers.firebaseapp.com",
  projectId: "salpointe-prayers",
  storageBucket: "salpointe-prayers.firebasestorage.app",
  messagingSenderId: "606550957860",
  appId: "1:606550957860:web:082ccacd60d6f75cc21db1"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configure Google Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: "salpointe.org" // Forces the selector to prioritize school accounts
});

// App ID Logic - Critical for the database path
const rawAppId = (typeof window !== 'undefined' && window.__app_id) 
  ? window.__app_id 
  : 'salpointe-chapel'; // Default folder name

const appId = rawAppId.replace(/\//g, '_');

export { app, auth, db, googleProvider, appId };