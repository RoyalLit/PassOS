# PassOS | Multi-Tenant Campus Mobility SaaS

PassOS is a modern, production-grade gatepass management system designed for multi-university deployments. It features cryptographic pass verification, hierarchical role-based access control, and automated behavioral analytics across multiple isolated tenants.

---

## 📖 Quick Links

- [**Project Overview & Features**](./PROJECT_OVERVIEW.md)
- [**Architecture & Security Model**](./docs/architecture.md)
- [**Database & RLS Documentation**](./docs/database.md)
- [**Setup & Installation Guide**](./docs/setup.md)

---

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Env**:
   ```bash
   cp .env.example .env.local
   # Fill in values from your Supabase project
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

4. **Migrations**:
   Ensure your Supabase database is linked and run:
   ```bash
   supabase db push
   ```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Security**: jose (JWT), Zod (Validation), HMAC-SHA256, RLS.
- **Automation**: n8n, Claude AI.

---

## 📄 License

This project is proprietary. All rights reserved.
