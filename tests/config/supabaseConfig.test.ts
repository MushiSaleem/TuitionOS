import { beforeEach, describe, expect, test } from 'bun:test';
import {
  DEFAULT_DEV_CLIENT_CONFIG,
  validateClientConfig,
} from '../../src/config/clientConfig';
import {
  SupabaseConfigurationError,
  assertPublicSupabaseKey,
  hasSupabaseConfig,
  resolveBackendProvider,
  resolveSupabaseConfig,
} from '../../src/config/supabaseConfig';
import {
  getActiveBackendProvider,
  getSupabaseClient,
  isSupabaseClientInitialized,
  resetSupabaseClientForTesting,
} from '../../src/lib/supabase';

function makeFakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj), 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature_segment_placeholder`;
}

const VALID_ANON_JWT = makeFakeJwt({
  iss: 'supabase',
  ref: 'demoacademyref',
  role: 'anon',
  iat: 1700000000,
  exp: 2000000000,
});

const LEAKED_SERVICE_ROLE_JWT = makeFakeJwt({
  iss: 'supabase',
  ref: 'demoacademyref',
  role: 'service_role',
  iat: 1700000000,
  exp: 2000000000,
});

const LEAKED_ADMIN_JWT = makeFakeJwt({
  iss: 'supabase',
  role: 'supabase_admin',
});

describe('Stage A2.1 — Supabase Config & Backend Provider Validation', () => {
  beforeEach(() => {
    resetSupabaseClientForTesting();
  });

  test('defaults backend provider to firebase when unset', () => {
    expect(resolveBackendProvider({})).toBe('firebase');
    expect(resolveBackendProvider({ VITE_BACKEND_PROVIDER: '' })).toBe('firebase');
    expect(getActiveBackendProvider({})).toBe('firebase');
  });

  test('accepts explicit firebase and supabase providers and rejects invalid values', () => {
    expect(resolveBackendProvider({ VITE_BACKEND_PROVIDER: 'firebase' })).toBe('firebase');
    expect(resolveBackendProvider({ VITE_BACKEND_PROVIDER: 'supabase' })).toBe('supabase');
    expect(() => resolveBackendProvider({ VITE_BACKEND_PROVIDER: 'mongodb' })).toThrow(
      SupabaseConfigurationError
    );
  });

  test('hasSupabaseConfig returns false cleanly in Firebase mode with zero Supabase vars', () => {
    expect(hasSupabaseConfig({})).toBe(false);
    expect(
      hasSupabaseConfig({
        VITE_SUPABASE_URL: 'YOUR_PROJECT_REF',
        VITE_SUPABASE_ANON_KEY: 'YOUR_SUPABASE_PUBLIC_ANON_KEY',
      })
    ).toBe(false);
  });

  test('resolveSupabaseConfig accepts valid HTTPS URL and public anon JWT', () => {
    const resolved = resolveSupabaseConfig({
      VITE_SUPABASE_URL: 'https://demoacademyref.supabase.co/',
      VITE_SUPABASE_ANON_KEY: VALID_ANON_JWT,
    });
    expect(resolved.url).toBe('https://demoacademyref.supabase.co');
    expect(resolved.anonKey).toBe(VALID_ANON_JWT);
  });

  test('resolveSupabaseConfig allows http://127.0.0.1 for local CLI dev and rejects non-local http://', () => {
    const local = resolveSupabaseConfig({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: VALID_ANON_JWT,
    });
    expect(local.url).toBe('http://127.0.0.1:54321');

    expect(() =>
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'http://demoacademyref.supabase.co',
        VITE_SUPABASE_ANON_KEY: VALID_ANON_JWT,
      })
    ).toThrow(SupabaseConfigurationError);
  });

  test('rejects missing, partial, and placeholder Supabase environment variables', () => {
    expect(() => resolveSupabaseConfig({})).toThrow(SupabaseConfigurationError);
    expect(() =>
      resolveSupabaseConfig({ VITE_SUPABASE_URL: 'https://demoacademyref.supabase.co' })
    ).toThrow(/Incomplete Supabase configuration/);
    expect(() =>
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: VALID_ANON_JWT,
      })
    ).toThrow(/placeholder host/);
  });

  test('CRITICAL SECURITY: rejects service_role JWT, supabase_admin JWT, and sb_secret_* keys', () => {
    expect(() => assertPublicSupabaseKey(LEAKED_SERVICE_ROLE_JWT)).toThrow(/service_role/);
    expect(() => assertPublicSupabaseKey(LEAKED_ADMIN_JWT)).toThrow(/supabase_admin/);
    expect(() => assertPublicSupabaseKey('sb_secret_abc1234567890abcdef')).toThrow(
      /privileged Supabase secret/
    );

    // Even hasSupabaseConfig must throw immediately if someone pastes a service-role key
    expect(() =>
      hasSupabaseConfig({ VITE_SUPABASE_ANON_KEY: LEAKED_SERVICE_ROLE_JWT })
    ).toThrow(SupabaseConfigurationError);
  });

  test('lazy Supabase client never initializes in Firebase mode', () => {
    expect(isSupabaseClientInitialized()).toBe(false);
    expect(() =>
      getSupabaseClient({
        env: {
          VITE_BACKEND_PROVIDER: 'firebase',
          VITE_SUPABASE_URL: 'https://demoacademyref.supabase.co',
          VITE_SUPABASE_ANON_KEY: VALID_ANON_JWT,
        },
      })
    ).toThrow(/blocked because VITE_BACKEND_PROVIDER is set to "firebase"/);
    expect(isSupabaseClientInitialized()).toBe(false);
  });

  test('lazy Supabase client initializes cleanly when VITE_BACKEND_PROVIDER=supabase', () => {
    const client = getSupabaseClient({
      env: {
        VITE_BACKEND_PROVIDER: 'supabase',
        VITE_SUPABASE_URL: 'https://demoacademyref.supabase.co',
        VITE_SUPABASE_ANON_KEY: VALID_ANON_JWT,
      },
    });
    expect(client).toBeDefined();
    expect(isSupabaseClientInitialized()).toBe(true);
  });

  test('clientConfig preserves Firebase defaults while validating Supabase provider extensions', () => {
    expect(DEFAULT_DEV_CLIENT_CONFIG.integrations.authProvider).toBe('firebase');
    expect(DEFAULT_DEV_CLIENT_CONFIG.integrations.databaseProvider).toBe('firestore');

    const supabaseConfig = validateClientConfig({
      ...DEFAULT_DEV_CLIENT_CONFIG,
      clientSlug: 'pilot-supabase-academy',
      integrations: {
        authProvider: 'supabase',
        databaseProvider: 'supabase-postgres',
        storageProvider: 'supabase-storage',
        smsProvider: 'notify-lk',
        whatsappProvider: 'none',
        paymentProvider: 'payhere',
        videoProvider: 'bunny-stream',
        liveClassProvider: 'google-meet-and-zoom',
      },
    });

    expect(supabaseConfig.integrations.authProvider).toBe('supabase');
    expect(supabaseConfig.integrations.databaseProvider).toBe('supabase-postgres');
    expect(supabaseConfig.integrations.storageProvider).toBe('supabase-storage');
    expect(supabaseConfig.integrations.videoProvider).toBe('bunny-stream');
    expect(supabaseConfig.integrations.liveClassProvider).toBe('google-meet-and-zoom');
  });
});
