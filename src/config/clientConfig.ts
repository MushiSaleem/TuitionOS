export type DemoPortalId = 'dashboard' | 'counter' | 'lecturer' | 'student';

export type StorageProvider = 'firebase-storage' | 'cloudflare-r2' | 'none';
export type SmsProvider = 'none' | 'notify-lk' | 'dialog-esms' | 'twilio';
export type WhatsappProvider = 'none' | 'meta-cloud-api' | 'twilio';
export type PaymentProvider = 'none' | 'payhere' | 'webxpay' | 'stripe';

export interface ClientBrandingColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ClientTypography {
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  googleFontsUrl?: string;
}

export interface ClientBranding {
  academyName: string;
  shortName?: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  faviconUrl: string;
  colors: ClientBrandingColors;
  typography: ClientTypography;
}

export interface ClientContact {
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  address: string;
  city: string;
  country: string;
}

export interface ClientLocalization {
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  countryCode: string;
}

export interface ClientModuleFlags {
  demoSandboxEnabled: boolean;
  publicOnboardingEnabled: boolean;
  studentPortalEnabled: boolean;
  lecturerPortalEnabled: boolean;
  receptionCounterEnabled: boolean;
  examAnalyticsEnabled: boolean;
  studyMaterialsEnabled: boolean;
  thermalReceiptPrintingEnabled: boolean;
}

export interface ClientDemoConfig {
  sandboxInstituteName: string;
  sandboxCity: string;
  defaultPortal: DemoPortalId;
  allowReset: boolean;
}

export interface ClientIntegrations {
  authProvider: 'firebase';
  databaseProvider: 'firestore';
  storageProvider: StorageProvider;
  smsProvider: SmsProvider;
  whatsappProvider: WhatsappProvider;
  paymentProvider: PaymentProvider;
}

export interface ClientConfig {
  schemaVersion: '1.0';
  clientSlug: string;
  coreVersion: string;
  isExampleConfig?: boolean;
  branding: ClientBranding;
  contact: ClientContact;
  localization: ClientLocalization;
  modules: ClientModuleFlags;
  demo: ClientDemoConfig;
  integrations: ClientIntegrations;
}

export class ClientConfigValidationError extends Error {
  public readonly issues: string[];

  constructor(issues: string[], sourceLabel = 'client configuration') {
    const formatted = issues.map((issue) => `  - ${issue}`).join('\n');
    super(`Invalid ${sourceLabel}:\n${formatted}`);
    this.name = 'ClientConfigValidationError';
    this.issues = issues;
  }
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const HEX_COLOR_REGEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const DEMO_PORTALS: readonly DemoPortalId[] = ['dashboard', 'counter', 'lecturer', 'student'];
const STORAGE_PROVIDERS: readonly StorageProvider[] = ['firebase-storage', 'cloudflare-r2', 'none'];
const SMS_PROVIDERS: readonly SmsProvider[] = ['none', 'notify-lk', 'dialog-esms', 'twilio'];
const WHATSAPP_PROVIDERS: readonly WhatsappProvider[] = ['none', 'meta-cloud-api', 'twilio'];
const PAYMENT_PROVIDERS: readonly PaymentProvider[] = ['none', 'payhere', 'webxpay', 'stripe'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[],
  options?: { minLength?: number; maxLength?: number; pattern?: RegExp; patternHint?: string }
): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(`${path}: must be a non-empty string`);
    return '';
  }
  const trimmed = value.trim();
  if (options?.minLength !== undefined && trimmed.length < options.minLength) {
    issues.push(`${path}: must be at least ${options.minLength} characters`);
  }
  if (options?.maxLength !== undefined && trimmed.length > options.maxLength) {
    issues.push(`${path}: must be at most ${options.maxLength} characters`);
  }
  if (options?.pattern && !options.pattern.test(trimmed)) {
    issues.push(`${path}: ${options.patternHint || 'invalid format'} (received "${trimmed}")`);
  }
  return trimmed;
}

