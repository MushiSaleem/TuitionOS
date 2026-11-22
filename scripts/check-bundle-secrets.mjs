#!/usr/bin/env node
/**
 * TuitionOS — Production Bundle Secret & Leakage Scanner (Stage A2.1)
 *
 * Scans compiled assets under ./dist and exits non-zero if any privileged
 * credential markers, service-role JWTs, or dev-only Firebase fallback leaks appear.
 */

import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
  console.error(`[check-bundle-secrets] ERROR: "${distDir}" does not exist. Run build first.`);
  process.exit(1);
}

const FORBIDDEN_PATTERNS = [
  {
    name: 'Dev Firebase Applet Config Reference',
    regex: /firebase-applet-config/gi,
  },
  {
    name: 'Supabase Service Role Env Variable Name',
    regex: /SUPABASE_SERVICE_ROLE_KEY/g,
  },
  {
    name: 'Supabase New-Format Secret Key',
    regex: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/g,
  },
  {
    name: 'Private Key PEM Block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: 'PayHere Merchant Secret Env Reference',
    regex: /PAYHERE_MERCHANT_SECRET/g,
  },
];

// Matches standard 3-part JWTs so we can inspect embedded claims for privileged roles
const JWT_REGEX = /\beyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}\b/g;
const PRIVILEGED_JWT_ROLES = new Set(['service_role', 'supabase_admin', 'postgres']);

function collectFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

const files = collectFiles(distDir);
const findings = [];

for (const filePath of files) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf'].includes(ext)) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(process.cwd(), filePath);

  for (const rule of FORBIDDEN_PATTERNS) {
    rule.regex.lastIndex = 0;
    if (rule.regex.test(content)) {
      findings.push(`${relPath}: matched forbidden pattern "${rule.name}"`);
    }
  }

  JWT_REGEX.lastIndex = 0;
  let jwtMatch;
  while ((jwtMatch = JWT_REGEX.exec(content)) !== null) {
    try {
      const payloadB64 = jwtMatch[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
      const parsed = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
      const role = typeof parsed?.role === 'string' ? parsed.role.toLowerCase() : '';
      if (PRIVILEGED_JWT_ROLES.has(role)) {
        findings.push(`${relPath}: embedded JWT contains privileged role "${role}"`);
      }
    } catch {
      // Ignore non-JSON base64 coincidences
    }
  }
}

if (findings.length > 0) {
  console.error('[check-bundle-secrets] FAILED — Potential secret/config leakage detected:');
  for (const finding of findings) {
    console.error(`  - ${finding}`);
  }
  process.exit(1);
}

console.log(`[check-bundle-secrets] PASS — Scanned ${files.length} files in dist/; zero forbidden secrets or leaks detected.`);
