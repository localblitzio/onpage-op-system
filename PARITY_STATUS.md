# Local / Cloud Parity Status

Date: 2026-06-05

## Status

Core local/cloud parity is verified for the current product surface.

The app is not two separate codebases. The local dashboard and Cloudflare dashboard have separate runtimes, but they share the same product model:

- Client-first workflow.
- Tool pages in matching navigation groups.
- Compatible table/data shapes.
- Bridge-based execution for Windows-only Cora actions.
- Cloud/API execution for cloud-safe tools.
- Shared report metadata and public Cloudflare report delivery.

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

Parity is no longer the main blocker. The next work should be product hardening:

- Cloud user/admin management by email.
- Conflict handling for bidirectional edits.
- Cleanup/archive policy for verification rows and old reports.
- More polished report templates by level: Basic, Medium, Comprehensive.
- Broader live paid/API matrix across more providers when spend is acceptable.
