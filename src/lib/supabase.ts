import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  resolveBackendProvider,
  resolveSupabaseConfig,
  type BackendProvider,
  type SupabaseClientConfig,
} from '@/src/config/supabaseConfig';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey: string | null = null;

function readRuntimeEnv(): Record<string, unknown> {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env as unknown as Record<string, unknown>;
  }
  return {};
}

export function getActiveBackendProvider(env: Record<string, unknown> = readRuntimeEnv()): BackendProvider {
  return resolveBackendProvider(env);
}

/**
 * Lazily creates and caches a Supabase browser client.
 *
 * Stage A2.1 safety guarantee:
 * - Never initializes at module import time.
 * - Refuses to initialize when active backend provider is 'firebase' unless explicitly
 *   requested with { allowWhenFirebaseActive: true } (e.g., diagnostics or future dual-mode tests).
 * - Validates configuration via resolveSupabaseConfig() before creating the client.
 */
export function getSupabaseClient(options?: {
  env?: Record<string, unknown>;
  allowWhenFirebaseActive?: boolean;
}): SupabaseClient {
  const env = options?.env ?? readRuntimeEnv();
  const provider = resolveBackendProvider(env);

  if (provider !== 'supabase' && !options?.allowWhenFirebaseActive) {
    throw new Error(
      'Supabase client initialization blocked because VITE_BACKEND_PROVIDER is set to "firebase". Supabase is not initialized while Firebase is the active backend.'
    );
  }

  const config: SupabaseClientConfig = resolveSupabaseConfig(env);
  const configKey = `${config.url}::${config.anonKey}`;

  if (cachedClient && cachedConfigKey === configKey) {
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedConfigKey = configKey;

  return cachedClient;
}

export function isSupabaseClientInitialized(): boolean {
  return cachedClient !== null;
}

export function resetSupabaseClientForTesting(): void {
  cachedClient = null;
  cachedConfigKey = null;
}
