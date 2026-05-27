const state = {
  runs: [],
  jobs: [],
  projects: [],
  apiKeys: [],
  contentPlans: [],
  overview: null,
  projectDetails: {},
  activeView: "overview-view",
  selectedRunId: null,
  selectedProjectId: null,
  selectedComparison: null,
  selectedRun: null,
  jobTimer: null,
};

const el = (id) => document.getElementById(id);

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

function showEmpty() {
  el("empty-state").classList.remove("hidden");
  el("project-detail").classList.add("hidden");
  el("compare-detail").classList.add("hidden");
  el("run-detail").classList.add("hidden");
}

function showMainView(viewId) {
  state.activeView = viewId;
  document.querySelectorAll(".app-view").forEach((view) => view.classList.add("hidden"));
  document.querySelectorAll(".main-tab").forEach((tab) => tab.classList.remove("active"));
  el(viewId).classList.remove("hidden");
  document.querySelector(`.main-tab[data-view="${viewId}"]`)?.classList.add("active");
  const isCora = viewId === "cora-view";
  el("import-latest").classList.toggle("hidden", !isCora);
  el("force-stop-cora").classList.toggle("hidden", !isCora);
  el("cora-status").classList.toggle("hidden", !isCora);
  if (viewId === "overview-view") {
    loadOverview().catch((err) => toast(err.message));
  }
  if (viewId === "planner-view") {
    loadPlanner().catch((err) => toast(err.message));
  }
  if (viewId === "api-keys-view") {
    loadApiKeys().catch((err) => toast(err.message));
  }
}

async function refreshCoraStatus() {
  const data = await api("/api/cora/status");
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
  root.innerHTML = `
    <div class="overview-grid">
      <div class="overview-card"><span>${fmtNum(counts.projects || 0)}</span><label>Projects</label></div>
      <div class="overview-card"><span>${fmtNum(counts.runs || 0)}</span><label>Cora Runs</label></div>
      <div class="overview-card"><span>${fmtNum(counts.keywords || 0)}</span><label>Keywords</label></div>
      <div class="overview-card"><span>${fmtNum(counts.workbook_rows || 0)}</span><label>Workbook Rows</label></div>
      <div class="overview-card"><span>${fmtNum(counts.sites || 0)}</span><label>Sites</label></div>
      <div class="overview-card"><span>${fmtNum(counts.pages || 0)}</span><label>Pages</label></div>
      <div class="overview-card"><span>${fmtNum(counts.content_plans || 0)}</span><label>Content Plans</label></div>
      <div class="overview-card"><span>${fmtNum(counts.api_keys || 0)}</span><label>API Keys</label></div>
    </div>
    <div class="overview-sections">
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
}

async function loadOverview() {
  const data = await api("/api/overview");
  state.overview = data;
  renderOverview();
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
      <span>${fmtNum(project.keyword_count || 0)} keywords | ${fmtNum(project.run_count || 0)} runs</span>
    </button>
  `).join("");
  root.querySelectorAll(".project-item").forEach((item) => {
    item.addEventListener("click", () => selectProject(Number(item.dataset.projectId)));
  });
}