function readOptionalString(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[]
): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    issues.push(`${path}: must be a string when provided`);
    return undefined;
  }
  return value.trim();
}

function readBoolean(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[]
): boolean {
  const value = obj[key];
  if (typeof value !== 'boolean') {
    issues.push(`${path}: must be a boolean`);
    return false;
  }
  return value;
}

function readEnum<T extends string>(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly T[],
  issues: string[]
): T {
  const value = obj[key];
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    issues.push(`${path}: must be one of [${allowed.join(', ')}]`);
    return allowed[0];
  }
  return value as T;
}

function validateSafeAssetUrl(value: string, path: string, issues: string[], allowSvgDataUri = false): void {
  const lower = value.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
    issues.push(`${path}: unsafe URL protocol is not allowed`);
    return;
  }
  if (lower.startsWith('data:')) {
    if (allowSvgDataUri && lower.startsWith('data:image/svg+xml')) {
      return;
    }
    issues.push(`${path}: unsupported data URI format`);
    return;
  }
  const isRelativePath = value.startsWith('/') || value.startsWith('./');
  const isHttpUrl = lower.startsWith('https://') || lower.startsWith('http://');
  if (!isRelativePath && !isHttpUrl) {
    issues.push(`${path}: must be an https:// URL or relative path starting with "/" or "./"`);
  }
}

function validateTimezone(tz: string, path: string, issues: string[]): void {
  if (!tz) return;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    issues.push(`${path}: "${tz}" is not a valid IANA timezone (e.g. "Asia/Colombo")`);
  }
}

