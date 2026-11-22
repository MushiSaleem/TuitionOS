-- =============================================================================
-- TuitionOS — Stage A2.1 Foundation Migration 0002
-- Foundational RLS Helpers, Default-Deny Privileges, Policies & Audited RPCs
--
-- Security Architecture:
--   1. Default-deny: REVOKE ALL from PUBLIC, anon, authenticated before grants.
--   2. FORCE ROW LEVEL SECURITY enabled on every foundational table.
--   3. Authoritative live DB membership checks (NOT stale JWT claims) enforce
--      immediate revocation/suspension even for an existing valid JWT.
--   4. Safe SECURITY DEFINER functions with explicit SET search_path = public, pg_temp
--      and explicit EXECUTE grants.
--   5. Audit logs are readable only by authorized academy_admin members; direct
--      INSERT/UPDATE/DELETE/TRUNCATE is revoked from all application roles.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Default-Deny Table Privileges (Revoke Everything First)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.academies,
  public.user_profiles,
  public.academy_memberships,
  public.permissions,
  public.role_permissions,
  public.membership_invites,
  public.audit_logs,
  public.schema_releases
FROM PUBLIC, anon, authenticated;

-- Explicitly revoke TRUNCATE as defense-in-depth on all foundational tables
REVOKE TRUNCATE ON TABLE
  public.academies,
  public.user_profiles,
  public.academy_memberships,
  public.permissions,
  public.role_permissions,
  public.membership_invites,
  public.audit_logs,
  public.schema_releases
FROM PUBLIC, anon, authenticated;

-- Minimal least-privilege grants for authenticated role (RLS further scopes rows)
GRANT SELECT, UPDATE (name, timezone, currency_code) ON TABLE public.academies TO authenticated;
GRANT SELECT, UPDATE (full_name, phone)              ON TABLE public.user_profiles TO authenticated;
-- Memberships: SELECT only! All status/role mutations MUST use authorized server workflows.
GRANT SELECT                                         ON TABLE public.academy_memberships TO authenticated;
-- Permissions & role_permissions: strictly read-only catalog for application roles
GRANT SELECT                                         ON TABLE public.permissions TO authenticated;
GRANT SELECT                                         ON TABLE public.role_permissions TO authenticated;
-- Invites: SELECT, INSERT, UPDATE (guard trigger restricts UPDATE to revoke only; no DELETE)
GRANT SELECT, INSERT, UPDATE                         ON TABLE public.membership_invites TO authenticated;
-- Audit logs: SELECT ONLY for authenticated (NO INSERT, NO UPDATE, NO DELETE, NO TRUNCATE)
GRANT SELECT                                         ON TABLE public.audit_logs TO authenticated;
-- Schema releases: SELECT ONLY for authenticated admins (RLS gated)
GRANT SELECT                                         ON TABLE public.schema_releases TO authenticated;

