# On Page Optimization System Dashboard

Local database and dashboard for on-page SEO analysis, beginning with Cora report ingestion.

## What It Does

- Archives raw Cora `.xlsx` reports under `data/archive/`.
- Stores run metadata in SQLite at `data/cora_runs.sqlite3`.
- Imports SERP results, tuning recommendations, LSI keywords, and selected raw sheet rows.
- Captures every non-empty row from every workbook sheet in `workbook_rows`.
- Organizes analysis under projects, sites, pages, and keywords.
- Opens on an overview tab for project, run, job, workbook, and API-key status.
- Adds a Content Planner tab for planned page updates, briefs, and new content.
- Keeps Cora features in a dedicated dashboard tab.
- Compares two imported Cora runs to show target rank movement, SERP changes, recommendation changes, and LSI changes.
- Adds a manual Force Stop Cora control and a managed-run watchdog for frozen Cora status.
- Stores API keys for future AI vendors and SEO data tools with masked display in the UI.
- Starts Cora jobs through the local Cora API and watches for the generated report.
- Pushes structured dashboard data to a Cloudflare Worker/D1 endpoint when configured.
- Serves a local dashboard at `http://127.0.0.1:9191/`.

## Start

Double-click:

```bat
start-dashboard.bat
```

Then open:

```text
http://127.0.0.1:9191/
```

## Import A Report

From the dashboard, click **Import Latest Report**.

Or from a terminal:

```bat
python app.py ingest "C:\Users\simon\san_diego_pools_goog_260527_C_US_L_EN_M3P1AS_GMW.xlsx" "https://www.sandiegopools.com/"
```

## Start A Managed Cora Run

1. Make sure `SEO Correlation Tool 2026` is already open.
2. Open the dashboard.
3. Use **Run Manager** in the left panel.
4. Enter a keyword and target URL/domain.
5. Click **Start Cora Run**.

The dashboard submits this workflow to Cora:

```text
search {keyword}; track domain {target_domain}; click get data
```

It then watches the user folder for the matching Cora `.xlsx`, waits until the file is stable, archives it, and imports it into SQLite.

Managed runs also watch Cora's status. If the status signature does not change for 10 minutes while Cora still reports itself as running, the dashboard sends Cora's stop command and marks the job as stopped. Set `CORA_FREEZE_SECONDS` before starting the dashboard to tune that threshold.

## Current Imported Run

The initial database contains:

- Project: `San Diego Pools`
- Site: `sandiegopools.com`
- Page: `https://www.sandiegopools.com/`
- Keyword: `san diego pools`
- Target: `https://www.sandiegopools.com/`
- SERP rows: `61`
- Recommendation rows: `284`
- Complete raw workbook rows: `16,644`
- Raw report archive: `data/archive/2026-05-27/5f98c6e37e7c/`

## Backfill Complete Workbook Rows

For older imported runs:

```bat
python app.py backfill-workbook
```

## Push To Cloudflare

Deploy the Worker in `../cloudflare/`, then set:

```powershell
$env:CLOUDFLARE_SYNC_URL = "https://YOUR-WORKER.workers.dev"
$env:CLOUDFLARE_SYNC_TOKEN = "same-token-set-in-cloudflare"
```

Preview what would sync:

```powershell
python app.py cloudflare-sync --dry-run
```

Push structured data:

```powershell
python app.py cloudflare-sync
```

Push generated customer report HTML and source XLSX files to R2:

```powershell
python app.py cloudflare-artifacts-sync --dry-run
python app.py cloudflare-artifacts-sync
```

You can also use **Push to Cloudflare** and **Push Report Files** on the Overview screen. Synced customer reports are served by the Worker at `/share/report/{token}` and source XLSX downloads at `/share/report/{token}/download`.

Raw workbook rows are skipped by default because they can be large. To include them:

```powershell
$env:CLOUDFLARE_SYNC_WORKBOOK_ROWS = "1"
```

## Next Build Steps

- Parse content-brief fields from recommendations.
- Add a content planner and writing brief generator.
