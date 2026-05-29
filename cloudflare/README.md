# Cloudflare Production Sync

This folder contains the Cloudflare Worker and D1 schema for pushing local dashboard data to Cloudflare.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create Cloudflare resources:

```bash
wrangler d1 create opos-production
wrangler r2 bucket create opos-reports
```

3. Copy config:

```bash
copy wrangler.toml.example wrangler.toml
```

Put the D1 database id into `wrangler.toml`.

4. Set the sync token:

```bash
wrangler secret put SYNC_TOKEN
```

5. Initialize D1:

```bash
npm run d1:init:remote
```

6. Deploy Worker:

```bash
npm run deploy
```

## Local Dashboard Sync

Set these environment variables before starting `app.py`:

```powershell
$env:CLOUDFLARE_SYNC_URL = "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev"
$env:CLOUDFLARE_SYNC_TOKEN = "same-token-set-with-wrangler-secret"
```

Then run:

```powershell
python ".\On Page Optimization System Dashboard\app.py" cloudflare-sync
```

Or use the **Push to Cloudflare** button on the dashboard Overview page.

To upload generated customer reports and source Cora XLSX files to R2:

```powershell
python ".\On Page Optimization System Dashboard\app.py" cloudflare-artifacts-sync --dry-run
python ".\On Page Optimization System Dashboard\app.py" cloudflare-artifacts-sync
```

The Worker serves synced report pages from `/share/report/{token}` and their source XLSX downloads from `/share/report/{token}/download`.

By default, raw `workbook_rows` are not pushed because they can be large. To include them:

```powershell
$env:CLOUDFLARE_SYNC_WORKBOOK_ROWS = "1"
```