-- Explicit server-side service_role grants (audit_logs strictly append-only even for service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.academies,
  public.user_profiles,
  public.academy_memberships,
  public.permissions,
  public.role_permissions,
  public.membership_invites,
  public.schema_releases
TO service_role;

REVOKE ALL ON TABLE public.audit_logs FROM service_role;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Enable AND FORCE Row-Level Security on Every Foundational Table
-- -----------------------------------------------------------------------------
ALTER TABLE public.academies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academies            FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles        FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.academy_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_memberships  FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions          FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions     FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.membership_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_invites   FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.schema_releases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_releases      FORCE  ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Authoritative Live-DB Security Helper Functions (SECURITY DEFINER)
-- -----------------------------------------------------------------------------

-- Checks live DB state: academy active + user_profile active + membership active (+ optional role filter)
CREATE OR REPLACE FUNCTION public.auth_is_active_member(
  p_academy_id uuid,
  p_roles text[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_memberships m
    INNER JOIN public.user_profiles u
      ON u.user_id = m.user_id
    INNER JOIN public.academies a
      ON a.id = m.academy_id
    WHERE m.academy_id = p_academy_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND u.status = 'active'
      AND a.status = 'active'
      AND (p_roles IS NULL OR m.role = ANY(p_roles))
  );
$$;

-- Checks whether caller holds a specific permission in an active academy via live DB rows
CREATE OR REPLACE FUNCTION public.auth_has_permission(
  p_academy_id uuid,
  p_permission_code text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_memberships m
    INNER JOIN public.user_profiles u
      ON u.user_id = m.user_id
    INNER JOIN public.academies a
      ON a.id = m.academy_id
    INNER JOIN public.role_permissions rp
      ON rp.role = m.role
    WHERE m.academy_id = p_academy_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND u.status = 'active'
      AND a.status = 'active'
      AND rp.permission_code = p_permission_code
  );
$$;

-- Returns the caller's active membership ID in the specified academy (or NULL)
CREATE OR REPLACE FUNCTION public.auth_current_membership_id(p_academy_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.id
  FROM public.academy_memberships m
  INNER JOIN public.user_profiles u
    ON u.user_id = m.user_id
  INNER JOIN public.academies a
    ON a.id = m.academy_id
  WHERE m.academy_id = p_academy_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND u.status = 'active'
    AND a.status = 'active'
  LIMIT 1;
$$;

-- Checks whether caller has ANY active academy membership (used for read-only permission catalog)
CREATE OR REPLACE FUNCTION public.auth_has_any_active_membership()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_memberships m
    INNER JOIN public.user_profiles u
      ON u.user_id = m.user_id
    INNER JOIN public.academies a
      ON a.id = m.academy_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND u.status = 'active'
      AND a.status = 'active'
  );
$$;

-- Checks whether caller is authorized to read another user's profile (shared academy + memberships.read)
CREATE OR REPLACE FUNCTION public.auth_can_read_profile(p_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (auth.uid() IS NOT NULL AND p_target_user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.academy_memberships target_m
      WHERE target_m.user_id = p_target_user_id
        AND public.auth_has_permission(target_m.academy_id, 'memberships.read')
    );
$$;

-- Server-side internal audit writer (NEVER granted to anon or authenticated!)
CREATE OR REPLACE FUNCTION public.internal_write_audit_log(
  p_academy_id uuid,
  p_actor_user_id uuid,
  p_actor_role text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    academy_id,
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_academy_id,
    p_actor_user_id,
    p_actor_role,
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Explicitly authorized server-side workflow for changing another member's status or role.
-- Enforces:
--   - Caller must hold 'memberships.manage' in p_academy_id (checked live in DB)
--   - Target membership must belong to p_academy_id (cross-academy rejected)
--   - Caller CANNOT modify their own role or suspend/reactivate themselves
--   - Increments user_profiles.auth_version for session invalidation traceability
--   - Atomically records an immutable audit_logs entry
CREATE OR REPLACE FUNCTION public.admin_update_membership(
  p_academy_id uuid,
  p_target_membership_id uuid,
  p_new_status text DEFAULT NULL,
  p_new_role text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS public.academy_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_role text;
  v_target public.academy_memberships%ROWTYPE;
  v_updated public.academy_memberships%ROWTYPE;
  v_effective_status text;
  v_effective_role text;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.auth_has_permission(p_academy_id, 'memberships.manage') THEN
    RAISE EXCEPTION 'Forbidden: caller lacks memberships.manage permission in this academy.'
      USING ERRCODE = '42501';
  END IF;

  SELECT m.role INTO v_caller_role
  FROM public.academy_memberships m
  WHERE m.academy_id = p_academy_id
    AND m.user_id = v_caller_uid
    AND m.status = 'active'
  LIMIT 1;

  SELECT * INTO v_target
  FROM public.academy_memberships
  WHERE id = p_target_membership_id
    AND academy_id = p_academy_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target membership not found in the specified academy.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Prevent self-escalation, self-suspension, or self-reactivation
  IF v_target.user_id = v_caller_uid THEN
    RAISE EXCEPTION 'Forbidden: users cannot modify their own membership role or status.'
      USING ERRCODE = '42501';
  END IF;

  v_effective_status := COALESCE(p_new_status, v_target.status);
  v_effective_role   := COALESCE(p_new_role, v_target.role);

  IF v_effective_status NOT IN ('invited', 'active', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'Invalid membership status: %', v_effective_status USING ERRCODE = '22023';
  END IF;

  IF v_effective_role NOT IN ('academy_admin', 'receptionist', 'teacher', 'student', 'parent') THEN
    RAISE EXCEPTION 'Invalid membership role: %', v_effective_role USING ERRCODE = '22023';
  END IF;

  UPDATE public.academy_memberships
  SET
    status       = v_effective_status,
    role         = v_effective_role,
    suspended_at = CASE WHEN v_effective_status = 'suspended' THEN now() ELSE suspended_at END,
    revoked_at   = CASE WHEN v_effective_status = 'revoked'   THEN now() ELSE revoked_at   END
  WHERE id = v_target.id
    AND academy_id = p_academy_id
  RETURNING * INTO v_updated;

  -- Increment auth_version whenever role or status changes to support session invalidation
  IF v_effective_status IS DISTINCT FROM v_target.status
     OR v_effective_role IS DISTINCT FROM v_target.role THEN
    UPDATE public.user_profiles
    SET auth_version = auth_version + 1
    WHERE user_id = v_target.user_id;
  END IF;

  PERFORM public.internal_write_audit_log(
    p_academy_id,
    v_caller_uid,
    v_caller_role,
    'MEMBERSHIP_UPDATED',
    'academy_membership',
    v_updated.id::text,
    jsonb_build_object(
      'target_user_id', v_target.user_id,
      'previous_status', v_target.status,
      'new_status', v_updated.status,
      'previous_role', v_target.role,
      'new_role', v_updated.role,
      'reason', COALESCE(p_reason, '')
    )
  );

  RETURN v_updated;
END;
$$;

-- Restrict function execution grants explicitly
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_user_profiles_immutable_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_membership_invites_transitions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_audit_logs_mutation() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.auth_is_active_member(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_has_permission(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_current_membership_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_has_any_active_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_can_read_profile(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_write_audit_log(uuid, uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_membership(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.auth_is_active_member(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_current_membership_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_has_any_active_membership() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_can_read_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_membership(uuid, uuid, text, text, text) TO authenticated, service_role;
-- internal_write_audit_log is strictly server-only (service_role)
GRANT EXECUTE ON FUNCTION public.internal_write_audit_log(uuid, uuid, text, text, text, text, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Row-Level Security Policies (Default-Deny; Explicit Per-Action Policies)
-- -----------------------------------------------------------------------------

-- 4.1 academies
CREATE POLICY academies_select_active_member
  ON public.academies
  FOR SELECT
  TO authenticated
  USING (public.auth_is_active_member(id));

CREATE POLICY academies_update_manage
  ON public.academies
  FOR UPDATE
  TO authenticated
  USING (public.auth_has_permission(id, 'academy.manage'))
  WITH CHECK (public.auth_has_permission(id, 'academy.manage'));

-- 4.2 user_profiles
CREATE POLICY user_profiles_select_self_or_academy_admin
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.auth_can_read_profile(user_id));

CREATE POLICY user_profiles_update_self_only
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'active'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'active'
  );

-- 4.3 academy_memberships (Read-only via direct PostgREST; mutations via audited RPC/service_role)
CREATE POLICY academy_memberships_select_self_or_admin
  ON public.academy_memberships
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'active')
    OR public.auth_has_permission(academy_id, 'memberships.read')
  );

-- 4.4 permissions & role_permissions (Read-only catalog for active authenticated members)
CREATE POLICY permissions_select_active_member
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (public.auth_has_any_active_membership());

CREATE POLICY role_permissions_select_active_member
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (public.auth_has_any_active_membership());

-- 4.5 membership_invites (Strictly academy-scoped to invites.read / invites.manage)
CREATE POLICY membership_invites_select_authorized
  ON public.membership_invites
  FOR SELECT
  TO authenticated
  USING (public.auth_has_permission(academy_id, 'invites.read'));

CREATE POLICY membership_invites_insert_authorized
  ON public.membership_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_has_permission(academy_id, 'invites.manage')
    AND status = 'pending'
    AND accepted_by_user_id IS NULL
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND created_by_membership_id = public.auth_current_membership_id(academy_id)
  );

CREATE POLICY membership_invites_update_revoke_authorized
  ON public.membership_invites
  FOR UPDATE
  TO authenticated
  USING (
    public.auth_has_permission(academy_id, 'invites.manage')
    AND status = 'pending'
  )
  WITH CHECK (
    public.auth_has_permission(academy_id, 'invites.manage')
    AND status = 'revoked'
  );

-- 4.6 audit_logs (Academy-scoped read only for audit_logs.read; zero direct writes)
CREATE POLICY audit_logs_select_authorized
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.auth_has_permission(academy_id, 'audit_logs.read'));

-- 4.7 schema_releases (Read-only for active academy admins)
CREATE POLICY schema_releases_select_admin
  ON public.schema_releases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.academy_memberships m
      WHERE m.user_id = auth.uid()
        AND public.auth_has_permission(m.academy_id, 'academy.manage')
    )
  );

-- Record migration release
INSERT INTO public.schema_releases (version, stage, description)
VALUES (
  '20260101000002',
  'A2.1',
  'Foundational default-deny grants, FORCE RLS, authoritative live-DB membership/permission SECURITY DEFINER helpers, audited membership update workflow, and foundational RLS policies.'
);

COMMIT;
