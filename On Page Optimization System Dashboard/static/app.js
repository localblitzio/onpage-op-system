const state = {
  runs: [],
  jobs: [],
  profiles: [],
  projects: [],
  apiKeys: [],
  aiProviders: [],
  entityLsiRuns: [],
  entityLsiBatches: [],
  entitySets: [],
  rankingSnapshots: [],
  rankingSnapshot: null,
  selectedRankingSnapshotId: null,
  rankingOptimizationTargets: [],
  rankingTargetSelection: {},
  rankingComparison: null,
  rankingSnapshotTab: "overview",
  rankingKeywordSort: { key: "searchVolume", direction: "desc" },
  rankingKeywordFilters: { keyword: "", url: "", minVolume: "", posMin: "", posMax: "" },
  rankingPageSort: "traffic",
  rankingOpportunitySort: { key: "position", direction: "asc" },
  rankingOpportunityFilter: "all",
  rankingTargetSort: { key: "opportunityScore", direction: "desc" },
  rankingTargetFilter: "all",
  rankingTargetStatusFilter: "all",
  savedTargetStatusFilter: "all",
  savedTargetSelection: {},
  selectedRankingTargetUrl: "",
  entitySeedOverride: "",
  selectedEntityLsiBatchId: null,
  selectedEntityLsiRunId: null,
  entityProgressTimer: null,
  contentPlans: [],
  shareReports: [],
  domainLists: null,
  overview: null,
  cloudflareSync: null,
  projectDetails: {},
  activeView: "clients-view",
  selectedRunId: null,
  selectedProjectId: null,
  selectedComparison: null,
  selectedRun: null,
  selectedClientId: "",
  activeProfileId: "",
  jobTimer: null,
  coraStatus: null,
  coraLog: [],
  coraActivity: [],
  coraLiveLogKey: "",
  activityFilter: "all",
  queuePaused: false,
  queueAutoResume: false,
  queueStopAfterCurrent: false,
  queueSummary: null,
  reportRunId: "",
  reportSnapshotId: "",
  reportEntitySetId: "",
  reportTargetSelection: {},
  themeMode: "system",
};

const el = (id) => document.getElementById(id);
const THEME_STORAGE_KEY = "opos.theme";

function applyTheme(mode = "system") {
  const normalized = ["light", "dark", "system"].includes(mode) ? mode : "system";
  state.themeMode = normalized;
  document.documentElement.dataset.theme = normalized;
  const select = el("theme-mode");
  if (select) select.value = normalized;
}

function loadThemePreference() {
  let saved = "system";
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY) || "system";
  } catch (_err) {
    saved = "system";
  }
  applyTheme(saved);
}

function saveThemePreference(mode) {
  applyTheme(mode);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, state.themeMode);
  } catch (_err) {
    return;
  }
}

