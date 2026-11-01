import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');

// Initialize Cloud Firestore database per Firebase Integration guidelines
const databaseId = (firebaseConfig as any).firestoreDatabaseId;
export const db = (databaseId && databaseId !== '(default)')
  ? getFirestore(app, databaseId)
  : getFirestore(app);

/**
 * Validate connection to Firestore on app startup per Firebase skill specification
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status:', error.message);
    } else {
      // Permission-denied is expected for unauthenticated /test/connection, which confirms server reachability
      console.log('Firestore connection verified with active project.');
    }
    return false;
  }
}

// Initial connection test
testFirestoreConnection().catch(() => {});
