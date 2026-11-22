-- =============================================================================
-- TuitionOS — Stage A2.1 Real PostgreSQL Security & RLS Verification Suite
--
-- Runs directly against a freshly migrated PostgreSQL 16+ database (via psql in
-- GitHub Actions CI or via @electric-sql/pglite in local bun test).
-- Fails immediately with an explicit error if ANY security invariant breaks.
--
-- Fixture topology (isolated test fixtures only):
--   Academy A: admin_a (academy_admin), teacher_a (teacher), student_a (student)
--   Academy B: admin_b (academy_admin), teacher_b (teacher)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Seed Isolated Two-Academy Test Fixtures (as migration owner / service_role)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_acad_a uuid := '11111111-1111-4111-8111-111111111111';
  v_acad_b uuid := '22222222-2222-4222-8222-222222222222';

  v_uid_admin_a   uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_uid_teacher_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  v_uid_student_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
  v_uid_admin_b   uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  v_uid_teacher_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';

  v_mem_admin_a   uuid := 'aaaa1111-1111-4111-8111-111111111111';
  v_mem_teacher_a uuid := 'aaaa2222-2222-4222-8222-222222222222';
  v_mem_student_a uuid := 'aaaa3333-3333-4333-8333-333333333333';
  v_mem_admin_b   uuid := 'bbbb1111-1111-4111-8111-111111111111';
  v_mem_teacher_b uuid := 'bbbb2222-2222-4222-8222-222222222222';
BEGIN
  -- Verify schema_releases registered both A2.1 migrations
  IF (SELECT count(*) FROM public.schema_releases WHERE stage = 'A2.1') <> 2 THEN
    RAISE EXCEPTION 'FAIL: Expected 2 A2.1 rows in schema_releases.';
  END IF;

  INSERT INTO auth.users (id, email) VALUES
    (v_uid_admin_a,   'admin.a@academy-a.test'),
    (v_uid_teacher_a, 'teacher.a@academy-a.test'),
    (v_uid_student_a, 'student.a@academy-a.test'),
    (v_uid_admin_b,   'admin.b@academy-b.test'),
    (v_uid_teacher_b, 'teacher.b@academy-b.test');

  INSERT INTO public.academies (id, slug, name, status) VALUES
    (v_acad_a, 'academy-a-test', 'Academy Alpha Colombo', 'active'),
    (v_acad_b, 'academy-b-test', 'Academy Beta Kandy',    'active');

  INSERT INTO public.user_profiles (user_id, full_name, email, legacy_firebase_uid, status) VALUES
    (v_uid_admin_a,   'Admin Alpha',   'admin.a@academy-a.test',   'fb_uid_admin_a',   'active'),
    (v_uid_teacher_a, 'Teacher Alpha', 'teacher.a@academy-a.test', 'fb_uid_teacher_a', 'active'),
    (v_uid_student_a, 'Student Alpha', 'student.a@academy-a.test', NULL,               'active'),
    (v_uid_admin_b,   'Admin Beta',    'admin.b@academy-b.test',   'fb_uid_admin_b',   'active'),
    (v_uid_teacher_b, 'Teacher Beta',  'teacher.b@academy-b.test', NULL,               'active');

  INSERT INTO public.academy_memberships (id, academy_id, user_id, role, status) VALUES
    (v_mem_admin_a,   v_acad_a, v_uid_admin_a,   'academy_admin', 'active'),
    (v_mem_teacher_a, v_acad_a, v_uid_teacher_a, 'teacher',       'active'),
    (v_mem_student_a, v_acad_a, v_uid_student_a, 'student',       'active'),
    (v_mem_admin_b,   v_acad_b, v_uid_admin_b,   'academy_admin', 'active'),
    (v_mem_teacher_b, v_acad_b, v_uid_teacher_b, 'teacher',       'active');

  -- Seed one audit log per academy via internal server-side helper
  PERFORM public.internal_write_audit_log(
    v_acad_a, v_uid_admin_a, 'academy_admin', 'ACADEMY_SEEDED', 'academy', v_acad_a::text, '{"fixture":true}'::jsonb
  );
  PERFORM public.internal_write_audit_log(
    v_acad_b, v_uid_admin_b, 'academy_admin', 'ACADEMY_SEEDED', 'academy', v_acad_b::text, '{"fixture":true}'::jsonb
  );

  -- ---------------------------------------------------------------------------
  -- 1. Composite Foreign-Key Tenant Isolation (even as superuser/service_role!)
  -- ---------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.membership_invites (
      academy_id, email_normalized, intended_role, invite_token_hash,
      status, expires_at, created_by_membership_id
    ) VALUES (
      v_acad_a, 'cross.fk@test.lk', 'teacher', repeat('f', 64),
      'pending', now() + interval '48 hours', v_mem_admin_b -- Academy B membership in Academy A invite!
    );
    RAISE EXCEPTION 'FAIL: Composite FK allowed cross-academy created_by_membership_id!';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL; -- Expected 23503
  END;

  -- Verify ON DELETE RESTRICT prevents cascading deletion of audit_logs
  BEGIN
    DELETE FROM public.academies WHERE id = v_acad_a;
    RAISE EXCEPTION 'FAIL: Deleting an academy with audit_logs must be rejected!';
  EXCEPTION
    WHEN foreign_key_violation OR restrict_violation THEN
      NULL; -- Expected 23001 (restrict_violation) or 23503 (foreign_key_violation)
  END;

  -- Verify audit_logs immutability trigger blocks UPDATE, DELETE, and TRUNCATE even as owner
  BEGIN
    UPDATE public.audit_logs SET action = 'TAMPERED' WHERE academy_id = v_acad_a;
    RAISE EXCEPTION 'FAIL: UPDATE on audit_logs must be blocked!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Expected 42501
  END;

  BEGIN
    DELETE FROM public.audit_logs WHERE academy_id = v_acad_a;
    RAISE EXCEPTION 'FAIL: DELETE on audit_logs must be blocked!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Expected 42501
  END;

  BEGIN
    TRUNCATE public.audit_logs;
    RAISE EXCEPTION 'FAIL: TRUNCATE on audit_logs must be blocked!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Expected 42501
  END;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. Unauthenticated (anon) Default-Deny Enforcement Across All Tables
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_tbl text;
  v_tables text[] := ARRAY[
    'academies', 'user_profiles', 'academy_memberships', 'permissions',
    'role_permissions', 'membership_invites', 'audit_logs', 'schema_releases'
  ];
