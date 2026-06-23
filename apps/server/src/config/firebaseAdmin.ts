import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  return applicationDefault();
}

if (!getApps().length) {
  initializeApp({
    credential: getCredential(),
  });
}

export const firebaseAuth = getAuth();
