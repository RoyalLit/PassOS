# PassOS Developer Setup

This guide will help you get PassOS running on your local machine.

## 📋 Prerequisites

- **Node.js**: v20+ recommended.
- **Supabase Account**: You'll need a project for Auth, Database, and Storage.
- **npm/pnpm/yarn**: Any modern package manager.

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd passos
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env.local
   ```
   *Note: If .env.example doesn't exist, use the reference below.*

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🔐 Environment Variables Reference

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon/Public key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** Service Role key for admin actions (bypass RLS). |
| `PASS_SIGNING_SECRET` | Secret string for HMAC/JWT signing of QR codes. |
| `APPROVAL_TOKEN_SECRET` | Secret for generating parent approval links. |
| `CLAUDE_API_KEY` | (Optional) For AI risk analysis features. |
| `N8N_WEBHOOK_BASE_URL` | URL of your n8n instance for webhooks. |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app (e.g., `http://localhost:3000`). |

## 🏢 SaaS & Multi-Tenancy Setup

PassOS is a native multi-tenant platform. Each university/campus environment is isolated via a `tenant_id`. 

To set up a local testing environment:
1. Ensure your `.env.local` contains a valid `SUPABASE_SERVICE_ROLE_KEY`.
2. Use the database migrations to initialize the core schema.
3. For multi-tenant testing, ensure your test users are assigned a valid `tenant_id` in the `profiles` table.

## 🗄️ Database Setup

PassOS uses Supabase Migrations. To set up your schema:

1. Install the Supabase CLI.
2. Link your project: `supabase link --project-ref <your-ref>`.
3. Apply migrations: `supabase db push`.

### Critical Migrations
- `001_initial_schema`: Core tables and RLS.
- `011_tenants_schema`: Multi-tenancy support (adds `tenant_id`).
- `022_warden_escalation`: Adds the Warden role and escalation logic.
- `029_superadmin_rls`: Hardens security for the Superadmin layer.
- `042_allow_warden_approver`: Updates database constraints for Warden approvals.

## 🧪 Testing QR Scanning

To test the Guard scanner locally without a physical camera:
1. Navigate to the Guard portal.
2. Use a tool like `Postman` or `Bruno` to hit `/api/scan` with a valid JWT payload.
3. You can generate a test payload by requesting a pass as a student and copying the JWT from the QR display.