export function validateClientConfig(input: unknown, sourceLabel = 'client configuration'): ClientConfig {
  const issues: string[] = [];

  if (!isRecord(input)) {
    throw new ClientConfigValidationError(['root: configuration must be a JSON object'], sourceLabel);
  }

  const schemaVersion = readEnum(input, 'schemaVersion', 'schemaVersion', ['1.0'] as const, issues);
  const clientSlug = readRequiredString(input, 'clientSlug', 'clientSlug', issues, {
    minLength: 2,
    maxLength: 64,
    pattern: SLUG_REGEX,
    patternHint: 'must be lowercase alphanumeric kebab-case (e.g. "royal-science-kandy")',
  });
  const coreVersion = readRequiredString(input, 'coreVersion', 'coreVersion', issues, {
    pattern: SEMVER_REGEX,
    patternHint: 'must follow semantic versioning (e.g. "1.0.0")',
  });

  let isExampleConfig: boolean | undefined;
  if (input.isExampleConfig !== undefined) {
    if (typeof input.isExampleConfig !== 'boolean') {
      issues.push('isExampleConfig: must be a boolean when provided');
    } else {
      isExampleConfig = input.isExampleConfig;
    }
  }

  // Branding
  const brandingRaw = input.branding;
  let branding: ClientBranding = DEFAULT_DEV_CLIENT_CONFIG.branding;
  if (!isRecord(brandingRaw)) {
    issues.push('branding: must be an object');
  } else {
    const academyName = readRequiredString(brandingRaw, 'academyName', 'branding.academyName', issues, {
      minLength: 2,
      maxLength: 80,
    });
    const shortName = readOptionalString(brandingRaw, 'shortName', 'branding.shortName', issues);
    const tagline = readRequiredString(brandingRaw, 'tagline', 'branding.tagline', issues, {
      minLength: 4,
      maxLength: 180,
    });
    const description = readRequiredString(brandingRaw, 'description', 'branding.description', issues, {
      minLength: 10,
      maxLength: 320,
    });
    const logoUrl = readOptionalString(brandingRaw, 'logoUrl', 'branding.logoUrl', issues);
    if (logoUrl) {
      validateSafeAssetUrl(logoUrl, 'branding.logoUrl', issues, true);
    }
    const faviconUrl = readRequiredString(brandingRaw, 'faviconUrl', 'branding.faviconUrl', issues);
    if (faviconUrl) {
      validateSafeAssetUrl(faviconUrl, 'branding.faviconUrl', issues, true);
    }

    const colorsRaw = brandingRaw.colors;
    let colors: ClientBrandingColors = DEFAULT_DEV_CLIENT_CONFIG.branding.colors;
    if (!isRecord(colorsRaw)) {
      issues.push('branding.colors: must be an object');
    } else {
      const hexOpt = { pattern: HEX_COLOR_REGEX, patternHint: 'must be a hex color (e.g. "#4F46E5")' };
      colors = {
        primary: readRequiredString(colorsRaw, 'primary', 'branding.colors.primary', issues, hexOpt),
        primaryHover: readRequiredString(
          colorsRaw,
          'primaryHover',
          'branding.colors.primaryHover',
          issues,
          hexOpt
        ),
        secondary: readRequiredString(colorsRaw, 'secondary', 'branding.colors.secondary', issues, hexOpt),
        accent: readRequiredString(colorsRaw, 'accent', 'branding.colors.accent', issues, hexOpt),
        background: readRequiredString(colorsRaw, 'background', 'branding.colors.background', issues, hexOpt),
        text: readRequiredString(colorsRaw, 'text', 'branding.colors.text', issues, hexOpt),
      };
    }

    const typographyRaw = brandingRaw.typography;
    let typography: ClientTypography = DEFAULT_DEV_CLIENT_CONFIG.branding.typography;
    if (!isRecord(typographyRaw)) {
      issues.push('branding.typography: must be an object');
    } else {
      const googleFontsUrl = readOptionalString(
        typographyRaw,
        'googleFontsUrl',
        'branding.typography.googleFontsUrl',
        issues
      );
      if (googleFontsUrl && !googleFontsUrl.startsWith('https://fonts.googleapis.com/')) {
        issues.push('branding.typography.googleFontsUrl: must start with "https://fonts.googleapis.com/"');
      }
      typography = {
        displayFont: readRequiredString(
          typographyRaw,
          'displayFont',
          'branding.typography.displayFont',
          issues
        ),
        bodyFont: readRequiredString(typographyRaw, 'bodyFont', 'branding.typography.bodyFont', issues),
        monoFont: readRequiredString(typographyRaw, 'monoFont', 'branding.typography.monoFont', issues),
        ...(googleFontsUrl ? { googleFontsUrl } : {}),
      };
    }

    branding = {
      academyName,
      ...(shortName ? { shortName } : {}),
      tagline,
      description,
      ...(logoUrl ? { logoUrl } : {}),
      faviconUrl,
      colors,
      typography,
    };
  }

  // Contact
  const contactRaw = input.contact;
  let contact: ClientContact = DEFAULT_DEV_CLIENT_CONFIG.contact;
  if (!isRecord(contactRaw)) {
    issues.push('contact: must be an object');
  } else {
    const email = readRequiredString(contactRaw, 'email', 'contact.email', issues, {
      pattern: EMAIL_REGEX,
      patternHint: 'must be a valid email address',
    });
    const phone = readRequiredString(contactRaw, 'phone', 'contact.phone', issues, { minLength: 7 });
    const whatsapp = readOptionalString(contactRaw, 'whatsapp', 'contact.whatsapp', issues);
    const website = readOptionalString(contactRaw, 'website', 'contact.website', issues);
    if (website && !website.startsWith('https://') && !website.startsWith('http://')) {
      issues.push('contact.website: must start with "https://" or "http://"');
    }
    const address = readRequiredString(contactRaw, 'address', 'contact.address', issues, { minLength: 4 });
    const city = readRequiredString(contactRaw, 'city', 'contact.city', issues, { minLength: 2 });
    const country = readRequiredString(contactRaw, 'country', 'contact.country', issues, { minLength: 2 });

    contact = {
      email,
      phone,
      ...(whatsapp ? { whatsapp } : {}),
      ...(website ? { website } : {}),
      address,
      city,
      country,
    };
  }

  // Localization
  const localizationRaw = input.localization;
  let localization: ClientLocalization = DEFAULT_DEV_CLIENT_CONFIG.localization;
  if (!isRecord(localizationRaw)) {
    issues.push('localization: must be an object');
  } else {
    const currency = readRequiredString(localizationRaw, 'currency', 'localization.currency', issues, {
      pattern: CURRENCY_REGEX,
      patternHint: 'must be a 3-letter uppercase ISO currency code (e.g. "LKR")',
    });
    const currencySymbol = readRequiredString(
      localizationRaw,
      'currencySymbol',
      'localization.currencySymbol',
      issues
    );
    const locale = readRequiredString(localizationRaw, 'locale', 'localization.locale', issues);
    const timezone = readRequiredString(localizationRaw, 'timezone', 'localization.timezone', issues);
    validateTimezone(timezone, 'localization.timezone', issues);
    const countryCode = readRequiredString(
      localizationRaw,
      'countryCode',
      'localization.countryCode',
      issues
    );
    localization = { currency, currencySymbol, locale, timezone, countryCode };
  }

  // Modules
  const modulesRaw = input.modules;
  let modules: ClientModuleFlags = DEFAULT_DEV_CLIENT_CONFIG.modules;
  if (!isRecord(modulesRaw)) {
    issues.push('modules: must be an object');
  } else {
    modules = {
      demoSandboxEnabled: readBoolean(modulesRaw, 'demoSandboxEnabled', 'modules.demoSandboxEnabled', issues),
      publicOnboardingEnabled: readBoolean(
        modulesRaw,
        'publicOnboardingEnabled',
        'modules.publicOnboardingEnabled',
        issues
      ),
      studentPortalEnabled: readBoolean(
        modulesRaw,
        'studentPortalEnabled',
        'modules.studentPortalEnabled',
        issues
      ),
      lecturerPortalEnabled: readBoolean(
        modulesRaw,
        'lecturerPortalEnabled',
        'modules.lecturerPortalEnabled',
        issues
      ),
      receptionCounterEnabled: readBoolean(
        modulesRaw,
        'receptionCounterEnabled',
        'modules.receptionCounterEnabled',
        issues
      ),
      examAnalyticsEnabled: readBoolean(
        modulesRaw,
        'examAnalyticsEnabled',
        'modules.examAnalyticsEnabled',
        issues
      ),
      studyMaterialsEnabled: readBoolean(
        modulesRaw,
        'studyMaterialsEnabled',
        'modules.studyMaterialsEnabled',
        issues
      ),
      thermalReceiptPrintingEnabled: readBoolean(
        modulesRaw,
        'thermalReceiptPrintingEnabled',
        'modules.thermalReceiptPrintingEnabled',
        issues
      ),
    };
  }

  // Demo config
  const demoRaw = input.demo;
  let demo: ClientDemoConfig = DEFAULT_DEV_CLIENT_CONFIG.demo;
  if (!isRecord(demoRaw)) {
    issues.push('demo: must be an object');
  } else {
    demo = {
      sandboxInstituteName: readRequiredString(
        demoRaw,
        'sandboxInstituteName',
        'demo.sandboxInstituteName',
        issues
      ),
      sandboxCity: readRequiredString(demoRaw, 'sandboxCity', 'demo.sandboxCity', issues),
      defaultPortal: readEnum(demoRaw, 'defaultPortal', 'demo.defaultPortal', DEMO_PORTALS, issues),
      allowReset: readBoolean(demoRaw, 'allowReset', 'demo.allowReset', issues),
    };
  }

  // Integrations
  const integrationsRaw = input.integrations;
  let integrations: ClientIntegrations = DEFAULT_DEV_CLIENT_CONFIG.integrations;
  if (!isRecord(integrationsRaw)) {
    issues.push('integrations: must be an object');
  } else {
    integrations = {
      authProvider: readEnum(integrationsRaw, 'authProvider', 'integrations.authProvider', ['firebase'] as const, issues),
      databaseProvider: readEnum(
        integrationsRaw,
        'databaseProvider',
        'integrations.databaseProvider',
        ['firestore'] as const,
        issues
      ),
      storageProvider: readEnum(
        integrationsRaw,
        'storageProvider',
        'integrations.storageProvider',
        STORAGE_PROVIDERS,
        issues
      ),
      smsProvider: readEnum(integrationsRaw, 'smsProvider', 'integrations.smsProvider', SMS_PROVIDERS, issues),
      whatsappProvider: readEnum(
        integrationsRaw,
        'whatsappProvider',
        'integrations.whatsappProvider',
        WHATSAPP_PROVIDERS,
        issues
      ),
      paymentProvider: readEnum(
        integrationsRaw,
        'paymentProvider',
        'integrations.paymentProvider',
        PAYMENT_PROVIDERS,
        issues
      ),
    };
  }

  if (issues.length > 0) {
    throw new ClientConfigValidationError(issues, sourceLabel);
  }

  return {
    schemaVersion,
    clientSlug,
    coreVersion,
    ...(isExampleConfig !== undefined ? { isExampleConfig } : {}),
    branding,
    contact,
    localization,
    modules,
    demo,
    integrations,
  };
}

