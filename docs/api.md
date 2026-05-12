# PassOS API Reference

This document outlines the core internal API endpoints used by the PassOS frontend and external integrations.

## 🔐 Authentication
All API requests (except public auth) require a valid Supabase JWT in the `Authorization` header.

```http
Authorization: Bearer <token>
```

---

## 🎫 Pass Management

### `POST /api/pass/request`
Submit a new gatepass request.
- **Roles**: `student`
- **Body**:
  ```json
  {
    "type": "day_outing",
    "reason": "Medical appointment",
    "departure_at": "2026-05-12T10:00:00Z",
    "return_at": "2026-05-12T18:00:00Z"
  }
  ```

### `GET /api/pass/active`
Retrieve the current active signed pass for the authenticated student.
- **Roles**: `student`

---

## 🔍 Security & Scanning

### `POST /api/scan`
The primary endpoint for the Guard Terminal to verify a QR code.
- **Roles**: `guard`
- **Body**:
  ```json
  {
    "payload": "<signed-jwt-from-qr>"
  }
  ```
- **Logic**:
    1. Verifies the JWT signature using `PASS_SIGNING_SECRET`.
    2. Checks if the `pass_id` is valid and the student is in the correct state (e.g., cannot "Exit" if already "Outside").
    3. Calls the `process_scan` RPC to atomically update state and log the event.

---

## 👥 Multi-Tenancy Headers
For system-level actions, the `X-Tenant-ID` header may be required if not implicitly derived from the user's profile.

---

## 🛠️ Error Codes
PassOS uses standardized error responses:

| Status | Code | Description |
| :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | Token missing or expired. |
| `403` | `FORBIDDEN` | Role insufficient for this action. |
| `422` | `VALIDATION_FAILED` | Input data failed Zod schema check. |
| `409` | `STATE_CONFLICT` | Invalid transition (e.g., scanning out while already outside). |
