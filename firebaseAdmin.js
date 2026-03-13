import { cert, getApps, initializeApp } from "firebase-admin/app";
import { initializeFirestore } from "firebase-admin/firestore";

function normalizePrivateKey(privateKey) {
  if (!privateKey) {
    return privateKey;
  }

  let normalizedKey = privateKey.trim();

  if (
    (normalizedKey.startsWith('"') && normalizedKey.endsWith('",')) ||
    (normalizedKey.startsWith("'") && normalizedKey.endsWith("',"))
  ) {
    normalizedKey = normalizedKey.slice(1, -2).trim();
  }

  if (
    (normalizedKey.startsWith('"') && normalizedKey.endsWith('"')) ||
    (normalizedKey.startsWith("'") && normalizedKey.endsWith("'"))
  ) {
    normalizedKey = normalizedKey.slice(1, -1);
  }

  if (normalizedKey.endsWith(",")) {
    normalizedKey = normalizedKey.slice(0, -1).trim();
  }

  return normalizedKey.replace(/\\n/g, "\n");
}

function getFirebaseAdminConfig() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  return {
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };
}

let adminApp;
let adminDb;

function getAdminDb() {
  if (!adminDb) {
    adminApp = getApps()[0] || initializeApp(getFirebaseAdminConfig());
    adminDb = initializeFirestore(adminApp, {
      preferRest: true,
    });
  }

  return adminDb;
}

export { getAdminDb };