export function assertProductionClientConfigSelection(
  config: ClientConfig,
  options: {
    isProductionBuild: boolean;
    configPath?: string;
    requireExplicitConfig?: boolean;
    allowExampleConfig?: boolean;
  }
): void {
  if (!options.isProductionBuild) {
    return;
  }

  const normalizedPath = (options.configPath || '').replace(/\\/g, '/').toLowerCase();
  const pointsToExample =
    config.isExampleConfig === true ||
    normalizedPath.endsWith('clients/example/client.config.json') ||
    normalizedPath.includes('/clients/example/');

  if (pointsToExample && !options.allowExampleConfig) {
    throw new ClientConfigValidationError(
      [
        'clientConfig: example client configuration ("clients/example/client.config.json") cannot be used for a production academy build. Provide an explicit production academy config via CLIENT_CONFIG_PATH with isExampleConfig omitted or false.',
      ],
      options.configPath || 'production build'
    );
  }

  if (options.requireExplicitConfig && !options.configPath) {
    throw new ClientConfigValidationError(
      [
        'CLIENT_CONFIG_PATH: explicit client configuration path is required when REQUIRE_CLIENT_CONFIG=true.',
      ],
      'production build'
    );
  }
}

export const DEFAULT_FAVICON_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%234F46E5'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-family='sans-serif' font-size='18' font-weight='700' fill='%23FFFFFF'%3ET%3C/text%3E%3C/svg%3E";

