# Handoff: On Page Optimization System Dashboard

Date: 2026-05-30
Workspace: `D:\CC-Cora 7.2`

## Current Direction

The product is now both:

- A local Windows dashboard for controlling Cora and local data.
- A Cloudflare-hosted dashboard mirror at `https://onpage.localblitz.io/`.

The desired workflow is client-first and tool-first:

1. Select or create a client.
2. Open the tool from the sidebar or client workspace.
3. Run the tool directly from its own page.
4. See inline status/progress on that same page.
5. Keep `System > Command Review` as an admin/debug view, not the normal workflow.

## Feature Parity Rule

Use `FEATURE_PARITY.md` before calling any new feature complete. The rule is:

- Local UI, cloud UI, backend/API, data ownership, sync direction, execution location, tests, and handoff impact must all be accounted for.
- A feature may execute only locally, such as Cora, but the cloud workflow still needs a matching user path through the bridge.
- A feature may execute in the cloud, such as Ranking Snapshot or Entity Explorer, but local workflow and data compatibility still need to be reviewed.
- Do not let local and cloud become separate products. Labels, menu placement, client selection, run status, and report access should match unless a difference is intentional and documented.

## Important Paths

```text
D:\CC-Cora 7.2\On Page Optimization System Dashboard\
D:\CC-Cora 7.2\cloudflare\
D:\CC-Cora 7.2\cloudflare\src\worker.js
D:\CC-Cora 7.2\cloudflare\scripts\smoke-cloud-dashboard.mjs
D:\CC-Cora 7.2\Cora SEO Software\
```

## Cloud Production

Production URL:

```text
https://onpage.localblitz.io/
```

Worker deploy command:

```powershell
Set-Location "D:\CC-Cora 7.2\cloudflare"
npm run deploy
```

D1 binding/database:

```text
OPOS_DB
```

R2 binding:

```text
REPORTS = opos-reports
```

Git remote:

```text
https://github.com/localblitzio/onpage-op-system
```

## Latest Cloud Workflow State

Implemented:

- Cloud navigation is grouped by Clients, Cora, Entity Explorer, Ranking, Planning, System.
- `Cora > Run Cora` is a real tool page.
- `Ranking > Ranking Snapshot` has a direct run panel.
- `Entity Explorer > Entity Explorer` has a direct run panel.
- Client workspace opens tool pages directly instead of routing normal users through `Command Review`.
- Cora runs queue to the local Windows bridge; the UI states that execution happens on the remote/local Cora machine.
- Ranking Snapshot and Entity Explorer run through cloud/API command paths.
- Inline status/progress cards exist for:
  - Cora queueing, including per-keyword status.
  - Ranking Snapshot started/duplicate/failed.
  - Entity Explorer model run started/duplicate/failed.
- Duplicate cloud commands are now handled idempotently instead of surfacing D1 unique-constraint errors.

## Smoke Testing

Smoke tests are visible by default so the browser window can be observed.

```powershell
Set-Location "D:\CC-Cora 7.2\cloudflare"
npm run smoke:cloud
npm run smoke:cloud:auth
```

To force headless:

```powershell
$env:OPOS_SMOKE_HEADLESS="true"
npm run smoke:cloud
```

The smoke test supports:

- Public/locked mode with no token.
- Authenticated mode with:
  - `OPOS_SMOKE_TOKEN`
  - `OPOS_READ_TOKEN`
  - `OPOS_ADMIN_TOKEN`
  - `OPOS_SMOKE_SESSION`

We have been using a temporary D1 `cloud_users` + `cloud_sessions` row for authenticated smoke tests, then deleting it after the run. Do not print real tokens.

`npm run smoke:cloud:auth` now handles temporary D1 session setup and cleanup automatically. It does not print the generated session token.

Authenticated smoke currently checks:

- Dashboard leaves loading state.
- No unexpected browser/page errors.
- Nav items exist for Run Cora, Ranking Snapshot, Entity Explorer.
- Cora page renders.
- Ranking Snapshot run button renders.
- Entity Explorer run button renders.
- Inline status containers exist.

## Local Dashboard

Local dashboard path:

```text
D:\CC-Cora 7.2\On Page Optimization System Dashboard
```

Run:

```powershell
Set-Location "D:\CC-Cora 7.2\On Page Optimization System Dashboard"
python .\app.py
```

Open:

```text
http://127.0.0.1:9191/
```

Local Cora API:

```text
http://127.0.0.1:9090/
```

## Cora / Bridge Notes

- Cora itself remains local Windows-only.
- Cloud can queue Cora runs for the bridge.
- The bridge heartbeat shows whether Cora execution is allowed.
- Cloud Cora should behave like local Cora from the user perspective; only the execution badge/status should reveal remote bridge execution.

## Verification Checklist

After cloud Worker edits:

```powershell
Set-Location "D:\CC-Cora 7.2"
node --check cloudflare\src\worker.js
Set-Location "D:\CC-Cora 7.2\cloudflare"
npm run deploy
Set-Location "D:\CC-Cora 7.2"
Invoke-WebRequest -UseBasicParsing https://onpage.localblitz.io/ -OutFile cloudflare\live-dashboard.html
$html = Get-Content -Raw cloudflare\live-dashboard.html
$script = [regex]::Match($html, '<script>([\s\S]*?)</script>').Groups[1].Value
Set-Content -Path cloudflare\live-dashboard-script.js -Value $script
node --check cloudflare\live-dashboard-script.js
npm --prefix cloudflare run smoke:cloud
```

Delete temp live files with `apply_patch`, not shell delete.

## Git Notes

Use:

```powershell
git status --short
git log --oneline --decorate -10
```

Recent important commits:

- `16621fc` Run cloud smoke tests visibly by default
- `01962fa` Show inline cloud tool run status
- `1e6515e` Support session-based cloud smoke tests
- `c889477` Add cloud dashboard smoke test
- `e6179b6` Make cloud tool runs direct
- `61d59a0` Align cloud Cora workflow with local dashboard

## Phase Started After This Handoff

Live status refresh on the tool pages has been started:

- After queueing Cora, auto-refresh the current tool page for recent launch/job updates.
- After starting Ranking Snapshot, auto-refresh snapshots/command status.
- After starting Entity Explorer, auto-refresh batches/model runs.
- Keep refresh non-disruptive: do not re-render while the user is actively typing in inputs/textareas/selects.
- Show the user status where they already are; do not require `Command Review`.

## Next Phase

- Apply the parity checklist to the live codebase and close the highest-impact gaps:
  - Confirm Entity Explorer local/cloud workflow parity.
  - Confirm Ranking Snapshot local/cloud workflow parity.
  - Confirm Cora Reports local/cloud workflow parity.
  - Document any intentional local-only or cloud-only execution differences.
