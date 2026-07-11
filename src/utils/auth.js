import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { auth, db } from './db';

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function signOutUser() {
  return signOut(auth);
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function activateFreeplan(uid) {
  // Solo tocamos el campo subscriptionStatus: es el único que las reglas de
  // Firebase permiten escribir al cliente. subscriptionPlan y sessionsUsed
  // quedan bajo control exclusivo del servidor (generate.js vía REST con el
  // service account, que no está sujeto a estas reglas). Si se escriben los
  // 3 campos juntos en un solo set(), Firebase rechaza TODA la operación
  // porque subscriptionPlan/sessionsUsed tienen .write:false explícito.
  return update(ref(db, `users/${uid}`), {
    subscriptionStatus: 'free'
  });
}