export const DEFAULT_DEV_CLIENT_CONFIG: ClientConfig = {
  schemaVersion: '1.0',
  clientSlug: 'tuitionos-dev',
  coreVersion: '1.0.0',
  branding: {
    academyName: 'TuitionOS',
    shortName: 'TuitionOS',
    tagline: 'One operating system for classes, monthly cards, and lecturer splits.',
    description:
      'All-in-one multi-tenant tuition class, academy, and student management platform tailored for Sri Lanka.',
    faviconUrl: DEFAULT_FAVICON_DATA_URI,
    colors: {
      primary: '#4F46E5',
      primaryHover: '#4338CA',
      secondary: '#0F172A',
      accent: '#10B981',
      background: '#F8FAFC',
      text: '#0F172A',
    },
    typography: {
      displayFont: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      bodyFont: "'DM Sans', system-ui, -apple-system, sans-serif",
      monoFont: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
      googleFontsUrl:
        'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap',
    },
  },
  contact: {
    email: 'hello@tuitionos.lk',
    phone: '+94 11 250 4800',
    whatsapp: '+94 77 123 4567',
    website: 'https://tuitionos.lk',
    address: 'Colombo 05, Western Province',
    city: 'Colombo',
    country: 'Sri Lanka',
  },
  localization: {
    currency: 'LKR',
    currencySymbol: 'Rs.',
    locale: 'en-LK',
    timezone: 'Asia/Colombo',
    countryCode: '+94',
  },
  modules: {
    demoSandboxEnabled: true,
    publicOnboardingEnabled: true,
    studentPortalEnabled: true,
    lecturerPortalEnabled: true,
    receptionCounterEnabled: true,
    examAnalyticsEnabled: true,
    studyMaterialsEnabled: true,
    thermalReceiptPrintingEnabled: true,
  },
  demo: {
    sandboxInstituteName: 'Apex Academy - Colombo',
    sandboxCity: 'Colombo',
    defaultPortal: 'dashboard',
    allowReset: true,
  },
  integrations: {
    authProvider: 'firebase',
    databaseProvider: 'firestore',
    storageProvider: 'firebase-storage',
    smsProvider: 'none',
    whatsappProvider: 'none',
    paymentProvider: 'none',
  },
};

