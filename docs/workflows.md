# n8n Automation Workflows

PassOS uses n8n to handle background automation, alerting, and behavioral analytics. These workflows ensure the system remains proactive rather than just reactive.

## 🛠️ Included Workflows

The workflow JSON definitions can be found in the `/n8n` directory.

### 1. Daily Digest Workflow (`daily-digest-workflow.json`)
- **Trigger**: Daily at 8:00 AM.
- **Function**: Aggregates campus occupancy stats and pass usage from the previous 24 hours.
- **Output**: Sends a summary report to University Admins via email/Slack.

### 2. Overdue Alert Workflow (`overdue-alert-workflow.json`)
- **Trigger**: Every 15 minutes.
- **Function**: Queries the `student_states` table for students marked as `OUTSIDE` whose pass `valid_until` timestamp has passed.
- **Action**: 
    - Flags the student in the database.
    - Sends an immediate notification to the assigned Warden.
    - Notifies the Parent if the pass is an Overnight type.

### 3. Fraud Escalation Workflow (`fraud-escalation-workflow.json`)
- **Trigger**: Database Webhook on `fraud_flags` insert.
- **Function**: Analyzes suspicious activity (e.g., multiple entry attempts without exit).
- **Action**: Escalates to the Superadmin portal and triggers a security alert at the Guard terminal.

### 4. Parent Approval Workflow (`parent-approval-workflow.json`)
- **Trigger**: Student submits an Overnight pass request.
- **Function**: Generates a secure, one-time approval link.
- **Action**: Sends an SMS/Email to the parent with "Approve/Reject" buttons.

---

## 🚀 How to Import

1. Open your n8n instance.
2. Click **Add Workflow** -> **Import from File**.
3. Select the desired `.json` file from the `/n8n` directory.
4. Update the **Supabase Credentials** and **Webhook URLs** within the n8n nodes to match your environment.