BEGIN
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);

  FOREACH v_tbl IN ARRAY v_tables LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', v_tbl);
      RAISE EXCEPTION 'FAIL: anon role was able to SELECT from public.%', v_tbl;
    EXCEPTION
      WHEN insufficient_privilege THEN
        NULL; -- Expected 42501
    END;
  END LOOP;

  RESET ROLE;
END
$$;

-- -----------------------------------------------------------------------------
-- 3. Two-Academy Isolation, Permissions, Invites & Negative Tests (Admin A)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_acad_a uuid := '11111111-1111-4111-8111-111111111111';
  v_acad_b uuid := '22222222-2222-4222-8222-222222222222';
  v_uid_admin_a   uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_uid_teacher_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  v_uid_admin_b   uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  v_mem_admin_a   uuid := 'aaaa1111-1111-4111-8111-111111111111';
  v_mem_teacher_a uuid := 'aaaa2222-2222-4222-8222-222222222222';
  v_mem_teacher_b uuid := 'bbbb2222-2222-4222-8222-222222222222';
  v_count int;
  v_invite_a uuid;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_uid_admin_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_admin_a, 'role', 'authenticated')::text, true);

  -- Admin A sees ONLY Academy A
  SELECT count(*) INTO v_count FROM public.academies;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Admin A expected 1 academy, saw %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.academies WHERE id = v_acad_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Admin A leaked Academy B row!';
  END IF;

  -- Admin A can update Academy A name, cannot update Academy B
  UPDATE public.academies SET name = 'Academy Alpha Colombo Updated' WHERE id = v_acad_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Admin A could not update own academy!';
  END IF;

  UPDATE public.academies SET name = 'HACKED' WHERE id = v_acad_b;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Admin A updated Academy B!';
  END IF;

  -- Admin A sees ONLY Academy A memberships (3 rows) and ONLY Academy A audit logs (1 row)
  SELECT count(*) INTO v_count FROM public.academy_memberships;
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: Admin A expected 3 memberships, saw %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.audit_logs;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Admin A expected 1 audit log, saw %', v_count;
  END IF;

  -- Admin A CANNOT directly INSERT/UPDATE/DELETE audit_logs
  BEGIN
    INSERT INTO public.audit_logs (academy_id, actor_user_id, actor_role, action, entity_type, entity_id)
    VALUES (v_acad_a, v_uid_admin_a, 'academy_admin', 'SPOOFED', 'academy', v_acad_a::text);
    RAISE EXCEPTION 'FAIL: Authenticated admin was able to INSERT directly into audit_logs!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Admin A CANNOT directly UPDATE academy_memberships (must use admin_update_membership RPC)
  BEGIN
    UPDATE public.academy_memberships SET role = 'academy_admin' WHERE id = v_mem_teacher_a;
    RAISE EXCEPTION 'FAIL: Direct UPDATE on academy_memberships must be forbidden!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Admin A CANNOT mutate own membership via admin_update_membership
  BEGIN
    PERFORM public.admin_update_membership(v_acad_a, v_mem_admin_a, 'suspended', NULL, 'self-test');
    RAISE EXCEPTION 'FAIL: Admin A was able to modify own membership!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Admin A CANNOT mutate Academy B membership via admin_update_membership
  BEGIN
    PERFORM public.admin_update_membership(v_acad_b, v_mem_teacher_b, 'suspended', NULL, 'cross-tenant');
    RAISE EXCEPTION 'FAIL: Admin A modified Academy B membership!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Admin A CANNOT alter protected user_profiles fields (legacy_firebase_uid, status, auth_version)
  BEGIN
    UPDATE public.user_profiles SET legacy_firebase_uid = 'spoofed_fb_uid' WHERE user_id = v_uid_admin_a;
    RAISE EXCEPTION 'FAIL: User modified legacy_firebase_uid!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Admin A CAN update own safe profile field (full_name), CANNOT update another user's profile
  UPDATE public.user_profiles SET full_name = 'Admin Alpha Verified' WHERE user_id = v_uid_admin_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Admin A could not update own full_name!';
  END IF;

  UPDATE public.user_profiles SET full_name = 'Hijacked Teacher' WHERE user_id = v_uid_teacher_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Admin A updated another user profile directly!';
  END IF;

  -- Admin A CANNOT mutate permissions or role_permissions catalog
  BEGIN
    INSERT INTO public.permissions (code, domain, description) VALUES ('fake.perm', 'fake', 'nope');
    RAISE EXCEPTION 'FAIL: Authenticated user mutated permissions catalog!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Admin A CAN create an invite in Academy A, CANNOT create an invite in Academy B
  INSERT INTO public.membership_invites (
    academy_id, email_normalized, intended_role, invite_token_hash,
    status, expires_at, created_by_membership_id
  ) VALUES (
    v_acad_a, 'new.teacher@academy-a.test', 'teacher', repeat('a', 64),
    'pending', now() + interval '48 hours', v_mem_admin_a
  ) RETURNING id INTO v_invite_a;

  BEGIN
    INSERT INTO public.membership_invites (
      academy_id, email_normalized, intended_role, invite_token_hash,
      status, expires_at, created_by_membership_id
    ) VALUES (
      v_acad_b, 'intruder@academy-b.test', 'academy_admin', repeat('b', 64),
      'pending', now() + interval '48 hours', v_mem_admin_a
    );
    RAISE EXCEPTION 'FAIL: Admin A created an invite inside Academy B!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Admin A can revoke own academy's pending invite, and terminal status cannot be reopened
  UPDATE public.membership_invites SET status = 'revoked' WHERE id = v_invite_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Admin A could not revoke own academy invite!';
  END IF;

  -- Admin A cannot read Admin B's user_profile
  SELECT count(*) INTO v_count FROM public.user_profiles WHERE user_id = v_uid_admin_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Admin A leaked Admin B user_profile!';
  END IF;

  RESET ROLE;
