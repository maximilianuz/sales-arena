import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

let db;

export function getAdminDb() {
  if (db) return db;

  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }

  db = getDatabase();
  return db;
}

export async function getSubscriptionStatus(uid) {
  const adminDb = getAdminDb();
  const snap = await adminDb.ref(`users/${uid}/subscriptionStatus`).get();
  return snap.val(); // "active" | "free" | null
}

export async function activateSubscription(uid, plan, provider, durationDays) {
  const adminDb = getAdminDb();
  const expiry = Date.now() + durationDays * 24 * 60 * 60 * 1000;
  await adminDb.ref(`users/${uid}`).update({
    subscriptionStatus: 'active',
    subscriptionPlan: plan,
    subscriptionProvider: provider,
    subscriptionExpiry: expiry
  });
}