function toast(message) {
  const box = el("toast");
  box.textContent = message;
  box.classList.remove("hidden");
  window.setTimeout(() => box.classList.add("hidden"), 3800);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function fmtDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function fmtNum(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
}

function fmtBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toLocaleString(undefined, { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`;
}

function fmtDelta(value, lowerIsBetter = false) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  const sign = num > 0 ? "+" : "";
  const cls = num === 0 ? "neutral" : ((lowerIsBetter ? num < 0 : num > 0) ? "good" : "bad");
  return `<span class="delta ${cls}">${sign}${fmtNum(num)}</span>`;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function optionRows(items, selectedId, labelFn, includeBlank = true) {
  const blank = includeBlank ? `<option value="">None</option>` : "";
  return blank + items.map((item) => {
    const selected = Number(selectedId) === Number(item.id) ? " selected" : "";
    return `<option value="${item.id}"${selected}>${htmlEscape(labelFn(item))}</option>`;
  }).join("");
}

function activeProfile() {
  return state.profiles.find((profile) => String(profile.id) === String(state.activeProfileId)) || null;
}

function selectedClient() {
  return state.projects.find((project) => String(project.id) === String(state.selectedClientId || state.selectedProjectId)) || null;
}

function clientMainUrl(detail) {
  const sites = detail?.sites || [];
  const pages = detail?.pages || [];
  return pages[0]?.url || sites[0]?.domain || "";
}

function toolEmptyState(label) {
  return `
    <section class="tool-empty-state">
      <div>
        <h2>${htmlEscape(label)}</h2>
        <p>Select a client from the sidebar or create a new client before using this tool.</p>
      </div>
      <div class="tool-empty-actions">
        <button type="button" data-tool-action="clients">Clients</button>
        <button type="button" class="secondary" data-tool-action="new-client">New Client</button>
      </div>
    </section>
  `;
}

function bindToolEmptyActions(root) {
  root.querySelector('[data-tool-action="clients"]')?.addEventListener("click", () => showMainView("clients-view"));
  root.querySelector('[data-tool-action="new-client"]')?.addEventListener("click", () => showMainView("new-client-view"));
}

function clientToolContext(detail, label) {
  const project = detail?.project || selectedClient() || {};
  const keywords = detail?.keywords || [];
  const mainUrl = clientMainUrl(detail);
  return `
    <section class="tool-client-context">
      <div class="tool-context-primary">
        <label>Tool</label>
        <strong>${htmlEscape(label)}</strong>
        <span>Using variables from the selected client</span>
      </div>
      <div>
        <label>Client</label>
        <strong>${htmlEscape(project.name || "No client selected")}</strong>
        <span>${htmlEscape(project.client || "Client profile")}</span>
      </div>
      <div>
        <label>Main URL</label>
        <strong>${htmlEscape(mainUrl || "Not set")}</strong>
        <span>${mainUrl ? "Primary target URL" : "Add this on the Clients page"}</span>
      </div>
      <div>
        <label>Cora Profile</label>
        <strong>${htmlEscape(project.profile_name || "Not attached")}</strong>
        <span>${project.profile_name ? "Available to Cora tools" : "Attach from Cora Profiles"}</span>
      </div>
      <div>
        <label>Keywords</label>
        <strong>${fmtNum(keywords.length)}</strong>
        <span>Ready for tool runs</span>
      </div>
    </section>
  `;
}

function profileQuery(prefix = "?") {
  return "";
}

function profileQueryParam(params = new URLSearchParams()) {
  return params.toString() ? `?${params.toString()}` : "";
}

function showEmpty() {
  el("empty-state").classList.remove("hidden");
  el("cora-settings-detail").classList.add("hidden");
  el("project-detail").classList.add("hidden");
  el("compare-detail").classList.add("hidden");
  el("run-detail").classList.add("hidden");
}

function showMainView(viewId, options = {}) {
  state.activeView = viewId;
  document.querySelectorAll(".app-view").forEach((view) => view.classList.add("hidden"));
  document.querySelectorAll(".main-tab").forEach((tab) => tab.classList.remove("active"));
  el(viewId).classList.remove("hidden");
  document.querySelector(`.main-tab[data-view="${viewId}"]`)?.classList.add("active");
  if (viewId === "entity-batch-detail-view") {
    document.querySelector(`.main-tab[data-view="entity-crossover-view"]`)?.classList.add("active");
  }
  if (viewId === "ranking-targets-view") {
    document.querySelector(`.main-tab[data-view="ranking-snapshot-view"]`)?.classList.add("active");
  }
  const isCora = viewId === "cora-view";
  el("import-latest").classList.toggle("hidden", !isCora);
  el("force-stop-cora").classList.toggle("hidden", !isCora);
  el("cora-status").classList.toggle("hidden", !isCora);
  if (viewId === "clients-view" && !options.skipClientSelect) {
    selectFirstClientIfNeeded().catch((err) => toast(err.message));
  }
  if (viewId === "new-client-view") {
    renderProfileSelect();
  }
  if (viewId === "cora-view") {
    renderCoraTool().catch((err) => toast(err.message));
    loadCoraLog().catch(() => {});
  }
  if (viewId === "cora-profiles-view") {
    renderCoraProfilesPage().catch((err) => toast(err.message));
  }
  if (viewId === "reports-view") {
    loadReportsPage().catch((err) => toast(err.message));
  }
  if (viewId === "entity-view") {
    renderEntityExplorer().catch((err) => toast(err.message));
  }
  if (viewId === "ranking-snapshot-view") {
    renderRankingSnapshotTool().catch((err) => toast(err.message));
  }
  if (viewId === "ranking-targets-view") {
    renderSavedRankingTargetsPage().catch((err) => toast(err.message));
  }
  if (viewId === "entity-crossover-view") {
    renderEntityCrossoverPage().catch((err) => toast(err.message));
  }
  if (viewId === "entity-batch-detail-view") {
    renderEntityBatchDetailPage().catch((err) => toast(err.message));
  }
  if (viewId === "entity-sets-view") {
    renderEntitySetsPage().catch((err) => toast(err.message));
  }
  if (viewId === "tools2-view") {
    renderPlaceholderTool("tools2-tool-content", "Tools 2").catch((err) => toast(err.message));
  }
  if (viewId === "aeo-view") {
    renderPlaceholderTool("aeo-tool-content", "AEO Tool").catch((err) => toast(err.message));
  }
  if (viewId === "overview-view") {
    loadOverview().catch((err) => toast(err.message));
  }
  if (viewId === "cloud-sync-view") {
    loadCloudSyncPage().catch((err) => toast(err.message));
  }
  if (viewId === "planner-view") {
    loadPlanner().catch((err) => toast(err.message));
  }
  if (viewId === "api-keys-view") {
    loadApiKeys().catch((err) => toast(err.message));
  }
}

function refreshCurrentProfileView() {
  if (state.activeView === "clients-view") {
    return Promise.all([loadProjects(), selectFirstClientIfNeeded()]);
  }
  if (state.activeView === "new-client-view") {
    return Promise.all([loadProjects(), loadProfiles()]);
  }
  if (state.activeView === "cora-view") {
    return renderCoraTool();
  }
  if (state.activeView === "cora-profiles-view") {
    return renderCoraProfilesPage();
  }
  if (state.activeView === "reports-view") {
    return loadReportsPage();
  }
  if (state.activeView === "overview-view") {
    return loadOverview();
  }
  if (state.activeView === "cloud-sync-view") {
    return loadCloudSyncPage();
  }
  if (state.activeView === "planner-view") {
    return loadPlanner();
  }
  if (state.activeView === "entity-view") {
    return renderEntityExplorer();
  }
  if (state.activeView === "ranking-snapshot-view") {
    return renderRankingSnapshotTool();
  }
  if (state.activeView === "ranking-targets-view") {
    return renderSavedRankingTargetsPage();
  }
  if (state.activeView === "entity-crossover-view") {
    return renderEntityCrossoverPage();
  }
  if (state.activeView === "entity-batch-detail-view") {
    return renderEntityBatchDetailPage();
  }
  if (state.activeView === "entity-sets-view") {
    return renderEntitySetsPage();
  }
  if (state.activeView === "api-keys-view") {
    return loadApiKeys();
  }
  return Promise.all([refreshCoraStatus(), loadProjects(), loadRuns(), loadJobs()]);
}

async function showCoraSettings() {
  showMainView("cora-view");
  state.selectedRunId = null;
  renderRuns();
  await loadDomainLists();
  renderCoraToolSettings();
}

async function refreshCoraStatus() {
  const data = await api("/api/cora/status");
  state.coraStatus = data;
  const status = el("cora-status");
  if (data.error) {
    status.textContent = "Cora API is not reachable.";
    return;
  }
  const running = data.running ? "running" : "idle";
  const keyword = data.searchTerm ? `: ${data.searchTerm}` : "";
  status.innerHTML = `<span class="badge">${htmlEscape(data.checkinStatus || "unknown")}</span> Cora is ${running}${htmlEscape(keyword)}`;
}

function renderOverview() {
  const root = el("overview-content");
  const cloudSyncRoot = el("cloud-sync-content");
  if (cloudSyncRoot) cloudSyncRoot.innerHTML = "";
  const data = state.overview;
  if (!data) {
    root.innerHTML = `<div class="note-box">Loading overview...</div>`;
    return;
  }
  const counts = data.counts || {};
  const jobCounts = data.job_counts || [];
  const recentRuns = data.recent_runs || [];
  const recentJobs = data.recent_jobs || [];
  const apiProviders = data.api_key_providers || [];
  const cloudflare = state.cloudflareSync || {};
  const artifactState = cloudflare.artifacts || {};
  const artifactFiles = Number(artifactState.total_files || 0);
  root.innerHTML = `
    <div class="overview-grid">
      <div class="overview-card"><span>${fmtNum(counts.profiles || 0)}</span><label>Profiles</label></div>
      <div class="overview-card"><span>${fmtNum(counts.projects || 0)}</span><label>Projects</label></div>
      <div class="overview-card"><span>${fmtNum(counts.runs || 0)}</span><label>Cora Runs</label></div>
      <div class="overview-card"><span>${fmtNum(counts.keywords || 0)}</span><label>Keywords</label></div>
      <div class="overview-card"><span>${fmtNum(counts.workbook_rows || 0)}</span><label>Workbook Rows</label></div>
      <div class="overview-card"><span>${fmtNum(counts.sites || 0)}</span><label>Sites</label></div>
      <div class="overview-card"><span>${fmtNum(counts.pages || 0)}</span><label>Pages</label></div>
      <div class="overview-card"><span>${fmtNum(counts.content_plans || 0)}</span><label>Content Plans</label></div>
      <div class="overview-card"><span>${fmtNum(counts.api_keys || 0)}</span><label>API Keys</label></div>
      <div class="overview-card"><span>${cloudflare.configured ? "Ready" : "Setup"}</span><label>Cloudflare Sync</label></div>
      <div class="overview-card"><span>${fmtNum(artifactFiles)}</span><label>Cloud Files</label></div>
    </div>
    <div class="overview-sections">
      ${renderCloudflareSyncPanel()}
      <section class="data-section">
        <h3>Recent Runs</h3>
        ${recentRuns.length ? table(["Keyword", "Project", "Imported", "Recommendations", "LSI"], recentRuns.map((run) => `
          <tr>
            <td>${htmlEscape(run.keyword)}</td>
            <td>${htmlEscape(run.project_name || "")}</td>
            <td>${fmtDate(run.imported_at)}</td>
            <td>${fmtNum(run.recommendation_count || 0)}</td>
            <td>${fmtNum(run.lsi_count || 0)}</td>
          </tr>
        `)) : `<div class="note-box">No Cora runs imported yet.</div>`}
      </section>
      <section class="data-section">
        <h3>Recent Jobs</h3>
        ${recentJobs.length ? table(["Keyword", "Status", "Started", "Message"], recentJobs.map((job) => `
          <tr>
            <td>${htmlEscape(job.keyword)}</td>
            <td><span class="status-pill ${htmlEscape(job.status)}">${htmlEscape(job.status)}</span></td>
            <td>${fmtDate(job.started_at)}</td>
            <td>${htmlEscape(job.status_message)}</td>
          </tr>
        `)) : `<div class="note-box">No managed jobs yet.</div>`}
      </section>
      <section class="data-section">
        <h3>Content Plans</h3>
        ${(data.recent_content_plans || []).length ? table(["Title", "Project", "Keyword", "Status", "Priority"], (data.recent_content_plans || []).map((plan) => `
          <tr>
            <td>${htmlEscape(plan.title)}</td>
            <td>${htmlEscape(plan.project_name)}</td>
            <td>${htmlEscape(plan.keyword)}</td>
            <td><span class="status-pill ${htmlEscape(plan.status)}">${htmlEscape(plan.status)}</span></td>
            <td>${htmlEscape(plan.priority)}</td>
          </tr>
        `)) : `<div class="note-box">No content plans yet.</div>`}
      </section>
      <section class="data-section">
        <h3>Job Status</h3>
        ${jobCounts.length ? table(["Status", "Count"], jobCounts.map((row) => `
          <tr><td><span class="status-pill ${htmlEscape(row.status)}">${htmlEscape(row.status)}</span></td><td>${fmtNum(row.count)}</td></tr>
        `)) : `<div class="note-box">No job history yet.</div>`}
      </section>
      <section class="data-section">
        <h3>API Key Providers</h3>
        ${apiProviders.length ? table(["Provider", "Keys"], apiProviders.map((row) => `
          <tr><td>${htmlEscape(row.provider)}</td><td>${fmtNum(row.count)}</td></tr>
        `)) : `<div class="note-box">No API keys saved yet.</div>`}
      </section>
    </div>
  `;
  bindCloudflareSyncControls();
}

async function loadOverview() {
  const [data, cloudflare] = await Promise.all([
    api(`/api/overview${profileQuery()}`),
    api("/api/cloudflare/status").catch((err) => ({ configured: false, error: err.message })),
  ]);
  state.overview = data;
  state.cloudflareSync = cloudflare;
  renderOverview();
}

function renderCloudflareSyncPanel() {
  const cloudflare = state.cloudflareSync || {};
  const cloudflareRows = Object.values(cloudflare.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const cloudflareLast = (cloudflare.state || []).map((row) => row.last_success_at).filter(Boolean).sort().pop() || "";
  const artifactState = cloudflare.artifacts || {};
  const artifactFiles = Number(artifactState.total_files || 0);
  const artifactBytes = Number(artifactState.total_bytes || 0);
  const artifactLast = artifactState.last_uploaded_at || "";
  const bridge = cloudflare.bridge || {};
  return `
    <section class="data-section cloud-sync-panel">
      <div class="panel-head">
        <div>
          <h3>Cloudflare Production Sync</h3>
          <p>${cloudflare.configured ? "Push local dashboard data to the configured Cloudflare Worker/D1 endpoint." : "Set CLOUDFLARE_SYNC_URL and CLOUDFLARE_SYNC_TOKEN before pushing to production."}</p>
        </div>
        <div class="row-actions">
          <button id="cloudflare-dry-run" type="button" class="secondary">Dry Run</button>
          <button id="cloudflare-sync-now" type="button" ${cloudflare.configured ? "" : "disabled"}>Push to Cloudflare</button>
          <button id="cloudflare-files-dry-run" type="button" class="secondary">Dry Run Files</button>
          <button id="cloudflare-files-sync-now" type="button" ${cloudflare.configured ? "" : "disabled"}>Push Report Files</button>
          <button id="cloudflare-commands-pull" type="button" class="secondary" ${cloudflare.configured ? "" : "disabled"}>Pull Cloud Commands</button>
        </div>
      </div>
      <div id="cloudflare-sync-status" class="cloudflare-sync-status">
        <div><label>Endpoint</label><strong>${htmlEscape(cloudflare.sync_url || "Not configured")}</strong></div>
        <div><label>Credential Source</label><strong>${htmlEscape(cloudflare.credential_source || "none")}</strong></div>
        <div><label>Rows Prepared</label><strong>${fmtNum(cloudflareRows)}</strong></div>
        <div><label>Batch Size</label><strong>${fmtNum(cloudflare.batch_size || 0)}</strong></div>
        <div><label>Last Success</label><strong>${fmtDate(cloudflareLast) || "Never"}</strong></div>
        <div><label>Report Files</label><strong>${fmtNum(artifactFiles)} synced</strong></div>
        <div><label>File Bytes</label><strong>${fmtBytes(artifactBytes)}</strong></div>
        <div><label>Last File Upload</label><strong>${fmtDate(artifactLast) || "Never"}</strong></div>
        <div><label>Bridge</label><strong>${bridge.enabled ? "Auto" : "Manual"}</strong></div>
        <div><label>Last Poll</label><strong>${fmtDate(bridge.last_poll_at) || "Never"}</strong></div>
        <div><label>Cora Commands</label><strong>${bridge.allow_cora ? "Allowed" : "Blocked"}</strong></div>
        <div><label>Paid/API Tools</label><strong>${bridge.allow_paid_tools ? "Allowed" : "Blocked"}</strong></div>
      </div>
      <div class="cloud-bridge-controls">
        <label>Worker URL <input id="cloudflare-sync-url" type="url" value="${htmlEscape(cloudflare.sync_url || "")}" placeholder="https://onpage.localblitz.io"></label>
        <label>Sync Token <input id="cloudflare-sync-token" type="password" placeholder="${cloudflare.has_token ? "Saved token unchanged" : "Paste sync/admin token"}"></label>
        <button id="save-cloudflare-config" type="button" class="secondary">Save Sync Config</button>
      </div>
      <div class="cloud-bridge-controls">
        <label><input id="bridge-enabled" type="checkbox" ${bridge.enabled ? "checked" : ""}> Auto-pull cloud commands</label>
        <label><input id="bridge-allow-cora" type="checkbox" ${bridge.allow_cora ? "checked" : ""}> Allow cloud to queue Cora runs</label>
        <label><input id="bridge-allow-paid-tools" type="checkbox" ${bridge.allow_paid_tools ? "checked" : ""}> Allow cloud paid/API tool runs</label>
        <label>Poll seconds <input id="bridge-poll-interval" type="number" min="10" max="3600" value="${htmlEscape(bridge.poll_interval || 30)}"></label>
        <button id="save-bridge-settings" type="button" class="secondary">Save Bridge</button>
      </div>
    </section>
  `;
}

function renderCloudSyncPage() {
  const root = el("cloud-sync-content");
  if (!root) return;
  const overviewRoot = el("overview-content");
  if (overviewRoot) overviewRoot.innerHTML = "";
  root.innerHTML = renderCloudflareSyncPanel();
  bindCloudflareSyncControls();
}

async function loadCloudSyncPage() {
  state.cloudflareSync = await api("/api/cloudflare/status").catch((err) => ({ configured: false, error: err.message }));
  renderCloudSyncPage();
}

function renderCloudflareActiveView() {
  if (state.activeView === "overview-view") renderOverview();
  if (state.activeView === "cloud-sync-view") renderCloudSyncPage();
}

function bindCloudflareSyncControls() {
  el("cloudflare-dry-run")?.addEventListener("click", () => runCloudflareSync(true).catch((err) => toast(err.message)));
  el("cloudflare-sync-now")?.addEventListener("click", () => runCloudflareSync(false).catch((err) => toast(err.message)));
  el("cloudflare-files-dry-run")?.addEventListener("click", () => runCloudflareArtifactSync(true).catch((err) => toast(err.message)));
  el("cloudflare-files-sync-now")?.addEventListener("click", () => runCloudflareArtifactSync(false).catch((err) => toast(err.message)));
  el("cloudflare-commands-pull")?.addEventListener("click", () => pullCloudflareCommands().catch((err) => toast(err.message)));
  el("save-cloudflare-config")?.addEventListener("click", () => saveCloudflareConfig().catch((err) => toast(err.message)));
  el("save-bridge-settings")?.addEventListener("click", () => saveCloudBridgeSettings().catch((err) => toast(err.message)));
}

async function runCloudflareSync(dryRun = false) {
  const status = el("cloudflare-sync-status");
  if (status) status.insertAdjacentHTML("afterbegin", `<div class="ai-test-result">Cloudflare ${dryRun ? "dry run" : "push"} started...</div>`);
  const result = await api("/api/cloudflare/sync", {
    method: "POST",
    body: JSON.stringify({ dry_run: dryRun }),
  });
  state.cloudflareSync = await api("/api/cloudflare/status").catch(() => state.cloudflareSync);
  renderCloudflareActiveView();
  toast(dryRun ? `Dry run ready: ${fmtNum(result.total_rows)} rows.` : `Cloudflare sync pushed ${fmtNum(result.total_rows)} rows.`);
}

async function runCloudflareArtifactSync(dryRun = false, reportIds = null, force = false) {
  const status = el("cloudflare-sync-status");
  if (status) status.insertAdjacentHTML("afterbegin", `<div class="ai-test-result">Cloudflare report file ${dryRun ? "dry run" : "push"} started...</div>`);
  const result = await api("/api/cloudflare/artifacts/sync", {
    method: "POST",
    body: JSON.stringify({ dry_run: dryRun, force, report_ids: reportIds || [] }),
  });
  state.cloudflareSync = await api("/api/cloudflare/status").catch(() => state.cloudflareSync);
  await loadShareReports(state.selectedClientId || state.selectedProjectId || "");
  renderCloudflareActiveView();
  if (state.activeView === "reports-view") renderReportGenerator();
  const changed = dryRun ? result.artifacts?.length || 0 : result.uploaded || 0;
  toast(dryRun ? `File dry run ready: ${fmtNum(changed)} artifacts.` : `Uploaded ${fmtNum(changed)} report files to Cloudflare.`);
}

async function pullCloudflareCommands() {
  const result = await api("/api/cloudflare/commands/pull", {
    method: "POST",
    body: JSON.stringify({ limit: 25 }),
  });
  state.cloudflareSync = await api("/api/cloudflare/status").catch(() => state.cloudflareSync);
  await Promise.all([
    loadProjects().catch(() => {}),
    loadRuns().catch(() => {}),
    loadJobs().catch(() => {}),
  ]);
  if (state.activeView === "overview-view") renderOverview();
  if (state.activeView === "cloud-sync-view") renderCloudSyncPage();
  toast(`Processed ${fmtNum(result.processed || 0)} cloud commands.`);
}

async function saveCloudflareConfig() {
  const syncUrl = el("cloudflare-sync-url")?.value || "";
  const syncToken = el("cloudflare-sync-token")?.value || "";
  const result = await api("/api/cloudflare/config", {
    method: "POST",
    body: JSON.stringify({ sync_url: syncUrl, sync_token: syncToken }),
  });
  state.cloudflareSync = await api("/api/cloudflare/status").catch(() => state.cloudflareSync);
  renderCloudflareActiveView();
  toast(result.configured ? "Cloudflare sync config saved for bridge startup." : "Cloudflare sync config not complete.");
}

async function saveCloudBridgeSettings() {
  const result = await api("/api/cloudflare/bridge", {
    method: "POST",
    body: JSON.stringify({
      enabled: Boolean(el("bridge-enabled")?.checked),
      allow_cora: Boolean(el("bridge-allow-cora")?.checked),
      allow_paid_tools: Boolean(el("bridge-allow-paid-tools")?.checked),
      poll_interval: Number(el("bridge-poll-interval")?.value || 30),
    }),
  });
  state.cloudflareSync = await api("/api/cloudflare/status").catch(() => state.cloudflareSync);
  renderCloudflareActiveView();
  toast(result.enabled ? "Cloud bridge auto-polling enabled." : "Cloud bridge auto-polling disabled.");
}

function renderProjects() {
  const root = el("projects");
  if (!state.projects.length) {
    root.innerHTML = `<div class="project-empty">No projects yet.</div>`;
    return;
  }
  root.innerHTML = state.projects.map((project) => `
    <button class="project-item ${project.id === state.selectedProjectId ? "active" : ""}" data-project-id="${project.id}">
      <strong>${htmlEscape(project.name)}</strong>
      <span>${htmlEscape(project.profile_name || "No profile")} | ${fmtNum(project.keyword_count || 0)} keywords | ${fmtNum(project.run_count || 0)} runs</span>
    </button>
  `).join("");
  root.querySelectorAll(".project-item").forEach((item) => {
    item.addEventListener("click", () => selectClient(Number(item.dataset.projectId)));
  });
  renderClientSelect();
}

function renderClientSelect() {
  const select = el("active-client");
  if (!select) return;
  const current = state.selectedClientId || state.selectedProjectId || "";
  select.innerHTML = state.projects.length
    ? state.projects.map((project) => {
      const selected = String(project.id) === String(current) ? " selected" : "";
      return `<option value="${project.id}"${selected}>${htmlEscape(project.name)}</option>`;
    }).join("")
    : `<option value="">No clients</option>`;
}

function renderProfileSelect() {
  const projectSelect = el("project-profile");
  const jobSelect = el("job-profile");
  const currentProject = projectSelect?.value;
  const currentJob = jobSelect?.value;
  const options = [`<option value="">No Cora profile</option>`].concat(
    state.profiles.map((profile) => {
      const selected = String(profile.id) === String(currentProject || selectedClient()?.profile_id || "") ? " selected" : "";
      const count = Number(profile.project_count || 0);
      const suffix = count ? ` (${count} project${count === 1 ? "" : "s"})` : "";
      return `<option value="${profile.id}"${selected}>${htmlEscape(profile.name)}${suffix}</option>`;
    })
  );
  if (projectSelect) projectSelect.innerHTML = options.join("");

  const jobOptions = [`<option value="">Use current Cora profile</option>`].concat(
    state.profiles.map((profile) => {
      const selected = profile.name === (currentJob || selectedClient()?.profile_name || "") ? " selected" : "";
      return `<option value="${htmlEscape(profile.name)}"${selected}>${htmlEscape(profile.name)}</option>`;
    })
  );
  if (jobSelect) jobSelect.innerHTML = jobOptions.join("");
}

async function loadProfiles() {
  const data = await api("/api/profiles");
  state.profiles = data.profiles || [];
  const ids = new Set(state.profiles.map((profile) => String(profile.id)));
  if (!ids.has(String(state.activeProfileId))) {
    const selectedName = data.selected_cora_profile || "";
    const selected = state.profiles.find((profile) => profile.name === selectedName);
    state.activeProfileId = selected ? String(selected.id) : (state.profiles[0] ? String(state.profiles[0].id) : "");
  }
  renderProfileSelect();
}

async function loadProjects() {
  const data = await api(`/api/projects${profileQuery()}`);
  state.projects = data.projects || [];
  if (state.selectedProjectId && !state.projects.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = null;
  }
  if (state.selectedClientId && !state.projects.some((project) => String(project.id) === String(state.selectedClientId))) {
    state.selectedClientId = "";
  }
  if (!state.selectedClientId && state.projects.length) {
    state.selectedClientId = String(state.projects[0].id);
  }
  renderProjects();
}

async function loadShareReports(projectId = "") {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  const data = await api(`/api/share-reports${profileQueryParam(params)}`);
  state.shareReports = data.reports || [];
  return state.shareReports;
}

async function loadRankingOptimizationTargets(projectId = "", snapshotId = "") {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  if (snapshotId) params.set("snapshot_id", snapshotId);
  const data = await api(`/api/seo/optimization-targets${profileQueryParam(params)}`);
  state.rankingOptimizationTargets = data.targets || [];
  return state.rankingOptimizationTargets;
}

async function loadReportsPage() {
  await Promise.all([
    loadProjects(),
    loadRuns(),
    loadShareReports(state.selectedClientId || state.selectedProjectId || ""),
    loadRankingSnapshots(state.selectedClientId || state.selectedProjectId || ""),
    loadRankingOptimizationTargets(state.selectedClientId || state.selectedProjectId || ""),
    loadEntitySets(state.selectedClientId || state.selectedProjectId || "").catch(() => []),
  ]);
  renderReportGenerator();
}

function renderReportGenerator() {
  const root = el("report-generator-content");
  if (!root) return;
  const selectedProjectId = String(state.selectedClientId || state.selectedProjectId || "");
  const clientRuns = state.runs.filter((run) => !selectedProjectId || String(run.project_id || "") === selectedProjectId);
  const clientSnapshots = state.rankingSnapshots.filter((snapshot) => !selectedProjectId || String(snapshot.project_id || "") === selectedProjectId);
  const clientTargets = state.rankingOptimizationTargets.filter((target) => {
    if (selectedProjectId && String(target.projectId || target.project_id || "") !== selectedProjectId) return false;
    if (state.reportSnapshotId && String(target.snapshotId || target.snapshot_id || "") !== String(state.reportSnapshotId)) return false;
    return true;
  });
  const clientEntitySets = state.entitySets.filter((set) => !selectedProjectId || String(set.project_id || set.projectId || "") === selectedProjectId);
  if (!state.reportRunId || !clientRuns.some((run) => String(run.id) === String(state.reportRunId))) {
    state.reportRunId = clientRuns[0] ? String(clientRuns[0].id) : "";
  }
  if (state.reportSnapshotId && !clientSnapshots.some((snapshot) => String(snapshot.id) === String(state.reportSnapshotId))) {
    state.reportSnapshotId = "";
    state.reportTargetSelection = {};
  }
  if (state.reportEntitySetId && !clientEntitySets.some((set) => String(set.id) === String(state.reportEntitySetId))) {
    state.reportEntitySetId = "";
  }
  root.innerHTML = `
    <div class="report-generator-grid">
      <section class="client-panel">
        <h3>Create Customer Report</h3>
        <form id="share-report-form" class="report-form">
          <label>
            Client
            <select id="report-client">
              ${state.projects.map((project) => `<option value="${project.id}"${String(project.id) === selectedProjectId ? " selected" : ""}>${htmlEscape(project.name)}</option>`).join("")}
            </select>
          </label>
          <label>
            Completed Cora Run
            <select id="report-run">
              ${clientRuns.length ? clientRuns.map((run) => `<option value="${run.id}"${String(run.id) === String(state.reportRunId) ? " selected" : ""}>${htmlEscape(run.keyword)} - ${fmtDate(run.imported_at)}</option>`).join("") : `<option value="">No completed runs for this client</option>`}
            </select>
          </label>
          <label>
            Ranking Snapshot
            <select id="report-snapshot">
              <option value="">No snapshot attached</option>
              ${clientSnapshots.map((snapshot) => `<option value="${snapshot.id}"${String(snapshot.id) === String(state.reportSnapshotId) ? " selected" : ""}>${htmlEscape(snapshot.target)} - ${fmtDate(snapshot.created_at)}</option>`).join("")}
            </select>
          </label>
          <label>
            Entity Set
            <select id="report-entity-set">
              <option value="">No entity set attached</option>
              ${clientEntitySets.map((set) => `<option value="${set.id}"${String(set.id) === String(state.reportEntitySetId) ? " selected" : ""}>${htmlEscape(set.name)} (${fmtNum(set.term_count || 0)} terms)</option>`).join("")}
            </select>
          </label>
          <label>
            Report Level
            <select id="report-level">
              <option value="basic">Basic</option>
              <option value="medium" selected>Medium</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </label>
          <label>
            Report Title
            <input id="report-title" type="text" placeholder="Optional custom title" autocomplete="off">
          </label>
          <label class="wide">
            Client Notes
            <textarea id="report-notes" placeholder="Optional customer-facing notes"></textarea>
          </label>
          <div class="wide report-target-picker">
            <div class="panel-head compact">
              <div>
                <h4>Optimization Targets</h4>
                <p>Attach saved Ranking Snapshot targets to this customer report.</p>
              </div>
              <button id="report-select-all-targets" type="button" class="secondary" ${clientTargets.length ? "" : "disabled"}>Select Visible</button>
            </div>
            ${renderReportTargetPicker(clientTargets)}
          </div>
          <button type="submit" ${clientRuns.length ? "" : "disabled"}>Generate Share Link</button>
        </form>
        <div id="report-result" class="share-result hidden"></div>
      </section>
      <section class="client-panel">
        <h3>Stored Reports</h3>
        <div id="stored-reports">${renderStoredReports()}</div>
      </section>
    </div>
  `;
  el("report-client")?.addEventListener("change", async (event) => {
    state.selectedClientId = event.target.value;
    state.selectedProjectId = Number(event.target.value) || null;
    state.reportRunId = "";
    state.reportSnapshotId = "";
    state.reportEntitySetId = "";
    state.reportTargetSelection = {};
    await loadShareReports(state.selectedClientId);
    await loadRankingSnapshots(state.selectedClientId);
    await loadRankingOptimizationTargets(state.selectedClientId);
    await loadEntitySets(state.selectedClientId).catch(() => []);
    renderReportGenerator();
    renderClientSelect();
  });
  el("report-run")?.addEventListener("change", (event) => {
    state.reportRunId = event.target.value;
  });
  el("report-snapshot")?.addEventListener("change", (event) => {
    state.reportSnapshotId = event.target.value;
    state.reportTargetSelection = {};
    renderReportGenerator();
  });
  el("report-entity-set")?.addEventListener("change", (event) => {
    state.reportEntitySetId = event.target.value;
  });
  root.querySelectorAll(".report-target-check").forEach((input) => {
    input.addEventListener("change", () => {
      state.reportTargetSelection[input.value] = input.checked;
    });
  });
  el("report-select-all-targets")?.addEventListener("click", () => {
    clientTargets.forEach((target) => {
      state.reportTargetSelection[String(target.id)] = true;
    });
    renderReportGenerator();
  });
  el("share-report-form")?.addEventListener("submit", (event) => generateShareReport(event).catch((err) => toast(err.message)));
  root.querySelectorAll(".copy-report-link").forEach((button) => {
    button.addEventListener("click", () => copyReportUrl(button.dataset.url || ""));
  });
  root.querySelectorAll(".sync-report-files").forEach((button) => {
    button.addEventListener("click", () => runCloudflareArtifactSync(false, [Number(button.dataset.reportId)], true).catch((err) => toast(err.message)));
  });
}

function renderReportTargetPicker(targets) {
  if (!targets.length) {
    return `<div class="note-box">No saved Optimization Targets for this client yet. Save targets from the Ranking Snapshot tool first.</div>`;
  }
  return `
    <div class="report-target-list">
      ${targets.slice(0, 80).map((target) => `
        <label>
          <input class="report-target-check" type="checkbox" value="${target.id}" ${state.reportTargetSelection[String(target.id)] ? "checked" : ""}>
          <span><strong>${htmlEscape(target.keyword || target.url || "Optimization target")}</strong><small>${htmlEscape(target.url || "")} | ${htmlEscape(target.status || "new")} | score ${fmtNum(target.opportunityScore)}</small></span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderStoredReports() {
  if (!state.shareReports.length) {
    return `<div class="note-box">No customer reports generated yet.</div>`;
  }
  return table(["Report", "Level", "Created", "Cloud", ""], state.shareReports.map((report) => {
    const url = `${window.location.origin}${report.url}`;
    const cloudUrl = report.cloud_url || "";
    const cloudSynced = Number(report.cloud_synced_artifacts || 0);
    const cloudTotal = Number(report.cloud_total_artifacts || 0);
    const cloudLabel = cloudSynced ? `${fmtNum(cloudSynced)} file${cloudSynced === 1 ? "" : "s"} synced` : "Local only";
    return `
      <tr>
        <td><strong>${htmlEscape(report.title || report.keyword || "Shared report")}</strong><br><span class="muted">${htmlEscape(report.keyword || "")}</span></td>
        <td>${htmlEscape(report.level || "medium")}</td>
        <td>${fmtDate(report.created_at)}</td>
        <td><span class="status-pill ${cloudSynced ? "complete" : "queued"}">${htmlEscape(cloudLabel)}</span>${cloudTotal && cloudSynced < cloudTotal ? `<br><span class="muted">${fmtNum(cloudTotal - cloudSynced)} pending</span>` : ""}</td>
        <td class="row-actions">
          <a class="button-link" href="${htmlEscape(url)}" target="_blank" rel="noopener">Open</a>
          <button class="link-button copy-report-link" type="button" data-url="${htmlEscape(url)}">Copy link</button>
          ${cloudUrl ? `<a class="button-link" href="${htmlEscape(cloudUrl)}" target="_blank" rel="noopener">Cloud</a>` : ""}
          <button class="link-button sync-report-files" type="button" data-report-id="${report.id}">Sync files</button>
        </td>
      </tr>
    `;
  }));
}

async function generateShareReport(event) {
  event.preventDefault();
  const runId = el("report-run").value;
  if (!runId) {
    toast("Choose a completed Cora run.");
    return;
  }
  const result = await api("/api/share-reports", {
    method: "POST",
    body: JSON.stringify({
      run_id: Number(runId),
      level: el("report-level").value,
      title: el("report-title").value,
      notes: el("report-notes").value,
      ranking_snapshot_id: el("report-snapshot")?.value ? Number(el("report-snapshot").value) : null,
      entity_set_id: el("report-entity-set")?.value ? Number(el("report-entity-set").value) : null,
      optimization_target_ids: Object.entries(state.reportTargetSelection).filter(([, selected]) => selected).map(([id]) => Number(id)),
    }),
  });
  const url = result.report?.absolute_url || `${window.location.origin}${result.report?.url || ""}`;
  const resultHtml = `
    <label>Share URL</label>
    <div class="share-url-row">
      <input id="generated-report-url" type="text" readonly value="${htmlEscape(url)}">
      <button id="copy-generated-report" type="button" class="secondary">Copy</button>
      <a class="button-link" href="${htmlEscape(url)}" target="_blank" rel="noopener">Open</a>
    </div>
  `;
  await copyReportUrl(url, false);
  await loadShareReports(state.selectedClientId || state.selectedProjectId || "");
  renderReportGenerator();
  const resultBox = el("report-result");
  resultBox.classList.remove("hidden");
  resultBox.innerHTML = resultHtml;
  el("copy-generated-report")?.addEventListener("click", () => copyReportUrl(url));
  toast("Customer report link generated.");
}

async function copyReportUrl(url, showToast = true) {
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    if (showToast) toast("Report link copied.");
  } catch (_err) {
    const input = el("generated-report-url");
    if (input) input.select();
    if (showToast) toast("Could not copy automatically. Select the URL field.");
  }
}

async function selectFirstClientIfNeeded() {
  if ((state.activeView === "clients-view" || state.activeView === "cora-view" || state.activeView === "ranking-snapshot-view" || state.activeView === "ranking-targets-view") && !state.selectedProjectId && state.projects.length) {
    state.selectedRunId = null;
    state.selectedRun = null;
    await selectClient(Number(state.selectedClientId || state.projects[0].id));
  }
}

async function getProjectDetail(projectId, force = false) {
  if (!force && state.projectDetails[projectId]) {
    return state.projectDetails[projectId];
  }
  const detail = await api(`/api/projects/${projectId}`);
  state.projectDetails[projectId] = detail;
  return detail;
}

function renderProjectTables(detail) {
  const sites = detail.sites || [];
  const pages = detail.pages || [];
  const runs = detail.runs || [];
  return `
    <div class="project-tables">
      <section class="data-section">
        <h3>Sites</h3>
        ${sites.length ? table(["Domain", "Name"], sites.map((s) => `
          <tr><td>${htmlEscape(s.domain)}</td><td>${htmlEscape(s.name)}</td></tr>
        `)) : `<div class="note-box">No sites have been added.</div>`}
      </section>
      <section class="data-section">
        <h3>Pages</h3>
        ${pages.length ? table(["Site", "URL", "Title"], pages.map((p) => `
          <tr><td>${htmlEscape(p.site_domain)}</td><td class="url-cell">${htmlEscape(p.url)}</td><td>${htmlEscape(p.title)}</td></tr>
        `)) : `<div class="note-box">No pages have been added.</div>`}
      </section>
      <section class="data-section">
        <h3>Cora Report History</h3>
        ${runs.length ? table(["Keyword", "Target", "Imported", ""], runs.map((r) => `
          <tr>
            <td>${htmlEscape(r.keyword)}</td>
            <td class="url-cell">${htmlEscape(r.target_url || r.target_domain || "")}</td>
            <td>${fmtDate(r.imported_at)}</td>
            <td><button class="link-button project-run-open" data-run-id="${r.id}">Open run</button></td>
          </tr>
        `)) : `<div class="note-box">No Cora runs are assigned to this project yet.</div>`}
      </section>
    </div>
  `;
}

function lastRunForKeyword(keyword, runs) {
  const run = runs.find((item) => Number(item.keyword_id) === Number(keyword.id) || item.keyword === keyword.keyword);
  return run ? fmtDate(run.imported_at) : "";
}

async function selectProject(projectId) {
  state.selectedClientId = String(projectId);
  state.selectedProjectId = projectId;
  state.selectedRunId = null;
  renderProjects();
  renderRuns();
  const detail = await getProjectDetail(projectId, true);
  const project = detail.project;
  const sites = detail.sites || [];
  const pages = detail.pages || [];
  const keywords = detail.keywords || [];
  const mainUrl = pages[0]?.url || sites[0]?.domain || "";

  el("empty-state").classList.add("hidden");
  el("cora-settings-detail").classList.add("hidden");
  el("run-detail").classList.add("hidden");
  el("compare-detail").classList.add("hidden");
  el("project-detail").classList.remove("hidden");
  el("project-detail").innerHTML = `
    <div class="detail-head">
      <div>
        <h2>${htmlEscape(project.name)}</h2>
        <p>${htmlEscape(mainUrl || "No Main URL stored")} | ${htmlEscape(project.profile_name || "No Cora profile attached")}</p>
      </div>
    </div>
    <div class="metrics project-metrics">
      <div><span>${fmtNum(sites.length)}</span><label>URLs</label></div>
      <div><span>${fmtNum(pages.length)}</span><label>Pages</label></div>
      <div><span>${fmtNum(keywords.length)}</span><label>Keywords</label></div>
      <div><span>${fmtNum((detail.runs || []).length)}</span><label>Runs</label></div>
    </div>
    <section class="client-panel client-tool-launcher">
      <div class="panel-head">
        <div>
          <h3>Client Run Tools</h3>
          <p>Use this client's URL, keywords, and saved variables in each tool.</p>
        </div>
      </div>
      <div class="client-tool-launcher-actions">
        <button type="button" class="secondary client-tool-open" data-tool-view="cora-view">Run Cora</button>
        <button type="button" class="secondary client-tool-open" data-tool-view="ranking-snapshot-view">Ranking Snapshot</button>
        <button type="button" class="secondary client-tool-open" data-tool-view="entity-view">Entity &amp; LSI Explorer</button>
      </div>
    </section>
    <section class="client-panel primary-target-panel">
      <div class="panel-head">
        <div>
          <h3>Primary Target</h3>
          <p>${sites[0]?.domain ? `Domain: ${htmlEscape(sites[0].domain)}` : "No domain stored yet"}</p>
        </div>
      </div>
      <form id="add-page-form" class="primary-target-form">
        <input id="page-url" type="text" placeholder="https://example.com/" value="${htmlEscape(pages[0]?.url || mainUrl || "")}">
        <button type="submit">Save Target</button>
        <select id="page-site" class="hidden" aria-hidden="true">${optionRows(sites, sites[0]?.id || "", (s) => s.domain, false)}</select>
        <input id="page-title" type="hidden" value="${htmlEscape(pages[0]?.title || "")}">
      </form>
      <details class="advanced-url-details">
        <summary>Additional Domains & Pages</summary>
        <p class="advanced-url-help">Use this only when a client has more than one domain or different keywords need different target pages.</p>
        <form id="add-site-form" class="main-url-form compact">
          <input id="site-domain" type="text" placeholder="additional-domain.com">
          <input id="site-name" type="text" placeholder="Optional display name">
          <button type="submit" class="secondary">Add Domain</button>
        </form>
        <div class="advanced-url-list">
          ${sites.length ? table(["Domain", "Name"], sites.map((site) => `
            <tr><td>${htmlEscape(site.domain)}</td><td>${htmlEscape(site.name || "")}</td></tr>
          `)) : `<div class="note-box">No domains stored yet.</div>`}
        </div>
      </details>
    </section>
    <div class="client-workspace client-profile-workspace">
      <section class="client-panel">
        <div class="panel-head">
          <h3>Keywords</h3>
          <div class="keyword-actions">
            <button id="select-all-keywords" type="button" class="secondary">Select All</button>
            <button id="clear-keywords" type="button" class="secondary">Clear</button>
          </div>
        </div>
        <form id="add-keyword-form" class="keyword-add-form">
          <div class="keyword-add-main">
            <input id="keyword-text" type="text" placeholder="Add one keyword">
            <button type="submit">Add</button>
          </div>
          <div class="keyword-add-options">
            <select id="keyword-site">${optionRows(sites, "", (s) => s.domain)}</select>
            <select id="keyword-page">${optionRows(pages, "", (p) => p.url)}</select>
            <input id="keyword-intent" type="text" placeholder="Intent">
            <input id="keyword-priority" type="text" placeholder="Priority">
          </div>
        </form>
        <form id="bulk-keyword-form" class="bulk-keyword-form">
          <textarea id="bulk-keywords" placeholder="Paste keywords, one per line"></textarea>
          <button type="submit" class="secondary">Add Keywords</button>
        </form>
        <div class="keyword-table-wrap">
          ${keywords.length ? table(["", "Keyword", "Target", "Intent", "Priority", "Last Run"], keywords.map((k) => `
            <tr>
              <td><input class="keyword-check" type="checkbox" value="${k.id}"></td>
              <td><strong>${htmlEscape(k.keyword)}</strong></td>
              <td class="url-cell">${htmlEscape(k.page_url || k.site_domain || mainUrl || "")}</td>
              <td>${htmlEscape(k.intent)}</td>
              <td>${htmlEscape(k.priority)}</td>
              <td>${htmlEscape(lastRunForKeyword(k, detail.runs || []))}</td>
            </tr>
          `)) : `<div class="note-box">Add keywords to run Cora reports or other tools.</div>`}
        </div>
      </section>
    </div>
    ${renderProjectTables(detail)}
  `;
  bindProjectDetailForms(projectId, detail);
}

async function selectClient(projectId) {
  state.selectedClientId = String(projectId);
  state.selectedRunId = null;
  state.selectedRun = null;
  renderClientSelect();
  renderProjects();
  if (state.activeView === "clients-view") {
    await selectProject(projectId);
  } else if (state.activeView === "cora-view") {
    await renderCoraTool();
  } else if (state.activeView === "new-client-view") {
    renderProfileSelect();
  } else if (state.activeView === "cora-profiles-view") {
    await renderCoraProfilesPage();
  } else if (state.activeView === "entity-view") {
    await renderEntityExplorer();
  } else if (state.activeView === "ranking-snapshot-view") {
    await renderRankingSnapshotTool();
  } else if (state.activeView === "ranking-targets-view") {
    await renderSavedRankingTargetsPage();
  } else if (state.activeView === "entity-crossover-view") {
    await renderEntityCrossoverPage();
  } else if (state.activeView === "entity-batch-detail-view") {
    state.selectedEntityLsiBatchId = null;
    await renderEntityBatchDetailPage();
  } else if (state.activeView === "entity-sets-view") {
    await renderEntitySetsPage();
  } else if (state.activeView === "tools2-view") {
    await renderPlaceholderTool("tools2-tool-content", "Tools 2");
  } else if (state.activeView === "aeo-view") {
    await renderPlaceholderTool("aeo-tool-content", "AEO Tool");
  }
}

function bindProjectDetailForms(projectId, detail) {
  el("select-all-keywords")?.addEventListener("click", () => {
    document.querySelectorAll(".keyword-check").forEach((box) => { box.checked = true; });
  });
  el("clear-keywords")?.addEventListener("click", () => {
    document.querySelectorAll(".keyword-check").forEach((box) => { box.checked = false; });
  });
  document.querySelectorAll(".client-tool-open").forEach((button) => {
    button.addEventListener("click", () => showMainView(button.dataset.toolView));
  });
  el("add-site-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/sites", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        domain: el("site-domain").value.trim(),
        name: el("site-name").value.trim() || undefined,
      }),
    });
    delete state.projectDetails[projectId];
    await loadProjects();
    await selectProject(projectId);
  });

  el("add-page-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/pages", {
      method: "POST",
      body: JSON.stringify({
        site_id: el("page-site").value,
        url: el("page-url").value.trim(),
        title: el("page-title").value.trim() || undefined,
      }),
    });
    delete state.projectDetails[projectId];
    await loadProjects();
    await selectProject(projectId);
  });

  el("add-keyword-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const pageId = el("keyword-page").value || null;
    const page = (detail.pages || []).find((p) => Number(p.id) === Number(pageId));
    await api("/api/keywords", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        keyword: el("keyword-text").value.trim(),
        site_id: el("keyword-site").value || page?.site_id || null,
        page_id: pageId,
        intent: el("keyword-intent").value.trim() || undefined,
        priority: el("keyword-priority").value.trim() || undefined,
      }),
    });
    delete state.projectDetails[projectId];
    await loadProjects();
    await selectProject(projectId);
  });

  el("bulk-keyword-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = el("bulk-keywords").value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!values.length) {
      toast("Paste at least one keyword.");
      return;
    }
    const pageId = el("keyword-page").value || null;
    const page = (detail.pages || []).find((p) => Number(p.id) === Number(pageId));
    for (const keyword of values) {
      await api("/api/keywords", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          keyword,
          site_id: el("keyword-site").value || page?.site_id || null,
          page_id: pageId,
        }),
      });
    }
    delete state.projectDetails[projectId];
    await loadProjects();
    await selectProject(projectId);
  });

  document.querySelectorAll(".project-run-open").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openRun(Number(button.dataset.runId));
    });
  });
}

function updateClientToolState() {
  return;
}

async function runSelectedClientTool(event, projectId, tool = "cora", profileSelectId = "tool-cora-profile", scope = document) {
  event.preventDefault();
  const keywordIds = Array.from(scope.querySelectorAll(".tool-keyword-check:checked")).map((box) => Number(box.value));
  if (!keywordIds.length) {
    toast("Select one or more keywords.");
    return;
  }
  const profileValue = profileSelectId ? (scope.querySelector(`#${profileSelectId}`)?.value || el(profileSelectId)?.value || undefined) : undefined;
  const data = await api("/api/tools/run", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      keyword_ids: keywordIds,
      tool,
      cora_profile: profileValue,
    }),
  });
  if (data.placeholder) {
    toast(data.message);
    return;
  }
  toast(`Queued ${data.jobs.length} Cora report${data.jobs.length === 1 ? "" : "s"}.`);
  await loadJobs();
}

function clientSummary(detail) {
  const project = detail?.project || selectedClient() || {};
  const keywords = detail?.keywords || [];
  const mainUrl = clientMainUrl(detail);
  return `
    <div class="detail-head">
      <div>
        <h2>${htmlEscape(project.name || "Select a client")}</h2>
        <p>${htmlEscape(mainUrl || "No Main URL stored")} | ${fmtNum(keywords.length)} keywords</p>
      </div>
    </div>
  `;
}

function coraToolStatusStrip(detail, jobs) {
  const project = detail?.project || selectedClient() || {};
  const keywords = detail?.keywords || [];
  const mainUrl = clientMainUrl(detail);
  const complete = jobs.filter((job) => job.status === "imported").length;
  const active = jobs.filter((job) => ["running", "submitting"].includes(job.status)).length;
  const queued = jobs.filter((job) => job.status === "queued").length;
  const failed = jobs.filter((job) => ["error", "timeout", "stopped"].includes(job.status)).length;
  const queueLabel = state.queueSummary?.label || (active ? "running" : (queued ? "queued" : "idle"));
  return `
    <section class="cora-status-strip">
      <div class="cora-status-primary">
        <label>Client</label>
        <strong>${htmlEscape(project.name || "Select a client")}</strong>
        <span>${htmlEscape(mainUrl || "No Main URL stored")}</span>
      </div>
      <div>
        <label>Attached Cora Profile</label>
        <strong>${htmlEscape(project.profile_name || "No profile attached")}</strong>
        <span>${project.profile_name ? "Default for this client" : "Attach one from Cora Profiles"}</span>
      </div>
      <div>
        <label>Keywords</label>
        <strong>${fmtNum(keywords.length)}</strong>
        <span>Available for this client</span>
      </div>
      <div>
        <label>Queue</label>
        <strong>${queueStateText(queueLabel)}</strong>
        <span>${complete} complete, ${queued} queued, ${failed} failed</span>
      </div>
    </section>
  `;
}

function keywordChecklist(detail) {
  const keywords = detail?.keywords || [];
  if (!keywords.length) return `<div class="note-box">Add keywords on the Clients page before running this tool.</div>`;
  return `
    <div class="tool-keyword-list">
      ${keywords.map((keyword) => `
        <label class="tool-keyword-row">
          <input class="tool-keyword-check" type="checkbox" value="${keyword.id}">
          <span>
            <strong>${htmlEscape(keyword.keyword)}</strong>
            <small>${htmlEscape(keyword.page_url || keyword.site_domain || "")}</small>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

function toolProfileOptions(selectedName = "") {
  return [`<option value="">Use attached client profile</option>`].concat(
    state.profiles.map((profile) => {
      const selected = profile.name === selectedName ? " selected" : "";
      return `<option value="${htmlEscape(profile.name)}"${selected}>${htmlEscape(profile.name)}</option>`;
    })
  ).join("");
}

function profileIdOptions(selectedId = "") {
  return [`<option value="">Select existing Cora profile</option>`].concat(
    state.profiles.map((profile) => {
      const selected = String(profile.id) === String(selectedId || "") ? " selected" : "";
      const count = Number(profile.project_count || 0);
      const suffix = count ? ` (${count} client${count === 1 ? "" : "s"})` : "";
      return `<option value="${profile.id}"${selected}>${htmlEscape(profile.name)}${suffix}</option>`;
    })
  ).join("");
}

async function currentClientDetail() {
  const projectId = Number(state.selectedClientId || state.selectedProjectId || state.projects[0]?.id || 0);
  if (!projectId) return null;
  state.selectedClientId = String(projectId);
  return getProjectDetail(projectId, true);
}

async function renderCoraTool() {
  const root = el("cora-tool-content");
  const detail = await currentClientDetail();
  if (!detail) {
    root.innerHTML = toolEmptyState("Cora");
    bindToolEmptyActions(root);
    return;
  }
  const project = detail.project;
  const matchedProfile = project.profile_name || state.profiles.find((profile) => profile.name.toLowerCase() === project.name.toLowerCase())?.name || "";
  const attachedProfile = project.profile_name || "";
  const coraJobs = state.jobs.filter((job) => Number(job.project_id) === Number(project.id) && (job.tool || "cora") === "cora");
  root.innerHTML = `
    <div class="cora-tool-page">
      <div id="cora-status-strip-slot">${coraToolStatusStrip(detail, coraJobs)}</div>
      <div class="cora-workspace">
        <section class="client-panel cora-run-panel">
          <div class="panel-head">
            <div>
              <h3>Run Cora Reports</h3>
              <p>Uses the selected client URL, keywords, and attached Cora profile.</p>
            </div>
          </div>
          <div class="cora-profile-inline">
            <div class="profile-summary-box">
              <label>Active Profile</label>
              <strong>${htmlEscape(attachedProfile || "No profile attached")}</strong>
              <p>${attachedProfile ? "This profile will be used unless a run override is selected." : (matchedProfile ? `Matched by name to ${htmlEscape(matchedProfile)}. Attach it from Cora Profiles to make it explicit.` : "Set this up from the Cora Profiles page.")}</p>
            </div>
            <div class="cora-profile-actions">
              <label>
                Run Override
                <select id="tool-cora-profile">${toolProfileOptions("")}</select>
              </label>
              <button id="tool-cora-settings" type="button" class="secondary">Cora Profiles</button>
            </div>
          </div>
          <div class="panel-head cora-keyword-head">
            <h3>Keywords</h3>
            <div class="keyword-actions">
              <button id="tool-select-all" type="button" class="secondary">Select All</button>
              <button id="tool-clear-selection" type="button" class="secondary">Clear</button>
            </div>
          </div>
          ${keywordChecklist(detail)}
          <button id="tool-run-cora" type="button">Run Selected Keywords</button>
        </section>
        <aside class="cora-side-panel">
          <div id="cora-queue-summary-slot">${renderCoraQueueSummary(coraJobs)}</div>
          <div id="cora-health-panel-slot">${renderCoraHealthPanel(coraJobs)}</div>
        </aside>
      </div>
      <section class="client-panel tool-history cora-history-panel">
        <div class="panel-head">
          <h3>Cora Jobs</h3>
          <button id="refresh-jobs-inline" type="button" class="secondary">Refresh</button>
        </div>
        <div id="cora-inline-jobs">${renderJobCards(coraJobs)}</div>
      </section>
      <section class="client-panel cora-activity-panel">
        ${renderCoraLiveLog()}
      </section>
    </div>
  `;
  el("tool-select-all").addEventListener("click", () => {
    document.querySelectorAll(".tool-keyword-check").forEach((box) => { box.checked = true; });
  });
  el("tool-clear-selection").addEventListener("click", () => {
    document.querySelectorAll(".tool-keyword-check").forEach((box) => { box.checked = false; });
  });
  el("tool-run-cora").addEventListener("click", (event) => runSelectedClientTool(event, Number(project.id), "cora", "tool-cora-profile", root).catch((err) => toast(err.message)));
  el("tool-cora-settings").addEventListener("click", () => showMainView("cora-profiles-view"));
  el("refresh-jobs-inline")?.addEventListener("click", () => loadJobs().catch((err) => toast(err.message)));
  bindQueueControls();
  bindCoraLiveLogControls(root);
  bindJobLinks(root);
}

function currentCoraToolJobs() {
  const projectId = Number(state.selectedClientId || state.selectedProjectId || 0);
  if (!projectId) return [];
  return state.jobs.filter((job) => Number(job.project_id) === projectId && (job.tool || "cora") === "cora");
}

function currentCoraToolDetail() {
  const projectId = Number(state.selectedClientId || state.selectedProjectId || 0);
  if (!projectId) return null;
  if (state.projectDetails[projectId]) return state.projectDetails[projectId];
  const project = selectedClient();
  return project ? { project, keywords: [] } : null;
}

function refreshCoraToolJobPanels() {
  if (state.activeView !== "cora-view" || !el("cora-tool-content")) return;
  const jobs = currentCoraToolJobs();
  const detail = currentCoraToolDetail();
  if (!detail) return;

  const statusSlot = el("cora-status-strip-slot");
  if (statusSlot) statusSlot.innerHTML = coraToolStatusStrip(detail, jobs);

  const queueSlot = el("cora-queue-summary-slot");
  if (queueSlot) queueSlot.innerHTML = renderCoraQueueSummary(jobs);

  const healthSlot = el("cora-health-panel-slot");
  if (healthSlot) healthSlot.innerHTML = renderCoraHealthPanel(jobs);

  const jobsSlot = el("cora-inline-jobs");
  if (jobsSlot) {
    jobsSlot.innerHTML = renderJobCards(jobs);
    bindJobLinks(jobsSlot);
  }
  bindQueueControls();
}

async function attachClientCoraProfile(event, projectId) {
  event.preventDefault();
  const profileId = el("profiles-cora-attach-profile")?.value || "";
  const profileName = el("profiles-cora-new-profile")?.value.trim() || "";
  if (!profileId && !profileName) {
    toast("Select an existing Cora profile or enter a new profile name.");
    return;
  }
  const data = await api(`/api/projects/${projectId}/profile`, {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileName ? undefined : profileId,
      profile_name: profileName || undefined,
    }),
  });
  await loadProfiles();
  delete state.projectDetails[projectId];
  await loadProjects();
  state.selectedClientId = String(projectId);
  state.selectedProjectId = projectId;
  if (data.project?.profile_name) {
    await api("/api/cora/settings", {
      method: "POST",
      body: JSON.stringify({ profile: data.project.profile_name }),
    }).catch(() => {});
  }
  await renderCoraProfilesPage();
  toast(`Attached Cora profile: ${data.project?.profile_name || "None"}`);
}

async function detachClientCoraProfile(projectId) {
  await api(`/api/projects/${projectId}/profile`, {
    method: "POST",
    body: JSON.stringify({ detach: true }),
  });
  delete state.projectDetails[projectId];
  await loadProjects();
  state.selectedClientId = String(projectId);
  state.selectedProjectId = projectId;
  await renderCoraProfilesPage();
  toast("Cora profile detached from client.");
}

async function toggleCoraToolSettings() {
  const root = el("cora-tool-settings");
  if (!root) return;
  if (!root.classList.contains("hidden")) {
    root.classList.add("hidden");
    root.innerHTML = "";
    return;
  }
  renderCoraToolSettings();
  await loadDomainLists("tool");
}