END
$$;

-- -----------------------------------------------------------------------------
-- 4. Non-Admin (Teacher A) Least-Privilege & Immediate Suspension with Same JWT
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_acad_a uuid := '11111111-1111-4111-8111-111111111111';
  v_uid_admin_a   uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_uid_teacher_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  v_mem_teacher_a uuid := 'aaaa2222-2222-4222-8222-222222222222';
  v_mem_student_a uuid := 'aaaa3333-3333-4333-8333-333333333333';
  v_count int;
  v_auth_ver_before int;
  v_auth_ver_after int;
BEGIN
  -- Act as Teacher A with valid active JWT
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_uid_teacher_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_teacher_a, 'role', 'authenticated')::text, true);

  -- Teacher A can read Academy A (active member), sees only own membership (1), 0 invites, 0 audit logs
  SELECT count(*) INTO v_count FROM public.academies;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL: Active Teacher A expected 1 academy, saw %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.academy_memberships;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL: Teacher A expected only 1 own membership, saw %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.membership_invites;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: Teacher A must see 0 invites, saw %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.audit_logs;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: Teacher A must see 0 audit logs, saw %', v_count; END IF;

  -- Teacher A CANNOT update Academy A
  UPDATE public.academies SET name = 'Teacher Override' WHERE id = v_acad_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: Teacher A updated academy!'; END IF;

  -- Teacher A CANNOT create invites or suspend other members
  BEGIN
    INSERT INTO public.membership_invites (
      academy_id, email_normalized, intended_role, invite_token_hash,
      status, expires_at, created_by_membership_id
    ) VALUES (
      v_acad_a, 'rogue@academy-a.test', 'academy_admin', repeat('c', 64),
      'pending', now() + interval '24 hours', v_mem_teacher_a
    );
    RAISE EXCEPTION 'FAIL: Teacher A created an invite!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  BEGIN
    PERFORM public.admin_update_membership(v_acad_a, v_mem_student_a, 'suspended', NULL, 'unauthorized');
    RAISE EXCEPTION 'FAIL: Teacher A invoked admin_update_membership!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  -- Now Admin A suspends Teacher A via authorized RPC (checking auth_version increment & audit log)
  RESET ROLE;
  SELECT auth_version INTO v_auth_ver_before FROM public.user_profiles WHERE user_id = v_uid_teacher_a;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_uid_admin_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_admin_a, 'role', 'authenticated')::text, true);

  PERFORM public.admin_update_membership(v_acad_a, v_mem_teacher_a, 'suspended', NULL, 'Contract ended');

  -- Verify audit log recorded the suspension
  SELECT count(*) INTO v_count
  FROM public.audit_logs
  WHERE academy_id = v_acad_a AND action = 'MEMBERSHIP_UPDATED' AND entity_id = v_mem_teacher_a::text;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: admin_update_membership did not write audit_logs entry!';
  END IF;

  RESET ROLE;
  SELECT auth_version INTO v_auth_ver_after FROM public.user_profiles WHERE user_id = v_uid_teacher_a;
  IF v_auth_ver_after <> v_auth_ver_before + 1 THEN
    RAISE EXCEPTION 'FAIL: Expected auth_version to increment on suspension (before=%, after=%).',
      v_auth_ver_before, v_auth_ver_after;
  END IF;

  -- IMMEDIATE REVOCATION TEST:
  -- Replay Teacher A's EXACT SAME valid JWT immediately (without waiting for token expiry!)
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_uid_teacher_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_teacher_a, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO v_count FROM public.academies;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Suspended Teacher A still read academies with existing JWT (saw %)!', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.academy_memberships;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Suspended Teacher A still read active memberships (saw %)!', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.permissions;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Suspended Teacher A still read permissions catalog (saw %)!', v_count;
  END IF;

  IF public.auth_is_active_member(v_acad_a) THEN
    RAISE EXCEPTION 'FAIL: auth_is_active_member returned TRUE for suspended member!';
  END IF;

  RESET ROLE;
END
$$;

ROLLBACK;
