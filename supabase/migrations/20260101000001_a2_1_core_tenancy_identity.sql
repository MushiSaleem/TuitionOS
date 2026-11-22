-- =============================================================================
-- TuitionOS — Stage A2.1 Foundation Migration 0001
-- Core Tenancy, Identity, Memberships, Permissions, Invites, Audit & Releases
--
-- Scope Guardrail:
--   Contains ONLY A2.1 foundational tenancy, identity, RBAC, invitation,
--   immutable audit logging, and schema release tracking tables.
--   Zero future-stage feature tables (students, classes, payments, exams, etc.).
--   Zero hardcoded global Super Admin identities or backdoor roles.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Timestamp Maintenance Trigger Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. Academies (Physical-per-academy production DB; academy_id defense-in-depth)
-- -----------------------------------------------------------------------------
CREATE TABLE public.academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
  currency_code char(3) NOT NULL DEFAULT 'LKR'
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  timezone text NOT NULL DEFAULT 'Asia/Colombo',
  core_version text NOT NULL DEFAULT '1.0.0',
  legacy_firebase_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT academies_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT academies_slug_unique UNIQUE (slug),
  CONSTRAINT academies_legacy_firebase_id_unique UNIQUE (legacy_firebase_id)
);

CREATE TRIGGER trg_academies_set_updated_at
  BEFORE UPDATE ON public.academies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. User Profiles (Identity metadata; decoupled from tenant authorization)
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (char_length(trim(full_name)) >= 1),
  email text NOT NULL CHECK (char_length(trim(email)) >= 3),
  phone text,
  -- Migration traceability metadata ONLY. Never accepted as an auth credential or token.
  legacy_firebase_uid text,
  auth_version integer NOT NULL DEFAULT 1 CHECK (auth_version >= 1),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_profiles_legacy_firebase_uid_unique UNIQUE (legacy_firebase_uid)
);

COMMENT ON COLUMN public.user_profiles.legacy_firebase_uid IS
  'Migration traceability metadata ONLY. Must never be accepted as an authentication credential or authorization token.';

CREATE INDEX idx_user_profiles_email_lower ON public.user_profiles (lower(email));
CREATE INDEX idx_user_profiles_status ON public.user_profiles (status);

CREATE TRIGGER trg_user_profiles_set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Guard trigger: authenticated end-users may never alter privileged identity columns
-- (user_id, legacy_firebase_uid, auth_version, status, email) directly.
CREATE OR REPLACE FUNCTION public.guard_user_profiles_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.legacy_firebase_uid IS DISTINCT FROM OLD.legacy_firebase_uid
       OR NEW.auth_version IS DISTINCT FROM OLD.auth_version
       OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Modification of protected identity fields (user_id, email, legacy_firebase_uid, auth_version, status) is prohibited for application roles.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_profiles_guard_protected_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profiles_immutable_fields();

-- -----------------------------------------------------------------------------
-- 4. Academy Memberships (Authoritative tenant role & live revocation source)
-- -----------------------------------------------------------------------------
CREATE TABLE public.academy_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE RESTRICT,
  role text NOT NULL
    CHECK (role IN ('academy_admin', 'receptionist', 'teacher', 'student', 'parent')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
  invited_by uuid REFERENCES public.user_profiles(user_id) ON DELETE RESTRICT,
  joined_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Composite unique key supporting tenant-scoped composite foreign keys
  CONSTRAINT academy_memberships_academy_id_id_unique UNIQUE (academy_id, id),
  -- One authoritative membership record per user per academy
  CONSTRAINT academy_memberships_academy_user_unique UNIQUE (academy_id, user_id)
);

CREATE INDEX idx_academy_memberships_lookup
  ON public.academy_memberships (academy_id, user_id, status, role);
CREATE INDEX idx_academy_memberships_user
  ON public.academy_memberships (user_id, status);

CREATE TRIGGER trg_academy_memberships_set_updated_at
  BEFORE UPDATE ON public.academy_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Permissions & Role-Permission Matrix (Foundational RBAC Catalog)
-- -----------------------------------------------------------------------------
CREATE TABLE public.permissions (
  code text PRIMARY KEY CHECK (code ~ '^[a-z0-9_]+\.[a-z0-9_]+$'),
  domain text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  role text NOT NULL
    CHECK (role IN ('academy_admin', 'receptionist', 'teacher', 'student', 'parent')),
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (role, permission_code)
);

CREATE INDEX idx_role_permissions_permission ON public.role_permissions (permission_code);

-- Seed foundational A2.1 permissions only (no future-stage placeholder permissions)
INSERT INTO public.permissions (code, domain, description) VALUES
  ('academy.read',        'academies',   'Read basic metadata for the user''s active academy'),
  ('academy.manage',      'academies',   'Update academy settings and metadata'),
  ('memberships.read',    'memberships', 'View academy memberships and member profiles'),
  ('memberships.manage',  'memberships', 'Suspend, revoke, or change roles of other academy members'),
  ('invites.read',        'invites',     'View academy membership invitations'),
  ('invites.manage',      'invites',     'Create and revoke academy membership invitations'),
  ('audit_logs.read',     'audit',       'Read immutable academy audit logs');

