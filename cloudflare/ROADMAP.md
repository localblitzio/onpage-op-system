# Cloud Portal Roadmap

## Current Phase

- Cloud dashboard is protected by token-based read/write access.
- Public customer report URLs remain open by unguessable report token.
- Cloud Commands are queued in Cloudflare and executed by the local Windows bridge.

## Report Portal

- Improve the Cora Reports index with client, keyword, report level, created date, file counts, public report links, and XLSX links.
- Keep public reports shareable at `/share/report/{token}`.
- Keep source XLSX downloads available at `/share/report/{token}/download`.
- Preserve report metadata needed for later permissions: client, project, run, report level, created date, and report token.

## User And Admin Management

Planned progression:

1. Replace shared dashboard tokens with email-based user accounts.
2. Add admin invitations and role assignment.
3. Add roles for owner, admin, analyst, client viewer, and report-only viewer.
4. Add client-level access rules so users only see assigned clients and reports.
5. Add audit logs for login, report views, command creation, command resets, sync pushes, and bridge execution.
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
