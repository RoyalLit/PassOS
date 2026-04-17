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
> **Current Configuration: Enabled Multi-Tenant SaaS**
> PassOS is fully configured for multi-university deployments. Isolation is enforced at the database level using `tenant_id` and Row Level Security (RLS).

- **Status**: The `tenant_id` column is **Required** and enforced on all core tables.
- **System Tenant**: The `__system__` tenant slug is reserved for platform-level management. Users belonging to this tenant can manage global configurations and monitor platform-wide metrics.
- **RLS Enforcement**: Every query includes an implicit filter on `tenant_id` based on the user's authenticated session, ensuring robust multi-tenant isolation.

## 🛡️ Row Level Security (RLS) Policies

PassOS uses fine-grained RLS to ensure data privacy and tenant isolation.

### 👤 Profiles
- **Users**: Can read and update their own profile.
- **Wardens**: Can read profiles of students in their assigned hostels.
- **Admins**: Can read/create/update all profiles within their own tenant.

### 🎫 Passes & Requests
- **Students**: Can only see their own requests and active passes.
- **Parents**: Can only see requests linked to their specific ward's ID.
- **Wardens/Admins**: Can manage requests based on their geographical or organizational boundaries.

### 📍 Student States
- **Authenticated**: Logged-in users can read student states for their own university directory.
- **Update**: Restricted to `service_role` (via the `process_scan` RPC) or Admins of that specific tenant.

## ⚡ Atomic Transactions (RPCs)

### `process_scan(...)`
To prevent "double-scan" exploits, the system uses a PostgreSQL RPC that handles validation, logging, and state updates in a single atomic transaction within the correct tenant context.

## 📋 Warden Schema Extension

| Table | Description | Primary Key | Key Relationships |
| :--- | :--- | :--- | :--- |
| `wardens` | Links a profile to a specific geographical area (Hostel) | `id` (UUID) | `profile_id` -> `profiles.id` |

This table allows a single user to be a Warden for multiple hostels/blocks if required.