INSERT INTO public.role_permissions (role, permission_code) VALUES
  -- Academy Admin (full foundational academy governance)
  ('academy_admin', 'academy.read'),
  ('academy_admin', 'academy.manage'),
  ('academy_admin', 'memberships.read'),
  ('academy_admin', 'memberships.manage'),
  ('academy_admin', 'invites.read'),
  ('academy_admin', 'invites.manage'),
  ('academy_admin', 'audit_logs.read'),
  -- Operational & learner roles (strictly minimal foundational read)
  ('receptionist',  'academy.read'),
  ('teacher',       'academy.read'),
  ('student',       'academy.read'),
  ('parent',        'academy.read');

-- -----------------------------------------------------------------------------
-- 6. Membership Invites (Expiring, Single-Use, Composite-FK Tenant Scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE public.membership_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE RESTRICT,
  email_normalized text NOT NULL
    CHECK (email_normalized = lower(trim(email_normalized)) AND char_length(email_normalized) >= 3),
  intended_role text NOT NULL
    CHECK (intended_role IN ('academy_admin', 'receptionist', 'teacher', 'student', 'parent')),
  invite_token_hash text NOT NULL CHECK (char_length(invite_token_hash) >= 32),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL,
  created_by_membership_id uuid NOT NULL,
  accepted_by_user_id uuid REFERENCES public.user_profiles(user_id) ON DELETE RESTRICT,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT membership_invites_academy_id_id_unique UNIQUE (academy_id, id),
  CONSTRAINT membership_invites_token_hash_unique UNIQUE (invite_token_hash),
  CONSTRAINT membership_invites_expiry_after_create_chk CHECK (expires_at > created_at),
  -- Composite FK: mathematically prevents an Academy A invite from referencing an Academy B creator
  CONSTRAINT membership_invites_creator_composite_fk
    FOREIGN KEY (academy_id, created_by_membership_id)
    REFERENCES public.academy_memberships (academy_id, id)
    ON DELETE RESTRICT
);

-- At most one active pending invite per (academy, email)
CREATE UNIQUE INDEX idx_membership_invites_pending_unique
  ON public.membership_invites (academy_id, email_normalized)
  WHERE status = 'pending';

CREATE INDEX idx_membership_invites_academy_status
  ON public.membership_invites (academy_id, status, expires_at);

CREATE TRIGGER trg_membership_invites_set_updated_at
  BEFORE UPDATE ON public.membership_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent tampering with immutable invite attributes or re-opening terminal invites
CREATE OR REPLACE FUNCTION public.guard_membership_invites_transitions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.academy_id IS DISTINCT FROM OLD.academy_id
     OR NEW.email_normalized IS DISTINCT FROM OLD.email_normalized
     OR NEW.intended_role IS DISTINCT FROM OLD.intended_role
     OR NEW.invite_token_hash IS DISTINCT FROM OLD.invite_token_hash
     OR NEW.created_by_membership_id IS DISTINCT FROM OLD.created_by_membership_id THEN
    RAISE EXCEPTION 'Immutable invitation fields cannot be modified.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('accepted', 'revoked', 'expired') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Terminal invitation status "%" cannot transition to "%".', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;

  -- Direct client updates from authenticated role may ONLY revoke a pending invite
  IF current_user IN ('authenticated', 'anon') THEN
    IF NOT (OLD.status = 'pending' AND NEW.status = 'revoked') THEN
      RAISE EXCEPTION 'Direct application updates on membership_invites may only revoke pending invitations.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.revoked_at IS NULL THEN
      NEW.revoked_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_membership_invites_guard
  BEFORE UPDATE ON public.membership_invites
  FOR EACH ROW EXECUTE FUNCTION public.guard_membership_invites_transitions();

-- -----------------------------------------------------------------------------
-- 7. Immutable Audit Logs (Append-Only, No Cascade Delete, No Truncate)
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES public.user_profiles(user_id) ON DELETE RESTRICT,
  actor_role text,
  action text NOT NULL CHECK (char_length(trim(action)) >= 2),
  entity_type text NOT NULL CHECK (char_length(trim(entity_type)) >= 2),
  entity_id text NOT NULL CHECK (char_length(trim(entity_id)) >= 1),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_academy_created
  ON public.audit_logs (academy_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity
  ON public.audit_logs (academy_id, entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.block_audit_logs_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is strictly append-only; % operations are prohibited.', TG_OP
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_logs_mutation();

CREATE TRIGGER trg_audit_logs_no_truncate
  BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.block_audit_logs_mutation();

-- -----------------------------------------------------------------------------
-- 8. Schema Releases (Controlled Version Traceability per Academy DB)
-- -----------------------------------------------------------------------------
CREATE TABLE public.schema_releases (
  version text PRIMARY KEY,
  stage text NOT NULL,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.schema_releases (version, stage, description)
VALUES (
  '20260101000001',
  'A2.1',
  'Core academy tenancy, identity profiles, authoritative memberships, foundational RBAC permissions, composite-FK invites, immutable audit_logs, and schema release tracking.'
);

COMMIT;