async function renderCoraProfilesPage() {
  const root = el("cora-profiles-content");
  if (!root) return;
  await Promise.all([loadProjects(), loadProfiles()]);
  const detail = await currentClientDetail();
  let domainError = "";
  let coraSettings = {};
  try {
    const domains = await api("/api/cora/domains");
    if (domains.error) throw new Error(domains.error);
    state.domainLists = domains;
  } catch (err) {
    domainError = err.message || "Cora domain lists could not be loaded.";
  }
  coraSettings = await api("/api/cora/settings").catch((err) => ({ error: err.message }));
  if (!detail) {
    root.innerHTML = `<div class="empty-state">Create or select a client first.</div>`;
    return;
  }
  const project = detail.project;
  const attachedProfile = project.profile_name || "";
  root.innerHTML = `
    <div class="detail-head">
      <div>
        <h2>Cora Profiles</h2>
        <p>Attach Cora profiles to clients and manage shared Cora setup lists.</p>
      </div>
    </div>
    <section class="profile-status-strip">
      <div>
        <label>Client</label>
        <strong>${htmlEscape(project.name)}</strong>
      </div>
      <div>
        <label>Attached Cora Profile</label>
        <strong>${htmlEscape(attachedProfile || "No profile attached")}</strong>
      </div>
    </section>
    <div class="profile-setup-grid">
      <section class="client-panel">
        <h3>Attach Profile</h3>
        <form id="profiles-cora-profile-attach" class="cora-profile-form">
          <label>
            Existing Cora Profile
            <select id="profiles-cora-attach-profile">${profileIdOptions(project.profile_id)}</select>
          </label>
          <label>
            Create New Cora Profile
            <input id="profiles-cora-new-profile" type="text" placeholder="${htmlEscape(project.name)} Cora Profile" autocomplete="off">
          </label>
          <div class="form-actions">
            <button type="submit">Attach Profile</button>
            <button id="profiles-cora-detach-profile" type="button" class="secondary">Detach</button>
          </div>
        </form>
        <p class="panel-note">${attachedProfile ? "The attached profile will be used by Cora runs for this client unless a run override is selected." : "Choose an existing profile or create a new one for this client."}</p>
      </section>
      <section class="client-panel">
        <h3>Available Profiles</h3>
        ${state.profiles.length ? table(["Profile", "Clients"], state.profiles.map((profile) => `
          <tr>
            <td>${htmlEscape(profile.name)}</td>
            <td>${fmtNum(profile.project_count || 0)}</td>
          </tr>
        `)) : `<div class="note-box">No Cora profiles loaded yet.</div>`}
      </section>
      <section class="client-panel profile-editor-panel">
        <div class="panel-head">
          <div>
            <h3>Profile Editor</h3>
            <p>Edit dashboard metadata, apply a profile in Cora, or save current Cora settings into the profile.</p>
          </div>
        </div>
        ${renderCoraProfileEditor(project, coraSettings)}
      </section>
      <section class="client-panel profile-domain-panel">
        <div class="panel-head">
          <div>
            <h3>Cora Domain Lists</h3>
            <p>Shared native Cora tracked domains, competitors, and crawl lists.</p>
          </div>
        </div>
        ${domainError ? `<div class="note-box">${htmlEscape(domainError)}</div>` : renderCoraDomainListForm("profiles")}
      </section>
    </div>
  `;
  el("profiles-cora-profile-attach").addEventListener("submit", (event) => attachClientCoraProfile(event, Number(project.id)).catch((err) => toast(err.message)));
  el("profiles-cora-detach-profile").addEventListener("click", () => detachClientCoraProfile(Number(project.id)).catch((err) => toast(err.message)));
  bindCoraProfileEditor(project);
  if (!domainError) {
    renderDomainLists("profiles");
    bindCoraDomainListForm("profiles");
  }
}

function renderCoraProfileEditor(project, coraSettings = {}) {
  if (!state.profiles.length) {
    return `<div class="note-box">Create or pull a Cora profile first.</div>`;
  }
  const selectedId = String(project.profile_id || state.profiles[0]?.id || "");
  const selected = state.profiles.find((profile) => String(profile.id) === selectedId) || state.profiles[0] || {};
  const settingsError = coraSettings.error ? `<div class="note-box">${htmlEscape(coraSettings.error)}</div>` : "";
  return `
    <form id="cora-profile-editor-form" class="cora-profile-editor-form">
      <label>
        Profile
        <select id="profile-editor-select">
          ${state.profiles.map((profile) => `<option value="${profile.id}"${String(profile.id) === String(selected.id) ? " selected" : ""}>${htmlEscape(profile.name)}</option>`).join("")}
        </select>
      </label>
      <label>
        Profile Name
        <input id="profile-editor-name" type="text" value="${htmlEscape(selected.name || "")}" autocomplete="off">
      </label>
      <label>
        Client Label
        <input id="profile-editor-client" type="text" value="${htmlEscape(selected.client || "")}" autocomplete="off">
      </label>
      <label class="wide">
        Notes
        <textarea id="profile-editor-notes">${htmlEscape(selected.notes || "")}</textarea>
      </label>
      <div class="profile-editor-actions">
        <button type="submit">Save Metadata</button>
        <button id="profile-editor-apply-cora" type="button" class="secondary">Apply in Cora</button>
        <button id="profile-editor-push-cora" type="button" class="secondary">Push Current Cora Settings</button>
        <button id="profile-editor-pull-cora" type="button" class="secondary">Pull Current Cora Settings</button>
        <button id="profile-editor-archive" type="button" class="danger">Archive Profile</button>
      </div>
    </form>
    <div id="profile-editor-cora-settings" class="profile-cora-settings">
      ${settingsError || renderCoraSettingsSnapshot(coraSettings)}
    </div>
  `;
}

function renderCoraSettingsSnapshot(settings = {}) {
  if (!settings || settings.error) return `<div class="note-box">Current Cora settings are not available.</div>`;
  return `
    <div class="profile-cora-snapshot">
      <div><label>Active Cora Profile</label><strong>${htmlEscape(settings.profile || "None")}</strong></div>
      <div><label>Country</label><strong>${htmlEscape(settings.country || "")}</strong></div>
      <div><label>Language</label><strong>${htmlEscape(settings.language || "")}</strong></div>
      <div><label>Platform</label><strong>${htmlEscape(settings.platform || "")}</strong></div>
      <div><label>Searches</label><strong>${htmlEscape(settings.searches || "")}</strong></div>
      <div><label>Near</label><strong>${htmlEscape(settings.near || "")}</strong></div>
      <div class="wide"><label>Output Directory</label><strong>${htmlEscape(settings.outputDirectory || "")}</strong></div>
    </div>
    <p class="panel-note">Push Current Cora Settings saves this snapshot inside Cora under the selected profile name.</p>
  `;
}

function selectedEditorProfile() {
  const id = el("profile-editor-select")?.value || "";
  return state.profiles.find((profile) => String(profile.id) === String(id)) || null;
}

function fillProfileEditor(profile) {
  if (!profile) return;
  el("profile-editor-name").value = profile.name || "";
  el("profile-editor-client").value = profile.client || "";
  el("profile-editor-notes").value = profile.notes || "";
}

