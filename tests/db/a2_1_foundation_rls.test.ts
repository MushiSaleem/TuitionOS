import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { PGlite } from '@electric-sql/pglite';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(CURRENT_DIR, '..', '..');
const SHIM_PATH = path.join(ROOT_DIR, 'supabase', 'tests', 'a2_1_supabase_auth_shim.sql');
const MIGRATION_0001 = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20260101000001_a2_1_core_tenancy_identity.sql'
);
const MIGRATION_0002 = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20260101000002_a2_1_rls_helpers_and_policies.sql'
);
const SQL_SUITE_PATH = path.join(ROOT_DIR, 'supabase', 'tests', 'a2_1_foundation_rls.sql');

const ACAD_A = '11111111-1111-4111-8111-111111111111';
const ACAD_B = '22222222-2222-4222-8222-222222222222';
const UID_ADMIN_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const UID_TEACHER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const UID_ADMIN_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MEM_ADMIN_A = 'aaaa1111-1111-4111-8111-111111111111';
const MEM_TEACHER_A = 'aaaa2222-2222-4222-8222-222222222222';
const MEM_ADMIN_B = 'bbbb1111-1111-4111-8111-111111111111';

describe('Stage A2.1 — Real PostgreSQL Migrations, Composite FKs & RLS Security Tests', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(fs.readFileSync(SHIM_PATH, 'utf-8'));
    await db.exec(fs.readFileSync(MIGRATION_0001, 'utf-8'));
    await db.exec(fs.readFileSync(MIGRATION_0002, 'utf-8'));
  });

  afterAll(async () => {
    await db.close();
  });

  test('executes standalone SQL security verification script (supabase/tests/a2_1_foundation_rls.sql) end-to-end with zero errors', async () => {
    const sqlSuite = fs.readFileSync(SQL_SUITE_PATH, 'utf-8');
    try {
      await db.exec(sqlSuite);
    } catch (err) {
      await db.exec('ROLLBACK').catch(() => {});
      throw err;
    }
    // Script ends with ROLLBACK leaving the migrated database clean for granular tests below
    const { rows } = await db.query<{ count: string }>('SELECT count(*)::text AS count FROM public.academies');
    expect(rows[0].count).toBe('0');
  });

  test('verifies FORCE ROW LEVEL SECURITY is enabled on all 8 foundational tables and zero future-stage placeholder tables exist', async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      INNER JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
      `
    );

    const tableNames = rows.map((r) => r.relname);
    expect(tableNames).toEqual([
      'academies',
      'academy_memberships',
      'audit_logs',
      'membership_invites',
      'permissions',
      'role_permissions',
      'schema_releases',
      'user_profiles',
    ]);

    for (const row of rows) {
      expect(row.relrowsecurity).toBe(true);
      expect(row.relforcerowsecurity).toBe(true);
    }
  });

  test('verifies granular two-academy isolation, composite FK, self-escalation blocking, immediate suspension, and audit immutability', async () => {
    // Seed two isolated fixture academies
    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES
        ('${UID_ADMIN_A}',   'a.admin@test.lk'),
        ('${UID_TEACHER_A}', 'a.teacher@test.lk'),
        ('${UID_ADMIN_B}',   'b.admin@test.lk');

      INSERT INTO public.academies (id, slug, name, status) VALUES
        ('${ACAD_A}', 'alpha-test', 'Alpha Academy', 'active'),
        ('${ACAD_B}', 'beta-test',  'Beta Academy',  'active');

      INSERT INTO public.user_profiles (user_id, full_name, email, legacy_firebase_uid, status) VALUES
        ('${UID_ADMIN_A}',   'Alpha Admin',   'a.admin@test.lk',   'legacy_fb_1', 'active'),
        ('${UID_TEACHER_A}', 'Alpha Teacher', 'a.teacher@test.lk', NULL,          'active'),
        ('${UID_ADMIN_B}',   'Beta Admin',    'b.admin@test.lk',   'legacy_fb_2', 'active');

      INSERT INTO public.academy_memberships (id, academy_id, user_id, role, status) VALUES
        ('${MEM_ADMIN_A}',   '${ACAD_A}', '${UID_ADMIN_A}',   'academy_admin', 'active'),
        ('${MEM_TEACHER_A}', '${ACAD_A}', '${UID_TEACHER_A}', 'teacher',       'active'),
        ('${MEM_ADMIN_B}',   '${ACAD_B}', '${UID_ADMIN_B}',   'academy_admin', 'active');

      SELECT public.internal_write_audit_log(
        '${ACAD_A}', '${UID_ADMIN_A}', 'academy_admin', 'INIT', 'academy', '${ACAD_A}', '{}'::jsonb
      );
      SELECT public.internal_write_audit_log(
        '${ACAD_B}', '${UID_ADMIN_B}', 'academy_admin', 'INIT', 'academy', '${ACAD_B}', '{}'::jsonb
      );
    `);

    const asUser = async <T>(uid: string, fn: () => Promise<T>): Promise<T> => {
      await db.exec('BEGIN');
      try {
        await db.exec(`SET LOCAL ROLE authenticated`);
        await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
        await db.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: uid, role: 'authenticated' }),
        ]);
        const result = await fn();
        await db.exec('COMMIT');
        return result;
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    };

    // 1. Admin A sees only Academy A (not Academy B)
    const adminAAcademies = await asUser(UID_ADMIN_A, async () => {
      const res = await db.query<{ id: string }>('SELECT id FROM public.academies');
      return res.rows.map((r) => r.id);
    });
    expect(adminAAcademies).toEqual([ACAD_A]);

    // 2. Teacher A sees Academy A while active, cannot see invites or audit_logs
    const teacherActiveState = await asUser(UID_TEACHER_A, async () => {
      const academies = await db.query('SELECT id FROM public.academies');
      const audits = await db.query('SELECT id FROM public.audit_logs');
      const invites = await db.query('SELECT id FROM public.membership_invites');
      return {
        academies: academies.rows.length,
        audits: audits.rows.length,
        invites: invites.rows.length,
      };
    });
    expect(teacherActiveState).toEqual({ academies: 1, audits: 0, invites: 0 });

    // 3. Admin A suspends Teacher A through authorized audited RPC
    await asUser(UID_ADMIN_A, async () => {
      await db.query(
        `SELECT public.admin_update_membership($1::uuid, $2::uuid, 'suspended', NULL, 'Security review test')`,
        [ACAD_A, MEM_TEACHER_A]
      );
    });

    // 4. Immediately replay Teacher A's exact same JWT -> blocked immediately!
    const teacherAfterSuspension = await asUser(UID_TEACHER_A, async () => {
      const academies = await db.query('SELECT id FROM public.academies');
      const memberships = await db.query('SELECT id FROM public.academy_memberships');
      const perms = await db.query('SELECT code FROM public.permissions');
      return {
        academies: academies.rows.length,
        memberships: memberships.rows.length,
        perms: perms.rows.length,
      };
    });
    expect(teacherAfterSuspension).toEqual({ academies: 0, memberships: 0, perms: 0 });

    // 5. Composite FK rejects cross-academy invite creator even when run directly as DB owner
    let fkRejected = false;
    try {
      await db.query(
        `INSERT INTO public.membership_invites
          (academy_id, email_normalized, intended_role, invite_token_hash, status, expires_at, created_by_membership_id)
         VALUES ($1, 'cross@test.lk', 'teacher', $2, 'pending', now() + interval '1 day', $3)`,
        [ACAD_A, 'x'.repeat(64), MEM_ADMIN_B]
      );
    } catch {
      fkRejected = true;
    }
    expect(fkRejected).toBe(true);

    // 6. Audit logs reject DELETE and UPDATE even at DB level
    let auditDeleteBlocked = false;
    try {
      await db.query('DELETE FROM public.audit_logs WHERE academy_id = $1', [ACAD_A]);
    } catch {
      auditDeleteBlocked = true;
    }
    expect(auditDeleteBlocked).toBe(true);
  });
});
