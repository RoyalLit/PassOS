# PassOS | System Documentation & Overview

PassOS is a production-grade campus mobility and gate pass management system designed for high security, ease of use, and visual excellence.

## 📚 Documentation Index

- [**Architecture Guide**](./docs/architecture.md): Deep dive into the QR state machine and security model.
- [**Database Guide**](./docs/database.md): Schema definitions, RLS policies, and multi-tenancy status.
- [**Developer Setup**](./docs/setup.md): Environment variables, local installation, and migrations.

---

## 🚦 Project Status

> [!NOTE]
> **Multi-Tenancy**: Currently **Disabled**. The system is configured for a single university/campus environment. `tenant_id` columns are kept for future scalability but are nullable.

## 🚀 Technology Stack

### Core Framework
- **Next.js 16.2 (App Router)**: Hybrid server/client rendering with high performance.
- **React 19**: Utilizing the latest concurrent features and server components.
- **TypeScript**: Full-stack type safety.

### Backend & Infrastructure (Supabase)
- **PostgreSQL**: Robust relational database.
- **Supabase Auth**: Secure identity management and RBAC.
- **Supabase Storage**: Managed buckets for avatars and proof documents.
- **Row Level Security (RLS)**: Fine-grained data access control.

### UI & Styling
- **Tailwind CSS 4**: Modern utility-first CSS for styling and performance.
- **Framer Motion 12**: Smooth, physics-based UI animations.
- **Lucide React**: Clean, modern iconography.
- **Sonner**: High-performance toast notifications.
- **Next-themes**: Deep light/dark mode integration.

### Libraries & Tools
- **Recharts**: Data visualization and analytics charts.
- **html5-qrcode & qrcode**: QR generation and camera scanning logic.
- **Jose**: Cryptographic JWT signing for secure, tamper-proof passes.
- **Zod & React Hook Form**: Strict validation and efficient form management.
- **Date-fns**: Precise time manipulation for pass expiry and logs.

---

## 🛠️ Core Functions & Features

### 1. Multi-Platform Role Based Access Control (RBAC)
Dedicated portals for four distinct user roles, each with unique workflows and security levels.

### 2. Student Portal
- **Dashboard**: Real-time campus status (Inside/Outside/Overdue).
- **Pass Requests**: Integrated request system for Day Outings, Overnights, and Emergencies.
- **Digital Pass**: Dynamic QR-code pass with live countdown and security signature.
- **Profile Settings**: Personal details management and profile photo (Avatar) uploads.

### 3. Admin Dashboard
- **Action Center**: Centralized pending request approval system.
- **User Management**: Creating, deleting, and managing profiles for students, parents, and guards.
- **Student Directory**: Campus-wide directory with live location tracking and filtering.
- **System Analytics**: Visual charts showing pass issuance trends and system health.
- **Security Flags**: Automated fraud detection (e.g., rapid requests, late returns) with severity levels.

### 4. Guard Terminal (Security)
- **QR Scanner**: Optimized camera interface for scanning student passes.
- **Identity Verification**: Real-time student photo and profile display upon scan to prevent pass sharing.
- **Scan Logs**: Transparent history of all gate entries and exits indexed by guard and location.

### 5. Parent Portal
- **Ward Linking**: Securely link child's account using a unique Student ID.
- **Decision Engine**: Approve or reject outing requests from their dashboard with optional feedback notes.
- **Activity History**: Complete log of previous permissions and child's campus status.

### 6. Security Architecture
See the full [**Architecture Guide**](./docs/architecture.md) for technical details.
- **Tamper-Proof Passes**: QR codes are cryptographically signed using JWT (HS256) to prevent students from falsifying passes.
- **State Machine**: Prevents multiple active passes; tracks atomic transitions (Exited, Returned).
- **Geolocation Verification**: Optional GPS tagging for request validation.
