import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

function readFirebaseConfig(): FirebaseOptions | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId || !messagingSenderId || !storageBucket) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

const firebaseConfig = readFirebaseConfig();

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

export function isFirebaseConfigured(): boolean {
  return firebaseConfig !== null;
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig) {
    return null;
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }
  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getFirestoreDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }
  if (!db) {
    db = getFirestore(firebaseApp);
  }
  return db;
}

export function getFirebaseStorageBucket(): FirebaseStorage | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }
  if (!storage) {
    storage = getStorage(firebaseApp);
  }
  return storage;
}

/** 앱 시작 시 Firebase 연결을 미리 준비합니다. */
export function initFirebase(): void {
  if (!firebaseConfig) {
    if (__DEV__) {
      console.warn(
        '[Firebase] EXPO_PUBLIC_FIREBASE_* 환경 변수가 없습니다. 공유 앨범 동기화가 비활성화됩니다.',
      );
    }
    return;
  }
  getFirebaseApp();
  getFirebaseAuth();
  getFirestoreDb();
  getFirebaseStorageBucket();
}
