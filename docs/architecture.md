# PassOS Architecture Guide

This document describes the high-level architecture, security model, and core system flows of PassOS.

## 🏗️ System Overview

PassOS is a gatepass management system that uses a decentralized verification model. Passes are requested by students, approved by admins/parents, and verified by guards using cryptographically signed QR codes.

## 🔐 Security & Verification Model

### Tamper-Proof QR Codes
PassOS does not rely solely on a database lookup for QR verification. Instead, it uses **Compact JWTs (JSON Web Tokens)** signed with `HS256`.

- **Signing**: When a pass is approved and viewed by a student, the server generates a JWT containing:
    - `pass_id`: UUID of the pass record.
    - `student_id`: UUID of the student.
    - `nonce`: A unique, single-use string used to prevent replay attacks.
    - `valid_until`: The expiration timestamp of the pass.
- **Verification**: The Guard's device scans the QR, sends the JWT to the `/api/scan` endpoint. The server verifies the signature using `PASS_SIGNING_SECRET`.

### Replay Attack Prevention
Every pass generation includes a `nonce`. Once a pass is scanned and processed (Exit/Entry), the nonce is recorded, and the pass status is updated in the database. 

## 🔄 Pass State Machine

The system enforces a strict flow to ensure students cannot have multiple active outings or bypass security checks.

| State | Description | Next Possible State |
| :--- | :--- | :--- |
| `pending` | Request submitted by student, awaiting approval. | `active` (Approved), `rejected` |
| `active` | Approved pass, ready for exit scan. | `used_exit`, `revoked`, `expired` |
| `used_exit` | Student has scanned out and is currently off-campus. | `used_entry`, `expired` |
| `used_entry` | Student has scanned back in. Flow complete. | N/A (History) |
| `expired` | Pass validity period has passed before use. | `used_entry` (Late Return) |
| `revoked` | Admin has cancelled the pass manually. | N/A |

## 🛠️ Core API Flows

### 1. Request Flow
1. Student submits request via `PostgreSQL` (RLS enforced).
2. Admin/Parent receives notification.
3. Approver calls an RPC or updates the row directly (depending on role).

### 2. Scan Flow (`/api/scan`)
This is the most critical logic in the system:
1. **Guard Authentication**: Verified via `requireRole('guard')`.
2. **Signature Check**: `verifyQRPayload` checks for tampering and JWT expiry.
3. **Database Check**: Fetches the pass record and student profile.
4. **State Check**: 
    - **Exit**: Denied if expired or already used.
    - **Entry**: Allowed even if expired (Late Return) to ensure student safety.
5. **Atomic Update**: Uses the `process_scan` RPC to log the scan and update the student's on-campus/off-campus status in a single transaction.

## 📡 Integrations

- **Supabase Realtime**: Used for live dashboard updates for Admins.
- **n8n**: Used for background tasks like automated parent notifications or weekly reporting.
- **Claude AI**: (Optional) Analysis of pass request patterns for fraud detection.
