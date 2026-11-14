# TuitionOS Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every document inside `/institutes/{instituteId}/*` MUST carry `instituteId == instituteId` matching its parent path, and the parent `/institutes/{instituteId}` document MUST exist and not be suspended for tenant writes.
2. **Role Authority**: User roles (`super_admin`, `institute_admin`, `receptionist`, `lecturer`, `student`) are stored exclusively in `/users/{uid}`. Users CANNOT self-assign `super_admin`, `institute_admin`, `receptionist`, or `lecturer` privileges, nor change their own `role` or `instituteId` on profile creation or update.
3. **Bootstrapped Super Admin**: Only `apekollek@gmail.com` with `request.auth.token.email_verified == true` holds Super Admin platform authority over `/institutes`, `/onboardingRequests`, and `/auditLogs`.
4. **Verified Users & Server Timestamps**: Every authenticated write requires `request.auth.token.email_verified == true`, `createdAt == request.time` on creation, and `updatedAt == request.time` on update. Immutable fields (`instituteId`, `createdAt`, `studentId`, `paymentId`, etc.) cannot be mutated after creation.
5. **Financial Ledger Integrity**: `feePayments` are append-only receipts; `amountLkr`, `lecturerShareLkr`, and `instituteShareLkr` must be non-negative numbers with `lecturerShareLkr + instituteShareLkr <= amountLkr + 1` (accounting for rounding).
6. **PII Isolation**: Student phone numbers, parent phone numbers, NICs, and PINs are readable only by verified staff belonging to the exact same `instituteId` (or the linked student/parent owner).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Read**: User belonging to `inst-a` attempts `get` or `list` on `/institutes/inst-b/students`. Expected: `PERMISSION_DENIED`.
2. **Cross-Tenant Write Spoofing**: User belonging to `inst-a` attempts `create` on `/institutes/inst-a/students/s1` with `instituteId: "inst-b"`. Expected: `PERMISSION_DENIED`.
3. **Self-Assigned Super Admin**: New user creates `/users/{uid}` with `role: "super_admin"`. Expected: `PERMISSION_DENIED`.
4. **Role Escalation Update**: Receptionist updates `/users/{uid}` changing `role` from `"receptionist"` to `"institute_admin"`. Expected: `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: Admin creates a student with extra undocumented field `isFreeForever: true`. Expected: `PERMISSION_DENIED` via `hasOnly()`.
6. **Email Verification Spoof**: Token has `email: "apekollek@gmail.com"` with `email_verified: false` attempting to list `/institutes`. Expected: `PERMISSION_DENIED`.
7. **ID Poisoning / 1MB String**: Attacker passes a 1,500-character document ID or 500KB `fullName`. Expected: `PERMISSION_DENIED` via `isValidId()` and `.size()` bounds.
8. **Timestamp Tampering**: Client submits `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()`. Expected: `PERMISSION_DENIED` via `createdAt == request.time`.
9. **Orphaned Subcollection Record**: Attempt to create a student under `/institutes/non-existent-id/students/s1`. Expected: `PERMISSION_DENIED` via `exists(/institutes/$(instituteId))`.
10. **Financial Ledger Mutation**: Staff attempts `update` or `delete` on `/institutes/inst-a/feePayments/pay-1` to alter `amountLkr`. Expected: `PERMISSION_DENIED` (immutable ledger).
11. **Public Onboarding Status Spoof**: Unauthenticated visitor submits `/onboardingRequests/req-1` with `status: "approved"`. Expected: `PERMISSION_DENIED` (`status == 'pending'` enforced).
12. **PII Blanket List**: Unauthenticated or cross-tenant user executes `list` on `/users` or `/institutes/inst-a/students`. Expected: `PERMISSION_DENIED`.

## 3. Verification Test Reference (`firestore.rules.test.ts`)
Verified against Firestore Security Rules emulator assertions ensuring all 12 Dirty Dozen payloads return `PERMISSION_DENIED` while legitimate tenant-scoped operations succeed.
