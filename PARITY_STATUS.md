# Local / Cloud Parity Status

Date: 2026-06-07

## Status

Core local/cloud parity is verified for the current product surface.
The first hardening pass after parity has also shipped to production.

The app is not two separate codebases. The local dashboard and Cloudflare dashboard have separate runtimes, but they share the same product model:

- Client-first workflow.
- Tool pages in matching navigation groups.
- Compatible table/data shapes.
- Bridge-based execution for Windows-only Cora actions.
- Cloud/API execution for cloud-safe tools.
- Shared report metadata and public Cloudflare report delivery.
- Non-disruptive inline status refresh on cloud tool pages.
- Local/cloud customer report archive paths through `share_reports.revoked_at`.

## Verified End To End

| Area | Result |
|---|---|
| Cloud dashboard auth smoke | Passed |
| Cora run from cloud | Passed through local bridge and native Cora |
| Cora profile CRUD/apply/push | Passed |
| Cora Domain Lists CRUD/apply/pull | Passed |
| Cora report artifact sync | Passed |
| Ranking Snapshot synthetic parity | Passed |
| Entity Explorer / Entity Set synthetic parity | Passed |
| Customer report attachment rendering | Passed |
| Live DataForSEO Ranking Snapshot | Passed |
| Live LLM Entity Explorer | Passed |
| Cloud-to-local sync for paid/API results | Passed |
| Public report URL and XLSX download | Passed |
| Inline cloud tool status refresh | Passed by smoke/static verification |
| Local/cloud customer report archive controls | Implemented; route/static checks passed |
| Report template level differentiation | Implemented in local renderer and served through cloud artifacts |

Latest live proof:

- Client: `2` / Radio Mobile
- Ranking Snapshot: `9`
- Ranking rows: `25` keywords, `20` pages
- Optimization Target: `7`
- Entity Batch: `13`
- Entity Set: `4`
- Report: `18`
- Public URL: `https://onpage.localblitz.io/share/report/31225ea3c4b64b53a34907b30863b4d9`

## Intentional Differences

- Cora itself remains local Windows-only.
- Cloud Cora runs, native Cora profile actions, and native Cora Domain List actions go through the local bridge.
- Ranking Snapshot and Entity Explorer can run in Cloudflare because they use external APIs and normalized storage.
- Cloud report creation stores metadata immediately; local dashboard renders/uploads HTML and XLSX artifacts because the source Cora XLSX lives locally.
- Command Review is admin/debug. Normal workflows should start from Clients or the tool pages.

## Routine Verification

Run these after ordinary UI, sync, report, or bridge changes:

```powershell
Set-Location "D:\CC-Cora 7.2\cloudflare"
npm run smoke:cloud:auth
npm run smoke:cloud:admin
npm run verify:cora-domain-bridge
npm run verify:cora-profile-bridge
npm run verify:cora-report-artifacts
npm run verify:ranking-entity-parity
```

Run these only when real Cora/API spend is acceptable:

```powershell
npm run verify:cloud-cora-run
npm run verify:live-paid-tools
```

## Remaining Product Work

Parity is no longer the main blocker. The next work should continue product hardening:

- Local user/admin impact and permissions model after cloud email/admin is stabilized.
- Conflict handling for bidirectional edits.
- Cleanup/archive policy for old ranking/entity verification rows and stale report artifacts beyond report metadata revocation.
- More visual polish for report templates by level: Basic, Medium, Comprehensive.
- Broader live paid/API matrix across more providers when spend is acceptable.
