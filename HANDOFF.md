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
- Cloud Ranking Snapshot detail now includes a Save Optimization Targets workflow.
- Cloud can persist selected ranking pages to Saved Targets through `/api/optimization-targets`.
- Cloud-to-local pull sync includes ranking snapshots, ranking keyword/page rows, and ranking optimization targets by default.
- `Entity Explorer > Entity Explorer` has a direct run panel.
- `Entity Explorer > Entity Crossover` now loads the selected batch crossover table inline.
- Cloud Entity Crossover supports auto-select modes, select visible, clear, and Save Entity Set from the page.
- `Entity Explorer > Entity Sets` stores approved terms and cloud-to-local pull sync now includes `entity_sets` and `entity_set_terms`.
- Client workspace opens tool pages directly instead of routing normal users through `Command Review`.
- Cora runs queue to the local Windows bridge; the UI states that execution happens on the remote/local Cora machine.
- Ranking Snapshot and Entity Explorer run through cloud/API command paths.
- `Cora > Cora Reports` now includes a cloud-side Create Customer Report panel.
- Cloud Cora Reports can attach a Ranking Snapshot, saved Optimization Targets, and an Entity Set to report metadata.
- Cloud validates report attachments against the selected Cora run client before creating the report.
- `Cora > Cora Profiles` now includes a cloud-side Profile Setup panel.
- Cloud can create/reuse Cora profile metadata and attach a profile to a client.
- Cloud Cora Profiles can update profile metadata, detach a profile from a client, and archive a profile without deleting historical run/report references.
- Cloud Cora Profiles can queue local bridge commands to apply a profile in Windows Cora or push current Windows Cora settings into a profile.
- Local Cora Profiles now support archive behavior through the profile editor; archived profiles are hidden from normal profile lists.
- Cloud-to-local pull sync includes `profiles` by default so profile/client links mirror back locally.
- Cloud-created report metadata is immediate, but customer HTML/source XLSX artifacts still come from the local bridge/report file sync.
- Cloud reports without uploaded artifacts show `Files pending` and route the user to sync report files instead of opening a missing artifact URL.
- Inline status/progress cards exist for:
  - Cora queueing, including per-keyword status.
  - Cora Report creation.
  - Ranking Snapshot started/duplicate/failed.
  - Entity Explorer model run started/duplicate/failed.
- Duplicate cloud commands are now handled idempotently instead of surfacing D1 unique-constraint errors.
- Native push/apply into the Windows Cora app still runs through the local dashboard/bridge because it talks to the desktop Cora process.

## Latest Local Workflow State

Implemented in the parity phase:

- Local sidebar now follows the same major grouping as cloud:
  - Clients
  - Cora
  - Entity Explorer
  - Ranking
  - Planning
  - System
- Local `System > Cloud Sync` is now a dedicated page instead of being available only inside Overview.
- The local Cloud Sync page reuses the existing sync/bridge backend and includes:
  - Dry run data sync
  - Push to Cloudflare
  - Dry run report files
  - Push report files
  - Pull cloud commands
  - Auto-pull bridge toggle
  - Allow cloud Cora commands toggle
  - Allow cloud paid/API tool runs toggle
- Overview still shows the Cloudflare sync summary, but the full workflow now has a matching System page like cloud.

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
- Nav items exist for Run Cora, Ranking Snapshot, Entity Explorer, Entity Crossover, Entity Sets.
- Cora page renders.
- Cora Profiles setup panel renders, including create, attach, update, detach, archive, and local apply controls.
- Cora Reports create panel renders, including the Optimization Targets picker.
- Ranking Snapshot run button renders.
- Ranking Snapshot detail renders Save Optimization Targets and the target save button when snapshots exist.
- Entity Explorer run button renders.
- Entity Crossover page renders the inline save workflow instead of requiring a separate detail prompt.
- Entity Sets page renders saved-set context.
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

- Apply the parity checklist to the live codebase and close the next highest-impact gaps:
  - Confirm Ranking Snapshot local/cloud run and result parity.
  - Confirm real bridge execution of cloud-queued Cora profile apply/push commands.
  - Confirm real bridge generation/upload for cloud-created Cora report artifacts.
  - Verify attached Ranking Snapshot, Optimization Targets, and Entity Set metadata appear in generated customer reports.
  - Confirm cloud-to-local sync for cloud-created Ranking Targets and Entity Sets in a real bridge pull.
  - Document any intentional local-only or cloud-only execution differences.
