# Cloud Portal Roadmap

## Current Phase

- Cloud dashboard is protected by token-based read/write access.
- Public customer report URLs remain open by unguessable report token.
- Cloud Commands are queued in Cloudflare and executed by the local Windows bridge.
- Audit events are recorded for report views/downloads, sync pushes, artifact uploads, bridge status changes, and command lifecycle events.
- Cloud mirror drilldowns exist for Cora runs, ranking snapshots, and entity sets.
- Client workspace drilldowns tie together keywords, runs, reports, snapshots, targets, jobs, content plans, and entity activity.
- Entity Explorer run drilldowns expose parsed entities, LSI keywords, related keywords, questions, topics, summary, errors, and raw response preview.
- Cora run drilldowns include worksheet row exploration for synced `sheet_rows` and optional `workbook_rows`.
- Cloud Commands can request local data sync and report artifact sync through the bridge.

## Report Portal

- Improve the Cora Reports index with client, keyword, report level, created date, file counts, public report links, and XLSX links.
- Keep public reports shareable at `/share/report/{token}`.
- Keep source XLSX downloads available at `/share/report/{token}/download`.
- Preserve report metadata needed for later permissions: client, project, run, report level, created date, and report token.

## Data Parity

- Cora run drilldowns expose recommendations, SERP rows, LSI keywords, and sheet summaries.
- Ranking Snapshot drilldowns expose ranking keywords, ranking pages, and optimization targets.
- Entity Set drilldowns expose selected terms and source metadata.
- Entity Explorer run drilldowns expose each model's parsed extraction payload.
- Client workspaces expose each client's synced operational data in one place.
- Worksheet row exploration exposes synced Cora sheet data from run drilldowns.
- Cloud Actions can queue local mirror sync and report artifact uploads.
- Remaining parity work: local UI structure matching and broader cloud actions for paid/tool execution.

## User And Admin Management

Planned progression:

1. Replace shared dashboard tokens with email-based user accounts.
2. Add admin invitations and role assignment.
3. Add roles for owner, admin, analyst, client viewer, and report-only viewer.
4. Add client-level access rules so users only see assigned clients and reports.
5. Expand audit logs from token-level actors to real user/email actors after account management exists.
6. Add account recovery and user deactivation.

## Permission Model Draft

Future tables or equivalents:

- `users`: email, name, status, created_at, last_login_at.
- `roles`: role key and permission bundle.
- `user_roles`: user to global role assignments.
- `client_memberships`: user to project/client access with role.
- `report_access`: optional explicit report grants for external viewers.
- `audit_events`: actor, action, object type, object id, IP/user agent, timestamp, metadata.

Until this is implemented, keep `READ_TOKEN`, `ADMIN_TOKEN`, and `SYNC_TOKEN` separate in Cloudflare secrets.