async function saveProfileEditor(event) {
  event.preventDefault();
  const profile = selectedEditorProfile();
  if (!profile) {
    toast("Choose a profile to edit.");
    return;
  }
  const data = await api(`/api/profiles/${profile.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: el("profile-editor-name").value.trim(),
      client: el("profile-editor-client").value.trim(),
      notes: el("profile-editor-notes").value.trim(),
    }),
  });
  await loadProfiles();
  toast(`Saved profile metadata: ${data.profile?.name || ""}`);
  await renderCoraProfilesPage();
}

async function applyEditorProfileInCora() {
  const profile = selectedEditorProfile();
  if (!profile) {
    toast("Choose a profile to apply.");
    return;
  }
  const result = await api(`/api/profiles/${profile.id}/apply-cora`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  const settings = await api("/api/cora/settings").catch((err) => ({ error: err.message }));
  const box = el("profile-editor-cora-settings");
  if (box) box.innerHTML = renderCoraSettingsSnapshot(settings);
  toast(result.cora?.error ? `Cora returned: ${result.cora.error}` : `Applied profile in Cora: ${profile.name}`);
}

async function pushEditorProfileToCora() {
  const profile = selectedEditorProfile();
  if (!profile) {
    toast("Choose a profile to push.");
    return;
  }
  const confirmed = window.confirm(`Save current Cora settings into profile "${profile.name}"?`);
  if (!confirmed) return;
  const result = await api(`/api/profiles/${profile.id}/push-cora`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  await loadProfiles();
  toast(result.cora?.error ? `Cora returned: ${result.cora.error}` : `Pushed current Cora settings into ${profile.name}`);
  await renderCoraProfilesPage();
}

async function pullEditorCoraSettings() {
  const settings = await api("/api/cora/settings");
  const box = el("profile-editor-cora-settings");
  if (box) box.innerHTML = renderCoraSettingsSnapshot(settings);
  toast("Pulled current Cora settings.");
}

async function archiveEditorProfile() {
  const profile = selectedEditorProfile();
  if (!profile) {
    toast("Choose a profile to archive.");
    return;
  }
  const confirmed = window.confirm(`Archive "${profile.name}" and detach it from clients?`);
  if (!confirmed) return;
  await api(`/api/profiles/${profile.id}`, { method: "DELETE" });
  await loadProfiles();
  toast(`Archived profile: ${profile.name}`);
  await renderCoraProfilesPage();
}

function bindCoraProfileEditor() {
  el("profile-editor-select")?.addEventListener("change", () => fillProfileEditor(selectedEditorProfile()));
  el("cora-profile-editor-form")?.addEventListener("submit", (event) => saveProfileEditor(event).catch((err) => toast(err.message)));
  el("profile-editor-apply-cora")?.addEventListener("click", () => applyEditorProfileInCora().catch((err) => toast(err.message)));
  el("profile-editor-push-cora")?.addEventListener("click", () => pushEditorProfileToCora().catch((err) => toast(err.message)));
  el("profile-editor-pull-cora")?.addEventListener("click", () => pullEditorCoraSettings().catch((err) => toast(err.message)));
  el("profile-editor-archive")?.addEventListener("click", () => archiveEditorProfile().catch((err) => toast(err.message)));
}

function renderCoraDomainListForm(scope = "main") {
  const id = (value) => domainListId(scope, value);
  return `
    <form id="${id("domain-lists-form")}" class="domain-lists-form">
      <section class="editable-list-panel">
        <h3>Tracked Domains</h3>
        <div class="inline-add">
          <input id="${id("domains-tracked-new")}" type="text" placeholder="domain.com" autocomplete="off">
          <button id="${id("domains-tracked-add")}" type="button">Add</button>
        </div>
        <div id="${id("domains-tracked-list")}" class="editable-list"></div>
      </section>
      <section class="editable-list-panel">
        <h3>Competitors</h3>
        <div class="inline-add">
          <input id="${id("domains-competitors-new")}" type="text" placeholder="competitor.com" autocomplete="off">
          <button id="${id("domains-competitors-add")}" type="button">Add</button>
        </div>
        <div id="${id("domains-competitors-list")}" class="editable-list"></div>
      </section>
      <label>Banned Domains<textarea id="${id("domains-banned")}" spellcheck="false"></textarea></label>
      <label>Slow Render Domains<textarea id="${id("domains-slow-render")}" spellcheck="false"></textarea></label>
      <label>Stop Words<textarea id="${id("domains-stop-words")}" spellcheck="false"></textarea></label>
      <button type="submit">Save Cora Settings</button>
    </form>
  `;
}

function bindCoraDomainListForm(scope = "main") {
  const id = (value) => domainListId(scope, value);
  el(id("domain-lists-form"))?.addEventListener("submit", (event) => saveDomainLists(event, scope).catch((err) => toast(err.message)));
  el(id("domains-tracked-add"))?.addEventListener("click", () => addDomainListItem("tracked", scope));
  el(id("domains-competitors-add"))?.addEventListener("click", () => addDomainListItem("competitors", scope));
  el(id("domains-tracked-new"))?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDomainListItem("tracked", scope);
    }
  });
  el(id("domains-competitors-new"))?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDomainListItem("competitors", scope);
    }
  });
}

function secondsLabel(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

function queueStateText(label) {
  const labels = {
    running: "Running",
    queued: "Queued",
    paused: "Paused",
    stopping_after_current: "Stopping after current",
    stalled: "Possibly stalled",
    completed: "Completed",
    idle: "Idle",
  };
  return labels[label] || "Unknown";
}

function queueStateClass(label) {
  if (label === "running" || label === "queued") return "active";
  if (label === "completed" || label === "idle") return "ok";
  if (label === "stalled") return "error";
  return "warn";
}

function jobRetryText(job) {
  const retryCount = Number(job?.retry_count || 0);
  const maxRetries = Number(job?.max_retries || 0);
  const status = String(job?.status || "");
  if (!maxRetries || status === "imported") return "";
  if (retryCount <= 0 && !["queued", "running", "submitting"].includes(status)) return "";
  return `Attempt ${Math.min(retryCount + 1, maxRetries + 1)} of ${maxRetries + 1}`;
}

function renderCoraQueueSummary(jobs) {
  const ordered = [...jobs].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  const total = ordered.length;
  const complete = ordered.filter((job) => job.status === "imported").length;
  const runningJobs = ordered.filter((job) => ["running", "submitting"].includes(job.status));
  const queuedJobs = ordered.filter((job) => job.status === "queued");
  const attentionJobs = ordered.filter((job) => ["error", "timeout", "stopped"].includes(job.status));
  const stalledJobs = ordered.filter((job) => job.stalled);
  const running = runningJobs[0] || null;
  const next = queuedJobs[0] || null;
  const then = queuedJobs.slice(1, 4);
  const pct = total ? Math.round((complete / total) * 100) : 0;
  const fill = total ? Math.max(0, Math.min(100, pct)) : 0;
  const cora = state.coraStatus || {};
  const coraBusyBlank = cora.searchRunning && !cora.running && !String(cora.action || "").trim();
  const stalePaused = !running && queuedJobs.length && coraBusyBlank;
  const paused = state.queuePaused || stalePaused;
  const queueLabel = state.queueSummary?.label || (paused ? "paused" : (running ? "running" : (queuedJobs.length ? "queued" : "idle")));
  const queueClass = queueStateClass(queueLabel);
  const retryQueued = queuedJobs.filter((job) => Number(job.retry_count || 0) > 0).length;

  return `
    <section class="cora-queue-panel">
      <div class="cora-queue-head">
        <div>
          <h3>Cora Queue</h3>
          <p>${complete} of ${total} complete${attentionJobs.length ? `, ${attentionJobs.length} failed` : ""}${retryQueued ? `, ${retryQueued} retry queued` : ""}${state.queueAutoResume ? ", auto resume on idle" : ""}</p>
        </div>
        <div class="queue-actions">
          <span class="health-badge ${queueClass}">${queueStateText(queueLabel)}</span>
          <button id="queue-toggle" type="button" class="secondary">${state.queuePaused ? "Resume Queue" : "Pause Queue"}</button>
          <button id="queue-stop-after-current" type="button" class="secondary">${state.queueStopAfterCurrent ? "Stop Pending" : "Stop After Current"}</button>
          <button id="queue-auto-resume" type="button" class="secondary">${state.queueAutoResume ? "Auto Resume On" : "Auto Resume When Idle"}</button>
          <strong>${pct}%</strong>
        </div>
      </div>
      <div class="queue-progress" aria-label="${complete} of ${total} Cora jobs complete">
        <span style="width: ${fill}%"></span>
      </div>
      <div class="queue-stats">
        <span>${runningJobs.length} running</span>
        <span>${queuedJobs.length} queued</span>
        <span>${queueStateText(queueLabel).toLowerCase()}</span>
        <span>${stalledJobs.length} stalled</span>
        <span>${attentionJobs.length} issue${attentionJobs.length === 1 ? "" : "s"}</span>
      </div>
      <div class="queue-now-next">
        <div>
          <label>Running now</label>
          <strong>${running ? htmlEscape(running.keyword) : "None"}</strong>
          <p>${running ? `${htmlEscape(running.status_message || running.cora_action || running.status)}${running.seconds_since_activity !== null && running.seconds_since_activity !== undefined ? ` | last activity ${secondsLabel(running.seconds_since_activity)} ago` : ""}${jobRetryText(running) ? ` | ${jobRetryText(running)}` : ""}` : (paused ? "Queue paused. Queued jobs will not start until resumed." : "Waiting for the next queued job.")}</p>
        </div>
        <div>
          <label>Up next</label>
          <strong>${next ? htmlEscape(next.keyword) : "None"}</strong>
          <p>${next && jobRetryText(next) ? `${jobRetryText(next)}. ` : ""}${then.length ? `Then: ${then.map((job) => htmlEscape(job.keyword)).join(", ")}${queuedJobs.length > 4 ? `, +${queuedJobs.length - 4} more` : ""}` : "No additional queued keywords."}</p>
        </div>
      </div>
      ${state.queueStopAfterCurrent ? `<div class="queue-warning">Stop after current run is active. The running job can finish, then remaining queued jobs will stay paused.</div>` : ""}
      ${stalledJobs.length ? `<div class="queue-warning danger-warning">No progress has been detected for ${secondsLabel(stalledJobs[0].seconds_since_activity)}. The retry policy will stop and retry the job when the freeze threshold is reached.</div>` : ""}
      ${paused && !state.queueStopAfterCurrent ? `<div class="queue-warning">${state.queuePaused ? "Queue paused for maintenance." : "Queue paused: Cora reports busy but no action is running."}</div>` : ""}
    </section>
  `;
}

function renderCoraHealthPanel(jobs) {
  const cora = state.coraStatus || {};
  const activeJobs = jobs.filter((job) => ["running", "submitting"].includes(job.status));
  const queuedJobs = jobs.filter((job) => job.status === "queued");
  const stalledJobs = activeJobs.filter((job) => job.stalled);
  const running = activeJobs[0] || null;
  const action = String(cora.action || "").trim();
  const progress = Number(cora.progress);
  const isConnected = !cora.error;
  const isBusy = Boolean(cora.running || cora.searchRunning);
  const isQuiet = isConnected && isBusy && !action && (!Number.isFinite(progress) || progress === 0);
  let stateLabel = "Unknown";
  let stateClass = "warn";
  if (!isConnected) {
    stateLabel = "Disconnected";
    stateClass = "error";
  } else if (stalledJobs.length) {
    stateLabel = "Possibly stalled";
    stateClass = "error";
  } else if (isQuiet) {
    stateLabel = "Quiet / possibly stale";
    stateClass = "warn";
  } else if (isBusy) {
    stateLabel = "Running";
    stateClass = "active";
  } else {
    stateLabel = "Idle";
    stateClass = "ok";
  }
  const latestLog = state.coraLog.length ? state.coraLog[state.coraLog.length - 1] : "No recent log line loaded.";
  const progressLabel = Number.isFinite(progress) && progress > 0 ? `${Math.round(progress * 100)}%` : "0%";
  return `
    <section id="cora-health-panel" class="cora-health-panel">
      <div class="health-head">
        <div>
          <h3>Cora Health</h3>
          <p>${isConnected ? "API connected" : htmlEscape(cora.error || "API disconnected")}</p>
        </div>
        <span class="health-badge ${stateClass}">${stateLabel}</span>
      </div>
      <div class="health-grid">
        <div>
          <label>Current Keyword</label>
          <strong>${htmlEscape(cora.searchTerm || "None")}</strong>
        </div>
        <div>
          <label>Cora Action</label>
          <strong>${htmlEscape(action || "No visible action")}</strong>
        </div>
        <div>
          <label>Progress</label>
          <strong>${progressLabel}</strong>
        </div>
        <div>
          <label>Dashboard Jobs</label>
          <strong>${activeJobs.length} active, ${queuedJobs.length} queued</strong>
        </div>
        <div>
          <label>Last Job Activity</label>
          <strong>${running?.seconds_since_activity !== null && running?.seconds_since_activity !== undefined ? `${secondsLabel(running.seconds_since_activity)} ago` : "No active job"}</strong>
        </div>
      </div>
      <div class="health-log">
        <label>Last Log Line</label>
        <p id="cora-health-log-line">${htmlEscape(latestLog)}</p>
      </div>
      <div class="health-actions">
        <button id="cora-health-refresh" type="button" class="secondary">Refresh</button>
        <button id="cora-clear-stale" type="button" class="secondary">Clear Stale State</button>
        <button id="cora-stop-health" type="button" class="secondary">Stop Cora</button>
        <button id="cora-restart-health" type="button" class="secondary danger">Restart Cora</button>
      </div>
    </section>
  `;
}

function bindQueueControls() {
  const toggle = el("queue-toggle");
  if (toggle) {
    toggle.addEventListener("click", async () => {
      await setQueueState(!state.queuePaused, false);
    });
  }
  const stopAfterCurrent = el("queue-stop-after-current");
  if (stopAfterCurrent) {
    stopAfterCurrent.addEventListener("click", async () => {
      await setQueueState(true, false, !state.queueStopAfterCurrent, state.queueStopAfterCurrent ? "Queue paused" : "Stop after current run");
    });
  }
  const auto = el("queue-auto-resume");
  if (auto) {
    auto.addEventListener("click", async () => {
      await setQueueState(true, !state.queueAutoResume);
    });
  }
  el("cora-health-refresh")?.addEventListener("click", async () => {
    await refreshCoraStatus();
    await loadCoraLog();
    await loadJobs();
  });
  el("cora-clear-stale")?.addEventListener("click", () => clearStaleCoraState().catch((err) => toast(err.message)));
  el("cora-stop-health")?.addEventListener("click", () => forceStopCora().catch((err) => toast(err.message)));
  el("cora-restart-health")?.addEventListener("click", () => restartCora().catch((err) => toast(err.message)));
}

function renderCoraLiveLog() {
  const entries = mergedCoraActivityEntries();
  const filters = ["all", "queue", "job", "cora", "import", "error"];
  return `
    <div class="cora-live-log">
      <div class="live-log-head">
        <div>
          <h4>Live Activity</h4>
          <span id="cora-live-log-count">${entries.length ? `Latest ${entries.length}` : "Waiting for activity"}</span>
        </div>
        <div class="live-log-filters">
          ${filters.map((filter) => `<button class="live-log-filter ${state.activityFilter === filter ? "active" : ""}" type="button" data-filter="${filter}">${filter}</button>`).join("")}
        </div>
      </div>
      <div id="cora-live-log" class="live-log-box">${renderCoraLogEntries(entries)}</div>
    </div>
  `;
}

function bindCoraLiveLogControls(root = document) {
  root.querySelectorAll(".live-log-filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.activityFilter = button.dataset.filter || "all";
      root.querySelectorAll(".live-log-filter").forEach((item) => item.classList.toggle("active", item === button));
      updateCoraLiveLogBox();
    });
  });
}

function mergedCoraActivityEntries() {
  const dashboardEntries = state.coraActivity.map((entry) => ({
    kind: entry.kind || "system",
    level: entry.level || "info",
    text: `${fmtDate(entry.ts)} [${entry.kind || "system"}] ${entry.message || ""}`,
    ts: entry.ts || "",
  }));
  const coraEntries = state.coraLog.map((line) => ({
    kind: "cora",
    level: coraLogLineClass(line),
    text: line,
    ts: "",
  }));
  const entries = dashboardEntries.concat(coraEntries);
  const filter = state.activityFilter || "all";
  return entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "error") return entry.level === "error" || entry.kind === "error";
    return entry.kind === filter;
  }).slice(-120);
}

function renderCoraLogEntries(entries) {
  if (!entries.length) {
    return `<div class="live-log-line info">No activity for this filter yet.</div>`;
  }
  return entries.map((entry) => `<div class="live-log-line ${htmlEscape(entry.level || "info")}"><span>${htmlEscape(entry.kind || "log")}</span>${htmlEscape(entry.text || "")}</div>`).join("");
}

function coraLogLineClass(line) {
  const lower = String(line || "").toLowerCase();
  if (lower.includes("error")) return "error";
  if (lower.includes("warn") || lower.includes("waiting")) return "warn";
  if (lower.includes("started") || lower.includes("complete") || lower.includes("spawning") || lower.includes("queued")) return "highlight";
  return "info";
}

async function loadCoraLog() {
  if (state.activeView !== "cora-view") return;
  let data = null;
  let activity = null;
  try {
    const response = await fetch("http://127.0.0.1:9090/api/log?lines=20");
    data = await response.json();
  } catch (_err) {
    data = await api("/api/cora/log?lines=80");
  }
  activity = await api("/api/activity?limit=120").catch(() => ({ entries: [] }));
  state.coraLog = compactCoraLogLines(data.lines || [], 80);
  state.coraActivity = activity.entries || [];
  updateCoraLiveLogBox();
  const healthLog = el("cora-health-log-line");
  if (healthLog && state.coraLog.length) {
    healthLog.textContent = state.coraLog[state.coraLog.length - 1];
  }
}

function updateCoraLiveLogBox() {
  const entries = mergedCoraActivityEntries();
  const box = el("cora-live-log");
  const key = JSON.stringify(entries.map((entry) => [entry.level, entry.kind, entry.text]));
  if (box) {
    const previousScrollTop = box.scrollTop;
    const wasNearBottom = box.scrollHeight - box.clientHeight - box.scrollTop < 24;
    if (key !== state.coraLiveLogKey) {
      box.innerHTML = renderCoraLogEntries(entries);
      box.scrollTop = wasNearBottom ? box.scrollHeight : previousScrollTop;
      state.coraLiveLogKey = key;
    }
  }
  const count = el("cora-live-log-count");
  if (count) {
    count.textContent = entries.length ? `Latest ${entries.length}` : "Waiting for activity";
  }
}

function compactCoraLogLines(rawLines, limit = 80) {
  const entries = [];
  rawLines.forEach((value) => {
    String(value || "").split(/(?=\b\d+\s+-\s)/).forEach((part) => {
      const line = part.replace(/<[^>]*>/g, "").trim();
      if (/^\d+\s+-\s/.test(line)) entries.push(line.slice(0, 500));
    });
  });
  return entries.slice(-limit);
}

function renderCoraToolSettings() {
  const root = el("cora-tool-settings");
  if (!root) return;
  root.classList.remove("hidden");
  root.innerHTML = `
    <div class="panel-head">
      <div>
        <h3>Cora Domain Lists</h3>
        <p>These are native Cora lists used by all Cora runs.</p>
      </div>
      <button id="tool-cora-settings-close" type="button" class="secondary">Hide</button>
    </div>
    <form id="tool-domain-lists-form" class="domain-lists-form">
      <section class="editable-list-panel">
        <h3>Tracked Domains</h3>
        <div class="inline-add">
          <input id="tool-domains-tracked-new" type="text" placeholder="domain.com" autocomplete="off">
          <button id="tool-domains-tracked-add" type="button">Add</button>
        </div>
        <div id="tool-domains-tracked-list" class="editable-list"></div>
      </section>
      <section class="editable-list-panel">
        <h3>Competitors</h3>
        <div class="inline-add">
          <input id="tool-domains-competitors-new" type="text" placeholder="competitor.com" autocomplete="off">
          <button id="tool-domains-competitors-add" type="button">Add</button>
        </div>
        <div id="tool-domains-competitors-list" class="editable-list"></div>
      </section>
      <label>Banned Domains<textarea id="tool-domains-banned" spellcheck="false"></textarea></label>
      <label>Slow Render Domains<textarea id="tool-domains-slow-render" spellcheck="false"></textarea></label>
      <label>Stop Words<textarea id="tool-domains-stop-words" spellcheck="false"></textarea></label>
      <button type="submit">Save Cora Settings</button>
    </form>
  `;
  renderDomainLists("tool");
  el("tool-cora-settings-close").addEventListener("click", () => {
    root.classList.add("hidden");
    root.innerHTML = "";
  });
  el("tool-domain-lists-form").addEventListener("submit", (event) => saveDomainLists(event, "tool").catch((err) => toast(err.message)));
  el("tool-domains-tracked-add").addEventListener("click", () => addDomainListItem("tracked", "tool"));
  el("tool-domains-competitors-add").addEventListener("click", () => addDomainListItem("competitors", "tool"));
  el("tool-domains-tracked-new").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDomainListItem("tracked", "tool");
    }
  });
  el("tool-domains-competitors-new").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDomainListItem("competitors", "tool");
    }
  });
}

const ENTITY_DEPTH_LABELS = {
  1: "Quick",
  2: "Light",
  3: "Standard",
  4: "Deep",
  5: "Comprehensive",
};

function savedLlmKeys() {
  return state.apiKeys.filter((key) => {
    const provider = (key.provider_key || "").toLowerCase();
    return ["openai", "anthropic", "google", "xai", "perplexity"].includes(provider);
  });
}

function providerForKey(keyId) {
  const saved = state.apiKeys.find((key) => String(key.id) === String(keyId));
  if (!saved) return null;
  return state.aiProviders.find((provider) => provider.key === saved.provider_key) || null;
}

function modelOptionsForKey(keyId) {
  const saved = state.apiKeys.find((key) => String(key.id) === String(keyId));
  const provider = providerForKey(keyId);
  const models = provider?.models?.length ? provider.models : [provider?.default_model, saved?.default_model].filter(Boolean);
  const unique = Array.from(new Set(models.filter(Boolean)));
  const selected = saved?.default_model || provider?.default_model || unique[0] || "";
  return unique.map((model) => `<option value="${htmlEscape(model)}"${model === selected ? " selected" : ""}>${htmlEscape(model)}</option>`).join("");
}

function entityModelTargets() {
  const targets = [];
  savedLlmKeys().forEach((key) => {
    const provider = providerForKey(key.id);
    const models = provider?.models?.length ? provider.models : [key.default_model, provider?.default_model].filter(Boolean);
    Array.from(new Set(models.filter(Boolean))).forEach((model) => {
      targets.push({
        api_key_id: key.id,
        provider: key.provider_name || key.provider,
        provider_key: key.provider_key,
        key_label: key.label,
        model,
        selected: model === (key.default_model || provider?.default_model || models[0]),
      });
    });
  });
  return targets;
}

function renderEntityModelPicker(targets) {
  if (!targets.length) {
    return `<div class="note-box">Add and test at least one saved LLM key in API Providers before running this tool.</div>`;
  }
  const grouped = targets.reduce((acc, target) => {
    const key = target.provider || "Provider";
    acc[key] = acc[key] || [];
    acc[key].push(target);
    return acc;
  }, {});
  return `
    <div class="entity-model-picker">
      ${Object.entries(grouped).map(([provider, providerTargets]) => `
        <section class="entity-model-provider">
          <div class="entity-model-provider-head">
            <strong>${htmlEscape(provider)}</strong>
            <button type="button" class="link-button entity-provider-toggle" data-provider="${htmlEscape(provider)}">Toggle</button>
          </div>
          ${providerTargets.map((target) => {
            const value = `${target.api_key_id}::${target.model}`;
            return `
              <label class="entity-model-option">
                <input class="entity-model-check" type="checkbox" value="${htmlEscape(value)}" data-api-key-id="${target.api_key_id}" data-model="${htmlEscape(target.model)}"${target.selected ? " checked" : ""}>
                <span>
                  <strong>${htmlEscape(target.model)}</strong>
                  <small>${htmlEscape(target.key_label || "Production")}</small>
                </span>
              </label>
            `;
          }).join("")}
        </section>
      `).join("")}
    </div>
  `;
}

async function loadEntityLsiRuns(projectId) {
  const data = await api(`/api/entity-lsi/runs?project_id=${encodeURIComponent(projectId)}`);
  state.entityLsiRuns = data.runs || [];
  if (state.selectedEntityLsiRunId && !state.entityLsiRuns.some((run) => Number(run.id) === Number(state.selectedEntityLsiRunId))) {
    state.selectedEntityLsiRunId = null;
  }
}

async function loadEntityLsiBatches(projectId) {
  const data = await api(`/api/entity-lsi/batches?project_id=${encodeURIComponent(projectId)}`);
  state.entityLsiBatches = data.batches || [];
  if (state.selectedEntityLsiBatchId && !state.entityLsiBatches.some((batch) => Number(batch.id) === Number(state.selectedEntityLsiBatchId))) {
    state.selectedEntityLsiBatchId = null;
  }
}

async function loadProjectCoraReports(projectId) {
  const params = new URLSearchParams();
  params.set("project_id", projectId);
  const data = await api(`/api/runs?${params.toString()}`);
  return data.runs || [];
}

async function loadEntitySets(projectId) {
  const data = await api(`/api/entity-sets?project_id=${encodeURIComponent(projectId)}`);
  state.entitySets = data.sets || [];
  return state.entitySets;
}

async function renderEntitySetsPage() {
  const root = el("entity-sets-content");
  const detail = await currentClientDetail();
  if (!detail) {
    root.innerHTML = toolEmptyState("Entity Sets");
    bindToolEmptyActions(root);
    return;
  }
  await loadEntitySets(detail.project.id);
  root.innerHTML = `
    <div class="client-tool-page entity-sets-page">
      ${clientToolContext(detail, "Entity Sets")}
      <section class="client-panel">
        <div class="detail-head">
          <div>
            <h2>Saved Entity Sets</h2>
            <p>Approved entities, LSI terms, and related keywords saved from crossover runs.</p>
          </div>
          <div class="detail-actions">
            <button id="entity-sets-refresh" type="button" class="secondary">Refresh</button>
            <button id="entity-sets-open-explorer" type="button" class="secondary">Entity Explorer</button>
          </div>
        </div>
        <div id="entity-sets-list">${renderEntitySetList(state.entitySets)}</div>
      </section>
    </div>
  `;
  bindEntitySetsPage();
}

function renderEntitySetList(sets) {
  if (!sets.length) {
    return `<div class="note-box">No saved entity sets yet. Open a batch detail page, select crossover rows, and save the selected terms.</div>`;
  }
  return `<div class="entity-set-list">${sets.map((set) => `
    <article class="entity-set-card" data-set-id="${set.id}">
      <div class="entity-set-card-head">
        <div>
          <h3>${htmlEscape(set.name)}</h3>
          <p>${fmtNum(set.term_count || 0)} terms${set.source_seed_keyword ? ` | Source: ${htmlEscape(set.source_seed_keyword)}` : ""}</p>
        </div>
        <div class="row-actions">
          <button type="button" class="secondary entity-set-load" data-set-id="${set.id}">Open</button>
          <button type="button" class="link-button entity-set-delete" data-set-id="${set.id}">Delete</button>
        </div>
      </div>
      <div class="entity-set-card-body muted">Saved ${fmtDate(set.created_at)} | Updated ${fmtDate(set.updated_at)}</div>
    </article>
  `).join("")}</div>`;
}

function renderEntitySetDetail(data) {
  const set = data.set || {};
  const terms = data.terms || [];
  const groups = terms.reduce((acc, term) => {
    const key = term.type || "entity";
    acc[key] = acc[key] || [];
    acc[key].push(term);
    return acc;
  }, {});
  const groupOrder = ["entity", "lsi", "related_keyword", "question", "topic_cluster"];
  const sections = groupOrder.filter((type) => groups[type]?.length).map((type) => `
    <section class="entity-set-term-group">
      <h4>${htmlEscape(type.replaceAll("_", " "))}</h4>
      ${table(["Term", "Sources", "Models"], groups[type].map((term) => `
        <tr>
          <td><strong>${htmlEscape(term.term)}</strong></td>
          <td>${fmtNum(term.source_count || 0)}</td>
          <td>${htmlEscape((term.sources || []).map((source) => `${source.provider || ""} ${source.model || ""}`.trim()).filter(Boolean).slice(0, 4).join(", "))}</td>
        </tr>
      `))}
    </section>
  `).join("");
  return `
    <div class="entity-set-detail">
      <div class="entity-set-detail-head">
        <div>
          <h3>${htmlEscape(set.name || "Entity Set")}</h3>
          <p>${fmtNum(terms.length)} saved terms${set.source_seed_keyword ? ` | Source: ${htmlEscape(set.source_seed_keyword)}` : ""}</p>
        </div>
      </div>
      ${sections || `<div class="note-box">This entity set has no saved terms.</div>`}
    </div>
  `;
}

function bindEntitySetsPage() {
  el("entity-sets-refresh")?.addEventListener("click", () => renderEntitySetsPage().catch((err) => toast(err.message)));
  el("entity-sets-open-explorer")?.addEventListener("click", () => showMainView("entity-view"));
  document.querySelectorAll(".entity-set-load").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest(".entity-set-card");
      const data = await api(`/api/entity-sets/${button.dataset.setId}`);
      card.insertAdjacentHTML("beforeend", renderEntitySetDetail(data));
      button.disabled = true;
      button.textContent = "Open";
    });
  });
  document.querySelectorAll(".entity-set-delete").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("Delete this saved entity set?");
      if (!confirmed) return;
      await api(`/api/entity-sets/${button.dataset.setId}`, { method: "DELETE" });
      await renderEntitySetsPage();
      toast("Entity set deleted.");
    });
  });
}

async function renderEntityExplorer() {
  const root = el("entity-tool-content");
  const detail = await currentClientDetail();
  if (!detail) {
    root.innerHTML = toolEmptyState("Entity & LSI Explorer");
    bindToolEmptyActions(root);
    return;
  }
  await loadApiKeys(false);
  await loadEntityLsiRuns(detail.project.id);
  await loadEntityLsiBatches(detail.project.id);
  const project = detail.project;
  const keywords = detail.keywords || [];
  const seedKeyword = state.entitySeedOverride || keywords[0]?.keyword || "";
  const llmKeys = savedLlmKeys();
  const modelTargets = entityModelTargets();
  const latestBatch = state.selectedEntityLsiBatchId
    ? state.entityLsiBatches.find((batch) => Number(batch.id) === Number(state.selectedEntityLsiBatchId))
    : state.entityLsiBatches[0];
  const latestRun = state.selectedEntityLsiRunId
    ? state.entityLsiRuns.find((run) => Number(run.id) === Number(state.selectedEntityLsiRunId))
    : state.entityLsiRuns[0];
  root.innerHTML = `
    <div class="client-tool-page entity-lsi-page">
      ${clientToolContext(detail, "Entity & LSI Explorer")}
      <div class="entity-lsi-workspace entity-explorer-workspace">
        <section class="client-panel entity-lsi-run-panel">
          <div class="panel-head">
            <div>
              <h3>Explore Entities & LSI</h3>
              <p>Generate structured entity, LSI, related keyword, question, and topic cluster ideas from one seed keyword.</p>
            </div>
          </div>
          <form id="entity-lsi-form" class="entity-lsi-form">
            <label>
              Client Keyword
              <select id="entity-lsi-keyword-select">
                <option value="">Manual seed keyword</option>
                ${keywords.map((keyword) => `<option value="${htmlEscape(keyword.keyword)}">${htmlEscape(keyword.keyword)}</option>`).join("")}
              </select>
            </label>
            <label>
              Seed Keyword
              <input id="entity-lsi-seed" type="text" value="${htmlEscape(seedKeyword)}" placeholder="san diego pool builders" autocomplete="off">
            </label>
            <div class="wide">
              <div class="entity-model-picker-head">
                <label>LLM Models</label>
                <div class="entity-model-actions">
                  <button id="entity-model-select-defaults" type="button" class="secondary">Defaults</button>
                  <button id="entity-model-clear" type="button" class="secondary">Clear</button>
                </div>
              </div>
              ${renderEntityModelPicker(modelTargets)}
            </div>
            <label class="wide entity-depth-control">
              <span>Entity Depth <strong id="entity-lsi-depth-label">3 - Standard</strong></span>
              <input id="entity-lsi-depth" type="range" min="1" max="5" step="1" value="3">
              <small>Higher depth returns more entities, LSI terms, related keywords, questions, and topic clusters. It also uses more tokens.</small>
            </label>
            <div class="entity-lsi-actions">
              <button type="submit" ${modelTargets.length ? "" : "disabled"}>Run Explorer</button>
              <button id="entity-lsi-settings" type="button" class="secondary">API Providers</button>
            </div>
          </form>
          <div id="entity-lsi-status" class="ai-test-result"></div>
        </section>
        <section class="client-panel entity-lsi-results-panel">
          <div class="panel-head">
            <div>
              <h3>Latest Batch</h3>
              <p>${latestBatch ? `${htmlEscape(latestBatch.seed_keyword)} | ${fmtNum(latestBatch.target_count)} models` : "Run multiple models to create a crossover table."}</p>
            </div>
          </div>
          <div id="entity-lsi-results">${latestBatch ? renderEntityBatchSummaryCard(latestBatch) : (latestRun ? renderEntityLsiResults(latestRun) : `<div class="note-box">No Entity & LSI runs saved for ${htmlEscape(project.name)} yet.</div>`)}</div>
        </section>
      </div>
      <section class="client-panel entity-lsi-history-panel">
        <div class="panel-head">
          <h3>Saved Explorer Batches</h3>
          <button id="entity-lsi-refresh" type="button" class="secondary">Refresh</button>
        </div>
        <div id="entity-lsi-history">${renderEntityLsiBatchHistory()}${renderEntityLsiHistory()}</div>
      </section>
    </div>
  `;
  bindEntityExplorer(project.id);
}

function bindEntityExplorer(projectId) {
  const keywordSelect = el("entity-lsi-keyword-select");
  const seedInput = el("entity-lsi-seed");
  const depth = el("entity-lsi-depth");
  const setDepthLabel = () => {
    const value = Number(depth.value || 3);
    el("entity-lsi-depth-label").textContent = `${value} - ${ENTITY_DEPTH_LABELS[value] || "Standard"}`;
  };
  keywordSelect?.addEventListener("change", () => {
    if (keywordSelect.value) seedInput.value = keywordSelect.value;
  });
  depth?.addEventListener("input", setDepthLabel);
  setDepthLabel();
  el("entity-model-select-defaults")?.addEventListener("click", () => {
    const defaults = new Set(entityModelTargets().filter((target) => target.selected).map((target) => `${target.api_key_id}::${target.model}`));
    document.querySelectorAll(".entity-model-check").forEach((box) => { box.checked = defaults.has(box.value); });
  });
  el("entity-model-clear")?.addEventListener("click", () => {
    document.querySelectorAll(".entity-model-check").forEach((box) => { box.checked = false; });
  });
  document.querySelectorAll(".entity-provider-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.closest(".entity-model-provider");
      const boxes = Array.from(panel?.querySelectorAll(".entity-model-check") || []);
      const shouldCheck = boxes.some((box) => !box.checked);
      boxes.forEach((box) => { box.checked = shouldCheck; });
    });
  });
  el("entity-lsi-settings")?.addEventListener("click", () => showMainView("api-keys-view"));
  el("entity-lsi-refresh")?.addEventListener("click", () => renderEntityExplorer().catch((err) => toast(err.message)));
  el("entity-lsi-form")?.addEventListener("submit", (event) => runEntityLsiExplorer(event, projectId).catch((err) => {
    el("entity-lsi-status").className = "ai-test-result error";
    el("entity-lsi-status").textContent = err.message;
    toast(err.message);
  }));
  document.querySelectorAll(".entity-run-open").forEach((button) => {
    button.addEventListener("click", () => {
      const run = state.entityLsiRuns.find((item) => Number(item.id) === Number(button.dataset.runId));
      if (!run) return;
      state.selectedEntityLsiRunId = run.id;
      el("entity-lsi-results").innerHTML = renderEntityLsiResults(run);
    });
  });
  document.querySelectorAll(".entity-run-delete").forEach((button) => {
    button.addEventListener("click", () => deleteEntityLsiRun(Number(button.dataset.runId)).catch((err) => toast(err.message)));
  });
  document.querySelectorAll(".entity-batch-open").forEach((button) => {
    button.addEventListener("click", () => {
      openEntityBatchDetail(Number(button.dataset.batchId));
    });
  });
}

async function runEntityLsiExplorer(event, projectId) {
  event.preventDefault();
  const status = el("entity-lsi-status");
  const button = event.submitter || el("entity-lsi-form")?.querySelector("button[type='submit']");
  const targets = Array.from(document.querySelectorAll(".entity-model-check:checked")).map((box) => ({
    api_key_id: Number(box.dataset.apiKeyId || 0),
    model: box.dataset.model || "",
  }));
  const payload = {
    project_id: projectId,
    seed_keyword: el("entity-lsi-seed").value.trim(),
    depth: Number(el("entity-lsi-depth").value || 3),
    targets,
  };
  if (!payload.seed_keyword) {
    toast("Seed keyword is required.");
    return;
  }
  if (!payload.targets.length) {
    toast("Select at least one LLM model.");
    return;
  }
  if (button) button.disabled = true;
  status.className = "ai-test-result";
  status.textContent = `Queued Entity & LSI Explorer across ${payload.targets.length} model${payload.targets.length === 1 ? "" : "s"}...`;
  const data = await api("/api/entity-lsi/runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.selectedEntityLsiRunId = data.runs?.[0]?.id || data.run.id;
  state.selectedEntityLsiBatchId = data.runs?.[0]?.batch_id || null;
  await loadEntityLsiRuns(projectId);
  await loadEntityLsiBatches(projectId);
  if (state.selectedEntityLsiBatchId) {
    showMainView("entity-batch-detail-view");
    if (button) button.disabled = false;
    toast("Entity & LSI batch queued.");
    return;
  }
  if (button) button.disabled = false;
  toast("Entity & LSI batch queued.");
}

function openEntityBatchDetail(batchId) {
  state.selectedEntityLsiBatchId = Number(batchId) || null;
  state.selectedEntityLsiRunId = null;
  showMainView("entity-batch-detail-view");
}

async function openEntityLsiBatch(batchId, targetId = "entity-lsi-results", coraReports = []) {
  const data = await api(`/api/entity-lsi/batches/${batchId}`);
  state.selectedEntityLsiBatchId = batchId;
  state.selectedEntityLsiRunId = null;
  el(targetId).innerHTML = renderEntityLsiBatch(data, "all", targetId, coraReports);
  bindEntityBatchFilters(data, targetId, coraReports);
  if (data.batch?.status === "running") {
    startEntityProgressPolling(batchId, targetId, data.batch.project_id, coraReports);
  }
}

function stopEntityProgressPolling() {
  if (state.entityProgressTimer) {
    window.clearTimeout(state.entityProgressTimer);
    state.entityProgressTimer = null;
  }
}

function startEntityProgressPolling(batchId, targetId = "entity-lsi-results", projectId = null, coraReports = []) {
  stopEntityProgressPolling();
  const tick = async () => {
    const data = await api(`/api/entity-lsi/batches/${batchId}`);
    const target = el(targetId);
    if (!target) {
      stopEntityProgressPolling();
      return;
    }
    target.innerHTML = renderEntityLsiBatch(data, "all", targetId, coraReports);
    bindEntityBatchFilters(data, targetId, coraReports);
    if (projectId) {
      await loadEntityLsiBatches(projectId);
    }
    if (data.batch?.status === "running") {
      state.entityProgressTimer = window.setTimeout(() => tick().catch((err) => toast(err.message)), 3000);
    } else {
      stopEntityProgressPolling();
      const progress = data.progress || {};
      toast(`Entity & LSI complete: ${fmtNum(progress.complete || 0)} of ${fmtNum(progress.total || 0)} model runs succeeded.`);
    }
  };
  state.entityProgressTimer = window.setTimeout(() => tick().catch((err) => toast(err.message)), 1200);
}

async function deleteEntityLsiRun(runId) {
  await api(`/api/entity-lsi/runs/${runId}`, { method: "DELETE" });
  state.selectedEntityLsiRunId = null;
  await renderEntityExplorer();
  toast("Entity & LSI run deleted.");
}

function renderEntityLsiHistory() {
  const looseRuns = state.entityLsiRuns.filter((run) => !run.batch_id);
  if (!looseRuns.length) return "";
  return `<h4 class="entity-history-subhead">Individual Runs</h4>` + table(["Seed", "Depth", "Provider", "Status", "Created", ""], looseRuns.map((run) => `
    <tr>
      <td>${htmlEscape(run.seed_keyword)}</td>
      <td>${fmtNum(run.depth)} - ${htmlEscape(ENTITY_DEPTH_LABELS[run.depth] || "")}</td>
      <td>${htmlEscape(run.provider)}<br><small>${htmlEscape(run.model || "")}</small></td>
      <td><span class="status-pill ${run.status === "complete" ? "imported" : (run.status === "failed" ? "error" : (run.status === "cancelled" ? "cancelled" : ""))}">${htmlEscape(run.status)}</span></td>
      <td>${fmtDate(run.created_at)}</td>
      <td class="row-actions">
        <button type="button" class="secondary entity-run-open" data-run-id="${run.id}">Open</button>
        <button type="button" class="link-button entity-run-delete" data-run-id="${run.id}">Delete</button>
      </td>
    </tr>
  `));
}

function renderEntityLsiBatchHistory() {
  if (!state.entityLsiBatches.length) return `<div class="note-box">No saved Entity & LSI batches yet.</div>`;
  return table(["Seed", "Depth", "Models", "Status", "Created", ""], state.entityLsiBatches.map((batch) => `
    <tr>
      <td>${htmlEscape(batch.seed_keyword)}</td>
      <td>${fmtNum(batch.depth)} - ${htmlEscape(ENTITY_DEPTH_LABELS[batch.depth] || "")}</td>
      <td>${fmtNum(batch.target_count)} model${Number(batch.target_count) === 1 ? "" : "s"}<br><small>${fmtNum(batch.complete_count)} complete, ${fmtNum(batch.failed_count)} failed</small></td>
      <td><span class="status-pill ${batch.status === "complete" ? "imported" : (batch.status === "failed" ? "error" : (batch.status === "cancelled" ? "cancelled" : ""))}">${htmlEscape(batch.status)}</span></td>
      <td>${fmtDate(batch.created_at)}</td>
      <td class="row-actions">
        <button type="button" class="secondary entity-batch-open" data-batch-id="${batch.id}">Open Detail</button>
      </td>
    </tr>
  `));
}

function renderEntityBatchSummaryCard(batch) {
  return `
    <div class="entity-result-summary">
      <div>
        <label>Seed Keyword</label>
        <strong>${htmlEscape(batch.seed_keyword || "")}</strong>
        <span>${fmtDate(batch.created_at)}</span>
      </div>
      <div>
        <label>Models</label>
        <strong>${fmtNum(batch.target_count)}</strong>
        <span>${fmtNum(batch.complete_count)} complete, ${fmtNum(batch.failed_count)} failed</span>
      </div>
      <div>
        <label>Status</label>
        <strong>${htmlEscape(batch.status || "")}</strong>
        <span>${fmtNum(batch.depth)} - ${htmlEscape(ENTITY_DEPTH_LABELS[batch.depth] || "")}</span>
      </div>
    </div>
    <button type="button" class="entity-batch-open" data-batch-id="${batch.id}">Open Batch Detail</button>
  `;
}

async function renderEntityCrossoverPage() {
  const root = el("entity-crossover-content");
  const detail = await currentClientDetail();
  if (!detail) {
    root.innerHTML = toolEmptyState("Entity Crossover");
    bindToolEmptyActions(root);
    return;
  }
  await loadEntityLsiBatches(detail.project.id);
  const selectedBatch = state.selectedEntityLsiBatchId
    ? state.entityLsiBatches.find((batch) => Number(batch.id) === Number(state.selectedEntityLsiBatchId))
    : state.entityLsiBatches[0];
  const coraReports = selectedBatch ? await loadProjectCoraReports(detail.project.id) : [];
  if (selectedBatch) state.selectedEntityLsiBatchId = selectedBatch.id;
  root.innerHTML = `
    <div class="client-tool-page entity-crossover-page">
      ${clientToolContext(detail, "Entity Crossover")}
      <section class="client-panel">
        <div class="panel-head">
          <div>
            <h3>Crossover Analysis</h3>
            <p>Compare which entities, LSI terms, and related keywords appear across selected LLM model runs.</p>
          </div>
        </div>
        <div class="entity-crossover-select-row">
          <label>
            Batch
            <select id="entity-crossover-batch">
              ${state.entityLsiBatches.length ? state.entityLsiBatches.map((batch) => `<option value="${batch.id}"${selectedBatch && Number(batch.id) === Number(selectedBatch.id) ? " selected" : ""}>${htmlEscape(batch.seed_keyword)} - ${fmtDate(batch.created_at)}</option>`).join("") : `<option value="">No batches yet</option>`}
            </select>
          </label>
          <button id="entity-crossover-open-detail" type="button" class="secondary" ${selectedBatch ? "" : "disabled"}>Open Detail Page</button>
          <button id="entity-crossover-refresh" type="button" class="secondary">Refresh</button>
        </div>
        <div id="entity-crossover-results">${selectedBatch ? `<div class="note-box">Loading crossover...</div>` : `<div class="note-box">Run a multi-model Entity & LSI batch first.</div>`}</div>
      </section>
    </div>
  `;
  bindEntityCrossoverPage();
  if (selectedBatch) {
    openEntityLsiBatch(selectedBatch.id, "entity-crossover-results", coraReports).catch((err) => {
      el("entity-crossover-results").innerHTML = `<div class="note-box">${htmlEscape(err.message)}</div>`;
    });
  }
}

function bindEntityCrossoverPage() {
  el("entity-crossover-batch")?.addEventListener("change", async (event) => {
    state.selectedEntityLsiBatchId = Number(event.target.value) || null;
    if (state.selectedEntityLsiBatchId) {
      const detail = await currentClientDetail();
      const coraReports = detail ? await loadProjectCoraReports(detail.project.id) : [];
      openEntityLsiBatch(state.selectedEntityLsiBatchId, "entity-crossover-results", coraReports).catch((err) => toast(err.message));
    }
  });
  el("entity-crossover-open-detail")?.addEventListener("click", () => {
    if (state.selectedEntityLsiBatchId) openEntityBatchDetail(state.selectedEntityLsiBatchId);
  });
  el("entity-crossover-refresh")?.addEventListener("click", () => renderEntityCrossoverPage().catch((err) => toast(err.message)));
}

async function renderEntityBatchDetailPage() {
  const root = el("entity-batch-detail-content");
  const batchId = Number(state.selectedEntityLsiBatchId || 0);
  if (!batchId) {
    root.innerHTML = `
      <div class="client-tool-page entity-batch-detail-page">
        <section class="client-panel">
          <div class="detail-head">
            <div>
              <h2>Entity Batch Detail</h2>
              <p>Open a saved Entity & LSI batch from Explorer or Crossover.</p>
            </div>
            <div class="detail-actions">
              <button id="entity-detail-back-explorer" type="button" class="secondary">Entity Explorer</button>
              <button id="entity-detail-back-crossover" type="button" class="secondary">Entity Crossover</button>
            </div>
          </div>
          <div class="note-box">No Entity & LSI batch selected.</div>
        </section>
      </div>
    `;
    bindEntityBatchDetailActions();
    return;
  }
  const data = await api(`/api/entity-lsi/batches/${batchId}`);
  const detail = await currentClientDetail();
  const coraReports = data.batch?.project_id ? await loadProjectCoraReports(data.batch.project_id) : [];
  if (detail && Number(data.batch?.project_id) !== Number(detail.project?.id)) {
    state.selectedEntityLsiBatchId = null;
    root.innerHTML = `
      <div class="client-tool-page entity-batch-detail-page">
        ${clientToolContext(detail, "Entity Batch Detail")}
        <section class="client-panel">
          <div class="detail-head">
            <div>
              <h2>Entity Batch Detail</h2>
              <p>The previously selected batch belongs to another client.</p>
            </div>
            <div class="detail-actions">
              <button id="entity-detail-back-explorer" type="button" class="secondary">Entity Explorer</button>
              <button id="entity-detail-back-crossover" type="button" class="secondary">Entity Crossover</button>
            </div>
          </div>
          <div class="note-box">Choose a batch from this client's Explorer or Crossover page.</div>
        </section>
      </div>
    `;
    bindEntityBatchDetailActions();
    return;
  }
  state.selectedEntityLsiBatchId = batchId;
  root.innerHTML = `
    <div class="client-tool-page entity-batch-detail-page">
      ${detail ? clientToolContext(detail, "Entity Batch Detail") : ""}
      <section class="client-panel">
        <div class="detail-head entity-batch-detail-head">
          <div>
            <h2>${htmlEscape(data.batch?.seed_keyword || "Entity Batch")}</h2>
            <p>${fmtNum(data.batch?.target_count)} model${Number(data.batch?.target_count) === 1 ? "" : "s"} | ${fmtNum(data.batch?.depth)} - ${htmlEscape(ENTITY_DEPTH_LABELS[data.batch?.depth] || "")} | ${fmtDate(data.batch?.created_at)}</p>
          </div>
          <div class="detail-actions">
            <button id="entity-detail-back-explorer" type="button" class="secondary">Entity Explorer</button>
            <button id="entity-detail-back-crossover" type="button" class="secondary">Entity Crossover</button>
            <button id="entity-detail-refresh" type="button" class="secondary">Refresh</button>
          </div>
        </div>
        <div id="entity-batch-detail-results">${renderEntityLsiBatch(data, "all", "entity-batch-detail-results", coraReports)}</div>
      </section>
    </div>
  `;
  bindEntityBatchDetailActions();
  bindEntityBatchFilters(data, "entity-batch-detail-results", coraReports);
  if (data.batch?.status === "running") {
    startEntityProgressPolling(batchId, "entity-batch-detail-results", data.batch.project_id, coraReports);
  }
}

function bindEntityBatchDetailActions() {
  el("entity-detail-back-explorer")?.addEventListener("click", () => showMainView("entity-view"));
  el("entity-detail-back-crossover")?.addEventListener("click", () => showMainView("entity-crossover-view"));
  el("entity-detail-refresh")?.addEventListener("click", () => renderEntityBatchDetailPage().catch((err) => toast(err.message)));
}

function renderCoraReportImportControls(batch, coraReports) {
  return `
    <div class="entity-crossover-actions">
      ${batch.status === "running" ? `<button type="button" class="danger entity-batch-cancel-remaining" data-batch-id="${batch.id}">Cancel Remaining</button>` : ""}
      ${Number(batch.failed_count || 0) > 0 ? `<button type="button" class="secondary entity-batch-retry-failed" data-batch-id="${batch.id}">Retry Failed Models</button>` : ""}
      <form class="entity-cora-import-form" data-batch-id="${batch.id}">
        <label>
          Cora Report Source
          <select class="entity-cora-report-select" ${coraReports.length ? "" : "disabled"}>
            ${coraReports.length ? coraReports.map((run) => `<option value="${run.id}">${htmlEscape(run.keyword || "Cora report")} | ${fmtDate(run.imported_at)} | ${htmlEscape(run.file_name || "")}</option>`).join("") : `<option value="">No imported Cora reports for this client</option>`}
          </select>
        </label>
        <button type="submit" class="secondary" ${coraReports.length ? "" : "disabled"}>Attach Cora Report</button>
      </form>
    </div>
  `;
}

function renderEntityLsiBatch(data, filter = "all", targetId = "entity-lsi-results", coraReports = []) {
  const batch = data.batch || {};
  const runs = data.runs || [];
  const progress = data.progress || {};
  const crossover = filterEntityCrossover(scoreEntityCrossoverRows(data.crossover || [], batch), filter);
  const sourceLabels = runs.map((run) => `${run.provider} ${run.model || ""}`.trim());
  const sourcePreview = sourceLabels.slice(0, 4).join(", ");
  const hiddenSources = Math.max(0, sourceLabels.length - 4);
  return `
    <div class="entity-result-summary">
      <div>
        <label>Seed Keyword</label>
        <strong>${htmlEscape(batch.seed_keyword || "")}</strong>
        <span>${fmtNum(batch.target_count)} model${Number(batch.target_count) === 1 ? "" : "s"}</span>
      </div>
      <div>
        <label>Status</label>
        <strong>${htmlEscape(batch.status || "")}</strong>
        <span>${fmtNum(batch.complete_count)} complete, ${fmtNum(batch.failed_count)} failed</span>
      </div>
      <div>
        <label>Sources</label>
        <strong>${fmtNum(sourceLabels.length)}</strong>
        <span>${htmlEscape(sourcePreview)}${hiddenSources ? ` +${fmtNum(hiddenSources)} more` : ""}</span>
      </div>
    </div>
    ${renderEntityBatchProgress(progress)}
    <div class="entity-crossover-toolbar">
      <label>Filter
        <select id="entity-crossover-filter" data-target-id="${htmlEscape(targetId)}">
          <option value="all"${filter === "all" ? " selected" : ""}>All terms</option>
          <option value="entity"${filter === "entity" ? " selected" : ""}>Entities only</option>
          <option value="lsi"${filter === "lsi" ? " selected" : ""}>LSI only</option>
          <option value="related_keyword"${filter === "related_keyword" ? " selected" : ""}>Related keywords only</option>
          <option value="overlap"${filter === "overlap" ? " selected" : ""}>Appears in 2+ models</option>
          <option value="unique"${filter === "unique" ? " selected" : ""}>Unique to one model</option>
        </select>
      </label>
    </div>
    ${renderEntitySetSaveControls(batch, crossover.length)}
    ${renderCoraReportImportControls(batch, coraReports)}
    ${renderEntityCrossoverTable(crossover, runs)}
    <section class="entity-result-section">
      <h4>Model Runs</h4>
      ${table(["Provider", "Model", "Status", "Error"], runs.map((run) => `
        <tr>
          <td>${htmlEscape(run.provider)}</td>
          <td>${htmlEscape(run.model || "")}</td>
          <td><span class="status-pill ${run.status === "complete" ? "imported" : (run.status === "failed" ? "error" : (run.status === "cancelled" ? "cancelled" : ""))}">${htmlEscape(run.status)}</span></td>
          <td class="entity-error-cell" title="${htmlEscape(run.error || "")}">${htmlEscape(compactProviderError(run.error || ""))}</td>
        </tr>
      `))}
    </section>
  `;
}

function renderEntitySetSaveControls(batch, visibleCount) {
  if (!visibleCount || !batch.project_id) return "";
  const defaultName = `${batch.seed_keyword || "Entity"} approved terms`;
  return `
    <div class="entity-set-save-bar">
      <div class="entity-set-save-actions">
        <label>
          Auto Select
          <select class="entity-auto-select-mode">
            <option value="balanced">Balanced</option>
            <option value="conservative">Conservative</option>
            <option value="comprehensive">Comprehensive</option>
          </select>
        </label>
        <button type="button" class="secondary entity-crossover-auto-select">Auto Select</button>
        <button type="button" class="secondary entity-crossover-select-visible">Select Visible</button>
        <button type="button" class="secondary entity-crossover-clear-selected">Clear</button>
      </div>
      <label>
        Entity Set Name
        <input class="entity-set-name" type="text" value="${htmlEscape(defaultName)}" autocomplete="off">
      </label>
      <button type="button" class="entity-set-save" data-batch-id="${batch.id}" data-project-id="${batch.project_id}">Save Selected</button>
      <button type="button" class="secondary entity-sets-open">Entity Sets</button>
    </div>
  `;
}

function entityRunLabel(run) {
  if (!run) return "";
  return `${run.provider || "Provider"} / ${run.model || "model"}`;
}

function compactProviderError(message, limit = 180) {
  const text = String(message || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  let parsedMessage = "";
  try {
    const parsed = JSON.parse(text);
    parsedMessage = parsed?.error?.message || parsed?.message || "";
  } catch (_err) {
    parsedMessage = "";
  }
  const normalized = parsedMessage || text;
  if (/quota exceeded|exceeded your current quota|rate-limit|rate limits/i.test(normalized)) {
    return "Quota exceeded. Check provider billing/rate limits or choose another key/model.";
  }
  if (/high demand|temporarily unavailable|unavailable/i.test(normalized)) {
    return "Provider temporarily unavailable or under high demand.";
  }
  if (/timed out|timeout/i.test(normalized)) {
    return "Provider request timed out.";
  }
  if (/cancelled before run started/i.test(normalized)) {
    return "Cancelled before run started.";
  }
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}...` : normalized;
}

function renderEntityBatchProgress(progress) {
  if (!progress || !Number(progress.total || 0)) return "";
  const percent = Math.max(0, Math.min(100, Number(progress.percent || 0)));
  const current = progress.current_run ? entityRunLabel(progress.current_run) : "None";
  const upNext = progress.up_next ? entityRunLabel(progress.up_next) : "None";
  const queuedRuns = Array.isArray(progress.queued_runs) ? progress.queued_runs : [];
  const queuedPreview = queuedRuns.slice(0, 6).map(entityRunLabel).join(", ");
  const hiddenQueued = Math.max(0, queuedRuns.length - 6);
  const events = Array.isArray(progress.events) ? progress.events.slice(-6).reverse() : [];
  const cancelledCount = Number(progress.cancelled || 0);
  const cancelledText = cancelledCount ? `, ${fmtNum(cancelledCount)} cancelled` : "";
  return `
    <section class="entity-progress-panel">
      <div class="entity-progress-head">
        <div>
          <strong>${fmtNum(progress.finished || 0)} of ${fmtNum(progress.total || 0)} finished</strong>
          <span>${fmtNum(progress.complete || 0)} complete, ${fmtNum(progress.failed || 0)} failed${cancelledText}, ${fmtNum(progress.queued || 0)} queued</span>
        </div>
        <div>
          <label>Running now</label>
          <strong>${htmlEscape(current)}</strong>
        </div>
        <div>
          <label>Up next</label>
          <strong>${htmlEscape(upNext)}</strong>
        </div>
      </div>
      <div class="entity-progress-bar" aria-label="Entity batch progress">
        <span style="width: ${percent}%"></span>
      </div>
      ${queuedRuns.length ? `<div class="entity-queued-list"><label>Queued</label><span>${htmlEscape(queuedPreview)}${hiddenQueued ? ` +${fmtNum(hiddenQueued)} more` : ""}</span></div>` : ""}
      <div class="entity-progress-log">
        ${events.length ? events.map((event) => `<div class="entity-progress-log-row ${htmlEscape(event.status || "")}"><span>${htmlEscape(event.status || "")}</span><strong title="${htmlEscape(event.message || "")}">${htmlEscape(compactProviderError(event.message || "", 220))}</strong><small>${fmtDate(event.updated_at)}</small></div>`).join("") : `<div class="muted">No completed model events yet.</div>`}
      </div>
    </section>
  `;
}

function filterEntityCrossover(rows, filter) {
  return rows.filter((row) => {
    if (filter === "overlap") return Number(row.source_count || 0) >= 2;
    if (filter === "unique") return Number(row.source_count || 0) === 1;
    if (["entity", "lsi", "related_keyword"].includes(filter)) return row.type === filter;
    return true;
  });
}

function scoreEntityCrossoverRows(rows, batch = {}) {
  return rows.map((row) => {
    const sources = Array.isArray(row.sources) ? row.sources : [];
    const providers = new Set(sources.map((source) => source.provider || source.provider_key || "").filter(Boolean));
    const term = String(row.term || "");
    const normalized = String(row.normalized || "").trim();
    const sourceCount = Number(row.source_count || sources.length || 0);
    const sourceScore = Math.min(36, sourceCount * 9);
    const providerScore = Math.min(20, providers.size * 5);
    const typeScores = { entity: 22, lsi: 17, related_keyword: 12, question: 10, topic_cluster: 10 };
    const typeScore = typeScores[row.type] || 8;
    const hasCora = sources.some((source) => /cora/i.test(`${source.provider || ""} ${source.provider_key || ""}`));
    const seedTokens = new Set(String(batch.seed_keyword || "").toLowerCase().split(/\s+/).filter((token) => token.length > 2));
    const termTokens = normalized.split(/\s+/).filter(Boolean);
    const tokenOverlap = termTokens.filter((token) => seedTokens.has(token)).length;
    const keywordScore = tokenOverlap ? Math.min(10, tokenOverlap * 4) : 0;
    let penalty = 0;
    const genericTerms = new Set(["service", "services", "company", "companies", "business", "website", "page", "content", "system", "solution", "solutions"]);
    if (normalized.length < 3) penalty += 18;
    if (termTokens.length === 1 && genericTerms.has(termTokens[0])) penalty += 14;
    if (termTokens.length === 1 && termTokens[0] === String(batch.seed_keyword || "").toLowerCase()) penalty += 10;
    const coraScore = hasCora ? 18 : 0;
    const score = Math.max(0, Math.min(100, Math.round(sourceScore + providerScore + typeScore + coraScore + keywordScore - penalty)));
    const reasons = [
      `${sourceCount} source${sourceCount === 1 ? "" : "s"}`,
      `${providers.size} provider${providers.size === 1 ? "" : "s"}`,
      row.type === "entity" ? "entity boost" : row.type?.replaceAll("_", " "),
      hasCora ? "Cora match" : "",
      keywordScore ? "keyword match" : "",
      penalty ? "noise penalty" : "",
    ].filter(Boolean);
    return { ...row, relevance_score: score, relevance_reasons: reasons };
  }).sort((a, b) => Number(b.relevance_score || 0) - Number(a.relevance_score || 0));
}

function renderEntityCrossoverTable(rows, runs) {
  if (!rows.length) return `<div class="note-box">No crossover rows for this filter.</div>`;
  const sourceKeys = runs.map((run) => `${run.provider}::${run.model}`);
  return `
    <div class="table-wrap entity-crossover-table-wrap">
      <table class="entity-crossover-table">
        <thead>
          <tr>
            <th class="entity-select-col">Save</th>
            <th>Term</th>
            <th>Type</th>
            <th>Source Count</th>
            <th>Relevance</th>
            ${runs.map((run) => `
              <th class="entity-source-head">
                <strong>${htmlEscape(run.provider)}</strong>
                <small>${htmlEscape(run.model || "")}</small>
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const rowSourceKeys = new Set((row.sources || []).map((source) => source.source_key));
            return `
              <tr title="${htmlEscape((row.relevance_reasons || []).join(", "))}">
                <td class="entity-select-col"><input class="entity-crossover-check" type="checkbox" data-type="${htmlEscape(row.type)}" data-normalized="${htmlEscape(row.normalized)}" data-relevance="${Number(row.relevance_score || 0)}"></td>
                <td><strong>${htmlEscape(row.term)}</strong><br><small>${htmlEscape((row.examples || []).slice(1, 4).join(", "))}</small></td>
                <td>${htmlEscape(row.type.replaceAll("_", " "))}</td>
                <td>${fmtNum(row.source_count)}</td>
                <td><span class="entity-relevance-score">${fmtNum(row.relevance_score || 0)}</span><small>${htmlEscape((row.relevance_reasons || []).slice(0, 2).join(", "))}</small></td>
                ${sourceKeys.map((sourceKey) => `<td class="entity-source-cell">${rowSourceKeys.has(sourceKey) ? "Yes" : ""}</td>`).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function retryFailedEntityBatch(batchId, targetId, coraReports) {
  const button = document.querySelector(`.entity-batch-retry-failed[data-batch-id="${batchId}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = "Retrying...";
  }
  const data = await api(`/api/entity-lsi/batches/${batchId}/retry-failed`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  await loadEntityLsiBatches(data.batch.project_id);
  el(targetId).innerHTML = renderEntityLsiBatch(data, "all", targetId, coraReports);
  bindEntityBatchFilters(data, targetId, coraReports);
  toast(`Retried ${fmtNum((data.retried || []).length)} failed model run${(data.retried || []).length === 1 ? "" : "s"}.`);
}

async function cancelRemainingEntityBatch(batchId, targetId, coraReports) {
  const button = document.querySelector(`.entity-batch-cancel-remaining[data-batch-id="${batchId}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = "Cancelling...";
  }
  const data = await api(`/api/entity-lsi/batches/${batchId}/cancel-remaining`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  await loadEntityLsiBatches(data.batch.project_id);
  el(targetId).innerHTML = renderEntityLsiBatch(data, "all", targetId, coraReports);
  bindEntityBatchFilters(data, targetId, coraReports);
  toast(`Cancelled ${fmtNum(data.cancelled_count || 0)} queued model run${Number(data.cancelled_count || 0) === 1 ? "" : "s"}.`);
}

async function importCoraReportToEntityBatch(event, targetId, coraReports) {
  event.preventDefault();
  const form = event.currentTarget;
  const batchId = Number(form.dataset.batchId);
  const runId = Number(form.querySelector(".entity-cora-report-select")?.value || 0);
  if (!batchId || !runId) {
    toast("Choose a Cora report to attach.");
    return;
  }
  const button = form.querySelector("button[type='submit']");
  if (button) {
    button.disabled = true;
    button.textContent = "Attaching...";
  }
  const data = await api(`/api/entity-lsi/batches/${batchId}/import-cora-report`, {
    method: "POST",
    body: JSON.stringify({ run_id: runId }),
  });
  el(targetId).innerHTML = renderEntityLsiBatch(data, "all", targetId, coraReports);
  bindEntityBatchFilters(data, targetId, coraReports);
  toast("Cora report attached to crossover.");
}

async function saveSelectedEntitySet(data, targetId, coraReports) {
  const root = el(targetId);
  const checked = Array.from(root?.querySelectorAll(".entity-crossover-check:checked") || []);
  if (!checked.length) {
    toast("Select at least one crossover term to save.");
    return;
  }
  const batch = data.batch || {};
  const allRows = data.crossover || [];
  const terms = checked.map((box) => {
    const row = allRows.find((item) => item.type === box.dataset.type && item.normalized === box.dataset.normalized);
    return row ? {
      term: row.term,
      type: row.type,
      normalized: row.normalized,
      source_count: row.source_count,
      sources: row.sources || [],
    } : null;
  }).filter(Boolean);
  const name = root?.querySelector(".entity-set-name")?.value.trim() || `${batch.seed_keyword || "Entity"} approved terms`;
  const button = root?.querySelector(".entity-set-save");
  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }
  let saved;
  try {
    saved = await api("/api/entity-sets", {
      method: "POST",
      body: JSON.stringify({
        project_id: batch.project_id,
        source_batch_id: batch.id,
        name,
        terms,
      }),
    });
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Save Selected";
    }
  }
  await loadEntitySets(batch.project_id);
  root.innerHTML = renderEntityLsiBatch(data, "all", targetId, coraReports);
  bindEntityBatchFilters(data, targetId, coraReports);
  toast(`Saved ${fmtNum(saved.terms?.length || terms.length)} terms to ${saved.set?.name || "entity set"}.`);
}

function bindEntityBatchFilters(data, targetId = "entity-lsi-results", coraReports = []) {
  el("entity-crossover-filter")?.addEventListener("change", (event) => {
    const nextTargetId = event.target.dataset.targetId || targetId;
    el(nextTargetId).innerHTML = renderEntityLsiBatch(data, event.target.value, nextTargetId, coraReports);
    bindEntityBatchFilters(data, nextTargetId, coraReports);
  });
  const root = el(targetId);
  root?.querySelector(".entity-crossover-auto-select")?.addEventListener("click", () => {
    const mode = root.querySelector(".entity-auto-select-mode")?.value || "balanced";
    const thresholds = { conservative: 75, balanced: 55, comprehensive: 35 };
    const topRatios = { conservative: 0.2, balanced: 0.4, comprehensive: 0.65 };
    const boxes = Array.from(root.querySelectorAll(".entity-crossover-check"));
    const threshold = thresholds[mode] || thresholds.balanced;
    const topLimit = Math.max(1, Math.ceil(boxes.length * (topRatios[mode] || topRatios.balanced)));
    let selected = 0;
    boxes.forEach((box, index) => {
      const score = Number(box.dataset.relevance || 0);
      const shouldSelect = score >= threshold || index < topLimit;
      box.checked = shouldSelect;
      if (shouldSelect) selected += 1;
    });
    toast(`Auto selected ${fmtNum(selected)} term${selected === 1 ? "" : "s"} using ${mode} relevance.`);
  });
  root?.querySelector(".entity-crossover-select-visible")?.addEventListener("click", () => {
    root.querySelectorAll(".entity-crossover-check").forEach((box) => { box.checked = true; });
  });
  root?.querySelector(".entity-crossover-clear-selected")?.addEventListener("click", () => {
    root.querySelectorAll(".entity-crossover-check").forEach((box) => { box.checked = false; });
  });
  root?.querySelector(".entity-set-save")?.addEventListener("click", () => {
    saveSelectedEntitySet(data, targetId, coraReports).catch((err) => toast(err.message));
  });
  root?.querySelector(".entity-sets-open")?.addEventListener("click", () => showMainView("entity-sets-view"));
  document.querySelectorAll(".entity-batch-retry-failed").forEach((button) => {
    button.addEventListener("click", () => retryFailedEntityBatch(Number(button.dataset.batchId), targetId, coraReports).catch((err) => toast(err.message)));
  });
  document.querySelectorAll(".entity-batch-cancel-remaining").forEach((button) => {
    button.addEventListener("click", () => cancelRemainingEntityBatch(Number(button.dataset.batchId), targetId, coraReports).catch((err) => toast(err.message)));
  });
  document.querySelectorAll(".entity-cora-import-form").forEach((form) => {
    form.addEventListener("submit", (event) => importCoraReportToEntityBatch(event, targetId, coraReports).catch((err) => toast(err.message)));
  });
}

function entityItemLabel(item, keys) {
  if (typeof item === "string") return item;
  for (const key of keys) {
    if (item && item[key]) return item[key];
  }
  return JSON.stringify(item || {});
}

function entityItemMeta(item, keys) {
  if (!item || typeof item === "string") return "";
  return keys.map((key) => item[key]).filter(Boolean).join(" | ");
}

function renderEntityItems(title, items, labelKeys, metaKeys) {
  const safeItems = Array.isArray(items) ? items : [];
  return `
    <section class="entity-result-section">
      <h4>${htmlEscape(title)}</h4>
      ${safeItems.length ? `
        <div class="entity-chip-list">
          ${safeItems.slice(0, 100).map((item) => `
            <div class="entity-chip">
              <strong>${htmlEscape(entityItemLabel(item, labelKeys))}</strong>
              <span>${htmlEscape(entityItemMeta(item, metaKeys))}</span>
            </div>
          `).join("")}
        </div>
      ` : `<div class="note-box">No ${htmlEscape(title.toLowerCase())} returned.</div>`}
    </section>
  `;
}

function renderEntityLsiResults(run) {
  const result = run.result || {};
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  return `
    <div class="entity-result-summary">
      <div>
        <label>Seed Keyword</label>
        <strong>${htmlEscape(run.seed_keyword)}</strong>
        <span>${htmlEscape(run.provider)} | ${htmlEscape(run.model || "")}</span>
      </div>
      <div>
        <label>Depth</label>
        <strong>${fmtNum(run.depth)} - ${htmlEscape(ENTITY_DEPTH_LABELS[run.depth] || "Standard")}</strong>
        <span>${fmtDate(run.created_at)}</span>
      </div>
      <div>
        <label>Status</label>
        <strong>${htmlEscape(run.status)}</strong>
        <span>${htmlEscape(run.error || "")}</span>
      </div>
    </div>
    ${result.summary ? `<div class="note-box">${htmlEscape(result.summary)}</div>` : ""}
    ${warnings.length ? `<div class="note-box">${warnings.map((warning) => htmlEscape(warning)).join("<br>")}</div>` : ""}
    <div class="entity-result-grid">
      ${renderEntityItems("Entities", result.entities, ["name", "entity"], ["type", "relevance_score", "suggested_usage"])}
      ${renderEntityItems("LSI Terms", result.lsi_terms, ["term", "keyword"], ["relevance_score", "intent"])}
      ${renderEntityItems("Related Keywords", result.related_keywords, ["keyword", "term"], ["intent", "funnel_stage"])}
      ${renderEntityItems("Questions", result.questions, ["question"], ["intent", "content_opportunity"])}
      ${renderEntityItems("Topic Clusters", result.topic_clusters, ["cluster", "name"], ["terms", "content_angle"])}
    </div>
  `;
}

function domainOnly(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch (_err) {
    return text.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

async function loadRankingSnapshots(projectId = "") {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  const data = await api(`/api/seo/ranking-snapshots${profileQueryParam(params)}`);
  state.rankingSnapshots = data.snapshots || [];
  return state.rankingSnapshots;
}

async function loadRankingSnapshot(snapshotId) {
  const data = await api(`/api/seo/ranking-snapshots/${snapshotId}`);
  state.rankingSnapshot = data;
  state.selectedRankingSnapshotId = Number(snapshotId);
  state.rankingOptimizationTargets = data.savedTargets || state.rankingOptimizationTargets || [];
  state.rankingTargetSelection = {};
  return data;
}

async function loadRankingSnapshotComparison(baseId, compareId) {
  const params = new URLSearchParams({ base_id: String(baseId), compare_id: String(compareId) });
  const data = await api(`/api/seo/ranking-snapshots/compare?${params.toString()}`);
  state.rankingComparison = data;
  return data;
}

async function renderRankingSnapshotTool() {
  const root = el("ranking-snapshot-content");
  const detail = await currentClientDetail();
  if (!detail) {
    root.innerHTML = toolEmptyState("Ranking Snapshot");
    bindToolEmptyActions(root);
    return;
  }
  const project = detail.project;
  await loadRankingSnapshots(project.id);
  if (state.rankingSnapshot?.snapshot && Number(state.rankingSnapshot.snapshot.project_id || 0) !== Number(project.id)) {
    state.rankingSnapshot = null;
    state.selectedRankingSnapshotId = null;
  }
  if (!state.rankingSnapshot && state.rankingSnapshots[0]) {
    await loadRankingSnapshot(state.rankingSnapshots[0].id).catch(() => {});
  }
  const snapshotIds = new Set(state.rankingSnapshots.map((snapshot) => Number(snapshot.id)));
  if (state.rankingComparison && (!snapshotIds.has(Number(state.rankingComparison.base?.id)) || !snapshotIds.has(Number(state.rankingComparison.compare?.id)))) {
    state.rankingComparison = null;
  }
  const mainDomain = domainOnly(clientMainUrl(detail));
  root.innerHTML = `
    <div class="client-tool-page ranking-snapshot-page">
      ${clientToolContext(detail, "Ranking Snapshot")}
      <div class="client-tool-workspace ranking-snapshot-workspace">
        <section class="client-panel ranking-run-panel">
          <div class="panel-head">
            <div>
              <h3>Run Ranking Snapshot</h3>
              <p>Uses DataForSEO Labs weekly ranking data for the selected client's domain.</p>
            </div>
          </div>
          <form id="ranking-snapshot-form" class="ranking-snapshot-form">
            <label>
              Target Domain
              <input id="ranking-target" type="text" value="${htmlEscape(mainDomain)}" placeholder="example.com" autocomplete="off">
            </label>
            <div class="form-grid compact">
              <label>
                Location Code
                <input id="ranking-location-code" type="number" value="2840" min="1">
              </label>
              <label>
                Language
                <input id="ranking-language-code" type="text" value="en" maxlength="8">
              </label>
              <label>
                Limit
                <input id="ranking-limit" type="number" value="1000" min="1" max="1000">
              </label>
            </div>
            <div class="toggle-row">
              <label><input id="ranking-include-subdomains" type="checkbox"> Include subdomains</label>
              <label><input id="ranking-force-refresh" type="checkbox"> Force refresh</label>
            </div>
            <button type="submit">Run Snapshot</button>
            <div id="ranking-snapshot-status" class="ai-test-result"></div>
          </form>
          <div class="note-box">DataForSEO Labs data is updated weekly; this is a snapshot, not live rank tracking.</div>
        </section>
        <section class="client-panel ranking-history-panel">
          <div class="panel-head">
            <h3>Snapshot History</h3>
            <button id="ranking-history-refresh" type="button" class="secondary">Refresh</button>
          </div>
          <div id="ranking-snapshot-history">${renderRankingSnapshotHistory()}</div>
        </section>
      </div>
      <section class="client-panel ranking-results-panel">
        <div id="ranking-snapshot-results">${renderRankingSnapshotResults()}</div>
      </section>
      <section class="client-panel ranking-comparison-panel">
        <div id="ranking-snapshot-comparison">${renderRankingSnapshotComparisonPanel()}</div>
      </section>
    </div>
  `;
  bindRankingSnapshotTool(project.id);
}

async function renderSavedRankingTargetsPage() {
  const root = el("ranking-targets-content");
  if (!root) return;
  const detail = await currentClientDetail();
  if (!detail) {
    root.innerHTML = toolEmptyState("Saved Targets");
    bindToolEmptyActions(root);
    return;
  }
  await loadRankingOptimizationTargets(detail.project.id);
  const targets = filteredSavedRankingTargets();
  const selectedCount = targets.filter((target) => state.savedTargetSelection[String(target.id)]).length;
  root.innerHTML = `
    <div class="client-tool-page ranking-snapshot-page">
      ${clientToolContext(detail, "Saved Optimization Targets")}
      <section class="client-panel">
        <div class="panel-head">
          <div>
            <h3>Saved Targets</h3>
            <p>Manage selected Ranking Snapshot pages for this client.</p>
          </div>
          <button id="saved-targets-refresh" type="button" class="secondary">Refresh</button>
        </div>
        ${renderRankingTargetStatusSummary(state.rankingOptimizationTargets)}
        <div class="ranking-toolbar ranking-toolbar-compact">
          <select id="saved-target-status-filter">
            ${RANKING_TARGET_STATUS_OPTIONS.map(([value, label]) => `<option value="${value}"${state.savedTargetStatusFilter === value ? " selected" : ""}>${htmlEscape(label)}</option>`).join("")}
          </select>
          <button id="saved-targets-select-view" type="button" class="secondary" ${targets.length ? "" : "disabled"}>Select Current View</button>
        </div>
        <div class="field-help">Select Current View selects the saved target rows currently shown by the active status filter.</div>
        <div class="ranking-bulk-bar">
          <select id="saved-target-bulk-status">
            <option value="selected">Selected</option>
            <option value="in_cora">In Cora</option>
            <option value="in_entity_explorer">In Entity Explorer</option>
            <option value="content_plan_created">Plan Created</option>
            <option value="optimized">Optimized</option>
            <option value="archived">Archived</option>
          </select>
          <button id="saved-target-update-status" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Update Status</button>
          <button id="saved-target-queue-cora" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Queue Cora</button>
          <button id="saved-target-create-plans" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Create Plans</button>
          <button id="saved-target-use-report" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Use in Report</button>
          <span>${fmtNum(selectedCount)} selected</span>
        </div>
        ${renderSavedRankingTargetsTable(targets)}
      </section>
    </div>
  `;
  bindSavedRankingTargetsPage(detail.project.id);
}

function filteredSavedRankingTargets() {
  const statusFilter = state.savedTargetStatusFilter || "all";
  return [...(state.rankingOptimizationTargets || [])]
    .filter((target) => statusFilter === "all" || (target.status || "new") === statusFilter)
    .sort((a, b) => Number(b.opportunityScore || 0) - Number(a.opportunityScore || 0));
}

function renderSavedRankingTargetsTable(targets) {
  if (!targets.length) {
    return `<div class="note-box">No saved targets match this status filter.</div>`;
  }
  return `<div class="ranking-table-wrap">${table([
    "",
    "URL",
    "Focus Keyword",
    "Best Pos",
    "Score",
    "Status",
    "Snapshot",
    "Recommended Action",
    "Actions",
  ], targets.map((target) => {
    const checked = state.savedTargetSelection[String(target.id)] ? "checked" : "";
    return `
      <tr>
        <td><input class="saved-target-check" type="checkbox" value="${target.id}" ${checked}></td>
        <td class="url-cell">${htmlEscape(target.url || "")}</td>
        <td>${htmlEscape(target.keyword || "")}</td>
        <td>${fmtNum(target.bestPosition)}</td>
        <td><span class="priority-pill">${fmtNum(target.opportunityScore)}</span><br><span class="muted">${htmlEscape(target.priorityType || "")}</span></td>
        <td><span class="status-pill ${htmlEscape(target.status || "new")}">${htmlEscape(rankingStatusLabel(target.status || "new"))}</span></td>
        <td>${htmlEscape(target.snapshot_target || "")}<br><span class="muted">${fmtDate(target.snapshot_created_at)}</span></td>
        <td>${htmlEscape(target.recommendedAction || "")}</td>
        <td>${rankingActionButtons({ projectId: target.projectId, keyword: target.keyword, rankingUrl: target.url, position: target.bestPosition, recommendedAction: target.recommendedAction })}</td>
      </tr>
    `;
  }))}</div>`;
}

function bindSavedRankingTargetsPage(projectId) {
  el("saved-targets-refresh")?.addEventListener("click", () => renderSavedRankingTargetsPage().catch((err) => toast(err.message)));
  el("saved-target-status-filter")?.addEventListener("change", (event) => {
    state.savedTargetStatusFilter = event.target.value;
    renderSavedRankingTargetsPage().catch((err) => toast(err.message));
  });
  document.querySelectorAll(".saved-target-check").forEach((input) => {
    input.addEventListener("change", () => {
      state.savedTargetSelection[input.value] = input.checked;
      renderSavedRankingTargetsPage().catch((err) => toast(err.message));
    });
  });
  el("saved-targets-select-view")?.addEventListener("click", () => {
    filteredSavedRankingTargets().forEach((target) => {
      state.savedTargetSelection[String(target.id)] = true;
    });
    renderSavedRankingTargetsPage().catch((err) => toast(err.message));
  });
  el("saved-target-update-status")?.addEventListener("click", () => updateSavedTargetsPageStatus(projectId).catch((err) => toast(err.message)));
  el("saved-target-queue-cora")?.addEventListener("click", () => bulkQueueSavedTargets(projectId).catch((err) => toast(err.message)));
  el("saved-target-create-plans")?.addEventListener("click", () => bulkCreateSavedTargetPlans(projectId).catch((err) => toast(err.message)));
  el("saved-target-use-report")?.addEventListener("click", () => useSavedTargetsInReport(projectId).catch((err) => toast(err.message)));
  document.querySelectorAll(".ranking-action-add-keyword").forEach((button) => {
    button.addEventListener("click", () => addRankingKeywordToClient(button).catch((err) => toast(err.message)));
  });
  document.querySelectorAll(".ranking-action-cora").forEach((button) => {
    button.addEventListener("click", () => queueRankingCoraRun(button).catch((err) => toast(err.message)));
  });
  document.querySelectorAll(".ranking-action-entity").forEach((button) => {
    button.addEventListener("click", () => sendRankingKeywordToEntity(button));
  });
  document.querySelectorAll(".ranking-action-plan").forEach((button) => {
    button.addEventListener("click", () => createRankingContentPlan(button).catch((err) => toast(err.message)));
  });
}

function selectedSavedRankingTargets() {
  return (state.rankingOptimizationTargets || []).filter((target) => state.savedTargetSelection[String(target.id)]);
}

async function updateSavedTargetsPageStatus(projectId) {
  const ids = selectedSavedRankingTargets().map((target) => target.id);
  if (!ids.length) throw new Error("Select at least one saved target.");
  await api("/api/seo/optimization-targets/status", {
    method: "POST",
    body: JSON.stringify({ target_ids: ids, status: el("saved-target-bulk-status")?.value || "selected", project_id: projectId }),
  });
  await renderSavedRankingTargetsPage();
  toast("Saved target status updated.");
}

async function bulkQueueSavedTargets(projectId) {
  const targets = selectedSavedRankingTargets();
  if (!targets.length) throw new Error("Select at least one saved target.");
  for (const target of targets) {
    await queueRankingCoraRun({ dataset: {
      projectId,
      keyword: encodeURIComponent(target.keyword || ""),
      url: encodeURIComponent(target.url || ""),
      position: target.bestPosition || "",
      action: encodeURIComponent(target.recommendedAction || ""),
    }});
  }
  await api("/api/seo/optimization-targets/status", {
    method: "POST",
    body: JSON.stringify({ target_ids: targets.map((target) => target.id), status: "in_cora", project_id: projectId }),
  });
  await renderSavedRankingTargetsPage();
  toast(`Queued ${fmtNum(targets.length)} Cora run${targets.length === 1 ? "" : "s"}.`);
}

async function bulkCreateSavedTargetPlans(projectId) {
  const targets = selectedSavedRankingTargets();
  if (!targets.length) throw new Error("Select at least one saved target.");
  for (const target of targets) {
    await createRankingContentPlan({ dataset: {
      projectId,
      keyword: encodeURIComponent(target.keyword || ""),
      url: encodeURIComponent(target.url || ""),
      position: target.bestPosition || "",
      action: encodeURIComponent(target.recommendedAction || ""),
    }});
  }
  await api("/api/seo/optimization-targets/status", {
    method: "POST",
    body: JSON.stringify({ target_ids: targets.map((target) => target.id), status: "content_plan_created", project_id: projectId }),
  });
  await renderSavedRankingTargetsPage();
  toast(`Created ${fmtNum(targets.length)} content plan${targets.length === 1 ? "" : "s"}.`);
}

async function useSavedTargetsInReport(projectId) {
  const targets = selectedSavedRankingTargets();
  if (!targets.length) throw new Error("Select at least one saved target.");
  const snapshotIds = Array.from(new Set(targets.map((target) => String(target.snapshotId || "")).filter(Boolean)));
  if (snapshotIds.length > 1) throw new Error("Choose saved targets from one Ranking Snapshot before using them in a report.");
  state.selectedClientId = String(projectId);
  state.selectedProjectId = Number(projectId);
  state.reportSnapshotId = snapshotIds[0] || "";
  state.reportTargetSelection = {};
  targets.forEach((target) => {
    state.reportTargetSelection[String(target.id)] = true;
  });
  showMainView("reports-view");
  toast("Selected saved targets are ready in the Report Generator.");
}

function bindRankingSnapshotTool(projectId) {
  el("ranking-snapshot-form")?.addEventListener("submit", (event) => runRankingSnapshot(event, projectId).catch((err) => {
    const status = el("ranking-snapshot-status");
    if (status) {
      status.className = "ai-test-result error";
      status.textContent = err.message;
    }
  }));
  el("ranking-history-refresh")?.addEventListener("click", () => renderRankingSnapshotTool().catch((err) => toast(err.message)));
  bindRankingSnapshotHistory();
  el("ranking-compare-form")?.addEventListener("submit", (event) => runRankingSnapshotComparison(event).catch((err) => toast(err.message)));
  bindRankingSnapshotResults();
}

function bindRankingSnapshotHistory() {
  document.querySelectorAll(".ranking-snapshot-open").forEach((button) => {
    button.addEventListener("click", async () => {
      const snapshotId = Number(button.dataset.snapshotId);
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Opening...";
      try {
        await loadRankingSnapshot(snapshotId);
        const history = el("ranking-snapshot-history");
        if (history) history.innerHTML = renderRankingSnapshotHistory();
        const results = el("ranking-snapshot-results");
        if (results) {
          results.innerHTML = renderRankingSnapshotResults();
          results.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        bindRankingSnapshotHistory();
        bindRankingSnapshotResults();
        toast("Ranking Snapshot opened.");
      } catch (err) {
        button.disabled = false;
        button.textContent = originalLabel;
        toast(err.message);
      }
    });
  });
}

async function runRankingSnapshotComparison(event) {
  event.preventDefault();
  const baseId = Number(el("ranking-compare-base")?.value || 0);
  const compareId = Number(el("ranking-compare-to")?.value || 0);
  if (!baseId || !compareId || baseId === compareId) {
    toast("Choose two different snapshots.");
    return;
  }
  await loadRankingSnapshotComparison(baseId, compareId);
  el("ranking-snapshot-comparison").innerHTML = renderRankingSnapshotComparisonPanel();
  bindRankingSnapshotTool(Number(state.selectedClientId || state.selectedProjectId || 0));
}

async function runRankingSnapshot(event, projectId) {
  event.preventDefault();
  const status = el("ranking-snapshot-status");
  const button = event.submitter || el("ranking-snapshot-form")?.querySelector("button[type='submit']");
  if (status) {
    status.className = "ai-test-result";
    status.textContent = "Requesting DataForSEO Labs snapshot...";
  }
  if (button) button.disabled = true;
  try {
    const data = await api("/api/seo/ranking-snapshot", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        target: el("ranking-target").value,
        location_code: Number(el("ranking-location-code").value || 2840),
        language_code: el("ranking-language-code").value || "en",
        limit: Number(el("ranking-limit").value || 1000),
        include_subdomains: el("ranking-include-subdomains").checked,
        force_refresh: el("ranking-force-refresh").checked,
      }),
    });
    state.rankingSnapshot = data;
    state.selectedRankingSnapshotId = Number(data.snapshot?.id || 0) || null;
    await loadRankingSnapshots(projectId);
    if (status) {
      status.className = `ai-test-result ${data.meta?.partial ? "warn" : "ok"}`;
      status.textContent = data.meta?.cached ? "Loaded cached weekly snapshot." : (data.meta?.partial ? "Snapshot saved with partial DataForSEO data." : "Snapshot complete.");
    }
    await renderRankingSnapshotTool();
  } finally {
    if (button) button.disabled = false;
  }
}

function renderRankingSnapshotHistory() {
  if (!state.rankingSnapshots.length) {
    return `<div class="note-box">No Ranking Snapshots saved for this client yet.</div>`;
  }
  return table(["Target", "Keywords", "Pages", "Created", ""], state.rankingSnapshots.map((snapshot) => {
    const active = Number(state.selectedRankingSnapshotId || state.rankingSnapshot?.snapshot?.id || 0) === Number(snapshot.id);
    return `
    <tr class="${active ? "active-snapshot-row" : ""}">
      <td><strong>${htmlEscape(snapshot.target)}</strong><br><span class="muted">${htmlEscape(snapshot.source || "DataForSEO Labs")} | ${htmlEscape(snapshot.freshness || "weekly")}</span></td>
      <td>${fmtNum(snapshot.keyword_count || 0)}</td>
      <td>${fmtNum(snapshot.page_count || 0)}</td>
      <td>${fmtDate(snapshot.created_at)}</td>
      <td><button type="button" class="secondary ranking-snapshot-open" data-snapshot-id="${snapshot.id}">${active ? "Opened" : "Open"}</button></td>
    </tr>
  `;
  }));
}

function snapshotOptionLabel(snapshot) {
  return `${snapshot.target} | ${fmtDate(snapshot.created_at)} | ${fmtNum(snapshot.keyword_count || 0)} keywords`;
}

function renderRankingSnapshotComparisonPanel() {
  const snapshots = state.rankingSnapshots || [];
  const latest = snapshots[0]?.id || "";
  const previous = snapshots[1]?.id || latest;
  const comparison = state.rankingComparison;
  return `
    <div class="panel-head">
      <div>
        <h3>Compare Snapshots</h3>
        <p>Track weekly keyword and page movement from saved DataForSEO Labs snapshots.</p>
      </div>
    </div>
    <form id="ranking-compare-form" class="ranking-compare-form">
      <label>
        Baseline
        <select id="ranking-compare-base" ${snapshots.length >= 2 ? "" : "disabled"}>
          ${snapshots.length ? snapshots.map((snapshot) => `<option value="${snapshot.id}"${Number(snapshot.id) === Number(previous) ? " selected" : ""}>${htmlEscape(snapshotOptionLabel(snapshot))}</option>`).join("") : `<option value="">No snapshots</option>`}
        </select>
      </label>
      <label>
        Compare To
        <select id="ranking-compare-to" ${snapshots.length >= 2 ? "" : "disabled"}>
          ${snapshots.length ? snapshots.map((snapshot) => `<option value="${snapshot.id}"${Number(snapshot.id) === Number(latest) ? " selected" : ""}>${htmlEscape(snapshotOptionLabel(snapshot))}</option>`).join("") : `<option value="">No snapshots</option>`}
        </select>
      </label>
      <button type="submit" ${snapshots.length >= 2 ? "" : "disabled"}>Compare Snapshots</button>
    </form>
    ${snapshots.length < 2 ? `<div class="note-box">Run at least two snapshots for this client to compare movement.</div>` : ""}
    ${comparison ? renderRankingSnapshotComparisonResults(comparison) : ""}
  `;
}

function movementClass(value, lowerIsBetter = true) {
  const num = Number(value || 0);
  if (!num) return "neutral";
  return (lowerIsBetter ? num < 0 : num > 0) ? "good" : "bad";
}

function renderRankingSnapshotComparisonResults(data) {
  const summary = data.summary || {};
  return `
    <div class="overview-grid ranking-overview-grid">
      <div class="overview-card"><span>${fmtNum(summary.newKeywords || 0)}</span><label>New Keywords</label></div>
      <div class="overview-card"><span>${fmtNum(summary.lostKeywords || 0)}</span><label>Lost Keywords</label></div>
      <div class="overview-card"><span>${fmtNum(summary.improvedKeywords || 0)}</span><label>Improved</label></div>
      <div class="overview-card"><span>${fmtNum(summary.declinedKeywords || 0)}</span><label>Declined</label></div>
      <div class="overview-card"><span>${fmtNum(summary.pageGains || 0)}</span><label>Page Gains</label></div>
      <div class="overview-card"><span>${fmtNum(summary.pageLosses || 0)}</span><label>Page Losses</label></div>
    </div>
    <div class="ranking-comparison-grid">
      <section>
        <h4>Keyword Movement</h4>
        ${renderRankingKeywordMovementTable(data.keywords || [])}
      </section>
      <section>
        <h4>Page Movement</h4>
        ${renderRankingPageMovementTable(data.pages || [])}
      </section>
    </div>
  `;
}

function renderRankingKeywordMovementTable(rows) {
  const visible = rows.filter((row) => row.status !== "unchanged").slice(0, 80);
  if (!visible.length) return `<div class="note-box">No keyword movement found between these snapshots.</div>`;
  return `<div class="ranking-table-wrap">${table(["Status", "Keyword", "Before", "After", "Change", "Ranking URL", "Actions"], visible.map((row) => `
    <tr>
      <td><span class="status-pill ${htmlEscape(row.status || "")}">${htmlEscape(String(row.status || "").replaceAll("_", " "))}</span></td>
      <td>${htmlEscape(row.keyword || "")}</td>
      <td>${fmtNum(row.basePosition)}</td>
      <td>${fmtNum(row.comparePosition)}</td>
      <td><span class="delta ${movementClass(row.positionDelta, true)}">${row.positionDelta === null || row.positionDelta === undefined ? "" : fmtNum(row.positionDelta)}</span></td>
      <td class="url-cell">${htmlEscape(row.rankingUrl || "")}</td>
      <td>${rankingActionButtons({ keyword: row.keyword, rankingUrl: row.rankingUrl, position: row.comparePosition, recommendedAction: `Ranking movement status: ${row.status}` })}</td>
    </tr>
  `))}</div>`;
}

function renderRankingPageMovementTable(rows) {
  const visible = rows.filter((row) => row.status !== "unchanged").slice(0, 80);
  if (!visible.length) return `<div class="note-box">No page movement found between these snapshots.</div>`;
  return `<div class="ranking-table-wrap">${table(["Status", "URL", "Traffic Before", "Traffic After", "Traffic Change", "Keywords Change"], visible.map((row) => `
    <tr>
      <td><span class="status-pill ${htmlEscape(row.status || "")}">${htmlEscape(String(row.status || "").replaceAll("_", " "))}</span></td>
      <td class="url-cell">${htmlEscape(row.url || "")}</td>
      <td>${fmtNum(row.baseOrganicTraffic)}</td>
      <td>${fmtNum(row.compareOrganicTraffic)}</td>
      <td><span class="delta ${movementClass(row.organicTrafficDelta, false)}">${fmtNum(row.organicTrafficDelta)}</span></td>
      <td><span class="delta ${movementClass(row.organicKeywordDelta, false)}">${fmtNum(row.organicKeywordDelta)}</span></td>
    </tr>
  `))}</div>`;
}

function renderRankingSnapshotResults() {
  const data = state.rankingSnapshot;
  if (!data?.snapshot) {
    return `<div class="note-box">Run or open a Ranking Snapshot to see ranking keywords, ranking pages, and optimization opportunities.</div>`;
  }
  const tabs = [
    ["overview", "Overview"],
    ["targets", "Optimization Targets"],
    ["keywords", "Ranking Keywords"],
    ["pages", "Ranking Pages"],
    ["opportunities", "Opportunities"],
  ];
  return `
    <div class="ranking-result-head">
      <div>
        <h3>${htmlEscape(data.snapshot.target)} Ranking Snapshot</h3>
        <p>${htmlEscape(data.meta?.source || "DataForSEO Labs")} | ${htmlEscape(data.meta?.freshness || "weekly")} | ${fmtDate(data.meta?.generated_at)}</p>
      </div>
      ${data.meta?.cached ? `<span class="health-badge ok">Cached</span>` : ""}
      ${data.meta?.partial ? `<span class="health-badge warn">Partial Data</span>` : ""}
    </div>
    ${data.meta?.partial ? `<div class="note-box">DataForSEO returned partial data. Some tabs may be incomplete.</div>` : ""}
    <div class="ranking-tabs">
      ${tabs.map(([key, label]) => `<button type="button" class="ranking-tab ${state.rankingSnapshotTab === key ? "active" : ""}" data-ranking-tab="${key}">${label}</button>`).join("")}
    </div>
    <div class="ranking-tab-content">
      ${renderRankingSnapshotTab(data)}
    </div>
  `;
}

function bindRankingSnapshotResults() {
  document.querySelectorAll(".ranking-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.rankingSnapshotTab = button.dataset.rankingTab || "overview";
      el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
      bindRankingSnapshotResults();
    });
  });
  el("ranking-keyword-apply")?.addEventListener("click", () => {
    state.rankingKeywordFilters = {
      keyword: el("ranking-keyword-contains")?.value || "",
      url: el("ranking-keyword-url")?.value || "",
      minVolume: el("ranking-keyword-min-volume")?.value || "",
      posMin: el("ranking-keyword-pos-min")?.value || "",
      posMax: el("ranking-keyword-pos-max")?.value || "",
    };
    el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
    bindRankingSnapshotResults();
  });
  document.querySelectorAll(".ranking-sort").forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.dataset.sortScope || "keywords";
      const key = button.dataset.sortKey || "";
      const current = rankingSortForScope(scope);
      const nextDirection = current?.key === key && current.direction === "asc" ? "desc" : "asc";
      if (scope === "opportunities") {
        state.rankingOpportunitySort = { key, direction: nextDirection };
      } else if (scope === "targets") {
        state.rankingTargetSort = { key, direction: nextDirection };
      } else {
        state.rankingKeywordSort = { key, direction: nextDirection };
      }
      el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
      bindRankingSnapshotResults();
    });
  });
  el("ranking-page-sort")?.addEventListener("change", (event) => {
    state.rankingPageSort = event.target.value;
    el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
    bindRankingSnapshotResults();
  });
  el("ranking-opportunity-filter")?.addEventListener("change", (event) => {
    state.rankingOpportunityFilter = event.target.value;
    el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
    bindRankingSnapshotResults();
  });
  el("ranking-target-filter")?.addEventListener("change", (event) => {
    state.rankingTargetFilter = event.target.value;
    el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
    bindRankingSnapshotResults();
  });
  el("ranking-target-status-filter")?.addEventListener("change", (event) => {
    state.rankingTargetStatusFilter = event.target.value;
    el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
    bindRankingSnapshotResults();
  });
  el("ranking-export-keywords")?.addEventListener("click", () => exportRankingCsv("keywords"));
  el("ranking-export-pages")?.addEventListener("click", () => exportRankingCsv("pages"));
  el("ranking-export-opportunities")?.addEventListener("click", () => exportRankingCsv("opportunities"));
  el("ranking-export-targets")?.addEventListener("click", () => exportRankingCsv("targets"));
  document.querySelectorAll(".ranking-target-check").forEach((input) => {
    input.addEventListener("change", () => {
      state.rankingTargetSelection[normalizeRankingUrlKey(input.dataset.targetUrl)] = input.checked;
      el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
      bindRankingSnapshotResults();
    });
  });
  el("ranking-target-select-visible")?.addEventListener("change", (event) => {
    filteredRankingOptimizationTargets(state.rankingSnapshot || {}).forEach((row) => {
      state.rankingTargetSelection[normalizeRankingUrlKey(row.url)] = event.target.checked;
    });
    el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
    bindRankingSnapshotResults();
  });
  document.querySelectorAll(".ranking-target-detail").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRankingTargetUrl = button.dataset.targetUrl || "";
      el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
      bindRankingSnapshotResults();
    });
  });
  el("ranking-target-detail-close")?.addEventListener("click", () => {
    state.selectedRankingTargetUrl = "";
    el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
    bindRankingSnapshotResults();
  });
  el("ranking-save-selected-targets")?.addEventListener("click", () => saveSelectedRankingTargets().catch((err) => toast(err.message)));
  el("ranking-status-selected-targets")?.addEventListener("click", () => updateSelectedRankingTargetStatus().catch((err) => toast(err.message)));
  el("ranking-bulk-cora-targets")?.addEventListener("click", () => bulkQueueRankingTargets().catch((err) => toast(err.message)));
  el("ranking-bulk-plan-targets")?.addEventListener("click", () => bulkCreateRankingPlans().catch((err) => toast(err.message)));
  el("ranking-bulk-report-targets")?.addEventListener("click", () => useSelectedRankingTargetsInReport().catch((err) => toast(err.message)));
  document.querySelectorAll(".ranking-action-add-keyword").forEach((button) => {
    button.addEventListener("click", () => addRankingKeywordToClient(button).catch((err) => toast(err.message)));
  });
  document.querySelectorAll(".ranking-action-cora").forEach((button) => {
    button.addEventListener("click", () => queueRankingCoraRun(button).catch((err) => toast(err.message)));
  });
  document.querySelectorAll(".ranking-action-entity").forEach((button) => {
    button.addEventListener("click", () => sendRankingKeywordToEntity(button));
  });
  document.querySelectorAll(".ranking-action-plan").forEach((button) => {
    button.addEventListener("click", () => createRankingContentPlan(button).catch((err) => toast(err.message)));
  });
}

function selectedRankingTargets() {
  const selected = state.rankingTargetSelection || {};
  return buildRankingOptimizationTargets(state.rankingSnapshot || {}).filter((row) => selected[normalizeRankingUrlKey(row.url)]);
}

async function saveSelectedRankingTargets(status = "selected") {
  const targets = selectedRankingTargets();
  const snapshotId = Number(state.rankingSnapshot?.snapshot?.id || state.selectedRankingSnapshotId || 0);
  const projectId = Number(state.rankingSnapshot?.snapshot?.project_id || state.selectedClientId || state.selectedProjectId || 0);
  if (!snapshotId || !targets.length) throw new Error("Select at least one target to save.");
  const result = await api("/api/seo/optimization-targets", {
    method: "POST",
    body: JSON.stringify({ snapshot_id: snapshotId, project_id: projectId, status, targets }),
  });
  state.rankingSnapshot.savedTargets = result.targets || [];
  state.rankingOptimizationTargets = result.targets || state.rankingOptimizationTargets;
  await loadRankingSnapshot(snapshotId);
  el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
  bindRankingSnapshotResults();
  toast(`${fmtNum(result.saved_ids?.length || targets.length)} optimization target${targets.length === 1 ? "" : "s"} saved.`);
  return result.targets || [];
}

async function ensureSelectedRankingTargetsSaved() {
  const targets = selectedRankingTargets();
  if (!targets.length) throw new Error("Select at least one target.");
  const unsaved = targets.some((target) => !target.savedId);
  if (unsaved) {
    return saveSelectedRankingTargets("selected");
  }
  return targets;
}

async function updateSelectedRankingTargetStatus() {
  const status = el("ranking-bulk-status")?.value || "selected";
  const targets = await ensureSelectedRankingTargetsSaved();
  const result = await updateSavedRankingTargetStatus(targets, status);
  await loadRankingSnapshot(Number(state.rankingSnapshot?.snapshot?.id || 0));
  el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
  bindRankingSnapshotResults();
  toast("Optimization target status updated.");
  return result;
}

async function bulkQueueRankingTargets() {
  const targets = await ensureSelectedRankingTargetsSaved();
  for (const target of targets) {
    await queueRankingCoraRun({ dataset: {
      keyword: encodeURIComponent(target.keyword || ""),
      url: encodeURIComponent(target.url || ""),
      position: target.bestPosition || target.position || "",
      action: encodeURIComponent(target.recommendedAction || ""),
    }});
  }
  await updateSavedRankingTargetStatus(targets, "in_cora");
  await loadRankingSnapshot(Number(state.rankingSnapshot?.snapshot?.id || 0));
  el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
  bindRankingSnapshotResults();
  toast(`Queued ${fmtNum(targets.length)} Cora run${targets.length === 1 ? "" : "s"}.`);
}

async function bulkCreateRankingPlans() {
  const targets = await ensureSelectedRankingTargetsSaved();
  for (const target of targets) {
    await createRankingContentPlan({ dataset: {
      keyword: encodeURIComponent(target.keyword || ""),
      url: encodeURIComponent(target.url || ""),
      position: target.bestPosition || target.position || "",
      action: encodeURIComponent(target.recommendedAction || ""),
    }});
  }
  await updateSavedRankingTargetStatus(targets, "content_plan_created");
  await loadRankingSnapshot(Number(state.rankingSnapshot?.snapshot?.id || 0));
  el("ranking-snapshot-results").innerHTML = renderRankingSnapshotResults();
  bindRankingSnapshotResults();
  toast(`Created ${fmtNum(targets.length)} content plan${targets.length === 1 ? "" : "s"}.`);
}

async function updateSavedRankingTargetStatus(saved, status) {
  const ids = saved.map((target) => target.savedId || target.id).filter(Boolean);
  if (!ids.length) return null;
  return api("/api/seo/optimization-targets/status", {
    method: "POST",
    body: JSON.stringify({
      target_ids: ids,
      status,
      project_id: Number(state.rankingSnapshot?.snapshot?.project_id || state.selectedClientId || state.selectedProjectId || 0) || null,
    }),
  });
}

async function useSelectedRankingTargetsInReport() {
  const saved = await ensureSelectedRankingTargetsSaved();
  const projectId = String(state.rankingSnapshot?.snapshot?.project_id || state.selectedClientId || state.selectedProjectId || "");
  if (projectId) {
    state.selectedClientId = projectId;
    state.selectedProjectId = Number(projectId) || null;
  }
  state.reportSnapshotId = String(state.rankingSnapshot?.snapshot?.id || "");
  state.reportTargetSelection = {};
  saved.forEach((target) => {
    const id = target.savedId || target.id;
    if (id) state.reportTargetSelection[String(id)] = true;
  });
  await loadReportsPage();
  showMainView("reports-view");
  toast("Selected targets are ready in the Report Generator.");
}

function rankingActionData(button) {
  return {
    projectId: Number(button.dataset.projectId || state.rankingSnapshot?.snapshot?.project_id || state.selectedClientId || state.selectedProjectId || 0),
    keyword: decodeURIComponent(button.dataset.keyword || ""),
    rankingUrl: decodeURIComponent(button.dataset.url || ""),
    position: button.dataset.position || "",
    action: decodeURIComponent(button.dataset.action || ""),
  };
}

function rankingActionButtons(row) {
  const keyword = encodeURIComponent(row.keyword || "");
  const url = encodeURIComponent(row.rankingUrl || "");
  const action = encodeURIComponent(row.recommendedAction || "");
  const position = htmlEscape(row.position ?? "");
  const projectId = htmlEscape(row.projectId || row.project_id || "");
  const disabledUrl = row.rankingUrl ? "" : " disabled";
  return `
    <div class="ranking-row-actions">
      <button type="button" class="link-button ranking-action-add-keyword" title="Add this discovered keyword to the selected client" data-project-id="${projectId}" data-keyword="${keyword}" data-url="${url}" data-position="${position}" data-action="${action}">Add to Client</button>
      <button type="button" class="link-button ranking-action-cora" title="Queue a Cora run for this keyword and ranking URL" data-project-id="${projectId}" data-keyword="${keyword}" data-url="${url}" data-position="${position}" data-action="${action}"${disabledUrl}>Queue Cora Run</button>
      <button type="button" class="link-button ranking-action-entity" title="Open Entity & LSI Explorer with this keyword prefilled" data-project-id="${projectId}" data-keyword="${keyword}" data-url="${url}" data-position="${position}" data-action="${action}">Explore Entities</button>
      <button type="button" class="link-button ranking-action-plan" title="Create a Content Planner task from this opportunity" data-project-id="${projectId}" data-keyword="${keyword}" data-url="${url}" data-position="${position}" data-action="${action}">Create Plan</button>
    </div>
  `;
}

async function addRankingKeywordToClient(button) {
  const data = rankingActionData(button);
  if (!data.projectId || !data.keyword) throw new Error("Missing client or keyword.");
  const detail = await getProjectDetail(data.projectId);
  const exists = (detail.keywords || []).some((item) => String(item.keyword || "").toLowerCase() === data.keyword.toLowerCase());
  if (exists) {
    toast("Keyword is already on this client.");
    return;
  }
  await api("/api/keywords", {
    method: "POST",
    body: JSON.stringify({
      project_id: data.projectId,
      keyword: data.keyword,
      intent: "Discovered",
      priority: "Medium",
    }),
  });
  delete state.projectDetails[data.projectId];
  await loadProjects();
  toast("Keyword added to client.");
}

async function queueRankingCoraRun(button) {
  const data = rankingActionData(button);
  if (!data.projectId || !data.keyword || !data.rankingUrl) throw new Error("Missing client, keyword, or ranking URL.");
  const result = await api("/api/seo/ranking-snapshot/queue-cora", {
    method: "POST",
    body: JSON.stringify({
      project_id: data.projectId,
      keyword: data.keyword,
      ranking_url: data.rankingUrl,
      create_keyword: true,
    }),
  });
  delete state.projectDetails[data.projectId];
  await loadJobs();
  await loadProjects();
  toast(result.created_keyword ? "Keyword added and Cora job queued." : "Cora job queued.");
}

function sendRankingKeywordToEntity(button) {
  const data = rankingActionData(button);
  if (!data.keyword) {
    toast("Keyword is required.");
    return;
  }
  state.entitySeedOverride = data.keyword;
  showMainView("entity-view");
}

async function createRankingContentPlan(button) {
  const data = rankingActionData(button);
  if (!data.projectId || !data.keyword) throw new Error("Missing client or keyword.");
  await api("/api/content-plans", {
    method: "POST",
    body: JSON.stringify({
      project_id: data.projectId,
      title: `Optimize ranking page for ${data.keyword}`,
      content_type: "Page Update",
      intent: "SEO Optimization",
      priority: "High",
      status: "planned",
      notes: [
        data.rankingUrl ? `Ranking URL: ${data.rankingUrl}` : "",
        data.position ? `Current position: ${data.position}` : "",
        data.action ? `Recommended action: ${data.action}` : "",
      ].filter(Boolean).join("\n"),
    }),
  });
  state.overview = null;
  toast("Content plan created.");
}

function renderRankingSnapshotTab(data) {
  if (state.rankingSnapshotTab === "targets") return renderRankingOptimizationTargets(data);
  if (state.rankingSnapshotTab === "keywords") return renderRankingKeywords(data.keywords || []);
  if (state.rankingSnapshotTab === "pages") return renderRankingPages(data.pages || []);
  if (state.rankingSnapshotTab === "opportunities") return renderRankingOpportunities(data.opportunities || []);
  return renderRankingOverview(data);
}

function renderRankingOverview(data) {
  const overview = data.overview || {};
  const dist = overview.rankingDistribution || {};
  return `
    <div class="overview-grid ranking-overview-grid">
      <div class="overview-card"><span>${fmtNum(overview.organicKeywords)}</span><label>Organic Keywords</label></div>
      <div class="overview-card"><span>${fmtNum(overview.organicTraffic)}</span><label>Estimated Organic Traffic</label></div>
      <div class="overview-card"><span>${fmtNum(overview.organicTrafficCost)}</span><label>Traffic Cost</label></div>
      <div class="overview-card"><span>${fmtNum(overview.paidKeywords)}</span><label>Paid Keywords</label></div>
      <div class="overview-card"><span>${fmtNum(dist.top1)}</span><label>Top 1</label></div>
      <div class="overview-card"><span>${fmtNum(dist.top3)}</span><label>Top 3</label></div>
      <div class="overview-card"><span>${fmtNum(dist.top10)}</span><label>Top 10</label></div>
      <div class="overview-card"><span>${fmtNum(dist.top20)}</span><label>Top 20</label></div>
      <div class="overview-card"><span>${fmtNum(dist.top100)}</span><label>Top 100</label></div>
    </div>
    <div class="note-box">${htmlEscape(overview.dataFreshnessNote || "DataForSEO Labs data is updated weekly; this is not live rank tracking.")}</div>
  `;
}

function sortValue(row, key) {
  const value = row?.[key];
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value).toLowerCase();
}

function sortRows(rows, sort) {
  const key = sort?.key || "position";
  const direction = sort?.direction === "asc" ? "asc" : "desc";
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    if (left < right) return -1 * multiplier;
    if (left > right) return 1 * multiplier;
    return 0;
  });
}

function rankingSortForScope(scope = "keywords") {
  if (scope === "opportunities") return state.rankingOpportunitySort;
  if (scope === "targets") return state.rankingTargetSort;
  return state.rankingKeywordSort;
}

function sortHeader(label, key, scope = "keywords") {
  const sort = rankingSortForScope(scope);
  const active = sort?.key === key;
  const arrow = active ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  return `<button type="button" class="table-sort-button ranking-sort${active ? " active" : ""}" data-sort-scope="${scope}" data-sort-key="${key}">${htmlEscape(label)}${arrow}</button>`;
}

function filteredRankingKeywords(rows) {
  const filters = state.rankingKeywordFilters || {};
  const minVolume = Number(filters.minVolume || 0);
  const posMin = Number(filters.posMin || 0);
  const posMax = Number(filters.posMax || 0);
  const urlNeedle = String(filters.url || "").toLowerCase().trim();
  const keywordNeedle = String(filters.keyword || "").toLowerCase().trim();
  const filtered = rows.filter((row) => {
    const position = Number(row.position || 0);
    const volume = Number(row.searchVolume || 0);
    if (minVolume && volume < minVolume) return false;
    if (posMin && (!position || position < posMin)) return false;
    if (posMax && (!position || position > posMax)) return false;
    if (urlNeedle && !String(row.rankingUrl || "").toLowerCase().includes(urlNeedle)) return false;
    if (keywordNeedle && !String(row.keyword || "").toLowerCase().includes(keywordNeedle)) return false;
    return true;
  });
  return sortRows(filtered, state.rankingKeywordSort);
}

function normalizeRankingUrlKey(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function savedRankingTargetMap(data) {
  const saved = data.savedTargets || [];
  return new Map(saved.map((target) => [normalizeRankingUrlKey(target.url), target]));
}

function pageOpportunityType(position, previousPosition, aiOverviewPresent, aiOverviewReference) {
  const pos = Number(position || 0);
  const prev = Number(previousPosition || 0);
  if (aiOverviewPresent && !aiOverviewReference) return "AI Overview Gap";
  if (prev && pos && pos > prev) return "Slipping Keyword";
  if (pos >= 4 && pos <= 10) return "Top 3 Push";
  if (pos >= 11 && pos <= 20) return "Page Two Lift";
  if (pos >= 21 && pos <= 30) return "Content Expansion";
  return "Monitor";
}

function targetRecommendedAction(type) {
  if (type === "Top 3 Push") return "Improve on-page optimization, internal links, title/meta, and content depth to push the strongest terms into top 3.";
  if (type === "Page Two Lift") return "Refresh the ranking page and strengthen topical coverage to move page-two keywords onto page one.";
  if (type === "Content Expansion") return "Expand content depth, add internal links, and consider whether a dedicated page is needed for weaker keyword clusters.";
  if (type === "AI Overview Gap") return "Add concise answer blocks, entity-rich explanations, citations, and schema where relevant.";
  if (type === "Slipping Keyword") return "Review SERP movement, refresh stale sections, and reinforce internal links before more rankings decline.";
  return "Monitor the page and use Cora or entity analysis when search volume or position movement justifies work.";
}

function buildRankingOptimizationTargets(data) {
  const pagesByUrl = new Map((data.pages || []).map((page) => [normalizeRankingUrlKey(page.url), page]));
  const savedByUrl = savedRankingTargetMap(data);
  const groups = new Map();
  (data.keywords || []).forEach((row) => {
    const url = normalizeRankingUrlKey(row.rankingUrl);
    if (!url) return;
    if (!groups.has(url)) groups.set(url, []);
    groups.get(url).push(row);
  });
  return Array.from(groups.entries()).map(([url, keywords]) => {
    const page = pagesByUrl.get(url) || {};
    const sortedKeywords = [...keywords].sort((a, b) => {
      const leftVolume = Number(a.searchVolume || 0);
      const rightVolume = Number(b.searchVolume || 0);
      if (leftVolume !== rightVolume) return rightVolume - leftVolume;
      return Number(a.position || 999) - Number(b.position || 999);
    });
    const bestKeyword = [...keywords].sort((a, b) => Number(a.position || 999) - Number(b.position || 999))[0] || {};
    const opportunityRows = keywords.filter((row) => {
      const pos = Number(row.position || 0);
      const prev = Number(row.previousPosition || 0);
      return (pos >= 4 && pos <= 30) || (prev && pos > prev) || (row.aiOverviewPresent && !row.aiOverviewReference);
    });
    const typeCounts = opportunityRows.reduce((acc, row) => {
      const type = pageOpportunityType(row.position, row.previousPosition, row.aiOverviewPresent, row.aiOverviewReference);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const priorityType = ["AI Overview Gap", "Slipping Keyword", "Top 3 Push", "Page Two Lift", "Content Expansion"].find((type) => typeCounts[type]) || "Monitor";
    const totalSearchVolume = keywords.reduce((sum, row) => sum + Number(row.searchVolume || 0), 0);
    const estimatedTraffic = keywords.reduce((sum, row) => sum + Number(row.estimatedTraffic || 0), 0);
    const bestPosition = keywords.reduce((best, row) => {
      const pos = Number(row.position || 0);
      return pos ? Math.min(best, pos) : best;
    }, 999);
    const highIntentBonus = Number(bestPosition === 999 ? 0 : Math.max(0, 31 - bestPosition));
    const opportunityScore = Math.round(
      (opportunityRows.length * 12) +
      (Math.log10(totalSearchVolume + 1) * 18) +
      highIntentBonus +
      (typeCounts["AI Overview Gap"] ? 25 : 0) +
      (typeCounts["Slipping Keyword"] ? 18 : 0)
    );
    const saved = savedByUrl.get(url) || {};
    return {
      id: saved.id || null,
      savedId: saved.id || null,
      url,
      keyword: bestKeyword.keyword || sortedKeywords[0]?.keyword || "",
      position: bestKeyword.position ?? "",
      bestPosition: bestPosition === 999 ? null : bestPosition,
      rankingKeywords: keywords.length,
      opportunityCount: opportunityRows.length,
      totalSearchVolume,
      estimatedTraffic,
      pageOrganicTraffic: page.organicTraffic ?? null,
      pageOrganicKeywords: page.organicKeywords ?? null,
      top10: page.top10 ?? null,
      priorityType: saved.priorityType || priorityType,
      opportunityScore: saved.opportunityScore ?? opportunityScore,
      recommendedAction: saved.recommendedAction || targetRecommendedAction(priorityType),
      topKeywords: sortedKeywords.slice(0, 3).map((row) => row.keyword).filter(Boolean),
      rankingUrl: url,
      status: saved.status || "new",
      notes: saved.notes || "",
    };
  });
}

const RANKING_TARGET_STATUS_OPTIONS = [
  ["all", "All Statuses"],
  ["new", "New"],
  ["selected", "Selected"],
  ["in_cora", "In Cora"],
  ["in_entity_explorer", "In Entity Explorer"],
  ["content_plan_created", "Plan Created"],
  ["optimized", "Optimized"],
  ["archived", "Archived"],
];

function rankingStatusLabel(status) {
  return (RANKING_TARGET_STATUS_OPTIONS.find(([key]) => key === status)?.[1]) || String(status || "new").replaceAll("_", " ");
}

function rankingTargetStatusCounts(rows) {
  return rows.reduce((counts, row) => {
    const status = row.status || "new";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function renderRankingTargetStatusSummary(rows) {
  const counts = rankingTargetStatusCounts(rows);
  const statuses = ["selected", "in_cora", "content_plan_created", "optimized"];
  return `
    <div class="ranking-status-summary">
      ${statuses.map((status) => `
        <div><strong>${fmtNum(counts[status] || 0)}</strong><span>${htmlEscape(rankingStatusLabel(status))}</span></div>
      `).join("")}
    </div>
  `;
}

function filteredRankingOptimizationTargets(data) {
  const filter = state.rankingTargetFilter || "all";
  const statusFilter = state.rankingTargetStatusFilter || "all";
  const targets = buildRankingOptimizationTargets(data).filter((row) => {
    if (filter === "all") return true;
    if (filter === "quick_wins") return row.bestPosition >= 4 && row.bestPosition <= 10;
    if (filter === "page_two") return row.bestPosition >= 11 && row.bestPosition <= 20;
    if (filter === "expansion") return row.bestPosition >= 21 && row.bestPosition <= 30;
    if (filter === "ai_overview") return row.priorityType === "AI Overview Gap";
    if (filter === "slipping") return row.priorityType === "Slipping Keyword";
    return true;
  }).filter((row) => {
    if (statusFilter === "all") return true;
    return (row.status || "new") === statusFilter;
  });
  return sortRows(targets, state.rankingTargetSort);
}

function renderRankingOptimizationTargets(data) {
  const allTargets = buildRankingOptimizationTargets(data);
  const rows = filteredRankingOptimizationTargets(data);
  const selectedCount = rows.filter((row) => state.rankingTargetSelection[normalizeRankingUrlKey(row.url)]).length;
  return `
    ${renderRankingTargetStatusSummary(allTargets)}
    <div class="ranking-target-summary">
      <div><strong>${fmtNum(allTargets.length)}</strong><span>ranking URLs</span></div>
      <div><strong>${fmtNum(rows.reduce((sum, row) => sum + row.opportunityCount, 0))}</strong><span>visible opportunities</span></div>
      <div><strong>${fmtNum(rows.reduce((sum, row) => sum + row.totalSearchVolume, 0))}</strong><span>combined search volume</span></div>
    </div>
    <div class="ranking-toolbar ranking-toolbar-targets">
      <select id="ranking-target-filter">
        <option value="all">All Targets</option>
        <option value="quick_wins"${state.rankingTargetFilter === "quick_wins" ? " selected" : ""}>Quick Wins: Positions 4-10</option>
        <option value="page_two"${state.rankingTargetFilter === "page_two" ? " selected" : ""}>Page Two: Positions 11-20</option>
        <option value="expansion"${state.rankingTargetFilter === "expansion" ? " selected" : ""}>Expansion: Positions 21-30</option>
        <option value="ai_overview"${state.rankingTargetFilter === "ai_overview" ? " selected" : ""}>AI Overview Gaps</option>
        <option value="slipping"${state.rankingTargetFilter === "slipping" ? " selected" : ""}>Slipping Keywords</option>
      </select>
      <select id="ranking-target-status-filter">
        ${RANKING_TARGET_STATUS_OPTIONS.map(([value, label]) => `<option value="${value}"${state.rankingTargetStatusFilter === value ? " selected" : ""}>${htmlEscape(label)}</option>`).join("")}
      </select>
      <button id="ranking-export-targets" type="button" class="secondary">Export CSV</button>
    </div>
    <div class="ranking-bulk-bar">
      <label><input id="ranking-target-select-visible" type="checkbox" ${rows.length && selectedCount === rows.length ? "checked" : ""}> Select Current View</label>
      <select id="ranking-bulk-status">
        <option value="selected">Selected</option>
        <option value="in_cora">In Cora</option>
        <option value="in_entity_explorer">In Entity Explorer</option>
        <option value="content_plan_created">Content Plan Created</option>
        <option value="optimized">Optimized</option>
        <option value="archived">Archived</option>
      </select>
      <button id="ranking-save-selected-targets" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Save Selected</button>
      <button id="ranking-status-selected-targets" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Update Status</button>
      <button id="ranking-bulk-cora-targets" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Queue Cora</button>
      <button id="ranking-bulk-plan-targets" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Create Plans</button>
      <button id="ranking-bulk-report-targets" type="button" class="secondary" ${selectedCount ? "" : "disabled"}>Use in Report</button>
      <span>${fmtNum(selectedCount)} selected</span>
    </div>
    <div class="field-help">Select Current View selects the target rows currently shown by the active filters.</div>
    ${rows.length ? `<div class="ranking-table-wrap">${table([
      "",
      "Ranking URL",
      sortHeader("Focus Keyword", "keyword", "targets"),
      sortHeader("Best Pos", "bestPosition", "targets"),
      sortHeader("Keywords", "rankingKeywords", "targets"),
      sortHeader("Opps", "opportunityCount", "targets"),
      sortHeader("Volume", "totalSearchVolume", "targets"),
      sortHeader("Est. Traffic", "estimatedTraffic", "targets"),
      sortHeader("Page Traffic", "pageOrganicTraffic", "targets"),
      sortHeader("Score", "opportunityScore", "targets"),
      "Status",
      "Next Step",
      "Actions",
    ], rows.map((row) => `
      <tr>
        <td><input class="ranking-target-check" type="checkbox" data-target-url="${htmlEscape(row.url)}" ${state.rankingTargetSelection[normalizeRankingUrlKey(row.url)] ? "checked" : ""}></td>
        <td class="url-cell">
          <button type="button" class="link-button ranking-target-detail" data-target-url="${htmlEscape(row.url)}">${htmlEscape(row.url)}</button>
          <div class="muted">${row.topKeywords.map((keyword) => htmlEscape(keyword)).join(" | ")}</div>
        </td>
        <td>${htmlEscape(row.keyword)}</td>
        <td>${fmtNum(row.bestPosition)}</td>
        <td>${fmtNum(row.rankingKeywords)}</td>
        <td>${fmtNum(row.opportunityCount)}</td>
        <td>${fmtNum(row.totalSearchVolume)}</td>
        <td>${fmtNum(row.estimatedTraffic)}</td>
        <td>${fmtNum(row.pageOrganicTraffic)}</td>
        <td><span class="priority-pill">${fmtNum(row.opportunityScore)}</span><br><span class="muted">${htmlEscape(row.priorityType)}</span></td>
        <td><span class="status-pill ${htmlEscape(row.status || "new")}">${htmlEscape(String(row.status || "new").replaceAll("_", " "))}</span></td>
        <td>${htmlEscape(row.recommendedAction)}</td>
        <td>${rankingActionButtons(row)}</td>
      </tr>
    `))}</div>` : `<div class="note-box">No ranking URLs match this target filter.</div>`}
    ${renderRankingTargetDetail(data)}
  `;
}

function renderRankingTargetDetail(data) {
  const url = normalizeRankingUrlKey(state.selectedRankingTargetUrl);
  if (!url) return "";
  const target = buildRankingOptimizationTargets(data).find((row) => normalizeRankingUrlKey(row.url) === url);
  if (!target) return "";
  const keywords = (data.keywords || [])
    .filter((row) => normalizeRankingUrlKey(row.rankingUrl) === url)
    .sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
  return `
    <section class="ranking-target-detail-panel">
      <div class="panel-head">
        <div>
          <h3>${htmlEscape(target.keyword || "Optimization Target")}</h3>
          <p>${htmlEscape(target.url)}</p>
        </div>
        <button id="ranking-target-detail-close" type="button" class="secondary">Close</button>
      </div>
      <div class="ranking-target-detail-grid">
        <div><label>Status</label><strong>${htmlEscape(String(target.status || "new").replaceAll("_", " "))}</strong></div>
        <div><label>Opportunity Score</label><strong>${fmtNum(target.opportunityScore)}</strong></div>
        <div><label>Best Position</label><strong>${fmtNum(target.bestPosition)}</strong></div>
        <div><label>Total Search Volume</label><strong>${fmtNum(target.totalSearchVolume)}</strong></div>
      </div>
      <p>${htmlEscape(target.recommendedAction)}</p>
      <div class="ranking-table-wrap">${table(["Keyword", "Position", "Previous", "Volume", "Traffic", "SERP Features"], keywords.slice(0, 80).map((row) => `
        <tr>
          <td>${htmlEscape(row.keyword)}</td>
          <td>${fmtNum(row.position)}</td>
          <td>${fmtNum(row.previousPosition)}</td>
          <td>${fmtNum(row.searchVolume)}</td>
          <td>${fmtNum(row.estimatedTraffic)}</td>
          <td>${htmlEscape((row.serpFeatures || []).join(", "))}</td>
        </tr>
      `))}</div>
    </section>
  `;
}

function renderRankingKeywords(rows) {
  const filtered = filteredRankingKeywords(rows);
  const filters = state.rankingKeywordFilters || {};
  return `
    <div class="ranking-toolbar">
      <input id="ranking-keyword-contains" type="search" placeholder="Keyword contains" value="${htmlEscape(filters.keyword || "")}">
      <input id="ranking-keyword-url" type="search" placeholder="URL contains" value="${htmlEscape(filters.url || "")}">
      <input id="ranking-keyword-min-volume" type="number" placeholder="Min volume" min="0" value="${htmlEscape(filters.minVolume || "")}">
      <input id="ranking-keyword-pos-min" type="number" placeholder="Pos min" min="1" value="${htmlEscape(filters.posMin || "")}">
      <input id="ranking-keyword-pos-max" type="number" placeholder="Pos max" min="1" value="${htmlEscape(filters.posMax || "")}">
      <button id="ranking-keyword-apply" type="button" class="secondary">Apply</button>
      <button id="ranking-export-keywords" type="button" class="secondary">Export CSV</button>
    </div>
    ${filtered.length ? `<div class="ranking-table-wrap">${table([
      sortHeader("Keyword", "keyword"),
      sortHeader("Position", "position"),
      sortHeader("Previous", "previousPosition"),
      "Ranking URL",
      sortHeader("Search Volume", "searchVolume"),
      sortHeader("CPC", "cpc"),
      "Competition",
      sortHeader("Traffic", "estimatedTraffic"),
      "SERP Features",
      "AI",
      "Actions",
    ], filtered.map((row) => `
      <tr>
        <td>${htmlEscape(row.keyword)}</td>
        <td>${fmtNum(row.position)}</td>
        <td>${fmtNum(row.previousPosition)}</td>
        <td class="url-cell">${htmlEscape(row.rankingUrl || "")}</td>
        <td>${fmtNum(row.searchVolume)}</td>
        <td>${fmtNum(row.cpc)}</td>
        <td>${htmlEscape(row.competitionLevel || row.competition || "")}</td>
        <td>${fmtNum(row.estimatedTraffic)}</td>
        <td>${htmlEscape((row.serpFeatures || []).join(", "))}</td>
        <td>${row.aiOverviewPresent ? (row.aiOverviewReference ? "Referenced" : "Present") : ""}</td>
        <td>${rankingActionButtons(row)}</td>
      </tr>
    `))}</div>` : `<div class="note-box">No ranking keywords found for this target/location.</div>`}
  `;
}

function sortedRankingPages(rows) {
  const sort = state.rankingPageSort || "traffic";
  return [...rows].sort((a, b) => {
    if (sort === "keywords") return Number(b.organicKeywords || 0) - Number(a.organicKeywords || 0);
    return Number(b.organicTraffic || 0) - Number(a.organicTraffic || 0);
  });
}

function renderRankingPages(rows) {
  const sorted = sortedRankingPages(rows);
  return `
    <div class="ranking-toolbar">
      <select id="ranking-page-sort">
        <option value="traffic"${state.rankingPageSort === "traffic" ? " selected" : ""}>Sort: Traffic</option>
        <option value="keywords"${state.rankingPageSort === "keywords" ? " selected" : ""}>Sort: Keyword Count</option>
      </select>
      <button id="ranking-export-pages" type="button" class="secondary">Export CSV</button>
    </div>
    ${sorted.length ? `<div class="ranking-table-wrap">${table(["URL", "Organic Keywords", "Organic Traffic", "Traffic Cost", "Top 3", "Top 10", "Top 20", "Paid Keywords"], sorted.map((row) => `
      <tr>
        <td class="url-cell">${htmlEscape(row.url)}</td>
        <td>${fmtNum(row.organicKeywords)}</td>
        <td>${fmtNum(row.organicTraffic)}</td>
        <td>${fmtNum(row.organicTrafficCost)}</td>
        <td>${fmtNum(row.top3)}</td>
        <td>${fmtNum(row.top10)}</td>
        <td>${fmtNum(row.top20)}</td>
        <td>${fmtNum(row.paidKeywords)}</td>
      </tr>
    `))}</div>` : `<div class="note-box">No ranking pages found for this target/location.</div>`}
  `;
}

function filteredRankingOpportunities(rows) {
  const filter = state.rankingOpportunityFilter || "all";
  return sortRows(rows.filter((row) => filter === "all" || row.opportunityType === filter), state.rankingOpportunitySort);
}

function renderRankingOpportunities(rows) {
  const filtered = filteredRankingOpportunities(rows);
  const types = Array.from(new Set(rows.map((row) => row.opportunityType).filter(Boolean))).sort();
  return `
    <div class="ranking-toolbar">
      <select id="ranking-opportunity-filter">
        <option value="all">All Opportunities</option>
        ${types.map((type) => `<option value="${htmlEscape(type)}"${state.rankingOpportunityFilter === type ? " selected" : ""}>${htmlEscape(type)}</option>`).join("")}
      </select>
      <button id="ranking-export-opportunities" type="button" class="secondary">Export CSV</button>
    </div>
    ${filtered.length ? `<div class="ranking-table-wrap">${table([
      sortHeader("Opportunity Type", "opportunityType", "opportunities"),
      sortHeader("Keyword", "keyword", "opportunities"),
      sortHeader("Position", "position", "opportunities"),
      "Ranking URL",
      sortHeader("Search Volume", "searchVolume", "opportunities"),
      sortHeader("Traffic", "estimatedTraffic", "opportunities"),
      "Recommended Action",
      "Actions",
    ], filtered.map((row) => `
      <tr>
        <td>${htmlEscape(row.opportunityType)}</td>
        <td>${htmlEscape(row.keyword)}</td>
        <td>${fmtNum(row.position)}</td>
        <td class="url-cell">${htmlEscape(row.rankingUrl || "")}</td>
        <td>${fmtNum(row.searchVolume)}</td>
        <td>${fmtNum(row.estimatedTraffic)}</td>
        <td>${htmlEscape(row.recommendedAction || "")}</td>
        <td>${rankingActionButtons(row)}</td>
      </tr>
    `))}</div>` : `<div class="note-box">No opportunities match this filter.</div>`}
  `;
}

function csvValue(value) {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(filename, rows, columns) {
  const csv = [columns.map((column) => csvValue(column.label)).join(",")].concat(
    rows.map((row) => columns.map((column) => csvValue(row[column.key])).join(","))
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRankingCsv(kind) {
  const data = state.rankingSnapshot || {};
  const target = data.snapshot?.target || "ranking-snapshot";
  if (kind === "targets") {
    downloadCsv(`${target}-optimization-targets.csv`, filteredRankingOptimizationTargets(data), [
      { key: "url", label: "Ranking URL" },
      { key: "keyword", label: "Focus Keyword" },
      { key: "bestPosition", label: "Best Position" },
      { key: "rankingKeywords", label: "Ranking Keywords" },
      { key: "opportunityCount", label: "Opportunity Count" },
      { key: "totalSearchVolume", label: "Total Search Volume" },
      { key: "estimatedTraffic", label: "Estimated Traffic" },
      { key: "pageOrganicTraffic", label: "Page Organic Traffic" },
      { key: "pageOrganicKeywords", label: "Page Organic Keywords" },
      { key: "top10", label: "Top 10 Keywords" },
      { key: "priorityType", label: "Priority Type" },
      { key: "opportunityScore", label: "Opportunity Score" },
      { key: "recommendedAction", label: "Recommended Action" },
    ]);
    return;
  }
  if (kind === "pages") {
    downloadCsv(`${target}-ranking-pages.csv`, sortedRankingPages(data.pages || []), [
      { key: "url", label: "URL" },
      { key: "organicKeywords", label: "Organic Keywords" },
      { key: "organicTraffic", label: "Organic Traffic" },
      { key: "organicTrafficCost", label: "Traffic Cost" },
      { key: "top3", label: "Top 3" },
      { key: "top10", label: "Top 10" },
      { key: "top20", label: "Top 20" },
      { key: "paidKeywords", label: "Paid Keywords" },
    ]);
    return;
  }
  if (kind === "opportunities") {
    downloadCsv(`${target}-opportunities.csv`, filteredRankingOpportunities(data.opportunities || []), [
      { key: "opportunityType", label: "Opportunity Type" },
      { key: "keyword", label: "Keyword" },
      { key: "position", label: "Position" },
      { key: "rankingUrl", label: "Ranking URL" },
      { key: "searchVolume", label: "Search Volume" },
      { key: "estimatedTraffic", label: "Estimated Traffic" },
      { key: "recommendedAction", label: "Recommended Action" },
    ]);
    return;
  }
  downloadCsv(`${target}-ranking-keywords.csv`, filteredRankingKeywords(data.keywords || []), [
    { key: "keyword", label: "Keyword" },
    { key: "position", label: "Position" },
    { key: "previousPosition", label: "Previous Position" },
    { key: "rankingUrl", label: "Ranking URL" },
    { key: "searchVolume", label: "Search Volume" },
    { key: "cpc", label: "CPC" },
    { key: "competitionLevel", label: "Competition" },
    { key: "estimatedTraffic", label: "Estimated Traffic" },
    { key: "serpFeatures", label: "SERP Features" },
  ]);
}

async function renderPlaceholderTool(rootId, label) {
  const root = el(rootId);
  const detail = await currentClientDetail();
  if (!detail) {
    root.innerHTML = toolEmptyState(label);
    bindToolEmptyActions(root);
    return;
  }
  const project = detail.project;
  const mainUrl = clientMainUrl(detail);
  const keywords = detail.keywords || [];
  root.innerHTML = `
    <div class="client-tool-page">
      ${clientToolContext(detail, label)}
      <div class="client-tool-workspace">
        <section class="client-panel placeholder-tool-panel">
          <div class="panel-head">
            <div>
              <h3>Run ${htmlEscape(label)}</h3>
              <p>This page is wired to the selected client's URL, keywords, and shared variables.</p>
            </div>
          </div>
          <div class="tool-variable-grid">
            <div>
              <label>Main URL</label>
              <strong>${htmlEscape(mainUrl || "Not set")}</strong>
            </div>
            <div>
              <label>Attached Cora Profile</label>
              <strong>${htmlEscape(project.profile_name || "Not attached")}</strong>
            </div>
          </div>
          <div class="panel-head cora-keyword-head">
            <h3>Keywords</h3>
            <div class="keyword-actions">
              <button id="${rootId}-select-all" type="button" class="secondary">Select All</button>
              <button id="${rootId}-clear-selection" type="button" class="secondary">Clear</button>
            </div>
          </div>
          ${keywordChecklist(detail)}
          <button id="${rootId}-run" type="button" ${keywords.length ? "" : "disabled"}>Run Selected Keywords</button>
        </section>
        <section class="client-panel placeholder-tool-panel">
          <h3>Tool Output</h3>
          <div class="note-box">Output and stored results for ${htmlEscape(label)} will appear here when this tool is implemented.</div>
          <div class="tool-output-skeleton">
            <div><span>Client</span><strong>${htmlEscape(project.name || "")}</strong></div>
            <div><span>Keyword inputs</span><strong>${fmtNum(keywords.length)}</strong></div>
            <div><span>Status</span><strong>Placeholder</strong></div>
          </div>
        </section>
      </div>
    </div>
  `;
  el(`${rootId}-select-all`)?.addEventListener("click", () => {
    root.querySelectorAll(".tool-keyword-check").forEach((box) => { box.checked = true; });
  });
  el(`${rootId}-clear-selection`)?.addEventListener("click", () => {
    root.querySelectorAll(".tool-keyword-check").forEach((box) => { box.checked = false; });
  });
  el(`${rootId}-run`)?.addEventListener("click", (event) => runSelectedClientTool(event, Number(project.id), label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"), "", root).catch((err) => toast(err.message)));
}

async function createProject(event) {
  event.preventDefault();
  const name = el("project-name").value.trim();
  const profileName = el("project-profile-name")?.value.trim() || "";
  const profileId = profileName ? "" : (el("project-profile")?.value || "");
  const starterKeywords = (el("project-keywords")?.value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!name) {
    toast("Client name is required.");
    return;
  }
  const data = await api("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      profile_id: profileId || undefined,
      profile_name: profileName || undefined,
      client: el("project-client").value.trim() || undefined,
      site_domain: el("project-site").value.trim() || undefined,
    }),
  });
  for (const keyword of starterKeywords) {
    await api("/api/keywords", {
      method: "POST",
      body: JSON.stringify({
        project_id: data.project.id,
        keyword,
      }),
    });
  }
  if (el("project-profile")) el("project-profile").value = "";
  if (el("project-profile-name")) el("project-profile-name").value = "";
  el("project-name").value = "";
  el("project-client").value = "";
  el("project-site").value = "";
  if (el("project-keywords")) el("project-keywords").value = "";
  await loadProfiles();
  await loadProjects();
  state.selectedClientId = String(data.project.id);
  state.selectedProjectId = data.project.id;
  showMainView("clients-view");
  await selectProject(data.project.id);
}

function renderApiKeys() {
  const root = el("api-keys");
  const providers = state.aiProviders.length ? state.aiProviders : [
    { key: "openai", name: "OpenAI", placeholder: "sk-...", base_url: "https://api.openai.com", default_model: "gpt-5.5", models: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"] },
    { key: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", base_url: "https://api.anthropic.com", default_model: "claude-opus-4-8", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
    { key: "google", name: "Google", placeholder: "AIza...", base_url: "https://generativelanguage.googleapis.com", default_model: "gemini-3.5-flash", models: ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"] },
    { key: "xai", name: "xAI / Grok", placeholder: "xai-...", base_url: "https://api.x.ai", default_model: "grok-4.3", models: ["grok-4.3", "grok-4.3-latest", "grok-latest", "grok-build-0.1", "grok-code-fast"] },
    { key: "perplexity", name: "Perplexity", placeholder: "pplx-...", base_url: "https://api.perplexity.ai", default_model: "perplexity/sonar", models: ["perplexity/sonar", "openai/gpt-5.4", "anthropic/claude-sonnet-4-6", "xai/grok-4.3", "xai/grok-4.20-reasoning", "xai/grok-4.20-non-reasoning", "xai/grok-4.20-multi-agent"] },
    { key: "dataforseo", name: "DataForSEO", placeholder: "API password", login_placeholder: "api-login@example.com", base_url: "https://api.dataforseo.com", default_model: "", models: [], auth_type: "basic", test_path: "/v3/appendix/user_data" },
  ];
  root.innerHTML = `
    <div class="ai-provider-grid">
      ${providers.map((provider) => renderAiProviderCard(provider)).join("")}
    </div>
  `;
  bindAiProviderCards(root);
}

function apiKeysForProvider(providerKey) {
  return state.apiKeys.filter((key) => (key.provider_key || key.provider || "").toLowerCase() === providerKey);
}

function renderAiProviderCard(provider) {
  const saved = apiKeysForProvider(provider.key);
  const models = provider.models?.length ? provider.models : [provider.default_model || ""].filter(Boolean);
  const modelOptions = models.map((model) => {
    const selected = model === provider.default_model ? " selected" : "";
    return `<option value="${htmlEscape(model)}"${selected}>${htmlEscape(model)}</option>`;
  }).join("");
  const authFields = provider.auth_type === "basic" ? `
        <label>
          API Login
          <input data-field="api_login" type="text" placeholder="${htmlEscape(provider.login_placeholder || "api-login")}" autocomplete="off">
        </label>
        <label>
          API Password
          <input data-field="api_password" type="password" placeholder="${htmlEscape(provider.placeholder || "API password")}" autocomplete="off">
        </label>
  ` : `
        <label>
          API Key
          <input data-field="key_value" type="password" placeholder="${htmlEscape(provider.placeholder)}" autocomplete="off">
        </label>
  `;
  const modelField = modelOptions ? `
        <label>
          Default Model
          <select data-field="default_model">
            ${modelOptions}
          </select>
        </label>
  ` : `
        <label>
          Test Endpoint
          <input data-field="default_model" type="text" value="${htmlEscape(provider.test_path || "")}" disabled>
        </label>
  `;
  return `
    <section class="ai-provider-card" data-provider="${htmlEscape(provider.key)}">
      <div class="panel-head">
        <div>
          <h3>${htmlEscape(provider.name)}</h3>
          <p>${saved.length ? `${fmtNum(saved.length)} saved key${saved.length === 1 ? "" : "s"}` : "No saved key yet"}</p>
        </div>
        <span class="status-pill ${saved.some((key) => key.status === "valid") ? "imported" : (saved.some((key) => key.status === "failed") ? "error" : "")}">${htmlEscape(saved.find((key) => key.status)?.status || "untested")}</span>
      </div>
      <div class="ai-provider-form">
        <label>
          Label
          <input data-field="label" type="text" value="Production" autocomplete="off">
        </label>
        ${authFields}
        ${modelField}
        <label>
          Base URL
          <input data-field="base_url" type="text" value="${htmlEscape(provider.base_url || "")}" autocomplete="off">
        </label>
        <label class="wide">
          Notes
          <input data-field="notes" type="text" placeholder="Optional" autocomplete="off">
        </label>
        <div class="ai-provider-actions">
          <button type="button" data-action="test-new">Test Key</button>
          <button type="button" class="secondary" data-action="save-new">Save Key</button>
        </div>
      </div>
      <div class="ai-test-result" data-role="test-result"></div>
      <div class="ai-saved-keys">
        ${saved.length ? saved.map((key) => renderSavedAiKey(key)).join("") : `<div class="note-box">Add and test a ${htmlEscape(provider.name)} key when ready.</div>`}
      </div>
    </section>
  `;
}

function renderSavedAiKey(key) {
  const status = key.status || "untested";
  return `
    <div class="ai-saved-key" data-key-id="${key.id}">
      <div>
        <strong>${htmlEscape(key.label)}</strong>
        <span class="key-preview">${htmlEscape(key.key_preview)} <span class="muted">(${fmtNum(key.key_length)} chars)</span></span>
        <small>${htmlEscape(key.default_model || "No default model")} | ${key.last_tested_at ? `Tested ${fmtDate(key.last_tested_at)}` : "Not tested yet"}</small>
        ${key.last_error ? `<small class="error-text">${htmlEscape(key.last_error)}</small>` : ""}
      </div>
      <div class="row-actions">
        <span class="status-pill ${status === "valid" ? "imported" : (status === "failed" ? "error" : "")}">${htmlEscape(status)}</span>
        <button type="button" class="secondary" data-action="test-saved">Test</button>
        <button type="button" class="link-button" data-action="delete-saved">Delete</button>
      </div>
    </div>
  `;
}

function aiProviderPayload(card) {
  const read = (name) => card.querySelector(`[data-field="${name}"]`)?.value.trim() || "";
  return {
    provider: card.dataset.provider,
    label: read("label") || "Production",
    key_value: read("key_value"),
    api_login: read("api_login"),
    api_password: read("api_password"),
    default_model: read("default_model"),
    base_url: read("base_url"),
    notes: read("notes") || undefined,
  };
}

function hasProviderCredentials(payload) {
  if (payload.provider === "dataforseo") {
    return Boolean(payload.key_value || (payload.api_login && payload.api_password));
  }
  return Boolean(payload.key_value);
}

function showAiTestResult(card, result) {
  const box = card.querySelector('[data-role="test-result"]');
  if (!box) return;
  box.className = `ai-test-result ${result.ok ? "ok" : "error"}`;
  box.textContent = result.message || (result.ok ? "Connection verified." : "Test failed.");
}

function bindAiProviderCards(root) {
  root.querySelectorAll(".ai-provider-card").forEach((card) => {
    card.querySelector('[data-action="test-new"]')?.addEventListener("click", () => testNewAiKey(card).catch((err) => toast(err.message)));
    card.querySelector('[data-action="save-new"]')?.addEventListener("click", () => saveNewAiKey(card).catch((err) => toast(err.message)));
  });
  root.querySelectorAll(".ai-saved-key").forEach((row) => {
    row.querySelector('[data-action="test-saved"]')?.addEventListener("click", () => testSavedAiKey(Number(row.dataset.keyId)).catch((err) => toast(err.message)));
    row.querySelector('[data-action="delete-saved"]')?.addEventListener("click", () => deleteApiKey(Number(row.dataset.keyId)).catch((err) => toast(err.message)));
  });
}

async function testNewAiKey(card) {
  const payload = aiProviderPayload(card);
  if (!hasProviderCredentials(payload)) {
    toast(payload.provider === "dataforseo" ? "Enter the DataForSEO API login and password to test." : "Paste an API key to test.");
    return;
  }
  const data = await api("/api/api-keys/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  showAiTestResult(card, data.test);
  toast(data.test.ok ? "API key test passed." : "API key test failed.");
}

async function saveNewAiKey(card) {
  const payload = aiProviderPayload(card);
  if (!hasProviderCredentials(payload)) {
    toast(payload.provider === "dataforseo" ? "Enter the DataForSEO API login and password to save." : "Paste an API key to save.");
    return;
  }
  await api("/api/api-keys", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await loadApiKeys();
  toast("API key saved.");
}

async function testSavedAiKey(keyId) {
  const data = await api("/api/api-keys/test", {
    method: "POST",
    body: JSON.stringify({ key_id: keyId }),
  });
  await loadApiKeys();
  toast(data.test.ok ? "Saved API key test passed." : "Saved API key test failed.");
}

async function loadApiKeys(renderSettings = true) {
  const data = await api("/api/api-keys");
  state.apiKeys = data.api_keys || [];
  state.aiProviders = data.providers || state.aiProviders;
  if (renderSettings) renderApiKeys();
}

async function deleteApiKey(keyId) {
  await api(`/api/api-keys/${keyId}`, { method: "DELETE" });
  await loadApiKeys();
  toast("API key deleted.");
}

function renderPlanProjectSelect() {
  const select = el("plan-project");
  if (!state.projects.length) {
    select.innerHTML = `<option value="">Create a project first</option>`;
    el("content-plan-form").querySelector("button").disabled = true;
    return;
  }
  const current = select.value;
  select.innerHTML = optionRows(state.projects, current || state.projects[0].id, (project) => project.name, false);
  el("content-plan-form").querySelector("button").disabled = false;
}

async function loadPlanContext(projectId) {
  if (!projectId) {
    el("plan-site").innerHTML = `<option value="">None</option>`;
    el("plan-page").innerHTML = `<option value="">None</option>`;
    el("plan-keyword").innerHTML = `<option value="">None</option>`;
    return;
  }
  const detail = await getProjectDetail(projectId);
  el("plan-site").innerHTML = optionRows(detail.sites || [], "", (site) => site.domain);
  el("plan-page").innerHTML = optionRows(detail.pages || [], "", (page) => page.url);
  el("plan-keyword").innerHTML = optionRows(detail.keywords || [], "", (keyword) => keyword.keyword);
}

function renderContentPlans() {
  const root = el("content-plans");
  if (!state.contentPlans.length) {
    root.innerHTML = `<div class="note-box">No content plans yet.</div>`;
    return;
  }
  root.innerHTML = table(["Title", "Project", "Page", "Keyword", "Type", "Status", "Priority", "Due"], state.contentPlans.map((plan) => `
    <tr>
      <td><strong>${htmlEscape(plan.title)}</strong><br><span class="muted">${htmlEscape(plan.notes)}</span></td>
      <td>${htmlEscape(plan.project_name)}</td>
      <td class="url-cell">${htmlEscape(plan.page_url || plan.site_domain || "")}</td>
      <td>${htmlEscape(plan.keyword)}</td>
      <td>${htmlEscape(plan.content_type)}</td>
      <td><span class="status-pill ${htmlEscape(plan.status)}">${htmlEscape(plan.status)}</span></td>
      <td>${htmlEscape(plan.priority)}</td>
      <td>${htmlEscape(plan.due_date)}</td>
    </tr>
  `));
}

async function loadContentPlans() {
  const data = await api(`/api/content-plans${profileQuery()}`);
  state.contentPlans = data.content_plans || [];
  renderContentPlans();
}

async function loadPlanner() {
  await loadProjects();
  renderPlanProjectSelect();
  await loadPlanContext(Number(el("plan-project").value) || null);
  await loadContentPlans();
}

async function saveContentPlan(event) {
  event.preventDefault();
  const projectId = Number(el("plan-project").value);
  const title = el("plan-title").value.trim();
  if (!projectId || !title) {
    toast("Project and title are required.");
    return;
  }
  await api("/api/content-plans", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      site_id: el("plan-site").value || null,
      page_id: el("plan-page").value || null,
      keyword_id: el("plan-keyword").value || null,
      title,
      content_type: el("plan-type").value,
      intent: el("plan-intent").value.trim() || undefined,
      priority: el("plan-priority").value,
      status: el("plan-status").value,
      due_date: el("plan-due-date").value || undefined,
      notes: el("plan-notes").value.trim() || undefined,
    }),
  });
  el("plan-title").value = "";
  el("plan-intent").value = "";
  el("plan-due-date").value = "";
  el("plan-notes").value = "";
  await loadContentPlans();
  state.overview = null;
  toast("Content plan added.");
}

function listToText(items) {
  return (items || []).join("\n");
}

function normalizeListValue(value) {
  return String(value || "").trim();
}

function listWith(value, item) {
  const clean = normalizeListValue(item);
  const current = (value || []).map(normalizeListValue).filter(Boolean);
  if (!clean || current.some((existing) => existing.toLowerCase() === clean.toLowerCase())) return current;
  return current.concat(clean);
}

function listWithout(value, item) {
  const clean = normalizeListValue(item).toLowerCase();
  return (value || []).map(normalizeListValue).filter((existing) => existing && existing.toLowerCase() !== clean);
}

function domainListId(scope, id) {
  return scope === "main" ? id : `${scope}-${id}`;
}

function renderEditableList(kind, items, scope = "main") {
  const root = el(domainListId(scope, `domains-${kind}-list`));
  if (!root) return;
  const list = (items || []).map(normalizeListValue).filter(Boolean);
  root.innerHTML = list.length ? list.map((item) => `
    <div class="editable-list-row">
      <span>${htmlEscape(item)}</span>
      <button type="button" class="secondary domain-delete" data-scope="${scope}" data-kind="${kind}" data-value="${htmlEscape(item)}">Delete</button>
    </div>
  `).join("") : `<div class="note-box">No entries.</div>`;
  root.querySelectorAll(".domain-delete").forEach((button) => {
    button.addEventListener("click", () => {
      state.domainLists[button.dataset.kind] = listWithout(state.domainLists[button.dataset.kind], button.dataset.value);
      renderDomainLists(button.dataset.scope || scope);
    });
  });
}

function renderDomainLists(scope = "main") {
  const data = state.domainLists || {};
  renderEditableList("tracked", data.tracked || [], scope);
  renderEditableList("competitors", data.competitors || [], scope);
  const banned = el(domainListId(scope, "domains-banned"));
  const slowRender = el(domainListId(scope, "domains-slow-render"));
  const stopWords = el(domainListId(scope, "domains-stop-words"));
  if (banned) banned.value = listToText(data.banned);
  if (slowRender) slowRender.value = listToText(data.slowRender);
  if (stopWords) stopWords.value = listToText(data.stopWords);
}

function addDomainListItem(kind, scope = "main") {
  const input = el(domainListId(scope, `domains-${kind}-new`));
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  state.domainLists = state.domainLists || {};
  state.domainLists[kind] = listWith(state.domainLists[kind], value);
  input.value = "";
  renderDomainLists(scope);
}

async function loadDomainLists(scope = "main") {
  const data = await api("/api/cora/domains");
  if (data.error) throw new Error(data.error);
  state.domainLists = data;
  renderDomainLists(scope);
}

async function saveDomainLists(event, scope = "main") {
  event.preventDefault();
  const data = await api("/api/cora/domains", {
    method: "POST",
    body: JSON.stringify({
      tracked: listToText(state.domainLists?.tracked),
      competitors: listToText(state.domainLists?.competitors),
      banned: el(domainListId(scope, "domains-banned"))?.value || "",
      slowRender: el(domainListId(scope, "domains-slow-render"))?.value || "",
      stopWords: el(domainListId(scope, "domains-stop-words"))?.value || "",
    }),
  });
  if (data.error) throw new Error(data.error);
  state.domainLists = data;
  renderDomainLists(scope);
  toast("Domain lists saved.");
}

function renderRuns() {
  const root = el("runs");
  if (!state.runs.length) {
    root.innerHTML = `<div class="empty-state">No imported runs yet.</div>`;
    return;
  }
  root.innerHTML = state.runs.map((run) => `
    <div class="run-item ${run.id === state.selectedRunId ? "active" : ""}" data-run-id="${run.id}">
      <strong>${htmlEscape(run.keyword)}</strong>
      <span>${htmlEscape(run.target_domain || run.target_url || "No target stored")}</span>
      <span>${fmtDate(run.imported_at)} | ${run.result_count || 0} results</span>
      ${run.project_name ? `<span>Project: ${htmlEscape(run.project_name)}</span>` : ""}
    </div>
  `).join("");
  root.querySelectorAll(".run-item").forEach((item) => {
    item.addEventListener("click", () => openRun(Number(item.dataset.runId)));
  });
}

async function openRun(runId, options = {}) {
  if (!Number.isFinite(runId) || runId <= 0) {
    toast("This run link is missing a valid run ID.");
    return;
  }
  try {
    if (options.reloadRuns) {
      await loadRuns();
    }
    await selectRun(runId);
  } catch (err) {
    toast(err.message);
  }
}

async function loadRuns() {
  const q = el("search").value.trim();
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const data = await api(`/api/runs${profileQueryParam(params)}`);
  state.runs = data.runs || [];
  if (state.selectedRunId && !state.runs.some((run) => run.id === state.selectedRunId)) {
    state.selectedRunId = null;
  }
  renderRuns();
  renderCompareSelectors();
  if (state.activeView !== "cora-view" && !state.selectedRunId && !state.selectedProjectId && state.runs.length) {
    await selectRun(state.runs[0].id);
  }
}

function runOptionLabel(run) {
  const project = run.project_name ? ` | ${run.project_name}` : "";
  return `${run.keyword || "Untitled run"} | ${fmtDate(run.imported_at)}${project}`;
}

function renderCompareSelectors() {
  const base = el("compare-base");
  const target = el("compare-target");
  const button = el("compare-manager").querySelector("button");
  const previousBase = base.value;
  const previousTarget = target.value;
  if (!state.runs.length) {
    base.innerHTML = `<option value="">No runs imported</option>`;
    target.innerHTML = `<option value="">No runs imported</option>`;
    button.disabled = true;
    return;
  }
  const options = state.runs.map((run) => `<option value="${run.id}">${htmlEscape(runOptionLabel(run))}</option>`).join("");
  const ids = new Set(state.runs.map((run) => String(run.id)));
  base.innerHTML = options;
  target.innerHTML = options;
  if (state.runs.length > 1) {
    base.value = ids.has(previousBase) ? previousBase : String(state.runs[1].id);
    target.value = ids.has(previousTarget) ? previousTarget : String(state.runs[0].id);
    if (base.value === target.value) {
      target.value = String(state.runs.find((run) => String(run.id) !== base.value)?.id || state.runs[0].id);
    }
    button.disabled = false;
  } else {
    base.value = String(state.runs[0].id);
    target.value = String(state.runs[0].id);
    button.disabled = true;
  }
}

function renderJobs() {
  const root = el("jobs");
  if (!root) return;
  root.innerHTML = renderJobCards(state.jobs);
  bindJobLinks(root);
}

function renderJobCards(jobs) {
  if (!jobs.length) {
    return `<div class="job-empty">No managed jobs yet.</div>`;
  }
  return jobs.map((job) => {
    const pct = job.progress === null || job.progress === undefined ? "" : `${Math.round(Number(job.progress) * 100)}%`;
    const runLink = job.imported_run_id ? `<button class="link-button" data-run-id="${job.imported_run_id}">Open run</button>` : "";
    const retry = jobRetryText(job);
    const showActivity = ["queued", "running", "submitting"].includes(job.status);
    const activity = showActivity && job.seconds_since_activity !== null && job.seconds_since_activity !== undefined ? `Last activity ${secondsLabel(job.seconds_since_activity)} ago` : "";
    return `
      <div class="job-item ${htmlEscape(job.status)}${job.stalled ? " stalled" : ""}">
        <div class="job-title">${htmlEscape(job.keyword)}</div>
        <div class="job-meta">${htmlEscape(job.target_domain || job.target_url)}</div>
        <div class="job-status">
          <span>${htmlEscape(job.status)}</span>
          <span>${htmlEscape(pct)}</span>
        </div>
        <div class="job-message">${htmlEscape(job.status_message || job.cora_action || "")}</div>
        ${(retry || activity) ? `<div class="job-message muted">${htmlEscape([retry, activity].filter(Boolean).join(" | "))}</div>` : ""}
        ${job.error ? `<div class="job-error">${htmlEscape(job.error)}</div>` : ""}
        ${runLink}
      </div>
    `;
  }).join("");
}

function bindJobLinks(root) {
  root.querySelectorAll(".link-button[data-run-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openRun(Number(button.dataset.runId), { reloadRuns: true });
    });
  });
}

function renderJobsOldUnused() {
  const root = el("jobs");
  if (!state.jobs.length) {
    root.innerHTML = `<div class="job-empty">No managed jobs yet.</div>`;
    return;
  }
  root.innerHTML = state.jobs.map((job) => {
    const pct = job.progress === null || job.progress === undefined ? "" : `${Math.round(Number(job.progress) * 100)}%`;
    const runLink = job.imported_run_id ? `<button class="link-button" data-run-id="${job.imported_run_id}">Open run</button>` : "";
    const retry = jobRetryText(job);
    const showActivity = ["queued", "running", "submitting"].includes(job.status);
    const activity = showActivity && job.seconds_since_activity !== null && job.seconds_since_activity !== undefined ? `Last activity ${secondsLabel(job.seconds_since_activity)} ago` : "";
    return `
      <div class="job-item ${htmlEscape(job.status)}${job.stalled ? " stalled" : ""}">
        <div class="job-title">${htmlEscape(job.keyword)}</div>
        <div class="job-meta">${htmlEscape(job.target_domain || job.target_url)}</div>
        <div class="job-status">
          <span>${htmlEscape(job.status)}</span>
          <span>${htmlEscape(pct)}</span>
        </div>
        <div class="job-message">${htmlEscape(job.status_message || job.cora_action || "")}</div>
        ${(retry || activity) ? `<div class="job-message muted">${htmlEscape([retry, activity].filter(Boolean).join(" | "))}</div>` : ""}
        ${job.error ? `<div class="job-error">${htmlEscape(job.error)}</div>` : ""}
        ${runLink}
      </div>
    `;
  }).join("");
  root.querySelectorAll(".link-button[data-run-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openRun(Number(button.dataset.runId), { reloadRuns: true });
    });
  });
}

async function loadJobs() {
  const data = await api(`/api/jobs${profileQuery()}`);
  state.jobs = data.jobs || [];
  state.queuePaused = Boolean(data.queue?.paused ?? data.queue_paused);
  state.queueAutoResume = Boolean(data.queue?.auto_resume);
  state.queueStopAfterCurrent = Boolean(data.queue?.stop_after_current);
  state.queueSummary = data.summary || null;
  renderJobs();
  if (state.activeView === "cora-view" && el("cora-tool-content")) {
    refreshCoraToolJobPanels();
  }
}

function isEditingCoraTool() {
  const active = document.activeElement;
  const root = el("cora-tool-content");
  if (!active || !root || !root.contains(active)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
}

async function setQueueState(paused, autoResume = false, stopAfterCurrent = false, reason = "") {
  const data = await api("/api/jobs/queue", {
    method: "POST",
    body: JSON.stringify({
      paused,
      auto_resume: autoResume,
      stop_after_current: stopAfterCurrent,
      reason,
    }),
  });
  state.queuePaused = Boolean(data.paused);
  state.queueAutoResume = Boolean(data.auto_resume);
  state.queueStopAfterCurrent = Boolean(data.stop_after_current);
  await loadJobs();
  const message = state.queuePaused
    ? (state.queueStopAfterCurrent ? "Queue will stop after the current run." : (state.queueAutoResume ? "Queue will resume when Cora is idle." : "Queue paused."))
    : "Queue resumed.";
  toast(message);
}

async function startManagedJob(event) {
  event.preventDefault();
  const keyword = el("job-keyword").value.trim();
  const target = el("job-target").value.trim();
  const coraProfile = el("job-profile").value;
  const newProfileName = el("job-profile-name").value.trim();
  if (!keyword || !target) {
    toast("Keyword and target are required.");
    return;
  }
  const data = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      keyword,
      target_url: target,
      cora_profile: coraProfile || undefined,
      new_profile_name: newProfileName || undefined,
    }),
  });
  el("job-profile-name").value = "";
  await loadProfiles();
  toast(`Started Cora job ${data.job.id}.`);
  await loadJobs();
}

async function selectActiveProfile(profileId) {
  state.activeProfileId = profileId || "";
  const profile = activeProfile();
  if (profile) {
    el("project-profile").value = String(profile.id);
    el("job-profile").value = profile.name;
    await api("/api/cora/settings", {
      method: "POST",
      body: JSON.stringify({ profile: profile.name }),
    }).catch(() => {});
  } else {
    el("project-profile").value = "";
    el("job-profile").value = "";
  }
  state.selectedRunId = null;
  state.selectedProjectId = null;
  state.selectedComparison = null;
  state.selectedRun = null;
  renderProfileSelect();
  showEmpty();
  await Promise.all([
    loadOverview().catch((err) => toast(err.message)),
    loadProjects().catch((err) => toast(err.message)),
    loadRuns().catch((err) => toast(err.message)),
    loadJobs().catch((err) => toast(err.message)),
  ]);
  await selectFirstClientIfNeeded();
  if (state.activeView === "planner-view") {
    await loadPlanner().catch((err) => toast(err.message));
  }
}

async function forceStopCora() {
  const confirmed = window.confirm("Force stop the current Cora operation?");
  if (!confirmed) return;
  const result = await api("/api/cora/stop", {
    method: "POST",
    body: JSON.stringify({ reason: "Manual dashboard force stop" }),
  });
  toast(result.ok ? "Stop sent to Cora." : "Stop request returned an error.");
  await refreshCoraStatus().catch(() => {});
  await loadJobs().catch(() => {});
}

async function clearStaleCoraState() {
  const result = await api("/api/cora/stop", {
    method: "POST",
    body: JSON.stringify({ reason: "Dashboard clear stale state" }),
  });
  toast(result.ok ? "Cora stale state cleared." : "Clear stale state returned an error.");
  await refreshCoraStatus().catch(() => {});
  await loadJobs().catch(() => {});
}

async function restartCora() {
  const confirmed = window.confirm("Restart Cora now? This will stop the current Cora process and relaunch it.");
  if (!confirmed) return;
  await setQueueState(true, false, false, "Dashboard health restart");
  const result = await api("/api/cora/restart", {
    method: "POST",
    body: JSON.stringify({ reason: "Dashboard health restart" }),
  });
  toast(result.ok ? "Cora restart sent. Queue remains paused." : "Cora restart returned an error.");
  window.setTimeout(() => refreshCoraStatus().catch(() => {}), 5000);
  await loadJobs().catch(() => {});
}

function table(headers, rows) {
  return `
    <table>
      <thead><tr>${headers.map((h) => `<th>${String(h).includes("<") ? h : htmlEscape(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderSerp(results) {
  if (!results.length) {
    return `<div class="note-box">No SERP rows were imported.</div>`;
  }
  return table(["Rank", "Host", "Title", "URL"], results.map((r) => `
    <tr>
      <td>${fmtNum(r.avg_rank || r.rank)}</td>
      <td>${htmlEscape(r.host)}</td>
      <td>${htmlEscape(r.title)}</td>
      <td class="url-cell">${htmlEscape(r.url)}</td>
    </tr>
  `));
}

function renderRecommendations(items) {
  if (!items.length) {
    return `<div class="note-box">No recommendations were imported from the tuning sheets.</div>`;
  }
  return table(["Sheet", "Factor", "Current", "Goal", "Recommendation"], items.map((r) => `
    <tr>
      <td>${htmlEscape(r.sheet)}</td>
      <td><strong>${htmlEscape(r.factor_id)}</strong><br>${htmlEscape(r.factor)}</td>
      <td>${htmlEscape(r.current_value)}</td>
      <td>${htmlEscape(r.goal)}</td>
      <td>${htmlEscape(r.recommendation)}</td>
    </tr>
  `));
}

function renderLsi(items) {
  if (!items.length) {
    return `<div class="note-box">No LSI rows were imported.</div>`;
  }
  return table(["Term", "Best", "Avg", "Tracked", "Deficit"], items.map((r) => `
    <tr>
      <td>${htmlEscape(r.keyword)}</td>
      <td>${fmtNum(r.best_of_both)}</td>
      <td>${fmtNum(r.avg_value)}</td>
      <td>${fmtNum(r.tracked_value)}</td>
      <td>${fmtNum(r.deficit)}</td>
    </tr>
  `));
}

function renderRaw(run) {
  return `
    <div class="note-box">
      <h3>Raw Report</h3>
      <p><strong>Original:</strong> ${htmlEscape(run.source_path)}</p>
      <p><strong>Archive:</strong> ${htmlEscape(run.archive_path)}</p>
      <p><strong>SHA-256:</strong> ${htmlEscape(run.sha256)}</p>
      <p><strong>Size:</strong> ${fmtNum(run.file_size)} bytes</p>
    </div>
  `;
}

async function loadWorkbookSummary(runId) {
  const data = await api(`/api/runs/${runId}/workbook`);
  const rows = data.rows || [];
  if (!rows.length) {
    el("tab-workbook").innerHTML = `<div class="note-box">No workbook rows have been captured for this run.</div>`;
    return;
  }
  el("tab-workbook").innerHTML = `
    <div class="workbook-browser">
      <div class="sheet-list">
        ${rows.map((r) => `
          <button class="sheet-button" data-sheet="${htmlEscape(r.sheet)}">
            ${htmlEscape(r.sheet)}
            <span>${fmtNum(r.row_count)} rows</span>
          </button>
        `).join("")}
      </div>
      <div id="sheet-preview" class="sheet-preview">
        Select a sheet to preview stored raw rows.
      </div>
    </div>
  `;
  el("tab-workbook").querySelectorAll(".sheet-button").forEach((button) => {
    button.addEventListener("click", () => loadSheetRows(runId, button.dataset.sheet));
  });
}

async function loadSheetRows(runId, sheet) {
  const data = await api(`/api/runs/${runId}/workbook?sheet=${encodeURIComponent(sheet)}`);
  const rows = data.rows || [];
  const maxCols = rows.reduce((max, row) => Math.max(max, row.column_count || 0), 0);
  const previewRows = rows.slice(0, 200).map((row) => {
    const values = JSON.parse(row.row_json);
    const cells = Array.from({ length: maxCols }, (_, i) => `<td>${htmlEscape(values[i] ?? "")}</td>`).join("");
    return `<tr><th>${row.row_index}</th>${cells}</tr>`;
  }).join("");
  el("sheet-preview").innerHTML = `
    <h3>${htmlEscape(sheet)}</h3>
    <p>${fmtNum(rows.length)} stored rows${rows.length > 200 ? "; showing first 200" : ""}</p>
    <div class="sheet-table-wrap">
      <table class="sheet-table">
        <tbody>${previewRows}</tbody>
      </table>
    </div>
  `;
}

async function renderRunAssignment(run) {
  const root = el("run-assignment");
  if (!state.projects.length) {
    await loadProjects();
  }
  root.innerHTML = `
    <div class="assignment-head">
      <div>
        <h3>Database Assignment</h3>
        <p>${run.project_name ? `Assigned to ${htmlEscape(run.project_name)}` : "This run is not assigned to a project yet."}</p>
      </div>
      <select id="assign-project">${optionRows(state.projects, run.project_id, (p) => p.name)}</select>
    </div>
    <div id="assign-fields"></div>
  `;
  const projectSelect = root.querySelector("#assign-project");
  projectSelect.addEventListener("change", () => renderAssignmentFields(run, Number(projectSelect.value) || null));
  await renderAssignmentFields(run, Number(projectSelect.value) || null);
}

async function renderAssignmentFields(run, projectId) {
  const root = el("run-assignment");
  const fields = root.querySelector("#assign-fields");
  if (!projectId) {
    fields.innerHTML = `<button id="assign-save" type="button">Clear Assignment</button>`;
    fields.querySelector("#assign-save").addEventListener("click", () => saveRunAssignment(run.id, {}));
    return;
  }
  const detail = await getProjectDetail(projectId);
  const sites = detail.sites || [];
  const pages = detail.pages || [];
  const keywords = detail.keywords || [];
  fields.innerHTML = `
    <div class="assignment-grid">
      <label>Site<select id="assign-site">${optionRows(sites, run.site_id, (s) => s.domain)}</select></label>
      <label>Page<select id="assign-page">${optionRows(pages, run.page_id, (p) => p.url)}</select></label>
      <label>Keyword<select id="assign-keyword">${optionRows(keywords, run.keyword_id, (k) => k.keyword)}</select></label>
      <button id="assign-save" type="button">Save Assignment</button>
    </div>
  `;
  fields.querySelector("#assign-save").addEventListener("click", () => {
    saveRunAssignment(run.id, {
      project_id: projectId,
      site_id: fields.querySelector("#assign-site").value || null,
      page_id: fields.querySelector("#assign-page").value || null,
      keyword_id: fields.querySelector("#assign-keyword").value || null,
    });
  });
}

async function saveRunAssignment(runId, payload) {
  await api(`/api/runs/${runId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.projectDetails = {};
  await loadProjects();
  await loadRuns();
  await selectRun(runId);
  toast("Run assignment saved.");
}

function compareMetric(label, metric, lowerIsBetter = false) {
  return `
    <div>
      <span>${fmtNum(metric?.compare)}</span>
      <label>${htmlEscape(label)} ${fmtDelta(metric?.delta, lowerIsBetter)}</label>
      <small>Baseline ${fmtNum(metric?.base)}</small>
    </div>
  `;
}

function renderCompareSerp(rows) {
  if (!rows.length) {
    return `<div class="note-box">No SERP position changes were found between these runs.</div>`;
  }
  return table(["Status", "Host", "Base", "Compare", "Delta", "URL"], rows.map((r) => `
    <tr>
      <td>${htmlEscape(r.status)}</td>
      <td>${htmlEscape(r.host)}</td>
      <td>${fmtNum(r.base_rank)}</td>
      <td>${fmtNum(r.compare_rank)}</td>
      <td>${fmtDelta(r.rank_delta, true)}</td>
      <td class="url-cell">${htmlEscape(r.url)}</td>
    </tr>
  `));
}

function renderCompareRecommendations(rows) {
  if (!rows.length) {
    return `<div class="note-box">No recommendation changes were found between these runs.</div>`;
  }
  return table(["Status", "Sheet", "Factor", "Base", "Compare", "Recommendation"], rows.map((r) => `
    <tr>
      <td>${htmlEscape(r.status)}</td>
      <td>${htmlEscape(r.sheet)}</td>
      <td><strong>${htmlEscape(r.factor_id)}</strong><br>${htmlEscape(r.factor)}</td>
      <td>${htmlEscape(r.base_current)}<br><span class="muted">${htmlEscape(r.base_goal)}</span></td>
      <td>${htmlEscape(r.compare_current)}<br><span class="muted">${htmlEscape(r.compare_goal)}</span></td>
      <td>${htmlEscape(r.recommendation)}</td>
    </tr>
  `));
}

function renderCompareLsi(rows) {
  if (!rows.length) {
    return `<div class="note-box">No LSI term changes were found between these runs.</div>`;
  }
  return table(["Status", "Term", "Tracked", "Tracked Change", "Deficit", "Deficit Change"], rows.map((r) => `
    <tr>
      <td>${htmlEscape(r.status)}</td>
      <td>${htmlEscape(r.keyword)}</td>
      <td>${fmtNum(r.base_tracked)} -> ${fmtNum(r.compare_tracked)}</td>
      <td>${fmtDelta(r.tracked_delta)}</td>
      <td>${fmtNum(r.base_deficit)} -> ${fmtNum(r.compare_deficit)}</td>
      <td>${fmtDelta(r.deficit_delta, true)}</td>
    </tr>
  `));
}

function matchTypeLabel(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderTargetVisibility(run, matches = []) {
  const target = run.target_url || run.target_domain || "";
  return `
    <section class="target-visibility-panel">
      <div class="panel-head">
        <div>
          <h3>Target URL Visibility</h3>
          <p>${target ? htmlEscape(target) : "No target URL stored for this run."}</p>
        </div>
        <span class="status-pill ${matches.length ? "imported" : "error"}">${matches.length ? `${fmtNum(matches.length)} found` : "not found"}</span>
      </div>
      ${matches.length ? table(["Rank", "Match", "Host", "Found URL"], matches.map((match) => `
        <tr>
          <td>${fmtNum(match.rank)}</td>
          <td>${htmlEscape(matchTypeLabel(match.match_type))}</td>
          <td>${htmlEscape(match.host || "")}</td>
          <td class="url-cell">${htmlEscape(match.url || "")}</td>
        </tr>
      `)) : `<div class="note-box">No matching target URL or domain was found in the imported SERP rows.</div>`}
    </section>
  `;
}

async function compareSelectedRuns(event) {
  event.preventDefault();
  const baseId = Number(el("compare-base").value);
  const compareId = Number(el("compare-target").value);
  if (!baseId || !compareId || baseId === compareId) {
    toast("Choose two different runs to compare.");
    return;
  }
  await loadRuns();
  const availableIds = new Set(state.runs.map((run) => Number(run.id)));
  if (!availableIds.has(baseId) || !availableIds.has(compareId)) {
    toast("One selected run is not imported anymore. Refreshing the list; choose two imported reports.");
    return;
  }
  el("compare-base").value = String(baseId);
  el("compare-target").value = String(compareId);
  const data = await api(`/api/compare?base_id=${baseId}&compare_id=${compareId}`);
  state.selectedComparison = data;
  state.selectedRunId = null;
  state.selectedProjectId = null;
  renderProjects();
  renderRuns();

  const summary = data.summary || {};
  const counts = summary.counts || {};
  el("empty-state").classList.add("hidden");
  el("cora-settings-detail").classList.add("hidden");
  el("project-detail").classList.add("hidden");
  el("run-detail").classList.add("hidden");
  el("compare-detail").classList.remove("hidden");
  el("compare-detail").innerHTML = `
    <div class="detail-head">
      <div>
        <h2>Run Comparison</h2>
        <p>${htmlEscape(data.base_run.keyword)} | ${fmtDate(data.base_run.imported_at)} to ${fmtDate(data.compare_run.imported_at)}</p>
      </div>
    </div>
    <div class="metrics compare-metrics">
      ${compareMetric("Target Rank", summary.target_rank, true)}
      ${compareMetric("Recommendations", counts.recommendations)}
      ${compareMetric("LSI Terms", counts.lsi_keywords)}
      ${compareMetric("Workbook Rows", counts.workbook_rows)}
    </div>
    <nav class="tabs compare-tabs">
      <button class="tab active" data-compare-tab="serp">SERP Changes</button>
      <button class="tab" data-compare-tab="recommendations">Recommendation Changes</button>
      <button class="tab" data-compare-tab="lsi">LSI Changes</button>
    </nav>
    <section id="compare-tab-serp" class="tab-panel">${renderCompareSerp(data.serp_changes || [])}</section>
    <section id="compare-tab-recommendations" class="tab-panel hidden">${renderCompareRecommendations(data.recommendation_changes || [])}</section>
    <section id="compare-tab-lsi" class="tab-panel hidden">${renderCompareLsi(data.lsi_changes || [])}</section>
  `;
  setupCompareTabs();
}

function setupCompareTabs() {
  document.querySelectorAll(".compare-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".compare-tabs .tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll("#compare-detail .tab-panel").forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      el(`compare-tab-${tab.dataset.compareTab}`).classList.remove("hidden");
    });
  });
}

async function selectRun(id) {
  if (state.activeView !== "clients-view") {
    showMainView("clients-view", { skipClientSelect: true });
  }
  state.selectedRunId = id;
  state.selectedProjectId = null;
  renderProjects();
  renderRuns();
  const data = await api(`/api/runs/${id}`);
  state.selectedRun = data;
  const run = data.run;

  el("empty-state").classList.add("hidden");
  el("cora-settings-detail").classList.add("hidden");
  el("project-detail").classList.add("hidden");
  el("compare-detail").classList.add("hidden");
  el("run-detail").classList.remove("hidden");
  el("detail-title").textContent = run.keyword;
  el("detail-meta").textContent = `${run.target_url || "No target"} | Imported ${fmtDate(run.imported_at)}${run.project_name ? ` | Project ${run.project_name}` : ""}`;
  el("download-link").href = `/api/runs/${run.id}/download`;
  el("share-report-link").onclick = () => createShareReport(run.id).catch((err) => toast(err.message));
  el("metric-results").textContent = data.results.length;
  el("metric-recs").textContent = data.recommendations.length;
  el("metric-lsi").textContent = data.lsi.length;

  el("run-assignment").innerHTML = renderTargetVisibility(run, data.target_matches || []);
  el("tab-serp").innerHTML = renderSerp(data.results);
  el("tab-recommendations").innerHTML = renderRecommendations(data.recommendations);
  el("tab-lsi").innerHTML = renderLsi(data.lsi);
  el("tab-workbook").innerHTML = `<div class="note-box">Loading workbook sheets...</div>`;
  el("tab-raw").innerHTML = renderRaw(run);
  renderRunAssignment(run).then(() => {
    el("run-assignment").insertAdjacentHTML("afterbegin", renderTargetVisibility(run, data.target_matches || []));
  }).catch((err) => {
    el("run-assignment").innerHTML = `${renderTargetVisibility(run, data.target_matches || [])}<div class="note-box">${htmlEscape(err.message)}</div>`;
  });
  loadWorkbookSummary(run.id).catch((err) => {
    el("tab-workbook").innerHTML = `<div class="note-box">${htmlEscape(err.message)}</div>`;
  });
}

async function createShareReport(runId) {
  state.reportRunId = String(runId);
  const run = state.selectedRun?.run;
  if (run?.project_id) {
    state.selectedClientId = String(run.project_id);
    state.selectedProjectId = Number(run.project_id);
  }
  showMainView("reports-view");
}

async function importLatest() {
  const latest = await api("/api/latest-report");
  const target = window.prompt("Target URL/domain for this Cora run:", "https://www.sandiegopools.com/");
  const keyword = window.prompt("Keyword for this Cora run:", "san diego pools");
  const body = {
    path: latest.path,
    target_url: target || undefined,
    keyword: keyword || undefined,
  };
  const result = await api("/api/ingest", { method: "POST", body: JSON.stringify(body) });
  toast(result.created ? "Imported report into the database." : "Report was already imported.");
  await loadRuns();
  if (result.run?.id) await selectRun(result.run.id);
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      el(`tab-${tab.dataset.tab}`).classList.remove("hidden");
    });
  });
}

