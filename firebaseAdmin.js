import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, initializeFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

function normalizePrivateKey(privateKey) {
  if (!privateKey) return undefined;

  let key = privateKey.trim();

  if (/^["']/.test(key) && /["'],?$/.test(key)) {
    key = key.replace(/^["']|["'],?$/g, "").trim();
  }

  if (key.endsWith(",")) {
    key = key.slice(0, -1).trim();
  }

  return key.replace(/\\n/g, "\n");
}

function getServiceAccountFileConfig() {
  const configuredPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const defaultPath = path.resolve(
    process.cwd(),
    "secrets",
    "firebase-admin.json"
  );
  const serviceAccountPath =
    configuredPath || (fs.existsSync(defaultPath) ? defaultPath : null);

  if (!serviceAccountPath) {
    return null;
  }

  const resolvedPath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.resolve(process.cwd(), serviceAccountPath);
  const rawConfig = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));

  return {
    projectId: rawConfig.project_id,
    clientEmail: rawConfig.client_email,
    privateKey: normalizePrivateKey(rawConfig.private_key),
  };
}

function initializeAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const fileConfig = getServiceAccountFileConfig();
  const projectId = fileConfig?.projectId || process.env.FIREBASE_PROJECT_ID;
  const clientEmail =
    fileConfig?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    fileConfig?.privateKey ||
    normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Firebase Admin credentials missing: ${[
        !projectId && "FIREBASE_PROJECT_ID",
        !clientEmail && "FIREBASE_CLIENT_EMAIL",
        !privateKey && "FIREBASE_PRIVATE_KEY",
      ]
        .filter(Boolean)
        .join(", ")}`
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const app = initializeAdminApp();

let adminDb;

try {
  const shouldPreferRest =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  adminDb = shouldPreferRest
    ? initializeFirestore(app, { preferRest: true })
    : getFirestore(app);
} catch {
  adminDb = getFirestore(app);
}

export { adminDb };