let cachedClientConfig: ClientConfig | null = null;

export function getActiveClientConfig(): ClientConfig {
  if (cachedClientConfig) {
    return cachedClientConfig;
  }

  const rawInjected =
    typeof __TUITIONOS_CLIENT_CONFIG__ !== 'undefined'
      ? __TUITIONOS_CLIENT_CONFIG__
      : DEFAULT_DEV_CLIENT_CONFIG;

  const validated = validateClientConfig(rawInjected, 'active deployment client configuration');

  // Optional deployment override for demo sandbox gating via Vite env flag
  const envDemoOverride =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_DEMO_SANDBOX_ENABLED
      : undefined;

  if (envDemoOverride === 'false') {
    cachedClientConfig = {
      ...validated,
      modules: {
        ...validated.modules,
        demoSandboxEnabled: false,
      },
    };
  } else if (envDemoOverride === 'true') {
    cachedClientConfig = {
      ...validated,
      modules: {
        ...validated.modules,
        demoSandboxEnabled: true,
      },
    };
  } else {
    cachedClientConfig = validated;
  }

  return cachedClientConfig;
}

export function applyBrandTheme(config: ClientConfig, root?: HTMLElement): void {
  const target = root ?? (typeof document !== 'undefined' ? document.documentElement : undefined);
  if (!target) return;

  const { colors, typography } = config.branding;
  target.style.setProperty('--brand-primary', colors.primary);
  target.style.setProperty('--brand-primary-hover', colors.primaryHover);
  target.style.setProperty('--brand-secondary', colors.secondary);
  target.style.setProperty('--brand-accent', colors.accent);
  target.style.setProperty('--brand-background', colors.background);
  target.style.setProperty('--brand-text', colors.text);
  target.style.setProperty('--font-display', typography.displayFont);
  target.style.setProperty('--font-body', typography.bodyFont);
  target.style.setProperty('--font-mono', typography.monoFont);
}

export function buildDocumentTitle(config: ClientConfig): string {
  if (config.clientSlug === DEFAULT_DEV_CLIENT_CONFIG.clientSlug) {
    return 'TuitionOS — Tuition Class & Academy Management for Sri Lanka';
  }
  return `${config.branding.academyName} — ${config.branding.tagline}`;
}

export function applyDocumentMetadata(config: ClientConfig, doc?: Document): void {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!targetDoc) return;

  const title = buildDocumentTitle(config);
  targetDoc.title = title;

  const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let tag = targetDoc.querySelector(`meta[${attr}="${key}"]`);
    if (!tag) {
      tag = targetDoc.createElement('meta');
      tag.setAttribute(attr, key);
      targetDoc.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  upsertMeta('name', 'description', config.branding.description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', config.branding.description);
  upsertMeta('name', 'theme-color', config.branding.colors.primary);

  let faviconLink = targetDoc.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!faviconLink) {
    faviconLink = targetDoc.createElement('link');
    faviconLink.rel = 'icon';
    targetDoc.head.appendChild(faviconLink);
  }
  faviconLink.href = config.branding.faviconUrl;
}