async function boot() {
  loadThemePreference();
  setupTabs();
  el("theme-mode")?.addEventListener("change", (event) => saveThemePreference(event.target.value));
  document.querySelectorAll(".main-tab").forEach((tab) => {
    tab.addEventListener("click", () => showMainView(tab.dataset.view));
  });
  el("open-new-client")?.addEventListener("click", () => showMainView("new-client-view"));
  el("active-client").addEventListener("change", (event) => {
    selectClient(Number(event.target.value)).catch((err) => toast(err.message));
  });
  el("refresh").addEventListener("click", async () => {
    await loadProfiles();
    await refreshCurrentProfileView();
  });
  el("import-latest").addEventListener("click", () => importLatest().catch((err) => toast(err.message)));
  el("force-stop-cora").addEventListener("click", () => forceStopCora().catch((err) => toast(err.message)));
  el("api-key-form")?.addEventListener("submit", (event) => saveApiKey(event).catch((err) => toast(err.message)));
  el("content-plan-form").addEventListener("submit", (event) => saveContentPlan(event).catch((err) => toast(err.message)));
  el("domain-lists-form")?.addEventListener("submit", (event) => saveDomainLists(event).catch((err) => toast(err.message)));
  el("show-cora-settings")?.addEventListener("click", () => showCoraSettings().catch((err) => toast(err.message)));
  el("domains-tracked-add")?.addEventListener("click", () => addDomainListItem("tracked"));
  el("domains-competitors-add")?.addEventListener("click", () => addDomainListItem("competitors"));
  el("domains-tracked-new")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDomainListItem("tracked");
    }
  });
  el("domains-competitors-new")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDomainListItem("competitors");
    }
  });
  el("plan-project").addEventListener("change", () => loadPlanContext(Number(el("plan-project").value) || null).catch((err) => toast(err.message)));
  el("project-manager").addEventListener("submit", (event) => createProject(event).catch((err) => toast(err.message)));
  el("run-manager").addEventListener("submit", (event) => startManagedJob(event).catch((err) => toast(err.message)));
  el("compare-manager").addEventListener("submit", (event) => compareSelectedRuns(event).catch((err) => toast(err.message)));
  el("refresh-jobs").addEventListener("click", () => loadJobs().catch((err) => toast(err.message)));
  el("search").addEventListener("input", () => loadRuns().catch((err) => toast(err.message)));
  await refreshCoraStatus().catch(() => {});
  await loadProfiles().catch((err) => toast(err.message));
  await loadOverview().catch((err) => toast(err.message));
  await loadProjects().catch((err) => toast(err.message));
  await loadJobs().catch((err) => toast(err.message));
  await loadRuns().catch((err) => toast(err.message));
  await selectFirstClientIfNeeded().catch((err) => toast(err.message));
  if (!state.selectedRunId && !state.selectedProjectId) {
    showEmpty();
  }
  showMainView("clients-view");
  await selectFirstClientIfNeeded().catch((err) => toast(err.message));
  state.jobTimer = window.setInterval(() => {
    refreshCoraStatus().catch(() => {});
    loadJobs().catch(() => {});
    if (state.activeView === "cora-view") loadCoraLog().catch(() => {});
    if (state.activeView === "overview-view") loadOverview().catch(() => {});
  }, 8000);
}

boot();
