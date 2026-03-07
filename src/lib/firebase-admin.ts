import { createPrivateKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";

function normalizePrivateKey(rawValue: string | undefined) {
  if (!rawValue) return null;

  let value = rawValue.trim();

  // Remove optional wrapping quotes from env values.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  // Support both escaped and real new lines, and normalize Windows CRLF.
  value = value.replace(/\\n/g, "\n").replace(/\r/g, "");

  if (!value.includes("BEGIN PRIVATE KEY") || !value.includes("END PRIVATE KEY")) {
    return null;
  }

  return value;
}

type FirebaseCredential = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function parseServiceAccountJson(rawJson: string): FirebaseCredential {
  const parsed = JSON.parse(rawJson) as {
    project_id?: string;
    projectId?: string;
    client_email?: string;
    clientEmail?: string;
    private_key?: string;
    privateKey?: string;
  };

  const projectId = parsed.project_id ?? parsed.projectId;
  const clientEmail = parsed.client_email ?? parsed.clientEmail;
  const privateKey = normalizePrivateKey(parsed.private_key ?? parsed.privateKey);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Service-account JSON is missing project ID, client email, or private key.");
  }

  return { projectId, clientEmail, privateKey };
}

function readServiceAccountFromPath(filePath: string): FirebaseCredential {
  const absolutePath = resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Firebase service-account file not found at ${absolutePath}`);
  }

  const rawJson = readFileSync(absolutePath, "utf8");
  return parseServiceAccountJson(rawJson);
}

function readFirebaseCredential(): FirebaseCredential {
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    return readServiceAccountFromPath(serviceAccountPath);
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return parseServiceAccountJson(serviceAccountJson);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH (recommended) or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

function assertValidPrivateKey(privateKey: string) {
  try {
    createPrivateKey(privateKey);
  } catch {
    throw new Error("Invalid Firebase private key format.");
  }
}

function ensureFirebaseAdmin() {
  if (getApps().length) {
    return getApps()[0];
  }

  const { projectId, clientEmail, privateKey } = readFirebaseCredential();
  assertValidPrivateKey(privateKey);

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`;

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });
}

export function firebaseBucket() {
  const app = ensureFirebaseAdmin();
  return getStorage(app).bucket();
}

export function firebaseMessaging() {
  const app = ensureFirebaseAdmin();
  return getMessaging(app);
}
