# Security & Multi-Tenancy Protocols

PassOS is built on a "Security-First" architecture, ensuring that data integrity and tenant isolation are never compromised.

## 🏢 Multi-Tenant Isolation
Isolation is enforced at the lowest possible level: the Database.

- **Row Level Security (RLS)**: Every table contains a `tenant_id`. Policies are configured so that a user can *never* query or modify data belonging to another tenant.
- **Tenant Context**: The `tenant_id` is linked to the user's `profiles` entry and is automatically injected into queries by the backend middleware.

## 🕵️ Stealth Superadmin Access
To prevent brute-force and discovery attacks on the administrative layer:
- **Obfuscated Path**: The superadmin portal is not located at `/admin`. It uses a high-entropy, configurable secret path.
- **Role Blindness**: The standard `/login` page will return a generic "Invalid Credentials" even for valid superadmin accounts, preventing attackers from confirming the existence of a superadmin user.

## 🎫 Cryptographic Pass Verification
Gatepasses are not just database entries; they are cryptographically signed tokens.
- **JWT Signing**: When a pass is approved, the server generates a JWT containing the `pass_id` and `expiry`, signed with an institution-specific secret.
- **Offline Integrity**: This allows guards to verify the authenticity of a pass even if the database is momentarily unreachable (though PassOS prefers online verification for state tracking).

## 🛡️ API Hardening
- **Zod Validation**: No data enters the system without passing through a strict TypeScript schema.
- **Middleware Role Checks**: Every route is wrapped in `requireRole('role_name')` which verifies both the user's role and their tenant membership.
- **Audit Logging**: Every create, update, or delete action is logged in the `audit_logs` table with the actor's ID, IP address, and a timestamp.

---

## 📋 Security Checklist for New Features
1. [ ] Does this table have a `tenant_id` column?
2. [ ] Is there an RLS policy covering SELECT, INSERT, UPDATE, and DELETE?
3. [ ] Are all inputs validated with Zod?
4. [ ] Is the action being logged to the audit trail?
5. [ ] Does the UI check for the appropriate role before rendering the component?
