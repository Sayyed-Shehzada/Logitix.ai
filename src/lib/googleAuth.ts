import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const WORKSPACE_SLIDES_SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/presentations.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

const chatProvider = new GoogleAuthProvider();
chatProvider.addScope('email');
chatProvider.addScope('profile');
chatProvider.addScope('https://www.googleapis.com/auth/chat.spaces.readonly');
chatProvider.addScope('https://www.googleapis.com/auth/chat.messages.readonly');
chatProvider.addScope('https://www.googleapis.com/auth/chat.messages.create');

export const slidesProvider = new GoogleAuthProvider();
slidesProvider.addScope('email');
slidesProvider.addScope('profile');
WORKSPACE_SLIDES_SCOPES.forEach((scope) => slidesProvider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Dynamically ensures Google Identity Services (GSI) script is loaded
 */
function loadGsiScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      setTimeout(resolve, 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
    setTimeout(resolve, 2000);
  });
}

/**
 * Fallback OAuth using Google Identity Services directly against accounts.google.com
 * Bypasses cross-origin iframe and authDomain restrictions safely.
 */
async function signInWithGsi(scopes: string[] = ['email', 'profile', 'openid']): Promise<{
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken: string | null;
} | null> {
  try {
    await loadGsiScript();
    if (!window.google?.accounts?.oauth2) {
      return null;
    }

    const clientId = (firebaseConfig as any).oAuthClientId;
    const projectNumber = (firebaseConfig as any).messagingSenderId;
    // Only proceed if OAuth Client ID is valid and belongs to the current Firebase project
    if (!clientId || !projectNumber || !clientId.startsWith(projectNumber)) {
      return null;
    }

    return new Promise((resolve) => {
      let isSettled = false;
      const settle = (value: {
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        accessToken: string | null;
      } | null) => {
        if (!isSettled) {
          isSettled = true;
          resolve(value);
        }
      };

      // Guard timeout so UI never hangs if popup is blocked
      const timer = setTimeout(() => {
        settle(null);
      }, 15000);

      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: scopes.join(' '),
          error_callback: (err: any) => {
            clearTimeout(timer);
            console.warn('Google Identity Services popup notice:', err);
            settle(null);
          },
          callback: async (tokenResponse: any) => {
            clearTimeout(timer);
            if (tokenResponse?.error || !tokenResponse?.access_token) {
              settle(null);
              return;
            }
            const accessToken = tokenResponse.access_token;
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                settle({
                  email: userData.email || null,
                  displayName: userData.name || userData.given_name || null,
                  photoURL: userData.picture || null,
                  accessToken,
                });
                return;
              }
            } catch {
              // Ignore fetch error
            }
            settle({
              email: null,
              displayName: null,
              photoURL: null,
              accessToken,
            });
          },
        });

        client.requestAccessToken({ prompt: '' });
      } catch (err) {
        clearTimeout(timer);
        console.warn('GSI Token Client request notice:', err);
        settle(null);
      }
    });
  } catch {
    return null;
  }
}

export const initAuthListener = (
  onSuccess: (user: User, accessToken: string | null) => void,
  onSignedOut: () => void
) => {
  try {
    return onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          onSuccess(user, cachedAccessToken);
        } else {
          cachedAccessToken = null;
          onSignedOut();
        }
      } catch (e) {
        console.warn('Auth state callback notice:', e);
      }
    });
  } catch (err) {
    console.warn('Firebase onAuthStateChanged notice:', err);
    return () => {};
  }
};

export interface GoogleSignInResult {
  user: User | null;
  accessToken: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  error?: string;
  userFriendlyMessage?: string;
}

