import { cert, getApps, initializeApp } from "firebase-admin/app";
import { initializeFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

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

function getServiceAccountPath() {
  const configuredPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!configuredPath) {
    return null;
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

function loadServiceAccountFromFile() {
  const serviceAccountPath = getServiceAccountPath();

  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    return null;
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  return {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: normalizePrivateKey(serviceAccount.private_key),
  };
}

function getFirebaseAdminConfig() {
  const fileCredentials = loadServiceAccountFromFile();
  const projectId =
    fileCredentials?.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail =
    fileCredentials?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    fileCredentials?.privateKey ||
    normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

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
