import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

export const firebaseConfig = {
  projectId: 'psychoplay',
  appId: '1:726884000116:web:b614193b4511d17c0a0c21',
  apiKey: 'AIzaSyDlAOWyRFn473weJhmLlFeE0GweuQCeeLQ',
  authDomain: 'psychoplay.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-spy-2bdeba50-056f-42ee-8cdf-d659acdc72a2',
  storageBucket: 'psychoplay.firebasestorage.app',
  messagingSenderId: '726884000116',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

signInAnonymously(auth).catch((err) => {
  console.warn('Firebase anonymous authentication:', err);
});

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
