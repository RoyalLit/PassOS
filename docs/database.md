# PassOS Database Guide

This document details the Supabase/PostgreSQL schema, Row Level Security (RLS) policies, and the current state of multi-tenancy.

## 📊 Core Tables

| Table | Description | Primary Key | Key Relationships |
| :--- | :--- | :--- | :--- |
| `profiles` | User accounts (Student, Admin, Guard, Parent) | `id` (Auth UUID) | `parent_id` -> `profiles.id` |
| `pass_requests` | Outing/Pass applications | `id` (UUID) | `student_id` -> `profiles.id` |
| `passes` | Issued and signed gatepasses | `id` (UUID) | `request_id`, `student_id` |
| `pass_scans` | History of all gate entry/exit scans | `id` (UUID) | `pass_id`, `guard_id` |
| `student_states` | Current "live" status of a student (Inside/Outside) | `student_id` | `active_pass_id` -> `passes.id` |
| `fraud_flags` | Automated alerts for suspicious behavior | `id` (UUID) | `student_id` |
| `audit_logs` | Immutable history of data changes | `id` (UUID) | `actor_id` -> `profiles.id` |

## 🏢 Multi-Tenancy Status

> [!IMPORTANT]
> **Current Configuration: Single-Tenant (Disabled Multi-Tenancy)**
> As of Migration `016_disable_tenants.sql`, multi-tenancy is partially disabled to simplify single-campus deployments.

- **Status**: The `tenant_id` columns exist on all tables but have been modified to `DROP NOT NULL`.
- **Logic**: The application code and RLS policies currently ignore `tenant_id` checks to allow global access for admins and guards within the single deployed instance.
- **Rollback/Re-enable**: To re-enable strict multi-tenancy, re-apply the `NOT NULL` constraints and update RLS policies to enforce `tenant_id` matching (see Migration `011` for reference).

## 🛡️ Row Level Security (RLS) Policies

PassOS uses fine-grained RLS to ensure data privacy without complex backend middleware.

### 👤 Profiles
- **Users**: Can read and update their own profile.
- **Admins/Guards**: Can read all profiles for identity verification.

### 🎫 Passes & Requests
- **Students**: Can only see their own requests and active passes.
- **Admins**: Have full read/write access to all requests (for approval/rejection).
- **Guards**: Can read all passes to verify QR scans but cannot modify them.

### 📍 Student States
- **Public (Authenticated)**: All logged-in users can currently read student states (for the "Student Directory" feature).
- **Update**: Only the `service_role` (via the `process_scan` RPC) or Admins can modify states.

## ⚡ Atomic Transactions (RPCs)

### `process_scan(...)`
To prevent "double-scan" exploits where a student might try to exit twice before the first update completes, the system uses a PostgreSQL RPC.
- **Action**: It locks the `passes` row using `FOR UPDATE`, updates the status, records the scan event, and updates the student's location state (`inside`/`outside`) in a single atomic transaction.
