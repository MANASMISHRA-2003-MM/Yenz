const admin = require('firebase-admin');

// Built-in credential fallback for project krawing-6797e so cloud deployments (e.g. Render)
// always initialize Firebase Admin successfully even if .env environment variable is omitted
const DEFAULT_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "krawing-6797e",
  private_key_id: "284c6f7310b09ae7bacfeb809bf59aff35e6c798",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDPufYVnF6RXrI9\nNvRG/LKwpiE55ms3eIG42RsfIddRTpNrZecnwSTHxBuvQL02jEZmSLkJ3AiWnEsx\nku0KFpbNWyNBfwCisrOusag03+A4wCmecUBSfUlrGzhZpVF5bvCC9eNZt+2Owxhd\nx+MAawDz5YW/WFK9C4l3+B9Sz1ORRfR0XGkIy/0nYInf/HFK+24V9GXVxIa0TwK4\nobbN/gy0F1U7e0JMtpYP0LiYz2bbIPBHSPGDkemQXLYHLfIxWcZsYDn4okVM3Qlo\n307X/rYov5vYyZoBDqXzjXFMa2CfemcKdSMQ14b5YZ0dnB9S0A2wgElKyJO2nY3Y\nfgJY0EcpAgMBAAECgf9CiU5Jncysw6hT80ZLdqXF73C1Gxk8q1zh2KjXT/+oC4Ms\n43cnRLaDRk2X1STGVCg4mxKqFdCqbWWoe2dx08p5/LdOQ1/wvUzQqBc42Hz5sJOk\nLKJtybO6mv1xuYJfYymmyRwJoOB22gb0AxKzD5M+jEZLA/98jjV6N//Qhpg975ZV\nCDKIARSbJerxbdD0ZZaMkCW3Nw+gRNMPpsH1we99O7LAKxedOEcj9Q4mryoF5ZA6\nXUJCGPakM31od362wpm75f0EqEF1+ghIz3KuFpKp2tSX/skg5PG4mRRCV7wtUli+\nqUYN8TVfZW4/srrWWG7BI0BH3jpgKLjD9kZuggECgYEA9d2BVsV6+6IGArbktK2t\nuHpbDAPg5NB+dudicsuv7XirxSdZZQOwufKXMN4J90RJvLbHHBeP2v3a5qghxouR\nJ0tkoSEox0PW9mYi9ZHBXsrYEGXHaA/R4FYN1K7BGq8FK4We2r0h2ACbUtfm+ggu\nLMh5nI0ebSmMdzDJ9pkTXyECgYEA2En+4azVVwfDCf9sx+eQsqeda65qksav65FS\nkCYo/B7LwhSMgE5K4Tu1zBL/xMu5Reglxv2glaGaYDN5vdCxyUsh7WURnOLVtIl4\ngFQs8R4hUdqTvgs2TQ9RZ/0g7ObqO0+9P9lHmCKYEy9zpr3o1zqJx4g4LAi8fepA\naC2vDwkCgYBKZpVVJL1qmEUpXR8obcY8JQqYQDQ2CcG7SZnJE0pRmkqghp/Oqac5\nHegSqZ5qbQfDS6xFG/w0UM2FLyvJYUKzmWUCPX6Rjj3molHB7jGN9eQcUjBdlSv1\nrxTQX3GgGYZ+/RhtKP6s1sIp95u13fPbKW9jqHCkqAYRq3nyXbA3AQKBgFPHxe1Q\n74q4vPogcNi2gDxT5QyTEUEtqXNMZXjk7zdKDo9tOkdxDFxWrsMQEPcAGxJTLF76\nW7vaT1w4VE4MivF4Ivo8DiiBTVqTbZP4BziW/T0ht90DptMOve/UA28Au3aiGqKi\n3bK2o8W6uce7BHhqenhJ8chM0gbMOIqiN49RAoGBAIAgt0TioB8SByHPYTOFkImF\nDKWUJDG12/BCSU6GYEXs+rzsfSTmpTK0lAePCQHA+GHHnHiJ5pxRXuyOMIGT9sZn\nfOGuwde5QrJSqswtms7Dn0TWFeXNPWZZZ3xuxTW+UHB8wMYlocvxUi+Ac7AGmtda\nyMXCWcgowJDtPDaPotYb\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@krawing-6797e.iam.gserviceaccount.com",
  client_id: "103354065925501137734",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40krawing-6797e.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

let serviceAccount = null;

try {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    if (typeof rawKey === 'string') {
      const trimmed = rawKey.trim();
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
  console.error('[FirebaseAdmin] Failed to parse process.env.FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
}

// Fallback to default project service account if not provided via environment variable
const accountToUse = (serviceAccount && serviceAccount.project_id) ? serviceAccount : DEFAULT_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(accountToUse),
      projectId: accountToUse.project_id || 'krawing-6797e'
    });
    console.log('✅ Firebase Admin SDK initialized successfully for project:', accountToUse.project_id);
  } catch (err) {
    console.error('❌ Error initializing Firebase Admin SDK with cert, falling back to projectId:', err.message);
    try {
      admin.initializeApp({ projectId: 'krawing-6797e' });
      console.log('✅ Firebase Admin initialized with fallback projectId: krawing-6797e');
    } catch (fallbackErr) {
      console.error('❌ Critical Firebase Admin initialization failure:', fallbackErr.message);
    }
  }
}

module.exports = admin;
