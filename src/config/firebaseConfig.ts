export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  measurementId?: string;
}

export type FirebaseConfigSource = 'env' | 'dev-transition-fallback';

export interface ResolvedFirebaseConfig {
  config: FirebaseClientConfig;
  source: FirebaseConfigSource;
}

export class FirebaseConfigurationError extends Error {
  public readonly missingVars: string[];

  constructor(message: string, missingVars: string[] = []) {
    super(message);
    this.name = 'FirebaseConfigurationError';
    this.missingVars = missingVars;
  }
}

export const REQUIRED_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const PLACEHOLDER_PREFIXES = ['YOUR_', 'MY_', 'REPLACE_WITH_', '<'];

function cleanEnvValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (PLACEHOLDER_PREFIXES.some((prefix) => upper.startsWith(prefix))) {
    return '';
  }
  return trimmed;
}

export function resolveFirebaseConfig(
  env: Record<string, unknown>,
  options: {
    isDev: boolean;
    devFallbackConfig?: Partial<FirebaseClientConfig> | null;
  }
): ResolvedFirebaseConfig {
  const apiKey = cleanEnvValue(env.VITE_FIREBASE_API_KEY);
  const authDomain = cleanEnvValue(env.VITE_FIREBASE_AUTH_DOMAIN);
  const projectId = cleanEnvValue(env.VITE_FIREBASE_PROJECT_ID);
  const storageBucket = cleanEnvValue(env.VITE_FIREBASE_STORAGE_BUCKET);
  const messagingSenderId = cleanEnvValue(env.VITE_FIREBASE_MESSAGING_SENDER_ID);
  const appId = cleanEnvValue(env.VITE_FIREBASE_APP_ID);
  const firestoreDatabaseId = cleanEnvValue(env.VITE_FIREBASE_DATABASE_ID) || undefined;
  const measurementId = cleanEnvValue(env.VITE_FIREBASE_MEASUREMENT_ID) || undefined;

  const envMap: Record<(typeof REQUIRED_FIREBASE_ENV_KEYS)[number], string> = {
    VITE_FIREBASE_API_KEY: apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: authDomain,
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_STORAGE_BUCKET: storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId,
    VITE_FIREBASE_APP_ID: appId,
  };

  const missingVars = REQUIRED_FIREBASE_ENV_KEYS.filter((key) => !envMap[key]);
  const providedCount = REQUIRED_FIREBASE_ENV_KEYS.length - missingVars.length;

  // All required Vite environment variables provided -> use them in both dev and prod
  if (missingVars.length === 0) {
    return {
      source: 'env',
      config: {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId,
        ...(firestoreDatabaseId ? { firestoreDatabaseId } : {}),
        ...(measurementId ? { measurementId } : {}),
      },
    };
  }

  // Partial configuration is always an explicit error (even in development)
  if (providedCount > 0) {
    throw new FirebaseConfigurationError(
      `Incomplete Firebase configuration. Missing required environment variables: ${missingVars.join(', ')}.`,
      missingVars
    );
  }

  // Explicitly controlled development-only transition fallback (NEVER available in production)
  const devFallbackAllowed =
    options.isDev === true && cleanEnvValue(env.VITE_ALLOW_DEV_FIREBASE_FALLBACK) !== 'false';

  if (devFallbackAllowed && options.devFallbackConfig) {
    const fb = options.devFallbackConfig;
    const fbApiKey = cleanEnvValue(fb.apiKey);
    const fbAuthDomain = cleanEnvValue(fb.authDomain);
    const fbProjectId = cleanEnvValue(fb.projectId);
    const fbStorageBucket = cleanEnvValue(fb.storageBucket);
    const fbMessagingSenderId = cleanEnvValue(fb.messagingSenderId);
    const fbAppId = cleanEnvValue(fb.appId);
    const fbDatabaseId = cleanEnvValue(fb.firestoreDatabaseId) || undefined;
    const fbMeasurementId = cleanEnvValue(fb.measurementId) || undefined;

    if (fbApiKey && fbAuthDomain && fbProjectId && fbStorageBucket && fbMessagingSenderId && fbAppId) {
      return {
        source: 'dev-transition-fallback',
        config: {
          apiKey: fbApiKey,
          authDomain: fbAuthDomain,
          projectId: fbProjectId,
          storageBucket: fbStorageBucket,
          messagingSenderId: fbMessagingSenderId,
          appId: fbAppId,
          ...(fbDatabaseId ? { firestoreDatabaseId: fbDatabaseId } : {}),
          ...(fbMeasurementId ? { measurementId: fbMeasurementId } : {}),
        },
      };
    }
  }

  const modeHint = options.isDev
    ? 'Development fallback is disabled or unavailable.'
    : 'Production builds require explicit VITE_FIREBASE_* environment variables and never use local development fallback configuration.';

  throw new FirebaseConfigurationError(
    `Missing Firebase configuration (${missingVars.join(', ')}). ${modeHint}`,
    missingVars
  );
}
