# Feature Parity Discipline

The On Page Optimization System has two user-facing surfaces:

- Local Windows dashboard: controls Cora and local machine workflows.
- Cloudflare dashboard: mirrors the client/tool workflow and runs cloud-safe tools.

No new feature is complete until both surfaces are accounted for. A feature can still be local-only or cloud-only at the execution layer, but the user workflow, data model, and sync behavior must be explicit.

## Completion Rule

For every feature or workflow change, define these items before calling it done:

| Area | Required decision |
|---|---|
| Local UI | Implemented, unchanged by design, or explicitly not applicable |
| Cloud UI | Implemented, unchanged by design, or explicitly not applicable |
| Local API/backend | Implemented, compatible with existing route, or explicitly not applicable |
| Cloud API/backend | Implemented, compatible with existing route, or explicitly not applicable |
| Data ownership | Which side owns the source of truth |
| Sync | Local to cloud, cloud to local, bidirectional, bridge queued, or none |
| Execution | Local machine, cloud Worker/API, third-party API, or hybrid |
| Tests/smoke | Local test, cloud smoke, route check, or documented manual verification |
| Handoff | Updated when behavior, deploy steps, or known gaps change |

## Feature Template

Use this checklist when starting or reviewing a feature:

```text
Feature:
User workflow:
Local UI files:
Cloud UI files:
Local routes/APIs:
Cloud routes/APIs:
Storage:
Sync direction:
Execution location:
Auth/security:
Error states:
Tests/smoke:
Known gaps:
Release notes:
```

## Execution Patterns

### Local-only execution, mirrored workflow

Use this for Cora because Cora is Windows-only and depends on the local desktop app.

- Local dashboard can run directly against local Cora.
- Cloud dashboard should present the same workflow and queue the command through the bridge.
- Cloud UI must clearly indicate the run happens on the remote/local Cora machine.
- Command Review remains admin/debug, not the primary user path.

### Cloud-native execution, mirrored workflow

Use this for API-backed tools such as Ranking Snapshot and Entity Explorer.

- Local and cloud should expose the same client/tool workflow.
- Cloud executes through Worker/API routes.
- Local can execute through local routes or call the same provider APIs.
- Results should use compatible normalized shapes so reports and client views do not fork.

### Mirrored data

Use this for clients, keywords, reports, entity sets, optimization targets, and planning data.

- Create, update, and delete behavior must be defined on both sides.
- Prevent cross-client writes unless the user intentionally copies/imports data.
- Prefer shared IDs or stable external keys so sync does not duplicate records.
- Record source and timestamps where conflicts are possible.

## Acceptance Checklist

Before finishing a feature:

- Local user path works or is explicitly marked not applicable.
- Cloud user path works or is explicitly marked not applicable.
- Local and cloud labels, menu placement, and workflow names match.
- Data shapes are compatible across local and cloud.
- Sync direction and conflict behavior are documented.
- Cora-specific work uses the bridge when initiated from cloud.
- API credentials remain in the existing secret/config system.
- Errors are visible where the user is working, not only in admin/debug views.
- Smoke or targeted tests cover the changed path.
- `HANDOFF.md` is updated if the next engineer needs to know about the change.

## Current Parity Watchlist

These areas need active parity checks during upcoming phases:

- Cora run workflow: cloud has been aligned to the local-style run page; verify local stays equally simple.
- Entity Explorer: cloud has provider/model selectors, direct run status, inline Entity Crossover save workflow, and Entity Set storage/sync defaults; next check is a real bridge pull of cloud-created Entity Sets.
- Ranking Snapshot: cloud has direct run status, recent snapshot panels, comparison, snapshot detail, and Save Optimization Targets; next check is a real bridge pull of cloud-created ranking targets.
- Cora Profiles: local/Cora bridge is the source of truth today; cloud needs a clean attach/edit workflow when profile management moves further into the dashboard.
- Reports: Cora Reports should be available from both surfaces, with report storage and share URLs handled consistently.
- Users/admin: planned future cloud feature; local impact and permissions model need to be defined before implementation.
