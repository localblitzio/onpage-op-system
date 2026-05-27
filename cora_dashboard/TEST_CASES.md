# On Page Optimization System Test Cases

Use this set after dashboard changes and before relying on the tool for client work.

## Manual QA

### Startup

1. Start `start-dashboard.bat`.
2. Open `http://127.0.0.1:9191/`.
3. Confirm the page title says `On Page Optimization System`.
4. Confirm the top menu has `Cora` and `API Keys`.
5. Confirm the Cora status line shows either a Cora status or that Cora is unreachable.

Expected: The app loads without a browser error and the Cora tab is selected.

### Projects

1. In the Cora tab, create a project with a project name, client, and starting site.
2. Select the project from the project list.
3. Add a site.
4. Add a page under that site.
5. Add a keyword linked to that page.

Expected: The project detail view updates with the new site, page, and keyword.

### Cora Import

1. Run or locate a Cora `.xlsx` report.
2. Click `Import Latest Report`.
3. Enter the target URL/domain and keyword.
4. Open the imported run.

Expected: The run shows SERP rows, recommendations, LSI terms, workbook sheets, and a raw file path.

### Run Assignment

1. Open an imported run.
2. In `Database Assignment`, choose a project, site, page, and keyword.
3. Save the assignment.
4. Open the project detail view.

Expected: The run appears under `Assigned Runs` for the project.

### Compare Runs

1. Import at least two Cora reports.
2. In `Compare Runs`, choose two different imported runs.
3. Click `Compare`.

Expected: The comparison view shows target rank movement, count changes, SERP changes, recommendation changes, and LSI changes.

If the app says a dataset is missing, refresh the run list and confirm both selected runs are actually imported.

### API Keys

1. Open the `API Keys` tab.
2. Add a test key with provider, label, key, and notes.
3. Confirm the key appears masked.
4. Delete the test key.

Expected: The full key is not displayed in the UI, and deletion removes it from the list.

### Cora Force Stop

1. Start a Cora operation.
2. Click `Force Stop Cora`.
3. Confirm the browser prompt.
4. Refresh Cora status.

Expected: The stop command is sent to Cora. If Cora was already idle, the stop request should still return cleanly.

### Managed Run Freeze Watchdog

1. Start a managed Cora run from the dashboard.
2. If Cora freezes with unchanged status for the configured threshold, wait for the watchdog.

Expected: The job is marked `stopped`, and the job error contains the stop response. Default threshold is 10 minutes. Set `CORA_FREEZE_SECONDS` before startup to tune it.

## Automated Smoke Tests

Run from `D:\CC-Cora 7.2\cora_dashboard`:

```bat
python test_dashboard.py
```

The smoke tests use a temporary database and do not touch `data/cora_runs.sqlite3`.