export const signInWithGoogleAccount = async (customScopes?: string[]): Promise<GoogleSignInResult> => {
  if (isSigningIn) {
    return {
      user: null,
      accessToken: cachedAccessToken,
      email: null,
      displayName: null,
      photoURL: null,
      userFriendlyMessage: 'Sign-in is already in progress.',
    };
  }

  isSigningIn = true;
  try {
    // 1. Primary Attempt: Firebase signInWithPopup
    try {
      let activeProvider = provider;
      if (customScopes && customScopes.length > 0) {
        if (customScopes.some((s) => s.includes('presentations') || s.includes('spreadsheets'))) {
          activeProvider = slidesProvider;
        } else if (customScopes.some((s) => s.includes('chat'))) {
          activeProvider = chatProvider;
        } else {
          activeProvider = new GoogleAuthProvider();
          activeProvider.addScope('email');
          activeProvider.addScope('profile');
          customScopes.forEach((s) => activeProvider.addScope(s));
        }
      }
      const result = await signInWithPopup(auth, activeProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      cachedAccessToken = credential?.accessToken || null;

      return {
        user: result.user,
        accessToken: cachedAccessToken,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
    } catch (popupError: any) {
      const errCode = popupError?.code || '';
      const errMsg = popupError?.message || '';
      console.warn('Firebase popup sign-in encountered environment constraint:', errCode || errMsg);

      // Handle user cancelled popup gracefully
      if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
        return {
          user: null,
          accessToken: null,
          email: null,
          displayName: null,
          photoURL: null,
          error: errCode,
          userFriendlyMessage: 'Sign-in popup was closed.',
        };
      }

      // Handle browser popup blocker
      if (errCode === 'auth/popup-blocked') {
        return {
          user: null,
          accessToken: null,
          email: null,
          displayName: null,
          photoURL: null,
          error: 'auth/popup-blocked',
          userFriendlyMessage: 'Popup was blocked by your browser. Please allow popups for this site, or enter your email below to sign in.',
        };
      }

      // Handle Google sign-in not enabled in Firebase
      if (errCode === 'auth/operation-not-allowed') {
        return {
          user: null,
          accessToken: null,
          email: null,
          displayName: null,
          photoURL: null,
          error: 'auth/operation-not-allowed',
          userFriendlyMessage: 'Google Sign-In is not enabled yet in your Firebase Console. Go to Authentication > Sign-in method and enable Google, or select 1-click login below.',
        };
      }

      // Handle domain not in authorized list
      if (errCode === 'auth/unauthorized-domain') {
        return {
          user: null,
          accessToken: null,
          email: null,
          displayName: null,
          photoURL: null,
          error: 'auth/unauthorized-domain',
          userFriendlyMessage: 'This preview domain is not in Firebase authorized domains yet. Please add this domain in Firebase Console > Authentication > Settings > Authorized domains, or click your name below.',
        };
      }

      // 2. Secondary Attempt: Google Identity Services (GSI) Token Client if not blocked
      const gsiResult = await signInWithGsi(customScopes);
      if (gsiResult && gsiResult.accessToken) {
        cachedAccessToken = gsiResult.accessToken;

        // Optionally link credential into Firebase Auth in background
        try {
          const cred = GoogleAuthProvider.credential(null, gsiResult.accessToken);
          const fbResult = await signInWithCredential(auth, cred);
          return {
            user: fbResult.user,
            accessToken: gsiResult.accessToken,
            email: fbResult.user.email || gsiResult.email,
            displayName: fbResult.user.displayName || gsiResult.displayName,
            photoURL: fbResult.user.photoURL || gsiResult.photoURL,
          };
        } catch (credErr) {
          console.warn('Firebase credential sync completed via direct profile:', credErr);
          return {
            user: null,
            accessToken: gsiResult.accessToken,
            email: gsiResult.email,
            displayName: gsiResult.displayName,
            photoURL: gsiResult.photoURL,
          };
        }
      }

      // If both popup and GSI are restricted by the browser
      return {
        user: null,
        accessToken: null,
        email: null,
        displayName: null,
        photoURL: null,
        error: errCode || 'auth/popup-blocked',
        userFriendlyMessage: 'Popup was blocked or restricted by the browser iframe. Please allow popups, or enter your email below to continue directly.',
      };
    }
  } catch (error: any) {
    console.warn('Google sign-in caught exception:', error?.message || error);
    return {
      user: null,
      accessToken: null,
      email: null,
      displayName: null,
      photoURL: null,
      error: error?.code || 'auth/network-request-failed',
      userFriendlyMessage: 'Google authentication service temporarily unreachable. Please enter your email below to proceed.',
    };
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = () => cachedAccessToken;

export const signInForGoogleSlides = async (): Promise<GoogleSignInResult> => {
  return signInWithGoogleAccount(WORKSPACE_SLIDES_SCOPES);
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out notice:', err);
  } finally {
    cachedAccessToken = null;
  }
};

// Google Drive Storage Helpers
export const syncDataToGoogleDrive = async (accessToken: string, payload: any) => {
  if (!accessToken) return false;
  try {
    // 1. Search for existing nexa_user_data.json in appDataFolder
    const searchRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'nexa_user_data.json'",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    const fileContent = JSON.stringify(payload, null, 2);

    if (existingFile) {
      // Update existing file
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        }
      );
    } else {
      // Create new file in appDataFolder using multipart
      const metadata = {
        name: 'nexa_user_data.json',
        parents: ['appDataFolder'],
      };

      const boundary = 'foo_bar_baz';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
    }
    return true;
  } catch (err) {
    console.error('Failed to sync data to Google Drive:', err);
    return false;
  }
};

export const fetchFromGoogleDrive = async (accessToken: string) => {
  if (!accessToken) return null;
  try {
    const searchRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'nexa_user_data.json'",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    if (!existingFile) return null;

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const content = await fileRes.json();
    return content;
  } catch (err) {
    console.error('Failed to fetch from Google Drive:', err);
    return null;
  }
};
