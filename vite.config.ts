import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import {
  DEFAULT_DEV_CLIENT_CONFIG,
  assertProductionClientConfigSelection,
  buildDocumentTitle,
  validateClientConfig,
  type ClientConfig,
} from './src/config/clientConfig';
import { resolveFirebaseConfig } from './src/config/firebaseConfig';
import {
  assertPublicSupabaseKey,
  resolveBackendProvider,
  resolveSupabaseConfig,
} from './src/config/supabaseConfig';

const DEV_FIREBASE_FALLBACK_VIRTUAL_ID = 'virtual:tuitionos-dev-firebase-fallback';
const RESOLVED_DEV_FIREBASE_FALLBACK_ID = '\0' + DEV_FIREBASE_FALLBACK_VIRTUAL_ID;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function loadActiveClientConfig(
  env: Record<string, string>,
  isProductionBuild: boolean
): ClientConfig {
  const configPathRaw = (env.CLIENT_CONFIG_PATH || '').trim();
  let config: ClientConfig;

  if (configPathRaw) {
    const resolvedPath = path.isAbsolute(configPathRaw)
      ? configPathRaw
      : path.resolve(__dirname, configPathRaw);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `CLIENT_CONFIG_PATH points to a missing file: "${configPathRaw}" (resolved: "${resolvedPath}")`
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
    } catch (err) {
      throw new Error(
        `Failed to parse JSON in CLIENT_CONFIG_PATH ("${configPathRaw}"): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    config = validateClientConfig(parsed, configPathRaw);
  } else {
    // Never auto-select clients/example/client.config.json; use built-in TuitionOS default config
    config = validateClientConfig(DEFAULT_DEV_CLIENT_CONFIG, 'default TuitionOS dev configuration');
  }

  assertProductionClientConfigSelection(config, {
    isProductionBuild,
    configPath: configPathRaw || undefined,
    requireExplicitConfig: env.REQUIRE_CLIENT_CONFIG === 'true',
    allowExampleConfig: env.ALLOW_EXAMPLE_CLIENT_CONFIG === 'true',
  });

  if (env.VITE_DEMO_SANDBOX_ENABLED === 'false') {
    return {
      ...config,
      modules: { ...config.modules, demoSandboxEnabled: false },
    };
  }
  if (env.VITE_DEMO_SANDBOX_ENABLED === 'true') {
    return {
      ...config,
      modules: { ...config.modules, demoSandboxEnabled: true },
    };
  }

  return config;
}

function tuitionOsConfigPlugin(
  clientConfig: ClientConfig,
  isDevServer: boolean,
  allowDevFirebaseFallback: boolean
): Plugin {
  return {
    name: 'tuitionos-client-and-firebase-config',
    resolveId(id) {
      if (id === DEV_FIREBASE_FALLBACK_VIRTUAL_ID) {
        return RESOLVED_DEV_FIREBASE_FALLBACK_ID;
      }
      return null;
    },
    load(id) {
      if (id !== RESOLVED_DEV_FIREBASE_FALLBACK_ID) {
        return null;
      }

      // Production builds NEVER depend on or fall back to firebase-applet-config.json
      if (!isDevServer || !allowDevFirebaseFallback) {
        return 'export const devFirebaseFallback = null;';
      }

      const fallbackPath = path.resolve(__dirname, 'firebase-applet-config.json');
      if (!fs.existsSync(fallbackPath)) {
        return 'export const devFirebaseFallback = null;';
      }

      const rawJson = fs.readFileSync(fallbackPath, 'utf-8');
      return `export const devFirebaseFallback = ${rawJson};`;
    },
    transformIndexHtml(html) {
      const title = escapeHtmlText(buildDocumentTitle(clientConfig));
      const description = escapeHtmlAttr(clientConfig.branding.description);
      const ogTitle = escapeHtmlAttr(buildDocumentTitle(clientConfig));
      const themeColor = escapeHtmlAttr(clientConfig.branding.colors.primary);
      const faviconUrl = escapeHtmlAttr(clientConfig.branding.faviconUrl);

      let transformed = html
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
        .replace(
          /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="description" content="${description}" />`
        )
        .replace(
          /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
          `<meta property="og:title" content="${ogTitle}" />`
        )
        .replace(
          /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
          `<meta property="og:description" content="${description}" />`
        )
        .replace(
          /<meta\s+name="theme-color"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="theme-color" content="${themeColor}" />`
        )
        .replace(
          /<link\s+rel="icon"\s+href="[^"]*"\s*\/?>/i,
          `<link rel="icon" href="${faviconUrl}" />`
        );

      if (clientConfig.branding.typography.googleFontsUrl) {
        const fontsHref = escapeHtmlAttr(clientConfig.branding.typography.googleFontsUrl);
        transformed = transformed.replace(
          /<link\s+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*"\s+rel="stylesheet"\s*\/?>/i,
          `<link href="${fontsHref}" rel="stylesheet" />`
        );
      }

      return transformed;
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDevServer = command === 'serve' && mode === 'development';
  const isProductionBuild = command === 'build' && mode === 'production';

  const activeClientConfig = loadActiveClientConfig(env, isProductionBuild);

  // Always reject any service-role key accidentally placed in VITE_SUPABASE_ANON_KEY
  if (typeof env.VITE_SUPABASE_ANON_KEY === 'string' && env.VITE_SUPABASE_ANON_KEY.trim()) {
    assertPublicSupabaseKey(env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');
  }

  // Validate backend provider selector if provided (defaults to 'firebase')
  const backendProvider = resolveBackendProvider(env);

  // Optional strict build-time checks for production CI pipelines
  if (isProductionBuild && env.STRICT_FIREBASE_ENV === 'true') {
    resolveFirebaseConfig(env, { isDev: false, devFallbackConfig: null });
  }
  if (isProductionBuild && (env.STRICT_SUPABASE_ENV === 'true' || backendProvider === 'supabase')) {
    resolveSupabaseConfig(env);
  }

  return {
    base: './',
    define: {
      __TUITIONOS_CLIENT_CONFIG__: JSON.stringify(activeClientConfig),
    },
    plugins: [
      tuitionOsConfigPlugin(
        activeClientConfig,
        isDevServer,
        env.VITE_ALLOW_DEV_FIREBASE_FALLBACK !== 'false'
      ),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