async function loadProjects() {
  const data = await api("/api/projects");
  state.projects = data.projects || [];
  renderProjects();
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
  const keywords = detail.keywords || [];
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
        <h3>Keywords</h3>
        ${keywords.length ? table(["Keyword", "Site", "Page", "Intent", "Priority"], keywords.map((k) => `
          <tr>
            <td><strong>${htmlEscape(k.keyword)}</strong></td>
            <td>${htmlEscape(k.site_domain)}</td>
            <td class="url-cell">${htmlEscape(k.page_url)}</td>
            <td>${htmlEscape(k.intent)}</td>
            <td>${htmlEscape(k.priority)}</td>
          </tr>
        `)) : `<div class="note-box">No keywords have been added.</div>`}
      </section>
      <section class="data-section">
        <h3>Assigned Runs</h3>
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

async function selectProject(projectId) {
  state.selectedProjectId = projectId;
  state.selectedRunId = null;
  renderProjects();
  renderRuns();
  const detail = await getProjectDetail(projectId, true);
  const project = detail.project;
  const sites = detail.sites || [];
  const pages = detail.pages || [];

  el("empty-state").classList.add("hidden");
  el("run-detail").classList.add("hidden");
  el("compare-detail").classList.add("hidden");
  el("project-detail").classList.remove("hidden");
  el("project-detail").innerHTML = `
    <div class="detail-head">
      <div>
        <h2>${htmlEscape(project.name)}</h2>
        <p>${htmlEscape(project.client || "No client stored")} | Created ${fmtDate(project.created_at)}</p>
      </div>
    </div>
    <div class="metrics project-metrics">
      <div><span>${fmtNum(sites.length)}</span><label>Sites</label></div>
      <div><span>${fmtNum(pages.length)}</span><label>Pages</label></div>
      <div><span>${fmtNum((detail.keywords || []).length)}</span><label>Keywords</label></div>
      <div><span>${fmtNum((detail.runs || []).length)}</span><label>Runs</label></div>
    </div>
    <div class="project-tools">
      <form id="add-site-form" class="tool-form">
        <h3>Add Site</h3>
        <input id="site-domain" type="text" placeholder="example.com">
        <input id="site-name" type="text" placeholder="Display name">
        <button type="submit">Add Site</button>
      </form>
      <form id="add-page-form" class="tool-form">
        <h3>Add Page</h3>
        <select id="page-site">${optionRows(sites, "", (s) => s.domain, false)}</select>
        <input id="page-url" type="text" placeholder="https://example.com/page">
        <input id="page-title" type="text" placeholder="Page title">
        <button type="submit">Add Page</button>
      </form>
      <form id="add-keyword-form" class="tool-form">
        <h3>Add Keyword</h3>
        <input id="keyword-text" type="text" placeholder="target keyword">
        <select id="keyword-site">${optionRows(sites, "", (s) => s.domain)}</select>
        <select id="keyword-page">${optionRows(pages, "", (p) => p.url)}</select>
        <input id="keyword-intent" type="text" placeholder="Intent">
        <input id="keyword-priority" type="text" placeholder="Priority">
        <button type="submit">Add Keyword</button>
      </form>
    </div>
    ${renderProjectTables(detail)}
  `;
  bindProjectDetailForms(projectId, detail);
}

function bindProjectDetailForms(projectId, detail) {
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

  document.querySelectorAll(".project-run-open").forEach((button) => {
    button.addEventListener("click", () => selectRun(Number(button.dataset.runId)));
  });
}

async function createProject(event) {
  event.preventDefault();
  const name = el("project-name").value.trim();
  if (!name) {
    toast("Project name is required.");
    return;
  }
  const data = await api("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      client: el("project-client").value.trim() || undefined,
      site_domain: el("project-site").value.trim() || undefined,
    }),
  });
  el("project-name").value = "";
  el("project-client").value = "";
  el("project-site").value = "";
  await loadProjects();
  await selectProject(data.project.id);
}

function renderApiKeys() {
  const root = el("api-keys");
  if (!state.apiKeys.length) {
    root.innerHTML = `<div class="note-box">No API keys have been saved yet.</div>`;
    return;
  }
  root.innerHTML = table(["Provider", "Label", "Key", "Updated", "Notes", ""], state.apiKeys.map((key) => `
    <tr>
      <td>${htmlEscape(key.provider)}</td>
      <td>${htmlEscape(key.label)}</td>
      <td class="key-preview">${htmlEscape(key.key_preview)} <span class="muted">(${fmtNum(key.key_length)} chars)</span></td>
      <td>${fmtDate(key.updated_at)}</td>
      <td>${htmlEscape(key.notes)}</td>
      <td><button class="link-button delete-api-key" data-key-id="${key.id}">Delete</button></td>
    </tr>
  `));
  root.querySelectorAll(".delete-api-key").forEach((button) => {
    button.addEventListener("click", () => deleteApiKey(Number(button.dataset.keyId)).catch((err) => toast(err.message)));
  });
}

async function loadApiKeys() {
  const data = await api("/api/api-keys");
  state.apiKeys = data.api_keys || [];
  renderApiKeys();
}

async function saveApiKey(event) {
  event.preventDefault();
  await api("/api/api-keys", {
    method: "POST",
    body: JSON.stringify({
      provider: el("api-provider").value.trim(),
      label: el("api-label").value.trim(),
      key_value: el("api-key-value").value.trim(),
      notes: el("api-notes").value.trim() || undefined,
    }),
  });
  el("api-provider").value = "";
  el("api-label").value = "";
  el("api-key-value").value = "";
  el("api-notes").value = "";
  await loadApiKeys();
  toast("API key saved.");
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
  const data = await api("/api/content-plans");
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
    item.addEventListener("click", () => selectRun(Number(item.dataset.runId)));
  });
}

