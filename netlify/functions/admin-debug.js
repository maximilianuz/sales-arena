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
    const uid = 'V8AGEhfnCzRppu4tHf2PqTgRVWY2';

    // Check if user exists in admin/admins/{uid}
    const snapshot = await db.ref(`admin/admins/${uid}`).get();
    const isAdmin = snapshot.exists();

    // Get all admins
    const allAdminsSnapshot = await db.ref('admin/admins').get();
    const allAdmins = allAdminsSnapshot.val() || {};

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin Debug</title>
        <style>
          body { font-family: monospace; background: #09090b; color: #f5f5f7; padding: 1rem; }
          .status { padding: 1rem; border-radius: 8px; margin: 1rem 0; }
          .yes { background: rgba(48,209,88,0.2); border: 1px solid rgba(48,209,88,0.5); color: #30d158; }
          .no { background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.5); color: #ff453a; }
          pre { background: rgba(0,0,0,0.5); padding: 1rem; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Admin Status Check</h1>

        <div class="status ${isAdmin ? 'yes' : 'no'}">
          <strong>Status:</strong> ${isAdmin ? '✓ User IS admin' : '✗ User is NOT admin'}
        </div>

        <h3>Details:</h3>
        <pre>UID: ${uid}
IsAdmin: ${isAdmin}
AdminData: ${isAdmin ? JSON.stringify(snapshot.val(), null, 2) : 'N/A'}

All Admins in Database:
${Object.keys(allAdmins).length > 0 ? JSON.stringify(allAdmins, null, 2) : 'No admins found'}
        </pre>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: monospace; background: #09090b; color: #f5f5f7; padding: 1rem; }
          .error { background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.5); color: #ff453a; padding: 1rem; border-radius: 8px; }
          pre { background: rgba(0,0,0,0.5); padding: 1rem; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <div class="error">
          <strong>${error.message}</strong>
        </div>
        <pre>${error.stack}</pre>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(errorHtml);
  }
};
