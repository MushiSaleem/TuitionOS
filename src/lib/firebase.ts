import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';
import { devFirebaseFallback } from 'virtual:tuitionos-dev-firebase-fallback';
import {
  resolveFirebaseConfig,
  type FirebaseConfigSource,
} from '@/src/config/firebaseConfig';

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let initError: Error | null = null;
let configSource: FirebaseConfigSource | null = null;

try {
  const resolved = resolveFirebaseConfig(import.meta.env, {
    isDev: import.meta.env.DEV,
    devFallbackConfig: import.meta.env.DEV ? devFirebaseFallback : null,
  });

  configSource = resolved.source;
  if (import.meta.env.DEV && resolved.source === 'dev-transition-fallback') {
    console.warn(
      '[TuitionOS] Using development-only Firebase transition fallback. Configure VITE_FIREBASE_* environment variables for production deployments.'
    );
  }

  appInstance = initializeApp(resolved.config);
  dbInstance = resolved.config.firestoreDatabaseId
    ? getFirestore(appInstance, resolved.config.firestoreDatabaseId)
    : getFirestore(appInstance);
  authInstance = getAuth(appInstance);
} catch (error) {
  initError = error instanceof Error ? error : new Error(String(error));
  console.error('[TuitionOS] Firebase initialization failed:', initError.message);
}

export const firebaseInitError = initError;
export const firebaseConfigSource = configSource;
export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid,
      email: authInstance?.currentUser?.email,
      emailVerified: authInstance?.currentUser?.emailVerified,
      isAnonymous: authInstance?.currentUser?.isAnonymous,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo:
        authInstance?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!dbInstance) return;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
