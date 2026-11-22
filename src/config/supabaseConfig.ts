export type BackendProvider = 'firebase' | 'supabase';

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
}

export class SupabaseConfigurationError extends Error {
  public readonly missingVars: string[];

  constructor(message: string, missingVars: string[] = []) {
    super(message);
    this.name = 'SupabaseConfigurationError';
    this.missingVars = missingVars;
  }
}

export const REQUIRED_SUPABASE_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

const PLACEHOLDER_PREFIXES = ['YOUR_', 'MY_', 'REPLACE_WITH_', '<'];
const PLACEHOLDER_HOSTS = ['example.supabase.co', 'your-project.supabase.co', 'placeholder.supabase.co'];
const DISALLOWED_PRIVILEGED_ROLES = new Set(['service_role', 'supabase_admin', 'postgres']);

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

function decodeBase64UrlToJson(segment: string): Record<string, unknown> | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);

    let decoded = '';
    if (typeof atob === 'function') {
      decoded = atob(padded);
    } else if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(padded, 'base64').toString('utf-8');
    } else {
      return null;
    }

    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Rejects any Supabase secret key or privileged JWT (such as service_role)
 * accidentally supplied as a public frontend client key.
 */
export function assertPublicSupabaseKey(key: string, varName = 'VITE_SUPABASE_ANON_KEY'): void {
  const trimmed = key.trim();
  if (!trimmed) return;

  const lower = trimmed.toLowerCase();

  // Reject new-format Supabase secret keys (sb_secret_*) and literal markers
  if (lower.startsWith('sb_secret_') || lower.includes('service_role')) {
    throw new SupabaseConfigurationError(
      `SECURITY ERROR: ${varName} appears to contain a privileged Supabase secret/service-role key. Service-role credentials must NEVER be placed in frontend VITE_* variables or exposed to browsers.`
    );
  }

  // Inspect JWT payload when key is a 3-part JWT
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    const payload = decodeBase64UrlToJson(parts[1]);
    const role = typeof payload?.role === 'string' ? payload.role.toLowerCase() : '';
    if (DISALLOWED_PRIVILEGED_ROLES.has(role)) {
      throw new SupabaseConfigurationError(
        `SECURITY ERROR: ${varName} contains a JWT with privileged role "${role}". Only the public anon/publishable key may be used in browser code.`
      );
    }
  }
}

export function validateSupabaseUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SupabaseConfigurationError(
      `Invalid VITE_SUPABASE_URL: "${rawUrl}" is not a valid URL.`
    );
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
    throw new SupabaseConfigurationError(
      `Invalid VITE_SUPABASE_URL: must use https:// (http:// is allowed only for localhost/127.0.0.1).`
    );
  }

  if (PLACEHOLDER_HOSTS.includes(host)) {
    throw new SupabaseConfigurationError(
      `Invalid VITE_SUPABASE_URL: placeholder host "${host}" is not allowed.`
    );
  }

  return parsed.toString().replace(/\/+$/, '');
}

/**
 * Resolves the active backend provider. Defaults strictly to 'firebase'
 * during Stage A2.1 coexistence so existing Firebase/Demo workflows remain untouched.
 */
export function resolveBackendProvider(env: Record<string, unknown>): BackendProvider {
  const raw = typeof env.VITE_BACKEND_PROVIDER === 'string' ? env.VITE_BACKEND_PROVIDER.trim().toLowerCase() : '';
  if (!raw || raw === 'firebase') {
    return 'firebase';
  }
  if (raw === 'supabase') {
    return 'supabase';
  }
  throw new SupabaseConfigurationError(
    `Invalid VITE_BACKEND_PROVIDER "${raw}". Allowed values are "firebase" or "supabase".`
  );
}

/**
 * Checks whether both Supabase public client variables are populated (non-placeholder)
 * without throwing when unset in Firebase mode. Still rejects service-role leaks if present.
 */
export function hasSupabaseConfig(env: Record<string, unknown>): boolean {
  const rawKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  if (rawKey) {
    assertPublicSupabaseKey(rawKey, 'VITE_SUPABASE_ANON_KEY');
  }

  const url = cleanEnvValue(env.VITE_SUPABASE_URL);
  const anonKey = cleanEnvValue(env.VITE_SUPABASE_ANON_KEY);
  return Boolean(url && anonKey);
}

/**
 * Validates and resolves public Supabase browser configuration from environment variables.
 * Never accepts service-role keys, partial configuration, or placeholder values.
 */
export function resolveSupabaseConfig(env: Record<string, unknown>): SupabaseClientConfig {
  const rawKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  if (rawKey) {
    assertPublicSupabaseKey(rawKey, 'VITE_SUPABASE_ANON_KEY');
  }

  const rawUrl = cleanEnvValue(env.VITE_SUPABASE_URL);
  const anonKey = cleanEnvValue(env.VITE_SUPABASE_ANON_KEY);

  const missingVars: string[] = [];
  if (!rawUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!anonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  if (missingVars.length === 1) {
    throw new SupabaseConfigurationError(
      `Incomplete Supabase configuration. Missing required environment variable: ${missingVars[0]}.`,
      missingVars
    );
  }

  if (missingVars.length > 1) {
    throw new SupabaseConfigurationError(
      `Missing Supabase configuration (${missingVars.join(', ')}). Provide both public client variables when Supabase mode or STRICT_SUPABASE_ENV is enabled.`,
      missingVars
    );
  }

  const url = validateSupabaseUrl(rawUrl);
  assertPublicSupabaseKey(anonKey, 'VITE_SUPABASE_ANON_KEY');

  return {
    url,
    anonKey,
  };
}
