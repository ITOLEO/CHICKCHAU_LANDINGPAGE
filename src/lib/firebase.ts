import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInAdminWithGoogle() {
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
}

export async function signOutAdmin() {
  await firebaseSignOut(auth);
}
