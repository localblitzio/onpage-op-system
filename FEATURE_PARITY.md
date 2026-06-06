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

## Current Execution Matrix

| Workflow | Local Dashboard | Cloud Dashboard | Source of Truth | Sync / Bridge | Verified |
|---|---|---|---|---|---|
| Clients, sites, keywords | Local CRUD and import paths | Cloud create/reuse paths | Shared SQLite/D1 table IDs | Bidirectional sync by table | Yes |
| Cora runs | Runs native Windows Cora directly | Queues the same run through the local bridge | Local dashboard/native Cora | Cloud command -> local bridge -> local import -> cloud push | Yes |
| Cora profiles | Dashboard metadata CRUD; native apply/push through Cora API | Metadata CRUD; native apply/push queued through bridge | Dashboard metadata, native Cora for active settings | Bidirectional metadata sync; bridge for native actions | Yes |
| Cora domain lists | CRUD plus native apply/pull | CRUD plus bridge apply/pull | Dashboard rows, native Cora for active list state | Bidirectional row sync; bridge for native actions | Yes |
| Ranking Snapshot | Local API path can run DataForSEO | Cloud Worker runs DataForSEO | `ranking_snapshots` and child rows | Cloud-to-local pull and local-to-cloud push | Yes |
| Optimization Targets | Local save/update and report attach | Cloud save/update and report attach | `ranking_optimization_targets` | Bidirectional sync | Yes |
| Entity Explorer | Local API-key execution and batch storage | Cloud provider-secret execution and batch storage | `entity_lsi_batches` / `entity_lsi_runs` | Cloud-to-local pull and local-to-cloud push | Yes |
| Entity Crossover / Entity Sets | Local crossover and set storage | Cloud crossover and set storage | `entity_sets` / `entity_set_terms` | Bidirectional sync | Yes |
| Customer reports | Local renders HTML and source XLSX artifacts | Cloud creates metadata and serves uploaded artifacts | Local renderer for artifacts, cloud/R2 for public delivery | Metadata sync plus local artifact upload to R2 | Yes |
| Public report URLs | Local share routes for local use | Cloud public share URL and XLSX download | Cloud R2 object after upload | Local bridge artifact sync | Yes |
| Users/admin | Local bridge settings only | Cloud email/session/admin model started | Cloud user/session tables | Not yet a local user model | Planned |

## Intentional Differences

- Cora execution is local-only because native Cora is a Windows desktop Java/JxBrowser app. Cloud Cora actions must use the bridge.
- Native Cora profile apply/push and native Domain List apply/pull are local-only because they talk to the running Cora process on port `9090`.
- Ranking Snapshot and Entity Explorer can execute in Cloudflare because they call external APIs and store normalized rows in D1. Local execution remains available through the local dashboard for the same normalized data shapes.
- Cloud customer reports are metadata-first. The public report HTML and XLSX artifacts are generated by the local dashboard and uploaded to R2 because the source Cora XLSX lives locally.
- Command Review is an admin/debug surface. Normal client/tool work should start from the tool pages or client workspace.

## Verified Parity Suite

Use the no-spend checks for routine regression coverage:

```powershell
Set-Location "D:\CC-Cora 7.2\cloudflare"
npm run smoke:cloud:auth
npm run verify:cora-domain-bridge
npm run verify:cora-profile-bridge
npm run verify:cora-report-artifacts
npm run verify:ranking-entity-parity
```

Use these only when real Cora/API execution is intended:

```powershell
npm run verify:cloud-cora-run
npm run verify:live-paid-tools
```

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

- Keep local and cloud menu labels/tool names aligned as new pages are added.
- Keep local/cloud result schemas compatible before adding new report sections.
- Re-run `verify:cloud-cora-run` after any Cora queue/bridge/job-runner changes.
- Re-run `verify:live-paid-tools` after any DataForSEO, LLM provider, Ranking Snapshot, Entity Explorer, report attachment, or artifact sync changes.
- Users/admin: planned future cloud feature; local impact and permissions model need to be defined before implementation.
