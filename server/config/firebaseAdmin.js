const admin = require('firebase-admin');

let serviceAccount = null;

try {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    if (typeof rawKey === 'string') {
      const trimmed = rawKey.trim();
      // Remove any outer single or double quotes if preserved by parser
      const cleanJson = trimmed.startsWith("'") && trimmed.endsWith("'")
        ? trimmed.slice(1, -1)
        : trimmed.startsWith('"') && trimmed.endsWith('"')
        ? trimmed.slice(1, -1)
        : trimmed;

      serviceAccount = JSON.parse(cleanJson);
    } else if (typeof rawKey === 'object') {
      serviceAccount = rawKey;
    }

    if (serviceAccount && serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  }
} catch (err) {
  console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
}

if (!admin.apps.length) {
  if (serviceAccount && serviceAccount.project_id) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
    } catch (err) {
      console.error('❌ Error initializing Firebase Admin SDK:', err.message);
    }
  } else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY missing or invalid. Phone OTP verification will be restricted.');
  }
}

module.exports = admin;
