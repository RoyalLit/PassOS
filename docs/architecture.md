# PassOS Architecture Guide

This document describes the high-level architecture, security model, and core system flows of PassOS.

## 🏗️ System Overview

PassOS is a gatepass management system that uses a decentralized verification model. Passes are requested by students, approved by admins/parents, and verified by guards using cryptographically signed QR codes.

## 🔐 Security & Identity Model

### Multi-Tenant SaaS Isolation
PassOS is designed for multi-tenancy. All data is isolated using `tenant_id` and PostgreSQL Row Level Security (RLS). This ensures that university data is never leaked between organizations.

### Tamper-Proof QR Codes
PassOS uses **Compact JWTs (JSON Web Tokens)** signed with `HS256` for pass verification.
- **Payload**: Includes `pass_id`, `student_id`, `nonce`, and `valid_until`.
- **Verification**: The Guard scans the QR, and the server verifies the integrity using the tenant-specific or global `PASS_SIGNING_SECRET`.

### API Hardening
All API endpoints are protected by:
1. **Strict Zod Validation**: All inputs (body, query, params) are validated against schemas before processing.
2. **Unified Error Handling**: Standardized responses that mask internal server details while providing actionable feedback to the client.
3. **Role Enforcement**: Every request is verified via `requireRole` middleware to ensure the user has sufficient permissions for the specific tenant.

## 🔄 Pass State Machine

The system enforces a strict state machine to prevent unauthorized movements.

| State | Description | Next Possible State |
| :--- | :--- | :--- |
| `pending` | Submitted by student, awaiting Parent/Warden/Admin approval. | `active`, `rejected` |
| `active` | Fully approved and cryptographically signed. | `used_exit`, `revoked`, `expired` |
| `used_exit` | Student has scanned out. | `used_entry`, `expired` |
| `used_entry` | Student has scanned back in. Flow complete. | N/A |

## 👥 System Roles & Portals

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **Superadmin** | Global | Platform configuration, tenant creation, and system-wide audit logs. |
| **Admin** | Tenant | University-wide management, staff onboarding, and global approvals. |
| **Warden** | Hostel | Hostel-specific approvals, student tracking, and escalation management. |
| **Guard** | Gate | Real-time QR scanning and identity verification at campus gates. |
| **Student** | Personal | Requesting passes, viewing digital identity, and managing profile. |
| **Parent** | Ward | Linkage to children, preliminary pass approvals, and status monitoring. |

---

## 🛠️ Core API Flows

### 1. The Warden Approval Flow
1. **Request**: Student submits a pass request.
2. **Parent Path**: For certain pass types (e.g., Overnight), the Parent must approve first.
3. **Warden Path**: The Warden reviews the request from their specific hostel dashboard.
4. **Finalization**: For Day Outings, the Warden's approval is often sufficient. For high-risk requests, an Admin may perform final review.

### 2. Guard Scan Flow (`/api/scan`)
1. **Guard Auth**: Verified via `requireRole('guard')`.
2. **Signature Check**: `verifyQRPayload` checks for tampering and JWT expiry.
3. **Atomic Update**: Uses the `process_scan` RPC to update the student's on-campus status and log the event instantly.
