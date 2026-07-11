import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase(app);
const auth = getAuth(app);

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, email } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: 'Missing uid or email' });
  }

  try {
    // Verificar que el correo pertenece al uid
    const user = await auth.getUser(uid);
    if (user.email !== email) {
      return res.status(403).json({ error: 'Email mismatch' });
    }

    // Consultar si el correo está en la lista de autorizados
    const authSnapshot = await db.ref('admin/authorizedEmails').orderByChild('email').equalTo(email).once('value');
    const authData = authSnapshot.val();

    if (!authData) {
      return res.status(403).json({ error: 'Email not authorized' });
    }

    // Otorgar acceso a versión Pro (plan: trainer)
    await db.ref(`users/${uid}`).update({
      subscriptionStatus: 'active',
      subscriptionPlan: 'trainer',
      subscriptionExpiry: null, // permanente
      authorizedAt: new Date().toISOString(),
      authorizedMethod: 'email-whitelist'
    });

    return res.status(200).json({
      success: true,
      plan: 'trainer',
      message: 'Access granted successfully'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ error: error.message });
  }
};
