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

Optional but recommended for the public dashboard:

```bash
wrangler secret put READ_TOKEN
wrangler secret put ADMIN_TOKEN
```

Auth roles:

- `READ_TOKEN` can view the cloud dashboard and synced mirror data.
- `ADMIN_TOKEN` can queue/reset cloud commands.
- `SYNC_TOKEN` is used by the local dashboard bridge and can also act as the fallback admin/read token if the other secrets are not set.
- Public customer report URLs under `/share/report/{token}` do not require dashboard auth.

5. Initialize D1:

```bash
npm run d1:init:remote
```

6. Deploy Worker:

```bash
npm run deploy
```

The production Worker is configured for:

```text
https://onpage.localblitz.io
```

## Local Dashboard Sync

Set these environment variables before starting `app.py`:

```powershell
$env:CLOUDFLARE_SYNC_URL = "https://onpage.localblitz.io"
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

The cloud portal roadmap, including future email-based users and admin management, lives in `ROADMAP.md`.

By default, raw `workbook_rows` are not pushed because they can be large. To include them:

```powershell
$env:CLOUDFLARE_SYNC_WORKBOOK_ROWS = "1"
```
