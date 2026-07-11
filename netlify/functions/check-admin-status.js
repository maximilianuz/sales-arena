import admin from 'firebase-admin';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

export default async (req, res) => {
  try {
    const uid = req.queryStringParameters?.uid;

    if (!uid) {
      return res.status(400).json({
        error: 'UID required as query parameter',
        example: '/.netlify/functions/check-admin-status?uid=V8AGEhfnCzRppu4tHf2PqTgRVWY2'
      });
    }

    // Check if user exists in admin/admins/{uid}
    const snapshot = await db.ref(`admin/admins/${uid}`).get();
    const isAdmin = snapshot.exists();

    // Get all admins for debugging
    const allAdminsSnapshot = await db.ref('admin/admins').get();
    const allAdmins = allAdminsSnapshot.val() || {};

    return res.status(200).json({
      uid,
      isAdmin,
      message: isAdmin ? '✓ User IS admin' : '✗ User is NOT admin',
      allAdminUids: Object.keys(allAdmins),
      adminData: isAdmin ? snapshot.val() : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
};