async function loadRuns() {
  const q = el("search").value.trim();
  const data = await api(`/api/runs${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  state.runs = data.runs || [];
  renderRuns();
  renderCompareSelectors();
  if (!state.selectedRunId && !state.selectedProjectId && state.runs.length) {
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
  if (!state.jobs.length) {
    root.innerHTML = `<div class="job-empty">No managed jobs yet.</div>`;
    return;
  }
  root.innerHTML = state.jobs.map((job) => {
    const pct = job.progress === null || job.progress === undefined ? "" : `${Math.round(Number(job.progress) * 100)}%`;
    const runLink = job.imported_run_id ? `<button class="link-button" data-run-id="${job.imported_run_id}">Open run</button>` : "";
    return `
      <div class="job-item ${htmlEscape(job.status)}">
        <div class="job-title">${htmlEscape(job.keyword)}</div>
        <div class="job-meta">${htmlEscape(job.target_domain || job.target_url)}</div>
        <div class="job-status">
          <span>${htmlEscape(job.status)}</span>
          <span>${htmlEscape(pct)}</span>
        </div>
        <div class="job-message">${htmlEscape(job.status_message || job.cora_action || "")}</div>
        ${job.error ? `<div class="job-error">${htmlEscape(job.error)}</div>` : ""}
        ${runLink}
      </div>
    `;
  }).join("");
  root.querySelectorAll(".link-button").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadRuns();
      await selectRun(Number(button.dataset.runId));
    });
  });
}

async function loadJobs() {
  const data = await api("/api/jobs");
  state.jobs = data.jobs || [];
  renderJobs();
}

async function startManagedJob(event) {
  event.preventDefault();
  const keyword = el("job-keyword").value.trim();
  const target = el("job-target").value.trim();
  if (!keyword || !target) {
    toast("Keyword and target are required.");
    return;
  }
  const data = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ keyword, target_url: target }),
  });
  toast(`Started Cora job ${data.job.id}.`);
  await loadJobs();
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

function table(headers, rows) {
  return `
    <table>
      <thead><tr>${headers.map((h) => `<th>${htmlEscape(h)}</th>`).join("")}</tr></thead>
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
  state.selectedRunId = id;
  state.selectedProjectId = null;
  renderProjects();
  renderRuns();
  const data = await api(`/api/runs/${id}`);
  state.selectedRun = data;
  const run = data.run;

  el("empty-state").classList.add("hidden");
  el("project-detail").classList.add("hidden");
  el("compare-detail").classList.add("hidden");
  el("run-detail").classList.remove("hidden");
  el("detail-title").textContent = run.keyword;
  el("detail-meta").textContent = `${run.target_url || "No target"} | Imported ${fmtDate(run.imported_at)}${run.project_name ? ` | Project ${run.project_name}` : ""}`;
  el("download-link").href = `/api/runs/${run.id}/download`;
  el("metric-results").textContent = data.results.length;
  el("metric-recs").textContent = data.recommendations.length;
  el("metric-lsi").textContent = data.lsi.length;

  el("tab-serp").innerHTML = renderSerp(data.results);
  el("tab-recommendations").innerHTML = renderRecommendations(data.recommendations);
  el("tab-lsi").innerHTML = renderLsi(data.lsi);
  el("tab-workbook").innerHTML = `<div class="note-box">Loading workbook sheets...</div>`;
  el("tab-raw").innerHTML = renderRaw(run);
  renderRunAssignment(run).catch((err) => {
    el("run-assignment").innerHTML = `<div class="note-box">${htmlEscape(err.message)}</div>`;
  });
  loadWorkbookSummary(run.id).catch((err) => {
    el("tab-workbook").innerHTML = `<div class="note-box">${htmlEscape(err.message)}</div>`;
  });
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
  setupTabs();
  document.querySelectorAll(".main-tab").forEach((tab) => {
    tab.addEventListener("click", () => showMainView(tab.dataset.view));
  });
  el("refresh").addEventListener("click", async () => {
    if (state.activeView === "overview-view") {
      await loadOverview();
      return;
    }
    if (state.activeView === "planner-view") {
      await loadPlanner();
      return;
    }
    if (state.activeView === "api-keys-view") {
      await loadApiKeys();
      return;
    }
    await refreshCoraStatus();
    await loadProjects();
    await loadRuns();
    await loadJobs();
  });
  el("import-latest").addEventListener("click", () => importLatest().catch((err) => toast(err.message)));
  el("force-stop-cora").addEventListener("click", () => forceStopCora().catch((err) => toast(err.message)));
  el("api-key-form").addEventListener("submit", (event) => saveApiKey(event).catch((err) => toast(err.message)));
  el("content-plan-form").addEventListener("submit", (event) => saveContentPlan(event).catch((err) => toast(err.message)));
  el("plan-project").addEventListener("change", () => loadPlanContext(Number(el("plan-project").value) || null).catch((err) => toast(err.message)));
  el("project-manager").addEventListener("submit", (event) => createProject(event).catch((err) => toast(err.message)));
  el("run-manager").addEventListener("submit", (event) => startManagedJob(event).catch((err) => toast(err.message)));
  el("compare-manager").addEventListener("submit", (event) => compareSelectedRuns(event).catch((err) => toast(err.message)));
  el("refresh-jobs").addEventListener("click", () => loadJobs().catch((err) => toast(err.message)));
  el("search").addEventListener("input", () => loadRuns().catch((err) => toast(err.message)));
  await refreshCoraStatus().catch(() => {});
  await loadOverview().catch((err) => toast(err.message));
  await loadProjects().catch((err) => toast(err.message));
  await loadJobs().catch((err) => toast(err.message));
  await loadRuns().catch((err) => toast(err.message));
  if (!state.selectedRunId && !state.selectedProjectId) {
    showEmpty();
  }
  showMainView("overview-view");
  state.jobTimer = window.setInterval(() => {
    refreshCoraStatus().catch(() => {});
    loadJobs().catch(() => {});
    if (state.activeView === "overview-view") loadOverview().catch(() => {});
  }, 8000);
}

boot();
