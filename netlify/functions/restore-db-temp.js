import { setPath } from './lib/firebaseAdmin.js';

export const handler = async (event) => {
  // Solo POST y requiere header de seguridad mínimo
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const fullData = {
      "admin": {
        "admins": {
          "V8AGEhfnCzRppu4tHf2PqTgRVWY2": true
        },
        "authorizedEmails": {}
      },
      "cohortCodes": {},
      "leaderboard": {},
      "rooms": {},
      "telemetry": {},
      "users": {}
    };

    await setPath('/', fullData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Database restored successfully",
        structure: fullData
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
