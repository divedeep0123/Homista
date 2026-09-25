import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  ConfirmationResult,
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';

let pendingConfirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

function getWebAuth() {
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  if (Object.values(config).some((value) => !value)) {
    throw new Error('Firebase is not configured yet. Add the Firebase web app values to mobile/.env.');
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function sendPhoneCode(phoneNumber: string): Promise<void> {
  const auth = getWebAuth();
  // Firebase's fictional test numbers can be exercised locally without a live
  // reCAPTCHA challenge. Expo replaces NODE_ENV for production web builds, so
  // production sign-in continues to use normal app verification.
  if (process.env.NODE_ENV === 'development') {
    auth.settings.appVerificationDisabledForTesting = true;
  }
  const container = document.getElementById('homista-recaptcha');
  if (!container) throw new Error('Phone verification is not ready. Reload the page and try again.');
  verifier?.clear();
  verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
  pendingConfirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function confirmPhoneCode(code: string): Promise<string> {
  if (!pendingConfirmation) throw new Error('Request a verification code first.');
  const result = await pendingConfirmation.confirm(code);
  pendingConfirmation = null;
  verifier?.clear();
  verifier = null;
  return result.user.getIdToken();
}

export async function signOutFromFirebase(): Promise<void> {
  if (getApps().length) await signOut(getAuth(getApp()));
}
