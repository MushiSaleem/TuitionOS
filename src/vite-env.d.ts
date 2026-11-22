/// <reference types="vite/client" />

declare const __TUITIONOS_CLIENT_CONFIG__: unknown;

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_DATABASE_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_ALLOW_DEV_FIREBASE_FALLBACK?: string;
  readonly VITE_DEMO_SANDBOX_ENABLED?: string;
  readonly VITE_BACKEND_PROVIDER?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:tuitionos-dev-firebase-fallback' {
  export const devFirebaseFallback: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    firestoreDatabaseId?: string;
    measurementId?: string;
  } | null;
}
