// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6hQMpWLHqk73j1gLFwigS5th4qP-9AEI",
  authDomain: "salpointe-prayers.firebaseapp.com",
  projectId: "salpointe-prayers",
  storageBucket: "salpointe-prayers.firebasestorage.app",
  messagingSenderId: "606550957860",
  appId: "1:606550957860:web:082ccacd60d6f75cc21db1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);