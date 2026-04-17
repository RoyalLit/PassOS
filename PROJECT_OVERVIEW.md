# PassOS | System Documentation & Overview

PassOS is a production-grade campus mobility and gate pass management system designed for high security, ease of use, and visual excellence.

## 📚 Documentation Index

- [**Architecture Guide**](./docs/architecture.md): Deep dive into the QR state machine and security model.
- [**Database Guide**](./docs/database.md): Schema definitions, RLS policies, and multi-tenancy status.
- [**Developer Setup**](./docs/setup.md): Environment variables, local installation, and migrations.

---

## 🚦 Project Status

> [!IMPORTANT]
> **Multi-Tenancy**: **Enabled**. PassOS is a native Multi-Tenant SaaS platform. It supports multiple isolated university/campus tenants within a single deployment, providing complete data residency and security for each institution.

## 🚀 Technology Stack

### Core Framework
- **Next.js 16.2 (App Router)**: Hybrid server/client rendering with high performance.
- **React 19**: Utilizing the latest concurrent features and server components.
- **TypeScript**: Full-stack type safety.

### Backend & Infrastructure (Supabase)
- **PostgreSQL**: Robust relational database with multi-tenant partitioning.
- **Supabase Auth**: Secure identity management and hierarchical RBAC.
- **Supabase Storage**: Managed buckets for avatars and proof documents.
- **Row Level Security (RLS)**: Enforced isolation between university tenants.

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
- **Zod**: Standardized schema validation for all API inputs and internal data.
- **Date-fns**: Precise time manipulation for pass expiry and logs.

---

## 🛠️ Core Functions & Features

### Hierarchical Role Based Access Control (RBAC)
Dedicated portals for specialized campus roles, enabling secure operations from university administration to gate security.

| Role | Responsibility | Portal Access |
| :--- | :--- | :--- |
| **Admin** | University-level management, analytics, and staff onboarding. | `/admin` |
| **Warden** | Hostel-level supervision, student tracking, and local approvals. | `/warden` |
| **Guard** | Gate security, QR scanning, and identity verification. | `/guard` |
| **Student** | Pass requests, digital identity, and profile management. | `/student` |
| **Parent** | Ward monitoring, linkage, and preliminary approvals. | `/parent` |

### 2. Warden Portal (Hostel Management)
- **Hostel Dashboard**: Real-time status of students assigned to specific hostel blocks.
- **Approvals**: Integrated approval queue for students under their jurisdiction.
- **Escalations**: Automated flags for overdue students or suspicious behavior.
- **Group Management**: Efficient bulk actions for hostel-wide announcements or status checks.

### 3. Student Portal
- **Dashboard**: Real-time campus status (Inside/Outside/Overdue).
- **Pass Requests**: Integrated request system for Day Outings, Overnights, and Emergencies.
- **Digital Pass**: Dynamic QR-code pass with live countdown and cryptographic security signature.
- **Profile Settings**: Personal details management and profile photo (Avatar) uploads.

### 4. Admin Dashboard
- **Action Center**: Centralized approval system with multi-level delegation for holiday and emergency passes.
- **User Management**: Creating and managing profiles for all campus staff and residents.
- **Student Directory**: Live location tracking and advanced filtering (by hostel, status, or year).
- **Compliance Reports**: Real-time summaries of campus attendance and pass usage trends.

### 5. Guard Terminal (Security)
- **QR Scanner**: High-speed camera interface optimized for gate security throughput.
- **Identity Verification**: Instant display of student photo and authorized pass details upon scan.
- **Gate Logs**: Detailed history of all entries and exits with timestamped evidence.

### 6. Parent Portal
- **Ward Linking**: Securely link child accounts using institutional verified identifiers.
- **Decision Engine**: Approve or reject outing requests with optional parental feedback.
- **Activity Monitoring**: Complete timeline of previous permissions and child's current on-campus status.

---

## 🛡️ Security & Multi-Tenancy Architecture
- **Tenant Isolation**: Strict PostgreSQL Row Level Security (RLS) ensures that data from one university is never visible to another.
- **System Tenancy**: Private platform-level configurations handle cross-university routing and data integrity.
- **API Hardening**: Every endpoint is protected by Zod schema validation and role-based middleware.
- **Tamper-Proof Passes**: Gatepasses are signed using JWT (HS256) to prevent local or digital tampering.
- **Audit Logs**: Immutable history of all critical actions indexed by tenant and user.
