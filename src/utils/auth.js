import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { auth, db } from './db';

const googleProvider = new GoogleAuthProvider();
// Mostrar siempre el selector de cuenta: evita quedar "pegado" con una sesión
// previa y hace el flujo predecible cuando alguien tiene varias cuentas.
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Detecta navegadores in-app (LinkedIn, Instagram, Facebook, TikTok, etc.).
// Google BLOQUEA el login OAuth dentro de estos webviews embebidos
// (error "disallowed_useragent"), así que conviene avisar al usuario que
// abra el enlace en Chrome/Safari en vez de dejarlo chocar contra el bloqueo.
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const markers = [
    'FBAN', 'FBAV', 'FB_IAB', 'Instagram', 'LinkedInApp', 'Line/',
    'Twitter', 'Snapchat', 'Pinterest', 'TikTok', 'musical_ly',
    'WhatsApp', 'WeChat', 'MicroMessenger', 'GSA/', '; wv'
  ];
  return markers.some((m) => ua.includes(m));
}

// Heurística simple para elegir redirect en móvil, donde el popup suele
// bloquearse o quedar en blanco.
function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

// Login con Google resiliente: intenta popup (ideal en escritorio) y si el
// entorno no lo soporta o lo bloquea, cae a redirect (más confiable en móvil).
// El resultado del redirect se recoge con getGoogleRedirectResult() al cargar.
export async function signInWithGoogle() {
  if (isMobile()) {
    return signInWithRedirect(auth, googleProvider);
  }
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (e) {
    const popupFailed = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ].includes(e?.code);
    if (popupFailed) {
      return signInWithRedirect(auth, googleProvider);
    }
    throw e;
  }
}

// Recoge el resultado del login por redirect (o su error) tras volver de Google.
export function getGoogleRedirectResult() {
  return getRedirectResult(auth);
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
