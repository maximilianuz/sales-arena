import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

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

export default async (req, res) => {
  // Solo aceptar solicitudes con el token secreto correcto
  const secretToken = req.headers['x-setup-token'];
  if (secretToken !== process.env.SETUP_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid' });
  }

  try {
    // Agregar el usuario como admin
    await db.ref(`admin/admins/${uid}`).set({
      addedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `User ${uid} is now an admin`
    });
  } catch (error) {
    console.error('Error setting up admin:', error);
    return res.status(500).json({ error: error.message });
  }
};
