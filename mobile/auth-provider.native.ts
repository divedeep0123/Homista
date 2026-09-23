import {
  getAuth,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from '@react-native-firebase/auth';

let pendingConfirmation: ConfirmationResult | null = null;

export async function sendPhoneCode(phoneNumber: string): Promise<void> {
  pendingConfirmation = await signInWithPhoneNumber(getAuth(), phoneNumber);
}

export async function confirmPhoneCode(code: string): Promise<string> {
  if (!pendingConfirmation) throw new Error('Request a verification code first.');
  const result = await pendingConfirmation.confirm(code);
  pendingConfirmation = null;
  return result.user.getIdToken();
}

export async function signOutFromFirebase(): Promise<void> {
  await signOut(getAuth());
}
