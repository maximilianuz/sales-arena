import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDi9uc_gDsi5krnR44YaZiFWcz9fJYeBPA",
  authDomain: "sales-arena-94086.firebaseapp.com",
  projectId: "sales-arena-94086",
  storageBucket: "sales-arena-94086.firebasestorage.app",
  messagingSenderId: "423888171348",
  appId: "1:423888171348:web:4508726cc1406edb8258c1",
  measurementId: "G-5T2XGLLBEB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);

// Initialize Auth (email/password + Google)
export const auth = getAuth(app);
