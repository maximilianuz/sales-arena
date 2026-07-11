# Email Authorization System (Pro Version Access)

## Overview

This system allows you to grant automatic Pro plan access to users by simply adding their email addresses to an authorized list. When those users log in or register, they automatically receive access to the Pro plan with no expiration date.

## Components

### 1. **Authorized Emails List** (Firebase Database)
- Location: `admin/authorizedEmails`
- Contains: Email addresses authorized for Pro access
- Managed by: Admin panel (only by admin users)

### 2. **Admin Panel** (`src/pages/AdminPanel.jsx`)
- UI for managing authorized emails
- Add/remove emails from the whitelist
- Only accessible to admin users
- Accessible from Lobby navigation

### 3. **Email Verification Function** (`netlify/functions/verify-authorized-email.js`)
- Runs when user logs in or registers
- Checks if email is in authorized list
- Automatically grants Pro access if authorized
- Sets subscription plan to "trainer" with permanent access

### 4. **Admin Setup Function** (`netlify/functions/setup-admin.js`)
- Used to configure initial admin users
- Requires authentication via secret token
- Called once during initial setup

## Setup Instructions

### Step 1: Set Environment Variables

Add these to your `.env.local` file (for local development):

```env
# Firebase Admin SDK credentials
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_service_account_private_key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Admin setup token (generate a strong secret)
SETUP_SECRET_TOKEN=your_secret_token_here
```

For production, add these to Netlify environment variables or your hosting platform's configuration.

### Step 2: Make Your User an Admin

Make a POST request to the setup-admin endpoint with your UID:

```bash
curl -X POST https://your-domain.com/.netlify/functions/setup-admin \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: your_secret_token_here" \
  -d '{"uid":"YOUR_UID"}'
```

Response:
```json
{
  "success": true,
  "message": "User YOUR_UID is now an admin"
}
```

Once you're an admin, you can manage authorized emails directly from the Admin panel.

### Step 3: Add Authorized Emails

1. Go to Lobby
2. Look for the "Admin" button in the top right navigation bar
3. Enter email addresses in the "Authorized Emails" section
4. Click "Add" to authorize

Authorized users will get Pro access when they:
- Log in with an authorized email
- Register with an authorized email

## Database Structure

```
admin/
  ├── admins/
  │   └── {uid}/
  │       └── addedAt: "2024-01-15T10:30:00Z"
  │
  └── authorizedEmails/
      └── {emailId}/
          ├── email: "user@example.com"
          ├── addedAt: "2024-01-15T10:30:00Z"
          └── addedBy: "{adminUid}"

users/
  ├── {uid}/
  │   ├── subscriptionStatus: "active"
  │   ├── subscriptionPlan: "trainer"
  │   ├── subscriptionExpiry: null  (permanent access)
  │   ├── authorizedAt: "2024-01-15T10:30:00Z"
  │   └── authorizedMethod: "email-whitelist"
  │
  └── ...
```

## Security Features

✅ **Admin-only access**: Only users marked as admins can manage authorized emails
✅ **Verified ownership**: Email verification ensures the email belongs to the user's UID
✅ **Permanent access**: Once authorized, users have permanent Pro access
✅ **Audit trail**: Tracks who added each authorized email and when
✅ **No client-side modification**: Admin data cannot be modified from the client

## Firebase Rules

The authorization system is protected by these Firebase Realtime Database rules:

```json
"admin": {
  "authorizedEmails": {
    "$emailId": {
      ".read": "root.child('admin').child('admins').child(auth.uid).exists()",
      ".write": "root.child('admin').child('admins').child(auth.uid).exists()"
    }
  },
  "admins": {
    ".read": "auth != null && root.child('admin').child('admins').child(auth.uid).exists()",
    ".write": false
  }
}
```

## API Reference

### POST `/api/verify-authorized-email`

Verifies if an email is authorized and grants Pro access if it is.

**Request:**
```json
{
  "uid": "user_uid",
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "plan": "trainer",
  "message": "Access granted successfully"
}
```

**Response (Not Authorized):**
```json
{
  "error": "Email not authorized"
}
```

### POST `/api/setup-admin`

Configures a user as an admin (requires secret token).

**Headers:**
```
X-Setup-Token: your_secret_token_here
```

**Request:**
```json
{
  "uid": "user_uid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User user_uid is now an admin"
}
```

## Troubleshooting

### Admin button not showing
- Verify you're marked as an admin in `admin/admins/{uid}`
- Clear browser cache and reload
- Check browser console for errors

### Email not getting authorized
- Verify email is in `admin/authorizedEmails`
- Check that email matches user's Firebase auth email exactly (case-sensitive for domain)
- Check network tab in browser dev tools for API errors

### "Email not authorized" error
- Email might be typo'd in the authorized list
- Email might be different from the one used in Firebase auth
- Try removing and re-adding the email

### "Unauthorized" error on setup
- Verify `SETUP_SECRET_TOKEN` is correct
- Check that token was added to Netlify environment variables
- Verify token in curl request matches exactly (no extra spaces)

## Future Enhancements

- [ ] Admin user management panel
- [ ] Email templates for authorization notifications
- [ ] Bulk email import (CSV)
- [ ] Expiring authorized access (temporary access window)
- [ ] Email verification before authorization
- [ ] Authorized email deletion audit log
