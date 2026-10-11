import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { getApps, initializeApp } from 'firebase/app';
import { type Auth, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithCredential, signOut } from 'firebase/auth';
import { FIREBASE_CONFIG, GOOGLE_WEB_CLIENT_ID } from '@/config';

/** Shown only when the Firebase and Google keys are configured. */
export const googleSignInEnabled = Boolean(GOOGLE_WEB_CLIENT_ID && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

let auth: Auth | null = null;

/** Firebase only exchanges the Google token; our own session lives elsewhere. */
function firebaseAuth(): Auth {
  if (!auth) {
    const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
    auth = initializeAuth(app, { persistence: inMemoryPersistence });
  }
  return auth;
}

/**
 * Signs in with the phone's Google account and returns a Firebase ID token
 * for the server to check, or null when the player cancelled.
 */
export async function googleFirebaseIdToken(): Promise<string | null> {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response) || !response.data.idToken) return null;

    const result = await signInWithCredential(firebaseAuth(), GoogleAuthProvider.credential(response.data.idToken));
    const idToken = await result.user.getIdToken();
    await signOut(firebaseAuth());
    // Next time, let the player pick an account again.
    await GoogleSignin.signOut().catch(() => {});
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) {
      return null;
    }
    throw error;
  }
}
