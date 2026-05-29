const TABLE_COLUMNS = {
  profiles: ["id", "name", "client", "notes", "created_at", "updated_at"],
  projects: ["id", "profile_id", "name", "client", "site_domain", "notes", "created_at", "updated_at"],
  sites: ["id", "project_id", "domain", "name", "created_at"],
  pages: ["id", "site_id", "url", "title", "created_at"],
  keywords: ["id", "project_id", "site_id", "page_id", "keyword", "intent", "priority", "created_at"],
  runs: ["id", "project_id", "site_id", "page_id", "keyword_id", "keyword", "target_url", "target_domain", "report_date", "imported_at", "source_path", "archive_path", "file_name", "file_size", "sha256", "notes", "status"],
  serp_results: ["id", "run_id", "rank", "title", "url", "host", "is_target"],
  recommendations: ["id", "run_id", "factor_id", "factor", "recommendation", "status", "details", "percent", "pages", "max_value", "min_value", "average"],
  lsi_keywords: ["id", "run_id", "keyword", "spearman", "pearson", "best_of_both", "pages", "max_value", "average", "tracked_value", "deficit"],
  sheet_rows: ["id", "run_id", "sheet", "row_index", "row_json"],
  workbook_rows: ["id", "run_id", "sheet", "row_index", "row_json"],
  managed_jobs: ["id", "project_id", "keyword_id", "keyword", "target_url", "target_domain", "cora_profile", "tool", "status", "status_message", "report_path", "run_id", "started_at", "updated_at", "completed_at", "last_activity_at", "retry_count", "max_retries", "next_retry_at", "stall_detected_at"],
  content_plans: ["id", "project_id", "site_id", "page_id", "keyword_id", "title", "content_type", "intent", "priority", "status", "due_date", "notes", "created_at", "updated_at"],
  entity_lsi_batches: ["id", "project_id", "seed_keyword", "depth", "target_count", "completed_count", "failed_count", "status", "created_at", "updated_at"],
  entity_lsi_runs: ["id", "project_id", "batch_id", "seed_keyword", "depth", "api_key_id", "provider", "model", "status", "summary", "entities_json", "lsi_keywords_json", "related_keywords_json", "questions_json", "topics_json", "raw_response", "error", "created_at", "completed_at"],
  entity_sets: ["id", "project_id", "source_batch_id", "name", "notes", "created_at", "updated_at"],
  entity_set_terms: ["id", "set_id", "term", "normalized", "type", "source_count", "sources_json", "notes", "created_at"],
  share_reports: ["id", "token", "run_id", "level", "title", "notes", "ranking_snapshot_id", "entity_set_id", "optimization_target_ids_json", "created_at", "revoked_at"],
  ranking_snapshots: ["id", "project_id", "target", "location_code", "language_code", "limit_value", "include_subdomains", "overview_json", "errors_json", "source", "freshness", "created_at"],
  ranking_snapshot_keywords: ["id", "snapshot_id", "keyword", "ranking_url", "position", "previous_position", "search_volume", "cpc", "competition", "competition_level", "keyword_difficulty", "estimated_traffic", "traffic_cost", "serp_features_json", "ai_overview_present", "ai_overview_reference", "intent", "last_updated", "created_at"],
  ranking_snapshot_pages: ["id", "snapshot_id", "url", "organic_keywords", "organic_traffic", "organic_traffic_cost", "top1", "top3", "top10", "top20", "top100", "paid_keywords", "paid_traffic", "created_at"],
  ranking_optimization_targets: ["id", "snapshot_id", "project_id", "url", "keyword", "best_position", "ranking_keywords", "opportunity_count", "total_search_volume", "estimated_traffic", "page_organic_traffic", "page_organic_keywords", "top10", "priority_type", "opportunity_score", "recommended_action", "top_keywords_json", "status", "notes", "created_at", "updated_at"]
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}

function text(data, status = 200) {
  return new Response(data, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function requireSyncAuth(request, env) {
  const expected = env.SYNC_TOKEN || "";
  const header = request.headers.get("authorization") || "";
  if (!expected || header !== `Bearer ${expected}`) {
    return false;
  }
  return true;
}

function requireAdminAuth(request, env) {
  const expected = env.ADMIN_TOKEN || env.SYNC_TOKEN || "";
  const header = request.headers.get("authorization") || "";
  return Boolean(expected && header === `Bearer ${expected}`);
}

function requireReadAuth(request, env) {
  const header = request.headers.get("authorization") || "";
  const tokens = [env.READ_TOKEN, env.ADMIN_TOKEN, env.SYNC_TOKEN].filter(Boolean);
  return tokens.some((token) => header === `Bearer ${token}`);
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.get("cookie") || "").split(";").map((part) => {
    const [name, ...rest] = part.trim().split("=");
    return [name, decodeURIComponent(rest.join("=") || "")];
  }).filter(([name]) => name));
}

function sessionCookie(value, maxAge) {
  const encoded = encodeURIComponent(value || "");
  return `opos_session=${encoded}; Max-Age=${Number(maxAge || 0)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function publicUser(row) {
  if (!row) return null;
  let clientIds = [];
  try { clientIds = row.client_ids_json ? JSON.parse(row.client_ids_json) : []; } catch (_err) { clientIds = []; }
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
    role: row.role || "read",
    status: row.status || "active",
    client_ids: Array.isArray(clientIds) ? clientIds : [],
    last_login_at: row.last_login_at || null
  };
}

async function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

async function currentUser(request, env) {
  const token = parseCookies(request).opos_session || "";
  if (!token || !env.DB) return null;
  try {
    const hash = await sha256Hex(token);
    const now = new Date().toISOString();
    const row = await env.DB.prepare(
      `SELECT u.*
       FROM cloud_sessions s
       JOIN cloud_users u ON u.id = s.user_id
       WHERE s.session_hash = ? AND s.expires_at > ? AND u.status = 'active'
       LIMIT 1`
    ).bind(hash, now).first();
    if (!row) return null;
    await env.DB.prepare("UPDATE cloud_sessions SET last_seen_at = ? WHERE session_hash = ?").bind(now, hash).run();
    return publicUser(row);
  } catch (_err) {
    return null;
  }
}

async function hasReadAccess(request, env) {
  if (requireReadAuth(request, env) || requireSyncAuth(request, env)) return true;
  return Boolean(await currentUser(request, env));
}

async function hasAdminAccess(request, env) {
  if (requireAdminAuth(request, env) || requireSyncAuth(request, env)) return true;
  const user = await currentUser(request, env);
  return ["admin", "owner"].includes(String(user?.role || "").toLowerCase());
}

async function accessContext(request, env) {
  const user = await currentUser(request, env);
  const admin = requireAdminAuth(request, env) || requireSyncAuth(request, env) || ["admin", "owner"].includes(String(user?.role || "").toLowerCase());
  const write = admin || ["write"].includes(String(user?.role || "").toLowerCase());
  const clientIds = !admin && Array.isArray(user?.client_ids) && user.client_ids.length ? user.client_ids.map((id) => Number(id)).filter(Boolean) : [];
  return { user, admin, write, clientIds, scoped: clientIds.length > 0 };
}

function scopeClause(scope, column) {
  if (!scope?.scoped) return { sql: "", binds: [] };
  const placeholders = scope.clientIds.map(() => "?").join(", ");
  return { sql: `${column} IN (${placeholders})`, binds: scope.clientIds };
}

function filterScope(rows, scope, column = "project_id") {
  if (!scope?.scoped) return rows || [];
  const allowed = new Set(scope.clientIds.map(String));
  return (rows || []).filter((row) => allowed.has(String(row[column] || "")));
}

async function assertProjectAccess(request, env, projectId) {
  const scope = await accessContext(request, env);
  if (!scope.scoped) return scope;
  if (!scope.clientIds.map(String).includes(String(projectId || ""))) {
    const error = new Error("Forbidden: this user is not assigned to this client.");
    error.status = 403;
    throw error;
  }
  return scope;
}

async function assertCommandAccess(request, env, commandType, payload) {
  const scope = await accessContext(request, env);
  if (!scope.write) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  if (["sync_cloud_data", "sync_cloud_to_local", "sync_report_artifacts"].includes(commandType) && !scope.admin) {
    const error = new Error("Forbidden: sync commands require admin access.");
    error.status = 403;
    throw error;
  }
  if (!scope.scoped) return scope;
  const projectId = Number(payload?.project_id || 0);
  if (!projectId || !scope.clientIds.map(String).includes(String(projectId))) {
    const error = new Error("Forbidden: this user can only queue commands for assigned clients.");
    error.status = 403;
    throw error;
  }
  return scope;
}

const COMMAND_TYPES = new Set(["create_project", "add_keyword", "create_content_plan", "create_share_report", "run_cora", "create_ranking_snapshot", "run_entity_lsi", "sync_cloud_data", "sync_cloud_to_local", "sync_report_artifacts"]);
const ENTITY_DEPTH_LIMITS = {
  1: { entities: 10, lsi_terms: 15, related_keywords: 15, questions: 8, topic_clusters: 4 },
  2: { entities: 18, lsi_terms: 25, related_keywords: 25, questions: 12, topic_clusters: 6 },
  3: { entities: 30, lsi_terms: 40, related_keywords: 40, questions: 20, topic_clusters: 8 },
  4: { entities: 45, lsi_terms: 60, related_keywords: 60, questions: 30, topic_clusters: 12 },
  5: { entities: 60, lsi_terms: 80, related_keywords: 80, questions: 40, topic_clusters: 16 }
};

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodeBase64(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function cleanArtifactPath(value) {
  const key = String(value || "").trim();
  if (!key || !key.startsWith("reports/") || key.includes("..") || key.includes("\\")) {
    throw new Error("Invalid artifact key");
  }
  return key;
}

function artifactPublicUrl(request, token, artifactType) {
  const url = new URL(request.url);
  const suffix = artifactType === "source_xlsx" ? "/download" : "";
  return `${url.origin}/share/report/${encodeURIComponent(token)}${suffix}`;
}

async function logAudit(request, env, action, objectType, objectId, metadata = {}, actor = "") {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_events
       (actor, action, object_type, object_id, metadata_json, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      actor || "",
      action,
      objectType || "",
      objectId == null ? "" : String(objectId),
      JSON.stringify(metadata || {}),
      request.headers.get("cf-connecting-ip") || "",
      (request.headers.get("user-agent") || "").slice(0, 500),
      new Date().toISOString()
    ).run();
  } catch (_err) {
    // Audit logging must not break report sharing, sync, or command execution.
  }
}

function normalizeRows(table, rows) {
  const columns = TABLE_COLUMNS[table];
  if (!columns) throw new Error(`Unsupported table: ${table}`);
  return rows.map((row) => {
    const item = {};
    for (const column of columns) {
      if (Object.prototype.hasOwnProperty.call(row, column)) item[column] = row[column];
    }
    return item;
  }).filter((row) => row.id !== undefined && row.id !== null);
}

async function upsertRows(db, table, rows) {
  const columns = TABLE_COLUMNS[table];
  const normalized = normalizeRows(table, rows);
  if (!normalized.length) return { table, rows: 0 };
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns.filter((column) => column !== "id").map((column) => `${column}=excluded.${column}`).join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
  const statements = normalized.map((row) => db.prepare(sql).bind(...columns.map((column) => row[column] ?? null)));
  await db.batch(statements);
  return { table, rows: normalized.length };
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function domainFromUrl(value) {
  const raw = cleanText(value).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  return raw.toLowerCase();
}

function deepGet(object, ...paths) {
  for (const path of paths) {
    let current = object;
    for (const part of String(path).split(".")) {
      if (!current || typeof current !== "object" || !(part in current)) {
        current = undefined;
        break;
      }
      current = current[part];
    }
    if (current !== undefined && current !== null && current !== "") return current;
  }
  return null;
}

function normalizeRankingTarget(value) {
  const target = domainFromUrl(value);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(target)) throw new Error("Invalid ranking snapshot target domain.");
  return target;
}

function rankingPayload(target, locationCode, languageCode, limit, includeSubdomains, orderBy) {
  const item = { target, location_code: Number(locationCode || 2840), language_code: cleanText(languageCode) || "en" };
  if (limit) item.limit = Math.max(1, Math.min(Number(limit || 1000), 1000));
  if (includeSubdomains) item.include_subdomains = true;
  if (orderBy) item.order_by = orderBy;
  return [item];
}

async function dataForSeoPost(path, payload, env) {
  const login = env.DATAFORSEO_LOGIN || "";
  const password = env.DATAFORSEO_PASSWORD || "";
  const auth = env.DATAFORSEO_AUTH || (login && password ? btoa(`${login}:${password}`) : "");
  if (!auth) throw new Error("Missing Cloudflare secret DATAFORSEO_AUTH or DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD.");
  const response = await fetch(`https://api.dataforseo.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Basic ${auth}` },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`DataForSEO HTTP ${response.status}: ${data.status_message || response.statusText}`);
  if (data.status_code && ![20000, 20100].includes(Number(data.status_code))) throw new Error(`DataForSEO error: ${data.status_message || "Request failed"}`);
  return data;
}

function dataForSeoItems(data) {
  const task = Array.isArray(data.tasks) ? data.tasks[0] || {} : {};
  if (task.status_code && ![20000, 20100].includes(Number(task.status_code))) throw new Error(task.status_message || "DataForSEO task failed");
  const result = Array.isArray(task.result) ? task.result : task.result ? [task.result] : [];
  if (!result.length) return [];
  const first = result[0] || {};
  if (Array.isArray(first.items)) return first.items.filter((item) => item && typeof item === "object");
  return result.filter((item) => item && typeof item === "object");
}

function normalizeSerpFeatures(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((item) => typeof item === "string" ? item : item?.type || item?.name || item?.feature).filter(Boolean).map(String))].sort();
}

function normalizeKeywordItem(item) {
  const features = normalizeSerpFeatures(deepGet(item, "keyword_data.serp_info.serp_item_types", "serp_info.serp_item_types", "serp_features", "serp_item_types"));
  const featureText = features.join(" ").toLowerCase();
  const rankItem = deepGet(item, "ranked_serp_element.serp_item") || {};
  return {
    keyword: cleanText(deepGet(item, "keyword_data.keyword", "keyword", "keyword_data.keyword_info.keyword")),
    rankingUrl: cleanText(deepGet(item, "ranked_serp_element.serp_item.url", "ranked_serp_element.url", "url", "ranking_url")),
    position: numberOrNull(deepGet(item, "ranked_serp_element.serp_item.rank_absolute", "ranked_serp_element.serp_item.rank_group", "rank_absolute", "position")),
    previousPosition: numberOrNull(deepGet(item, "ranked_serp_element.serp_item.previous_rank_absolute", "rank_changes.previous_rank_absolute", "previous_position")),
    searchVolume: numberOrNull(deepGet(item, "keyword_data.keyword_info.search_volume", "keyword_info.search_volume", "search_volume")),
    cpc: numberOrNull(deepGet(item, "keyword_data.keyword_info.cpc", "keyword_info.cpc", "cpc")),
    competition: numberOrNull(deepGet(item, "keyword_data.keyword_info.competition", "keyword_info.competition", "competition")),
    competitionLevel: cleanText(deepGet(item, "keyword_data.keyword_info.competition_level", "keyword_info.competition_level", "competition_level")),
    keywordDifficulty: numberOrNull(deepGet(item, "keyword_data.keyword_properties.keyword_difficulty", "keyword_properties.keyword_difficulty", "keyword_difficulty")),
    estimatedTraffic: numberOrNull(deepGet(item, "ranked_serp_element.serp_item.etv", "ranked_serp_element.etv", "metrics.organic.etv", "etv")),
    trafficCost: numberOrNull(deepGet(item, "ranked_serp_element.serp_item.estimated_paid_traffic_cost", "traffic_cost", "estimated_paid_traffic_cost")),
    serpFeatures: features,
    aiOverviewPresent: featureText.includes("ai_overview") || featureText.includes("ai overview"),
    aiOverviewReference: Boolean(deepGet(item, "ranked_serp_element.serp_item.ai_overview_reference", "ai_overview_reference")) || String(rankItem.type || "").toLowerCase() === "ai_overview",
    intent: cleanText(deepGet(item, "keyword_data.search_intent_info.main_intent", "search_intent_info.main_intent", "intent")),
    lastUpdated: cleanText(deepGet(item, "keyword_data.keyword_info.last_updated_time", "last_updated_time", "last_updated"))
  };
}

function normalizePageItem(item) {
  const organic = deepGet(item, "metrics.organic") || {};
  const paid = deepGet(item, "metrics.paid") || {};
  const dist = deepGet(item, "metrics.organic.pos_distribution", "ranking_distribution.organic", "metrics.organic.ranking_distribution") || {};
  return {
    url: cleanText(item.page_address || item.url || item.target),
    organicKeywords: numberOrNull(organic.count || item.organic_keywords),
    organicTraffic: numberOrNull(organic.etv || item.organic_traffic),
    organicTrafficCost: numberOrNull(organic.estimated_paid_traffic_cost || item.organic_traffic_cost),
    top1: numberOrNull(dist.pos_1 || dist.top1 || item.top1),
    top3: numberOrNull(dist.pos_2_3 || dist.top3 || item.top3),
    top10: numberOrNull(dist.pos_4_10 || dist.top10 || item.top10),
    top20: numberOrNull(dist.pos_11_20 || dist.top20 || item.top20),
    top100: numberOrNull(dist.pos_21_100 || dist.top100 || item.top100),
    paidKeywords: numberOrNull(paid.count || item.paid_keywords),
    paidTraffic: numberOrNull(paid.etv || item.paid_traffic)
  };
}

function normalizeOverviewItem(item, target, locationCode, languageCode) {
  const organic = deepGet(item, "metrics.organic") || deepGet(item, "organic") || {};
  const paid = deepGet(item, "metrics.paid") || deepGet(item, "paid") || {};
  const dist = deepGet(item, "metrics.organic.pos_distribution", "ranking_distribution.organic", "organic.pos_distribution") || {};
  return {
    target, locationCode, languageCode,
    organicKeywords: numberOrNull(organic.count || item.organic_keywords),
    organicTraffic: numberOrNull(organic.etv || item.organic_traffic),
    organicTrafficCost: numberOrNull(organic.estimated_paid_traffic_cost || item.organic_traffic_cost),
    paidKeywords: numberOrNull(paid.count || item.paid_keywords),
    paidTraffic: numberOrNull(paid.etv || item.paid_traffic),
    rankingDistribution: {
      top1: numberOrNull(dist.pos_1 || dist.top1),
      top3: numberOrNull(dist.pos_2_3 || dist.top3),
      top10: numberOrNull(dist.pos_4_10 || dist.top10),
      top20: numberOrNull(dist.pos_11_20 || dist.top20),
      top100: numberOrNull(dist.pos_21_100 || dist.top100)
    },
    dataSource: "DataForSEO Labs",
    dataFreshnessNote: "DataForSEO Labs ranking data is updated weekly and should be treated as a ranking snapshot, not live rank tracking."
  };
}

async function createCloudRankingSnapshot(payload, env) {
  const target = normalizeRankingTarget(payload.target);
  const projectId = Number(payload.project_id || 0) || null;
  const locationCode = Number(payload.location_code || 2840);
  const languageCode = cleanText(payload.language_code) || "en";
  const limit = Math.max(1, Math.min(Number(payload.limit || 1000), 1000));
  const includeSubdomains = Boolean(payload.include_subdomains);
  const now = new Date().toISOString();
  const errors = {};
  let overview = normalizeOverviewItem({}, target, locationCode, languageCode);
  let keywords = [];
  let pages = [];
  try {
    const data = await dataForSeoPost("/v3/dataforseo_labs/google/domain_rank_overview/live", rankingPayload(target, locationCode, languageCode, null, includeSubdomains), env);
    overview = normalizeOverviewItem(dataForSeoItems(data)[0] || {}, target, locationCode, languageCode);
  } catch (error) { errors.overview = error.message || String(error); }
  try {
    const data = await dataForSeoPost("/v3/dataforseo_labs/google/ranked_keywords/live", rankingPayload(target, locationCode, languageCode, limit, includeSubdomains, ["keyword_data.keyword_info.search_volume,desc"]), env);
    keywords = dataForSeoItems(data).map(normalizeKeywordItem).filter((row) => row.keyword);
  } catch (error) { errors.keywords = error.message || String(error); }
  try {
    const data = await dataForSeoPost("/v3/dataforseo_labs/google/relevant_pages/live", rankingPayload(target, locationCode, languageCode, limit, includeSubdomains, ["metrics.organic.etv,desc"]), env);
    pages = dataForSeoItems(data).map(normalizePageItem).filter((row) => row.url);
  } catch (error) { errors.pages = error.message || String(error); }
  if (!keywords.length && !pages.length && Object.keys(errors).length) throw new Error(`Ranking snapshot failed: ${Object.values(errors).join("; ")}`);
  const inserted = await env.DB.prepare(
    `INSERT INTO ranking_snapshots
     (project_id, target, location_code, language_code, limit_value, include_subdomains, overview_json, errors_json, source, freshness, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(projectId, target, locationCode, languageCode, limit, includeSubdomains ? 1 : 0, JSON.stringify(overview), JSON.stringify(errors), "DataForSEO Labs", "weekly", now).run();
  const snapshotId = inserted.meta.last_row_id;
  const keywordSql = `INSERT INTO ranking_snapshot_keywords
    (snapshot_id, keyword, ranking_url, position, previous_position, search_volume, cpc, competition, competition_level, keyword_difficulty, estimated_traffic, traffic_cost, serp_features_json, ai_overview_present, ai_overview_reference, intent, last_updated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const pageSql = `INSERT INTO ranking_snapshot_pages
    (snapshot_id, url, organic_keywords, organic_traffic, organic_traffic_cost, top1, top3, top10, top20, top100, paid_keywords, paid_traffic, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const statements = [];
  for (const row of keywords) statements.push(env.DB.prepare(keywordSql).bind(snapshotId, row.keyword, row.rankingUrl, row.position, row.previousPosition, row.searchVolume, row.cpc, row.competition, row.competitionLevel, row.keywordDifficulty, row.estimatedTraffic, row.trafficCost, JSON.stringify(row.serpFeatures || []), row.aiOverviewPresent ? 1 : 0, row.aiOverviewReference ? 1 : 0, row.intent, row.lastUpdated, now));
  for (const row of pages) statements.push(env.DB.prepare(pageSql).bind(snapshotId, row.url, row.organicKeywords, row.organicTraffic, row.organicTrafficCost, row.top1, row.top3, row.top10, row.top20, row.top100, row.paidKeywords, row.paidTraffic, now));
  for (let i = 0; i < statements.length; i += 50) await env.DB.batch(statements.slice(i, i + 50));
  const snapshot = await env.DB.prepare("SELECT * FROM ranking_snapshots WHERE id = ?").bind(snapshotId).first();
  return { snapshot, meta: { keyword_count: keywords.length, page_count: pages.length, errors } };
}

function normalizeProvider(value) {
  const key = cleanText(value).toLowerCase();
  const aliases = { "open ai": "openai", "chatgpt": "openai", "claude": "anthropic", "gemini": "google", "google ai": "google", "google gemini": "google", "grok": "xai", "x.ai": "xai", "xai / grok": "xai", "pplx": "perplexity", "perplexity ai": "perplexity" };
  return aliases[key] || key;
}

function providerSecret(provider, env) {
  const key = normalizeProvider(provider);
  const secrets = {
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    google: env.GOOGLE_API_KEY,
    xai: env.XAI_API_KEY,
    perplexity: env.PERPLEXITY_API_KEY
  };
  if (!secrets[key]) throw new Error(`Missing Cloudflare secret for ${provider}.`);
  return { provider: key, secret: secrets[key] };
}

function clampDepth(value) {
  return Math.max(1, Math.min(Number(value || 3), 5));
}

function entityPrompt(project, seedKeyword, depth, mainUrl, keywords) {
  const limits = ENTITY_DEPTH_LIMITS[depth] || ENTITY_DEPTH_LIMITS[3];
  const keywordContext = keywords.length ? keywords.slice(0, 40).join(", ") : "No other client keywords provided.";
  return `You are building an SEO Entity and LSI exploration artifact.

Return only valid JSON with these exact keys:
summary: string
entities: array of objects with name, type, relevance_score, suggested_usage
lsi_terms: array of objects with term, relevance_score, intent
related_keywords: array of objects with keyword, intent, funnel_stage
questions: array of objects with question, intent, content_opportunity
topic_clusters: array of objects with cluster, terms, content_angle
warnings: array of strings

Client: ${project?.name || ""}
Client main URL: ${mainUrl || "Not provided"}
Seed keyword: ${seedKeyword}
Other client keywords: ${keywordContext}

Depth: ${depth}
Target approximate counts:
entities: ${limits.entities}
lsi_terms: ${limits.lsi_terms}
related_keywords: ${limits.related_keywords}
questions: ${limits.questions}
topic_clusters: ${limits.topic_clusters}

Favor terms that are useful for on-page optimization, content briefs, headings, schema/entity coverage, and topical completeness. Do not include invented metrics. Use relevance_score from 1 to 100.`;
}

function extractJsonText(text) {
  const clean = cleanText(text).replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  if (!clean) return {};
  try { return JSON.parse(clean); } catch (_err) {}
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
  return {};
}

function listFrom(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEntityResult(parsed) {
  return {
    summary: cleanText(parsed.summary),
    entities: listFrom(parsed.entities),
    lsi_keywords: listFrom(parsed.lsi_terms || parsed.lsi_keywords),
    related_keywords: listFrom(parsed.related_keywords),
    questions: listFrom(parsed.questions),
    topics: listFrom(parsed.topic_clusters || parsed.topics),
    warnings: listFrom(parsed.warnings)
  };
}

async function callCloudLlm(provider, model, prompt, env) {
  const { provider: key, secret } = providerSecret(provider, env);
  if (key === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": secret, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 5000, messages: [{ role: "user", content: prompt }] })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `Anthropic HTTP ${response.status}`);
    return (data.content || []).map((part) => part.text || "").join("\n");
  }
  if (key === "google") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(secret)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `Google HTTP ${response.status}`);
    return (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("\n");
  }
  if (key === "perplexity" && String(model || "").startsWith("perplexity/sonar")) {
    const response = await fetch("https://api.perplexity.ai/v1/sonar", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${secret}` },
      body: JSON.stringify({ model: String(model).split("/", 2)[1] || "sonar", messages: [{ role: "system", content: "Return only valid JSON. No markdown." }, { role: "user", content: prompt }] })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `Perplexity HTTP ${response.status}`);
    return data.choices?.[0]?.message?.content || "";
  }
  const base = key === "xai" ? "https://api.x.ai" : key === "perplexity" ? "https://api.perplexity.ai" : "https://api.openai.com";
  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${secret}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: "Return only valid JSON. No markdown." }, { role: "user", content: prompt }] })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `${key} HTTP ${response.status}`);
  return data.choices?.[0]?.message?.content || "";
}

async function createCloudEntityRuns(payload, env) {
  const projectId = Number(payload.project_id || 0);
  const seed = cleanText(payload.seed_keyword);
  const depth = clampDepth(payload.depth);
  const targets = Array.isArray(payload.targets) ? payload.targets : [];
  if (!projectId || !seed) throw new Error("Project and seed keyword are required.");
  if (!targets.length) throw new Error("At least one cloud provider:model target is required.");
  const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) throw new Error("Client project not found.");
  const site = await env.DB.prepare("SELECT * FROM sites WHERE project_id = ? ORDER BY id LIMIT 1").bind(projectId).first();
  const kwRows = await env.DB.prepare("SELECT keyword FROM keywords WHERE project_id = ? ORDER BY id LIMIT 40").bind(projectId).all();
  const prompt = entityPrompt(project, seed, depth, site?.domain || project.site_domain || "", (kwRows.results || []).map((row) => row.keyword).filter(Boolean));
  const now = new Date().toISOString();
  const batchInsert = await env.DB.prepare(
    "INSERT INTO entity_lsi_batches (project_id, seed_keyword, depth, target_count, completed_count, failed_count, status, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, 'running', ?, ?)"
  ).bind(projectId, seed, depth, targets.length, now, now).run();
  const batchId = batchInsert.meta.last_row_id;
  const runs = [];
  let completed = 0;
  let failed = 0;
  for (const target of targets) {
    const provider = normalizeProvider(target.provider || target.provider_key || "");
    const model = cleanText(target.model);
    if (!provider || !model) throw new Error("Cloud Entity targets must use provider:model.");
    const runInsert = await env.DB.prepare(
      "INSERT INTO entity_lsi_runs (project_id, batch_id, seed_keyword, depth, api_key_id, provider, model, status, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?, 'running', ?)"
    ).bind(projectId, batchId, seed, depth, provider, model, now).run();
    const runId = runInsert.meta.last_row_id;
    try {
      const raw = await callCloudLlm(provider, model, prompt, env);
      const parsed = normalizeEntityResult(extractJsonText(raw));
      await env.DB.prepare(
        "UPDATE entity_lsi_runs SET status = 'complete', summary = ?, entities_json = ?, lsi_keywords_json = ?, related_keywords_json = ?, questions_json = ?, topics_json = ?, raw_response = ?, error = NULL, completed_at = ? WHERE id = ?"
      ).bind(parsed.summary, JSON.stringify(parsed.entities), JSON.stringify(parsed.lsi_keywords), JSON.stringify(parsed.related_keywords), JSON.stringify(parsed.questions), JSON.stringify(parsed.topics), raw.slice(0, 200000), new Date().toISOString(), runId).run();
      completed += 1;
    } catch (error) {
      await env.DB.prepare("UPDATE entity_lsi_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?").bind(error.message || String(error), new Date().toISOString(), runId).run();
      failed += 1;
    }
    runs.push(await env.DB.prepare("SELECT * FROM entity_lsi_runs WHERE id = ?").bind(runId).first());
  }
  const status = failed && completed ? "partial" : failed ? "failed" : "complete";
  await env.DB.prepare("UPDATE entity_lsi_batches SET completed_count = ?, failed_count = ?, status = ?, updated_at = ? WHERE id = ?").bind(completed, failed, status, new Date().toISOString(), batchId).run();
  const batch = await env.DB.prepare("SELECT * FROM entity_lsi_batches WHERE id = ?").bind(batchId).first();
  return { batch, runs };
}

async function findCloudProject(env, name, siteDomain = "") {
  const cleanName = cleanText(name);
  const domain = domainFromUrl(siteDomain);
  if (cleanName) {
    const row = await env.DB.prepare("SELECT * FROM projects WHERE lower(name) = lower(?) ORDER BY id LIMIT 1").bind(cleanName).first();
    if (row) return row;
  }
  if (domain) {
    const row = await env.DB.prepare(
      "SELECT p.* FROM projects p JOIN sites s ON s.project_id = p.id WHERE lower(s.domain) = lower(?) ORDER BY p.id LIMIT 1"
    ).bind(domain).first();
    if (row) return row;
  }
  return null;
}

async function executeCloudCommand(commandType, payload, env) {
  const now = new Date().toISOString();
  const changedTables = [];
  const result = { command_type: commandType, execution_mode: "cloud", changed_tables: changedTables };
  if (commandType === "run_cora") throw new Error("Cora execution is local-only. Use Local bridge mode.");
  if (commandType === "create_project") {
    const name = cleanText(payload.name);
    if (!name) throw new Error("Client name is required.");
    const existing = await findCloudProject(env, name, payload.site_domain);
    if (existing) {
      result.duplicate = true;
      result.project = existing;
      return result;
    }
    const inserted = await env.DB.prepare(
      "INSERT INTO projects (profile_id, name, client, site_domain, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(null, name, cleanText(payload.client) || null, cleanText(payload.site_domain) || null, cleanText(payload.notes) || null, now, now).run();
    const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(inserted.meta.last_row_id).first();
    changedTables.push("projects");
    const domain = domainFromUrl(payload.site_domain);
    if (domain) {
      await env.DB.prepare("INSERT INTO sites (project_id, domain, name, created_at) VALUES (?, ?, ?, ?)").bind(project.id, domain, name, now).run();
      changedTables.push("sites");
    }
    result.project = project;
    return result;
  }
  if (commandType === "add_keyword") {
    const projectId = Number(payload.project_id || 0);
    const keyword = cleanText(payload.keyword);
    if (!projectId || !keyword) throw new Error("Project and keyword are required.");
    const existing = await env.DB.prepare("SELECT * FROM keywords WHERE project_id = ? AND lower(keyword) = lower(?) ORDER BY id LIMIT 1").bind(projectId, keyword).first();
    if (existing) {
      result.duplicate = true;
      result.keyword = existing;
      return result;
    }
    const inserted = await env.DB.prepare(
      "INSERT INTO keywords (project_id, site_id, page_id, keyword, intent, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(projectId, payload.site_id || null, payload.page_id || null, keyword, cleanText(payload.intent) || null, cleanText(payload.priority) || null, now).run();
    result.keyword = await env.DB.prepare("SELECT * FROM keywords WHERE id = ?").bind(inserted.meta.last_row_id).first();
    changedTables.push("keywords");
    return result;
  }
  if (commandType === "create_content_plan") {
    const projectId = Number(payload.project_id || 0);
    const title = cleanText(payload.title);
    if (!projectId || !title) throw new Error("Project and content plan title are required.");
    const existing = await env.DB.prepare("SELECT * FROM content_plans WHERE project_id = ? AND lower(title) = lower(?) ORDER BY id LIMIT 1").bind(projectId, title).first();
    if (existing) {
      result.duplicate = true;
      result.content_plan = existing;
      return result;
    }
    const inserted = await env.DB.prepare(
      `INSERT INTO content_plans
       (project_id, site_id, page_id, keyword_id, title, content_type, intent, priority, status, due_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(projectId, payload.site_id || null, payload.page_id || null, payload.keyword_id || null, title, cleanText(payload.content_type) || null, cleanText(payload.intent) || null, cleanText(payload.priority) || null, cleanText(payload.status) || "planned", cleanText(payload.due_date) || null, cleanText(payload.notes) || null, now, now).run();
    result.content_plan = await env.DB.prepare("SELECT * FROM content_plans WHERE id = ?").bind(inserted.meta.last_row_id).first();
    changedTables.push("content_plans");
    return result;
  }
  if (commandType === "create_share_report") {
    const runId = Number(payload.run_id || 0);
    const level = cleanText(payload.level) || "medium";
    const title = cleanText(payload.title);
    if (!runId) throw new Error("Run is required for a report.");
    const existing = await env.DB.prepare(
      "SELECT * FROM share_reports WHERE run_id = ? AND level = ? AND lower(COALESCE(title, '')) = lower(?) AND revoked_at IS NULL ORDER BY id LIMIT 1"
    ).bind(runId, level, title).first();
    if (existing) {
      result.duplicate = true;
      result.report = existing;
      return result;
    }
    const token = crypto.randomUUID().replaceAll("-", "");
    const inserted = await env.DB.prepare(
      "INSERT INTO share_reports (token, run_id, level, title, notes, ranking_snapshot_id, entity_set_id, optimization_target_ids_json, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)"
    ).bind(token, runId, level, title || null, cleanText(payload.notes) || null, payload.ranking_snapshot_id || null, payload.entity_set_id || null, JSON.stringify(payload.optimization_target_ids || []), now).run();
    result.report = await env.DB.prepare("SELECT * FROM share_reports WHERE id = ?").bind(inserted.meta.last_row_id).first();
    result.artifact_note = "Cloud-created report metadata will get shareable artifacts after local report generation/upload sync.";
    changedTables.push("share_reports");
    return result;
  }
  if (commandType === "create_ranking_snapshot") {
    if (payload.dry_run) {
      result.dry_run = true;
      result.snapshot_request = {
        project_id: Number(payload.project_id || 0) || null,
        target: normalizeRankingTarget(payload.target),
        location_code: Number(payload.location_code || 2840),
        language_code: cleanText(payload.language_code) || "en",
        limit: Math.max(1, Math.min(Number(payload.limit || 1000), 1000)),
        include_subdomains: Boolean(payload.include_subdomains),
        execution_mode: "cloud"
      };
      return result;
    }
    const snapshot = await createCloudRankingSnapshot(payload, env);
    result.snapshot = snapshot.snapshot;
    result.meta = snapshot.meta;
    changedTables.push("ranking_snapshots", "ranking_snapshot_keywords", "ranking_snapshot_pages");
    return result;
  }
  if (commandType === "run_entity_lsi") {
    if (payload.dry_run) {
      const targets = Array.isArray(payload.targets) ? payload.targets : [];
      result.dry_run = true;
      result.entity_lsi_request = {
        project_id: Number(payload.project_id || 0),
        seed_keyword: cleanText(payload.seed_keyword),
        depth: clampDepth(payload.depth),
        target_count: targets.length,
        execution_mode: "cloud"
      };
      return result;
    }
    const entity = await createCloudEntityRuns(payload, env);
    result.batch = entity.batch;
    result.runs = entity.runs;
    result.batch_id = entity.batch?.id;
    changedTables.push("entity_lsi_batches", "entity_lsi_runs");
    return result;
  }
  throw new Error(`Cloud execution is not supported for ${commandType}.`);
}

async function handleArtifactUpload(request, env) {
  if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const token = String(payload.token || "").trim();
  const artifactType = String(payload.artifact_type || "").trim();
  const localId = String(payload.local_id || "").trim();
  if (!token || !localId || !["report_html", "source_xlsx"].includes(artifactType)) {
    return json({ ok: false, error: "Invalid artifact metadata" }, 400);
  }
  const r2Key = cleanArtifactPath(payload.r2_key);
  const contentType = String(payload.content_type || "application/octet-stream");
  const fileName = String(payload.file_name || r2Key.split("/").pop() || "artifact");
  const bytes = decodeBase64(payload.content_base64 || "");
  const uploadedAt = new Date().toISOString();
  const publicUrl = artifactPublicUrl(request, token, artifactType);
  await env.REPORTS.put(r2Key, bytes, {
    httpMetadata: { contentType },
    customMetadata: {
      local_id: localId,
      token,
      artifact_type: artifactType,
      sha256: String(payload.sha256 || "")
    }
  });
  await env.DB.prepare(
    `INSERT INTO report_artifacts
     (local_id, share_report_id, run_id, token, artifact_type, file_name, content_type, file_size, sha256, r2_key, public_url, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(local_id) DO UPDATE SET
       share_report_id=excluded.share_report_id,
       run_id=excluded.run_id,
       token=excluded.token,
       artifact_type=excluded.artifact_type,
       file_name=excluded.file_name,
       content_type=excluded.content_type,
       file_size=excluded.file_size,
       sha256=excluded.sha256,
       r2_key=excluded.r2_key,
       public_url=excluded.public_url,
       uploaded_at=excluded.uploaded_at`
  ).bind(
    localId,
    payload.share_report_id ?? null,
    payload.run_id ?? null,
    token,
    artifactType,
    fileName,
    contentType,
    Number(payload.file_size || bytes.byteLength || 0),
    String(payload.sha256 || ""),
    r2Key,
    publicUrl,
    uploadedAt
  ).run();
  await logAudit(request, env, "artifact_upload", "report_artifact", localId, {
    token,
    artifact_type: artifactType,
    file_name: fileName,
    file_size: Number(payload.file_size || bytes.byteLength || 0)
  }, "local-sync");
  return json({ ok: true, local_id: localId, artifact_type: artifactType, r2_key: r2Key, public_url: publicUrl, uploaded_at: uploadedAt });
}

async function artifactStatusData(env) {
  const rows = await env.DB.prepare(
    "SELECT artifact_type, COUNT(*) AS artifact_count, SUM(file_size) AS total_bytes, MAX(uploaded_at) AS last_uploaded_at FROM report_artifacts GROUP BY artifact_type ORDER BY artifact_type"
  ).all();
  return rows.results || [];
}

async function handleArtifactStatus(env) {
  return json({ ok: true, artifacts: await artifactStatusData(env) });
}

async function handleSyncPush(request, env) {
  if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const table = String(payload.table || "");
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const result = await upsertRows(env.DB, table, rows);
  await env.DB.prepare(
    "INSERT INTO sync_batches (table_name, row_count, source, received_at) VALUES (?, ?, ?, ?)"
  ).bind(table, result.rows, String(payload.source || "local"), new Date().toISOString()).run();
  await logAudit(request, env, "sync_push", table, "", { rows: result.rows, source: String(payload.source || "local") }, "local-sync");
  return json({ ok: true, ...result });
}

async function handleSyncExport(request, env) {
  if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const selected = (url.searchParams.get("tables") || "")
    .split(",")
    .map((table) => table.trim())
    .filter(Boolean);
  const tables = selected.length ? selected : ["projects", "sites", "keywords", "content_plans", "share_reports"];
  const limit = Math.min(Number(url.searchParams.get("limit") || 5000), 25000);
  const exported = [];
  for (const table of tables) {
    const columns = TABLE_COLUMNS[table];
    if (!columns) return json({ ok: false, error: `Unsupported table: ${table}` }, 400);
    const rows = await env.DB.prepare(`SELECT ${columns.join(", ")} FROM ${table} ORDER BY id LIMIT ?`).bind(limit).all();
    exported.push({ table, rows: rows.results || [] });
  }
  await logAudit(request, env, "sync_export", "tables", tables.join(","), { tables, limit }, "local-sync");
  return json({ ok: true, tables: exported, generated_at: new Date().toISOString() });
}

async function handleSecretsStatus(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const providers = secretStatusData(env);
  return json({
    ok: true,
    providers,
    missing: Object.entries(providers).filter(([, present]) => !present).map(([provider]) => provider),
    note: "Secrets are checked by presence only; values are never returned."
  });
}

function secretStatusData(env) {
  return {
    dataforseo: Boolean(env.DATAFORSEO_AUTH || (env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD)),
    openai: Boolean(env.OPENAI_API_KEY),
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    google: Boolean(env.GOOGLE_API_KEY),
    xai: Boolean(env.XAI_API_KEY),
    perplexity: Boolean(env.PERPLEXITY_API_KEY)
  };
}

async function sendLoginEmail(env, email, code) {
  if (!env.RESEND_API_KEY || !env.LOGIN_EMAIL_FROM) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: env.LOGIN_EMAIL_FROM,
      to: [email],
      subject: "On Page Optimization System login code",
      text: `Your On Page Optimization System login code is ${code}. It expires in 10 minutes.`
    })
  });
  return response.ok;
}

async function handleAuthRequest(request, env) {
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "Valid email required" }, 400);
  const user = await env.DB.prepare("SELECT * FROM cloud_users WHERE email = ? AND status = 'active'").bind(email).first();
  if (!user) {
    await logAudit(request, env, "login_code_denied", "cloud_user", email, {}, "auth");
    return json({ ok: true, email_sent: false, message: "If the account exists, a login code was sent." });
  }
  const code = randomCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const codeHash = await sha256Hex(`${email}:${code}`);
  await env.DB.prepare("INSERT INTO login_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(email, codeHash, expiresAt, now.toISOString()).run();
  const emailSent = await sendLoginEmail(env, email, code).catch(() => false);
  const revealCode = await hasAdminAccess(request, env);
  await logAudit(request, env, "login_code_requested", "cloud_user", user.id, { email_sent: emailSent }, email);
  return json({
    ok: true,
    email_sent: emailSent,
    message: emailSent ? "Login code sent." : "Email delivery is not configured yet. Admin-token callers receive a setup code.",
    dev_code: revealCode ? code : undefined
  });
}

async function handleAuthVerify(request, env) {
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || "").trim().toLowerCase();
  const code = String(payload.code || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^\d{6}$/.test(code)) return json({ ok: false, error: "Valid email and 6-digit code required" }, 400);
  const codeHash = await sha256Hex(`${email}:${code}`);
  const now = new Date().toISOString();
  const login = await env.DB.prepare(
    "SELECT * FROM login_codes WHERE email = ? AND code_hash = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1"
  ).bind(email, codeHash, now).first();
  if (!login) return json({ ok: false, error: "Invalid or expired login code" }, 401);
  const userRow = await env.DB.prepare("SELECT * FROM cloud_users WHERE email = ? AND status = 'active'").bind(email).first();
  if (!userRow) return json({ ok: false, error: "Account is not active" }, 403);
  const token = await randomToken();
  const sessionHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE login_codes SET used_at = ? WHERE id = ?").bind(now, login.id),
    env.DB.prepare("INSERT INTO cloud_sessions (user_id, session_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
      .bind(userRow.id, sessionHash, expiresAt, now, now),
    env.DB.prepare("UPDATE cloud_users SET last_login_at = ?, updated_at = ? WHERE id = ?").bind(now, now, userRow.id)
  ]);
  await logAudit(request, env, "login_success", "cloud_user", userRow.id, {}, email);
  return json({ ok: true, user: publicUser({ ...userRow, last_login_at: now }) }, 200, { "set-cookie": sessionCookie(token, 30 * 24 * 60 * 60) });
}

async function handleAuthMe(request, env) {
  const user = await currentUser(request, env);
  if (user) return json({ ok: true, user });
  if (requireAdminAuth(request, env) || requireSyncAuth(request, env)) return json({ ok: true, user: { email: "token-admin", role: "admin", status: "active" } });
  if (requireReadAuth(request, env)) return json({ ok: true, user: { email: "token-reader", role: "read", status: "active" } });
  return json({ ok: false, user: null }, 401);
}

async function handleAuthLogout(request, env) {
  const token = parseCookies(request).opos_session || "";
  if (token) await env.DB.prepare("DELETE FROM cloud_sessions WHERE session_hash = ?").bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

function normalizeToolPolicy(row) {
  return {
    tool_key: row.tool_key,
    cloud_enabled: Boolean(row.cloud_enabled),
    daily_limit: row.daily_limit == null ? null : Number(row.daily_limit),
    monthly_limit: row.monthly_limit == null ? null : Number(row.monthly_limit),
    per_client_daily_limit: row.per_client_daily_limit == null ? null : Number(row.per_client_daily_limit),
    updated_at: row.updated_at || null
  };
}

const DEFAULT_TOOL_POLICIES = {
  create_ranking_snapshot: { tool_key: "create_ranking_snapshot", cloud_enabled: true, daily_limit: 25, monthly_limit: 500, per_client_daily_limit: 10, updated_at: null },
  run_entity_lsi: { tool_key: "run_entity_lsi", cloud_enabled: true, daily_limit: 25, monthly_limit: 500, per_client_daily_limit: 10, updated_at: null }
};

async function toolPolicies(env) {
  const rows = await env.DB.prepare("SELECT * FROM tool_policies ORDER BY tool_key").all();
  const byKey = { ...DEFAULT_TOOL_POLICIES };
  for (const row of rows.results || []) byKey[row.tool_key] = normalizeToolPolicy(row);
  return Object.values(byKey);
}

async function adminData(env) {
  const [users, policies, usageToday, usageMonth] = await Promise.all([
    env.DB.prepare("SELECT * FROM cloud_users ORDER BY created_at DESC, id DESC LIMIT 100").all(),
    toolPolicies(env),
    env.DB.prepare("SELECT command_type, COUNT(*) AS runs FROM tool_usage WHERE created_at >= date('now') GROUP BY command_type").all(),
    env.DB.prepare("SELECT command_type, COUNT(*) AS runs FROM tool_usage WHERE created_at >= date('now', 'start of month') GROUP BY command_type").all()
  ]);
  return {
    users: (users.results || []).map(publicUser),
    tool_policies: policies,
    tool_usage_today: usageToday.results || [],
    tool_usage_month: usageMonth.results || [],
    secret_status: secretStatusData(env)
  };
}

async function handleAdminUsers(request, env) {
  if (!(await hasAdminAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method === "GET") return json({ ok: true, users: (await adminData(env)).users });
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "Valid email required" }, 400);
  const role = ["admin", "write", "read"].includes(String(payload.role || "").toLowerCase()) ? String(payload.role).toLowerCase() : "read";
  const status = ["active", "disabled"].includes(String(payload.status || "").toLowerCase()) ? String(payload.status).toLowerCase() : "active";
  const clientIds = Array.isArray(payload.client_ids) ? payload.client_ids.map((v) => Number(v)).filter(Boolean) : [];
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, status = excluded.status, client_ids_json = excluded.client_ids_json, updated_at = excluded.updated_at`
  ).bind(email, String(payload.name || "").trim(), role, status, JSON.stringify(clientIds), now, now).run();
  const user = await env.DB.prepare("SELECT * FROM cloud_users WHERE email = ?").bind(email).first();
  await logAudit(request, env, "user_upsert", "cloud_user", user.id, { role, status }, "admin");
  return json({ ok: true, user: publicUser(user) });
}

async function handleAdminToolPolicy(request, env) {
  if (!(await hasAdminAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method === "GET") return json({ ok: true, ...(await adminData(env)) });
  const payload = await request.json().catch(() => ({}));
  const toolKey = String(payload.tool_key || "").trim();
  if (!DEFAULT_TOOL_POLICIES[toolKey]) return json({ ok: false, error: "Unsupported tool policy" }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO tool_policies (tool_key, cloud_enabled, daily_limit, monthly_limit, per_client_daily_limit, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(tool_key) DO UPDATE SET cloud_enabled = excluded.cloud_enabled, daily_limit = excluded.daily_limit, monthly_limit = excluded.monthly_limit, per_client_daily_limit = excluded.per_client_daily_limit, updated_at = excluded.updated_at`
  ).bind(toolKey, payload.cloud_enabled === false ? 0 : 1, payload.daily_limit == null ? null : Number(payload.daily_limit), payload.monthly_limit == null ? null : Number(payload.monthly_limit), payload.per_client_daily_limit == null ? null : Number(payload.per_client_daily_limit), now).run();
  await logAudit(request, env, "tool_policy_update", "tool_policy", toolKey, payload, "admin");
  return json({ ok: true, ...(await adminData(env)) });
}

async function enforceToolPolicy(request, env, commandType, payload) {
  const defaults = DEFAULT_TOOL_POLICIES[commandType];
  if (!defaults || payload.dry_run) return;
  const policy = (await toolPolicies(env)).find((item) => item.tool_key === commandType) || defaults;
  const executionMode = String(payload.execution_mode || "local").toLowerCase();
  if (executionMode === "cloud" && !policy.cloud_enabled) throw new Error(`${commandType} is disabled for Cloudflare execution.`);
  const today = await env.DB.prepare("SELECT COUNT(*) AS count FROM tool_usage WHERE command_type = ? AND created_at >= date('now')").bind(commandType).first();
  if (policy.daily_limit != null && Number(today?.count || 0) >= Number(policy.daily_limit)) throw new Error(`${commandType} daily limit reached.`);
  const month = await env.DB.prepare("SELECT COUNT(*) AS count FROM tool_usage WHERE command_type = ? AND created_at >= date('now', 'start of month')").bind(commandType).first();
  if (policy.monthly_limit != null && Number(month?.count || 0) >= Number(policy.monthly_limit)) throw new Error(`${commandType} monthly limit reached.`);
  if (policy.per_client_daily_limit != null && payload.project_id) {
    const clientCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM tool_usage WHERE command_type = ? AND project_id = ? AND created_at >= date('now')").bind(commandType, Number(payload.project_id)).first();
    if (Number(clientCount?.count || 0) >= Number(policy.per_client_daily_limit)) throw new Error(`${commandType} client daily limit reached.`);
  }
}

async function recordToolUsage(request, env, commandType, payload) {
  if (!DEFAULT_TOOL_POLICIES[commandType] || payload.dry_run) return;
  const user = await currentUser(request, env);
  await env.DB.prepare("INSERT INTO tool_usage (user_id, project_id, command_type, execution_mode, units, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(user?.id || null, Number(payload.project_id || 0) || null, commandType, String(payload.execution_mode || "local"), 1, new Date().toISOString()).run();
}

async function createCommand(request, env) {
  const payload = await request.json();
  const commandType = String(payload.command_type || "").trim();
  if (!COMMAND_TYPES.has(commandType)) return json({ ok: false, error: "Unsupported command type" }, 400);
  const commandPayload = payload.payload && typeof payload.payload === "object" ? payload.payload : {};
  await assertCommandAccess(request, env, commandType, commandPayload);
  const executionMode = String(commandPayload.execution_mode || "local").trim().toLowerCase();
  if (commandType === "run_cora" && executionMode === "cloud") return json({ ok: false, error: "Cora is local-only. Use Local bridge mode." }, 400);
  await enforceToolPolicy(request, env, commandType, commandPayload);
  const commandKeyPayload = { ...commandPayload };
  delete commandKeyPayload.reviewed_at;
  let commandKey = String(payload.command_key || "").trim() || await sha256Hex(`${commandType}:${stableStringify(commandKeyPayload)}`);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM cloud_commands WHERE command_key = ?").bind(commandKey).first();
  if (existing && !payload.force_duplicate) {
    await logAudit(request, env, "command_duplicate", "cloud_command", existing.id, {
      command_type: commandType,
      status: existing.status
    }, String(payload.created_by || "cloud-dashboard"));
    return json({ ok: true, duplicate: true, command: normalizeCommand(existing) }, 200);
  }
  if (existing && payload.force_duplicate) {
    commandKey = await sha256Hex(`${commandKey}:${now}:${crypto.randomUUID()}`);
  }
  const initialStatus = executionMode === "cloud" ? "claimed" : "pending";
  const result = await env.DB.prepare(
    "INSERT INTO cloud_commands (command_key, command_type, payload_json, status, created_by, created_at, claimed_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(commandKey, commandType, JSON.stringify(commandPayload), initialStatus, String(payload.created_by || "cloud-dashboard"), now, executionMode === "cloud" ? now : null).run();
  await recordToolUsage(request, env, commandType, commandPayload);
  const command = await env.DB.prepare("SELECT * FROM cloud_commands WHERE id = ?").bind(result.meta.last_row_id).first();
  await logAudit(request, env, "command_created", "cloud_command", command?.id, {
    command_type: commandType,
    command_key: commandKey,
    execution_mode: executionMode
  }, String(payload.created_by || "cloud-dashboard"));
  if (executionMode === "cloud") {
    try {
      const cloudResult = await executeCloudCommand(commandType, commandPayload, env);
      await env.DB.prepare(
        "UPDATE cloud_commands SET status = 'complete', result_json = ?, error = NULL, completed_at = ? WHERE id = ?"
      ).bind(JSON.stringify(cloudResult), new Date().toISOString(), command.id).run();
      const completed = await env.DB.prepare("SELECT * FROM cloud_commands WHERE id = ?").bind(command.id).first();
      await logAudit(request, env, "command_completed_cloud", "cloud_command", command.id, {
        command_type: commandType,
        changed_tables: cloudResult.changed_tables || []
      }, String(payload.created_by || "cloud-dashboard"));
      return json({ ok: true, command: normalizeCommand(completed) }, 201);
    } catch (error) {
      await env.DB.prepare(
        "UPDATE cloud_commands SET status = 'failed', result_json = ?, error = ?, completed_at = ? WHERE id = ?"
      ).bind(JSON.stringify({ command_type: commandType, execution_mode: "cloud" }), error.message || String(error), new Date().toISOString(), command.id).run();
      const failed = await env.DB.prepare("SELECT * FROM cloud_commands WHERE id = ?").bind(command.id).first();
      return json({ ok: false, command: normalizeCommand(failed), error: error.message || String(error) }, 400);
    }
  }
  return json({ ok: true, command: normalizeCommand(command) }, 201);
}

function normalizeCommand(row) {
  if (!row) return null;
  let payload = {};
  let result = null;
  try { payload = JSON.parse(row.payload_json || "{}"); } catch (_err) { payload = {}; }
  try { result = row.result_json ? JSON.parse(row.result_json) : null; } catch (_err) { result = row.result_json; }
  if (result && typeof result === "object") {
    if (Array.isArray(result.runs)) {
      result.runs = result.runs.map((run) => ({
        id: run.id,
        project_id: run.project_id,
        batch_id: run.batch_id,
        provider: run.provider,
        model: run.model,
        status: run.status,
        summary: run.summary,
        error: run.error,
        created_at: run.created_at,
        completed_at: run.completed_at
      }));
    }
    if (result.snapshot && typeof result.snapshot === "object") {
      const { overview_json, errors_json, ...snapshot } = result.snapshot;
      result.snapshot = snapshot;
    }
  }
  return { ...row, payload, result, payload_json: undefined, result_json: undefined };
}

async function listCommands(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 250);
  let rows;
  if (status) {
    rows = await env.DB.prepare("SELECT * FROM cloud_commands WHERE status = ? ORDER BY created_at ASC, id ASC LIMIT ?").bind(status, limit).all();
  } else {
    rows = await env.DB.prepare("SELECT * FROM cloud_commands ORDER BY created_at DESC, id DESC LIMIT ?").bind(limit).all();
  }
  const commands = (rows.results || []).map(normalizeCommand).map((command) => ({ ...command, project_id: command.payload?.project_id || command.result?.project?.id || command.result?.snapshot?.project_id || null }));
  return json({ ok: true, commands: filterScope(commands, scope) });
}

async function updateCommand(request, env, id) {
  const admin = await hasAdminAccess(request, env);
  if (!requireSyncAuth(request, env) && !admin) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const status = String(payload.status || "").trim();
  if (!["pending", "claimed", "complete", "failed"].includes(status)) return json({ ok: false, error: "Unsupported command status" }, 400);
  if (status === "pending" && !admin) return json({ ok: false, error: "Admin token required to reset commands" }, 403);
  const now = new Date().toISOString();
  if (status === "claimed") {
    await env.DB.prepare("UPDATE cloud_commands SET status = 'claimed', claimed_at = COALESCE(claimed_at, ?) WHERE id = ?").bind(now, id).run();
  } else if (status === "pending") {
    await env.DB.prepare("UPDATE cloud_commands SET status = 'pending', claimed_at = NULL, completed_at = NULL, result_json = NULL, error = NULL WHERE id = ?").bind(id).run();
  } else if (status === "complete" || status === "failed") {
    await env.DB.prepare(
      "UPDATE cloud_commands SET status = ?, result_json = ?, error = ?, completed_at = ? WHERE id = ?"
    ).bind(status, payload.result ? JSON.stringify(payload.result) : null, payload.error ? String(payload.error).slice(0, 2000) : null, now, id).run();
  }
  const row = await env.DB.prepare("SELECT * FROM cloud_commands WHERE id = ?").bind(id).first();
  await logAudit(request, env, `command_${status}`, "cloud_command", id, {
    command_type: row?.command_type,
    error: row?.error || ""
  }, requireSyncAuth(request, env) ? "local-bridge" : "cloud-dashboard");
  return json({ ok: true, command: normalizeCommand(row) });
}

async function bridgeHeartbeat(request, env) {
  if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const bridgeId = String(payload.bridge_id || "local-dashboard").trim();
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM bridge_heartbeats WHERE bridge_id = ?").bind(bridgeId).first();
  await env.DB.prepare(
    `INSERT INTO bridge_heartbeats
     (bridge_id, status, version, allow_cora, allow_paid_tools, poll_interval, last_poll_at, last_result_json, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(bridge_id) DO UPDATE SET
       status=excluded.status,
       version=excluded.version,
       allow_cora=excluded.allow_cora,
       allow_paid_tools=excluded.allow_paid_tools,
       poll_interval=excluded.poll_interval,
       last_poll_at=excluded.last_poll_at,
       last_result_json=excluded.last_result_json,
       last_seen_at=excluded.last_seen_at`
  ).bind(
    bridgeId,
    String(payload.status || "online"),
    String(payload.version || ""),
    payload.allow_cora ? 1 : 0,
    payload.allow_paid_tools ? 1 : 0,
    Number(payload.poll_interval || 0),
    payload.last_poll_at || now,
    payload.last_result ? JSON.stringify(payload.last_result) : null,
    now
  ).run();
  const row = await env.DB.prepare("SELECT * FROM bridge_heartbeats WHERE bridge_id = ?").bind(bridgeId).first();
  if (!existing || String(existing.status || "") !== String(payload.status || "online") || Boolean(existing.allow_cora) !== Boolean(payload.allow_cora) || Boolean(existing.allow_paid_tools) !== Boolean(payload.allow_paid_tools)) {
    await logAudit(request, env, "bridge_status", "bridge", bridgeId, {
      status: String(payload.status || "online"),
      allow_cora: Boolean(payload.allow_cora),
      allow_paid_tools: Boolean(payload.allow_paid_tools),
      poll_interval: Number(payload.poll_interval || 0)
    }, "local-bridge");
  }
  return json({ ok: true, bridge: normalizeBridge(row) });
}

function normalizeBridge(row) {
  if (!row) return null;
  let lastResult = null;
  try { lastResult = row.last_result_json ? JSON.parse(row.last_result_json) : null; } catch (_err) { lastResult = row.last_result_json; }
  return { ...row, allow_cora: Boolean(row.allow_cora), allow_paid_tools: Boolean(row.allow_paid_tools), online: Date.now() - Date.parse(row.last_seen_at || 0) < 120000, last_result: lastResult, last_result_json: undefined };
}

async function bridgeStatus(env) {
  const rows = await env.DB.prepare("SELECT * FROM bridge_heartbeats ORDER BY last_seen_at DESC LIMIT 20").all();
  return (rows.results || []).map(normalizeBridge);
}

function normalizeAuditEvent(row) {
  if (!row) return null;
  let metadata = {};
  try { metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {}; } catch (_err) { metadata = {}; }
  return { ...row, metadata, metadata_json: undefined };
}

async function recentAuditEvents(env, limit = 100) {
  const rows = await env.DB.prepare(
    "SELECT * FROM audit_events ORDER BY created_at DESC, id DESC LIMIT ?"
  ).bind(Math.min(Number(limit || 100), 250)).all();
  return (rows.results || []).map(normalizeAuditEvent);
}

async function syncStatusData(env) {
  const rows = await env.DB.prepare(
    "SELECT table_name, SUM(row_count) AS rows_received, MAX(received_at) AS last_received_at FROM sync_batches GROUP BY table_name ORDER BY table_name"
  ).all();
  return { tables: rows.results || [], artifacts: await artifactStatusData(env) };
}

async function handleStatus(env) {
  return json({ ok: true, ...(await syncStatusData(env)) });
}

async function countTable(env, table) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
  return Number(row?.count || 0);
}

async function countProjectTable(env, table, scope, column = "project_id") {
  if (!scope?.scoped) return await countTable(env, table);
  const clause = scopeClause(scope, column);
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${clause.sql}`).bind(...clause.binds).first();
  return Number(row?.count || 0);
}

async function countReportRows(env, scope) {
  if (!scope?.scoped) return await countTable(env, "share_reports");
  const clause = scopeClause(scope, "r.project_id");
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM share_reports sr
     LEFT JOIN runs r ON r.id = sr.run_id
     WHERE sr.revoked_at IS NULL AND ${clause.sql}`
  ).bind(...clause.binds).first();
  return Number(row?.count || 0);
}

async function handleDashboardData(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const { user, admin } = scope;
  const [profiles, projects, keywords, runs, reports, rankingSnapshots, targets, pendingCommands, bridges, artifacts, sync] = await Promise.all([
    countTable(env, "profiles"),
    countProjectTable(env, "projects", scope, "id"),
    countProjectTable(env, "keywords", scope),
    countProjectTable(env, "runs", scope),
    countReportRows(env, scope),
    countProjectTable(env, "ranking_snapshots", scope),
    countProjectTable(env, "ranking_optimization_targets", scope),
    env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_commands WHERE status IN ('pending', 'claimed')").first().then((row) => Number(row?.count || 0)),
    bridgeStatus(env),
    artifactStatusData(env),
    syncStatusData(env)
  ]);
  const reportScope = scopeClause(scope, "r.project_id");
  const reportWhere = `sr.revoked_at IS NULL${reportScope.sql ? ` AND ${reportScope.sql}` : ""}`;
  const recentReports = await env.DB.prepare(
    `SELECT sr.id, sr.token, sr.run_id, sr.level, sr.title, sr.notes, sr.created_at,
            r.keyword, r.target_url, r.target_domain, r.imported_at, r.file_name,
            p.id AS project_id, p.name AS project_name, p.client AS client_name, p.site_domain,
            a.artifact_count, a.total_bytes, a.last_uploaded_at, a.cloud_url
     FROM share_reports sr
     LEFT JOIN runs r ON r.id = sr.run_id
     LEFT JOIN projects p ON p.id = r.project_id
     LEFT JOIN (
       SELECT token,
              COUNT(*) AS artifact_count,
              SUM(file_size) AS total_bytes,
              MAX(uploaded_at) AS last_uploaded_at,
              MAX(CASE WHEN artifact_type = 'report_html' THEN public_url END) AS cloud_url
       FROM report_artifacts
       GROUP BY token
     ) a ON a.token = sr.token
     WHERE ${reportWhere}
     ORDER BY sr.created_at DESC, sr.id DESC
     LIMIT 150`
  ).bind(...reportScope.binds).all();
  const clientScope = scopeClause(scope, "p.id");
  const clientWhere = clientScope.sql ? `WHERE ${clientScope.sql}` : "";
  const clientRows = await env.DB.prepare(
    `SELECT p.id, p.name, p.client, p.site_domain,
            (SELECT COUNT(*) FROM keywords k WHERE k.project_id = p.id) AS keyword_count,
            (SELECT COUNT(*) FROM runs r WHERE r.project_id = p.id) AS run_count,
            (SELECT COUNT(*) FROM ranking_snapshots rs WHERE rs.project_id = p.id) AS snapshot_count,
            (SELECT COUNT(*) FROM ranking_optimization_targets rot WHERE rot.project_id = p.id) AS target_count
     FROM projects p
     ${clientWhere}
     ORDER BY p.updated_at DESC, p.id DESC
     LIMIT 50`
  ).bind(...clientScope.binds).all();
  const adminBundle = admin ? await adminData(env) : null;
  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    worker_url: new URL(request.url).origin,
    user: user || (admin ? { email: "token-admin", role: "admin", status: "active" } : { email: "token-reader", role: "read", status: "active" }),
    is_admin: admin,
    counts: { profiles, projects, keywords, runs, reports, ranking_snapshots: rankingSnapshots, ranking_optimization_targets: targets, pending_commands: pendingCommands },
    artifacts,
    sync,
    bridges,
    admin: adminBundle,
    reports: recentReports.results || [],
    clients: clientRows.results || []
  });
}

async function handleDashboardMirrorData(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const overview = await handleDashboardData(request, env).then((response) => response.json());
  const [runs, jobs, snapshots, targets, entityBatches, entityRuns, entitySets, contentPlans, commands, audits] = await Promise.all([
    env.DB.prepare(
      `SELECT r.id, r.keyword, r.target_url, r.target_domain, r.imported_at, r.file_name, r.status,
              p.name AS project_name,
              (SELECT COUNT(*) FROM recommendations rec WHERE rec.run_id = r.id) AS recommendation_count,
              (SELECT COUNT(*) FROM lsi_keywords lsi WHERE lsi.run_id = r.id) AS lsi_count,
              (SELECT COUNT(*) FROM serp_results sr WHERE sr.run_id = r.id) AS serp_count
       FROM runs r
       LEFT JOIN projects p ON p.id = r.project_id
       ORDER BY r.imported_at DESC, r.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT j.id, j.keyword, j.target_url, j.target_domain, j.cora_profile, j.tool, j.status,
              j.status_message, j.started_at, j.updated_at, j.completed_at, j.last_activity_at,
              p.name AS project_name
       FROM managed_jobs j
       LEFT JOIN projects p ON p.id = j.project_id
       ORDER BY j.started_at DESC, j.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT rs.id, rs.project_id, rs.target, rs.location_code, rs.language_code, rs.limit_value,
              rs.include_subdomains, rs.source, rs.freshness, rs.created_at,
              p.name AS project_name,
              (SELECT COUNT(*) FROM ranking_snapshot_keywords rsk WHERE rsk.snapshot_id = rs.id) AS keyword_count,
              (SELECT COUNT(*) FROM ranking_snapshot_pages rsp WHERE rsp.snapshot_id = rs.id) AS page_count,
              (SELECT COUNT(*) FROM ranking_optimization_targets rot WHERE rot.snapshot_id = rs.id) AS target_count
       FROM ranking_snapshots rs
       LEFT JOIN projects p ON p.id = rs.project_id
       ORDER BY rs.created_at DESC, rs.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT rot.id, rot.snapshot_id, rot.project_id, rot.url, rot.keyword, rot.best_position,
              rot.ranking_keywords, rot.opportunity_count, rot.total_search_volume, rot.estimated_traffic,
              rot.priority_type, rot.opportunity_score, rot.recommended_action, rot.status, rot.updated_at,
              p.name AS project_name
       FROM ranking_optimization_targets rot
       LEFT JOIN projects p ON p.id = rot.project_id
       ORDER BY rot.opportunity_score DESC, rot.updated_at DESC, rot.id DESC
       LIMIT 150`
    ).all(),
    env.DB.prepare(
      `SELECT b.id, b.project_id, b.seed_keyword, b.depth, b.target_count, b.completed_count,
              b.failed_count, b.status, b.created_at, b.updated_at, p.name AS project_name
       FROM entity_lsi_batches b
       LEFT JOIN projects p ON p.id = b.project_id
       ORDER BY b.created_at DESC, b.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT r.id, r.project_id, r.batch_id, r.seed_keyword, r.depth, r.provider, r.model,
              r.status, r.summary, r.error, r.created_at, r.completed_at, p.name AS project_name
       FROM entity_lsi_runs r
       LEFT JOIN projects p ON p.id = r.project_id
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 150`
    ).all(),
    env.DB.prepare(
      `SELECT es.id, es.project_id, es.source_batch_id, es.name, es.notes, es.created_at, es.updated_at,
              p.name AS project_name,
              (SELECT COUNT(*) FROM entity_set_terms est WHERE est.set_id = es.id) AS term_count
       FROM entity_sets es
       LEFT JOIN projects p ON p.id = es.project_id
       ORDER BY es.updated_at DESC, es.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT cp.id, cp.project_id, cp.title, cp.content_type, cp.intent, cp.priority, cp.status,
              cp.due_date, cp.notes, cp.created_at, cp.updated_at, p.name AS project_name, k.keyword
       FROM content_plans cp
       LEFT JOIN projects p ON p.id = cp.project_id
       LEFT JOIN keywords k ON k.id = cp.keyword_id
       ORDER BY cp.updated_at DESC, cp.id DESC
       LIMIT 150`
    ).all(),
    env.DB.prepare("SELECT * FROM cloud_commands ORDER BY created_at DESC, id DESC LIMIT 100").all(),
    recentAuditEvents(env, 120)
  ]);
  const normalizedCommands = (commands.results || []).map(normalizeCommand);
  return json({
    ...overview,
    runs: filterScope(runs.results || [], scope),
    jobs: filterScope(jobs.results || [], scope),
    snapshots: filterScope(snapshots.results || [], scope),
    targets: filterScope(targets.results || [], scope),
    entity_batches: filterScope(entityBatches.results || [], scope),
    entity_runs: filterScope(entityRuns.results || [], scope),
    entity_sets: filterScope(entitySets.results || [], scope),
    content_plans: filterScope(contentPlans.results || [], scope),
    commands: filterScope(normalizedCommands.map((command) => ({ ...command, project_id: command.payload?.project_id || command.result?.project?.id || command.result?.snapshot?.project_id || null })), scope),
    audit_events: scope.scoped ? [] : audits
  });
}

function parseJsonField(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback; } catch (_err) { return fallback; }
}

async function handleRunDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const run = await env.DB.prepare(
    `SELECT r.*, p.name AS project_name
     FROM runs r
     LEFT JOIN projects p ON p.id = r.project_id
     WHERE r.id = ?`
  ).bind(id).first();
  if (!run) return json({ ok: false, error: "Run not found" }, 404);
  await assertProjectAccess(request, env, run.project_id);
  const [serp, recommendations, lsi, sheets] = await Promise.all([
    env.DB.prepare("SELECT * FROM serp_results WHERE run_id = ? ORDER BY rank ASC, id ASC LIMIT 200").bind(id).all(),
    env.DB.prepare("SELECT * FROM recommendations WHERE run_id = ? ORDER BY percent DESC, id ASC LIMIT 250").bind(id).all(),
    env.DB.prepare("SELECT * FROM lsi_keywords WHERE run_id = ? ORDER BY best_of_both DESC, id ASC LIMIT 250").bind(id).all(),
    env.DB.prepare(
      `SELECT sheet,
              SUM(sheet_count) AS sheet_rows,
              SUM(workbook_count) AS workbook_rows,
              SUM(sheet_count + workbook_count) AS row_count
       FROM (
         SELECT sheet, COUNT(*) AS sheet_count, 0 AS workbook_count FROM sheet_rows WHERE run_id = ? GROUP BY sheet
         UNION ALL
         SELECT sheet, 0 AS sheet_count, COUNT(*) AS workbook_count FROM workbook_rows WHERE run_id = ? GROUP BY sheet
       )
       GROUP BY sheet
       ORDER BY sheet
       LIMIT 80`
    ).bind(id, id).all()
  ]);
  await logAudit(request, env, "run_detail_view", "run", id, { keyword: run.keyword || "" }, "cloud-dashboard");
  return json({
    ok: true,
    run,
    serp_results: serp.results || [],
    recommendations: recommendations.results || [],
    lsi_keywords: lsi.results || [],
    sheets: sheets.results || []
  });
}

async function handleRunSheetRows(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const sheet = String(url.searchParams.get("sheet") || "").trim();
  if (!sheet) return json({ ok: false, error: "Sheet is required" }, 400);
  const run = await env.DB.prepare("SELECT id, project_id, keyword, target_domain, target_url FROM runs WHERE id = ?").bind(id).first();
  if (!run) return json({ ok: false, error: "Run not found" }, 404);
  await assertProjectAccess(request, env, run.project_id);
  const counts = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM sheet_rows WHERE run_id = ? AND sheet = ?").bind(id, sheet).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM workbook_rows WHERE run_id = ? AND sheet = ?").bind(id, sheet).first()
  ]);
  const requestedSource = String(url.searchParams.get("source") || "").trim();
  const sheetCount = Number(counts[0]?.count || 0);
  const workbookCount = Number(counts[1]?.count || 0);
  const source = requestedSource === "workbook_rows" || requestedSource === "sheet_rows"
    ? requestedSource
    : sheetCount ? "sheet_rows" : "workbook_rows";
  const table = source === "workbook_rows" ? "workbook_rows" : "sheet_rows";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 250), 1), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const rows = await env.DB.prepare(
    `SELECT id, row_index, row_json FROM ${table} WHERE run_id = ? AND sheet = ? ORDER BY row_index ASC, id ASC LIMIT ? OFFSET ?`
  ).bind(id, sheet, limit, offset).all();
  await logAudit(request, env, "run_sheet_view", "run", id, { sheet, source }, "cloud-dashboard");
  return json({
    ok: true,
    run,
    sheet,
    source,
    counts: { sheet_rows: sheetCount, workbook_rows: workbookCount },
    limit,
    offset,
    rows: (rows.results || []).map((row) => ({ ...row, values: parseJsonField(row.row_json, row.row_json), row_json: undefined }))
  });
}

async function handleRankingSnapshotDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const snapshot = await env.DB.prepare(
    `SELECT rs.*, p.name AS project_name
     FROM ranking_snapshots rs
     LEFT JOIN projects p ON p.id = rs.project_id
     WHERE rs.id = ?`
  ).bind(id).first();
  if (!snapshot) return json({ ok: false, error: "Ranking snapshot not found" }, 404);
  await assertProjectAccess(request, env, snapshot.project_id);
  const [keywords, pages, targets] = await Promise.all([
    env.DB.prepare("SELECT * FROM ranking_snapshot_keywords WHERE snapshot_id = ? ORDER BY position ASC, search_volume DESC LIMIT 500").bind(id).all(),
    env.DB.prepare("SELECT * FROM ranking_snapshot_pages WHERE snapshot_id = ? ORDER BY organic_traffic DESC, organic_keywords DESC LIMIT 250").bind(id).all(),
    env.DB.prepare("SELECT * FROM ranking_optimization_targets WHERE snapshot_id = ? ORDER BY opportunity_score DESC, id ASC LIMIT 250").bind(id).all()
  ]);
  await logAudit(request, env, "ranking_snapshot_detail_view", "ranking_snapshot", id, { target: snapshot.target || "" }, "cloud-dashboard");
  return json({
    ok: true,
    snapshot: {
      ...snapshot,
      overview: parseJsonField(snapshot.overview_json, {}),
      errors: parseJsonField(snapshot.errors_json, [])
    },
    keywords: keywords.results || [],
    pages: pages.results || [],
    targets: targets.results || []
  });
}

async function handleEntitySetDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const set = await env.DB.prepare(
    `SELECT es.*, p.name AS project_name
     FROM entity_sets es
     LEFT JOIN projects p ON p.id = es.project_id
     WHERE es.id = ?`
  ).bind(id).first();
  if (!set) return json({ ok: false, error: "Entity set not found" }, 404);
  await assertProjectAccess(request, env, set.project_id);
  const terms = await env.DB.prepare(
    "SELECT * FROM entity_set_terms WHERE set_id = ? ORDER BY source_count DESC, type ASC, term ASC LIMIT 500"
  ).bind(id).all();
  await logAudit(request, env, "entity_set_detail_view", "entity_set", id, { name: set.name || "" }, "cloud-dashboard");
  return json({
    ok: true,
    entity_set: set,
    terms: (terms.results || []).map((term) => ({ ...term, sources: parseJsonField(term.sources_json, []) }))
  });
}

async function handleEntityRunDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const run = await env.DB.prepare(
    `SELECT r.*, p.name AS project_name
     FROM entity_lsi_runs r
     LEFT JOIN projects p ON p.id = r.project_id
     WHERE r.id = ?`
  ).bind(id).first();
  if (!run) return json({ ok: false, error: "Entity Explorer run not found" }, 404);
  await assertProjectAccess(request, env, run.project_id);
  await logAudit(request, env, "entity_run_detail_view", "entity_lsi_run", id, {
    seed_keyword: run.seed_keyword || "",
    provider: run.provider || "",
    model: run.model || ""
  }, "cloud-dashboard");
  return json({
    ok: true,
    entity_run: {
      ...run,
      entities: parseJsonField(run.entities_json, []),
      lsi_keywords: parseJsonField(run.lsi_keywords_json, []),
      related_keywords: parseJsonField(run.related_keywords_json, []),
      questions: parseJsonField(run.questions_json, []),
      topics: parseJsonField(run.topics_json, []),
      entities_json: undefined,
      lsi_keywords_json: undefined,
      related_keywords_json: undefined,
      questions_json: undefined,
      topics_json: undefined
    }
  });
}

async function handleClientDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  await assertProjectAccess(request, env, id);
  const client = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!client) return json({ ok: false, error: "Client not found" }, 404);
  const [keywords, runs, jobs, snapshots, targets, reports, plans, entityBatches, entityRuns, entitySets] = await Promise.all([
    env.DB.prepare("SELECT * FROM keywords WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 250").bind(id).all(),
    env.DB.prepare("SELECT * FROM runs WHERE project_id = ? ORDER BY imported_at DESC, id DESC LIMIT 150").bind(id).all(),
    env.DB.prepare("SELECT * FROM managed_jobs WHERE project_id = ? ORDER BY updated_at DESC, id DESC LIMIT 150").bind(id).all(),
    env.DB.prepare("SELECT * FROM ranking_snapshots WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").bind(id).all(),
    env.DB.prepare("SELECT * FROM ranking_optimization_targets WHERE project_id = ? ORDER BY opportunity_score DESC, id DESC LIMIT 250").bind(id).all(),
    env.DB.prepare(
      `SELECT sr.id, sr.token, sr.level, sr.title, sr.created_at, sr.revoked_at,
              r.keyword, r.target_url, r.target_domain,
              a.artifact_count, a.total_bytes, a.last_uploaded_at
       FROM share_reports sr
       JOIN runs r ON r.id = sr.run_id
       LEFT JOIN (
         SELECT token, COUNT(*) AS artifact_count, SUM(file_size) AS total_bytes, MAX(uploaded_at) AS last_uploaded_at
         FROM report_artifacts
         GROUP BY token
       ) a ON a.token = sr.token
       WHERE r.project_id = ? AND sr.revoked_at IS NULL
       ORDER BY sr.created_at DESC, sr.id DESC
       LIMIT 150`
    ).bind(id).all(),
    env.DB.prepare(
      `SELECT cp.*, k.keyword
       FROM content_plans cp
       LEFT JOIN keywords k ON k.id = cp.keyword_id
       WHERE cp.project_id = ?
       ORDER BY cp.updated_at DESC, cp.id DESC
       LIMIT 150`
    ).bind(id).all(),
    env.DB.prepare("SELECT * FROM entity_lsi_batches WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").bind(id).all(),
    env.DB.prepare("SELECT * FROM entity_lsi_runs WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 150").bind(id).all(),
    env.DB.prepare(
      `SELECT es.*, (SELECT COUNT(*) FROM entity_set_terms est WHERE est.set_id = es.id) AS term_count
       FROM entity_sets es
       WHERE es.project_id = ?
       ORDER BY es.updated_at DESC, es.id DESC
       LIMIT 100`
    ).bind(id).all()
  ]);
  await logAudit(request, env, "client_detail_view", "project", id, { name: client.name || "" }, "cloud-dashboard");
  return json({
    ok: true,
    client,
    keywords: keywords.results || [],
    runs: runs.results || [],
    jobs: jobs.results || [],
    snapshots: snapshots.results || [],
    targets: targets.results || [],
    reports: reports.results || [],
    content_plans: plans.results || [],
    entity_batches: entityBatches.results || [],
    entity_runs: entityRuns.results || [],
    entity_sets: entitySets.results || []
  });
}

function cloudDashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>On Page Optimization System</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0d1117;
      --panel: #151b23;
      --panel-soft: #1d2630;
      --line: #303b47;
      --text: #edf2f7;
      --muted: #9aa8b8;
      --accent: #4db6ac;
      --accent-strong: #6ee7dc;
      --danger: #ff7b72;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 Inter, Segoe UI, Arial, sans-serif; }
    header { border-bottom: 1px solid var(--line); background: #111821; padding: 18px 22px; }
    header h1 { margin: 0; font-size: 22px; letter-spacing: 0; }
    header p { margin: 4px 0 0; color: var(--muted); }
    main { padding: 18px 22px 32px; max-width: 1400px; margin: 0 auto; }
    .grid { display: grid; gap: 12px; }
    .cards { grid-template-columns: repeat(4, minmax(140px, 1fr)); margin-bottom: 16px; }
    .card, section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
    .card { padding: 14px; }
    .card strong { display: block; font-size: 26px; }
    .card span, .muted { color: var(--muted); }
    .sections { grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr); align-items: start; }
    section { overflow: hidden; }
    .section-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 14px 14px 10px; border-bottom: 1px solid var(--line); }
    h2 { font-size: 16px; margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-size: 12px; font-weight: 600; background: var(--panel-soft); }
    td a { color: var(--accent-strong); text-decoration: none; }
    td a:hover { text-decoration: underline; }
    .pill { display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 2px 7px; color: var(--muted); font-size: 12px; }
    .ok { color: var(--accent-strong); }
    .warn { color: var(--danger); }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
    button { background: var(--accent); border: 0; border-radius: 6px; color: #061312; cursor: pointer; font-weight: 700; padding: 8px 10px; }
    button.secondary { background: var(--panel-soft); color: var(--accent-strong); border: 1px solid var(--line); }
    .status-list { padding: 12px; display: grid; gap: 8px; }
    .status-row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
    .status-row:last-child { border-bottom: 0; padding-bottom: 0; }
    .empty { padding: 18px; color: var(--muted); }
    @media (max-width: 900px) { .cards, .sections { grid-template-columns: 1fr; } th:nth-child(3), td:nth-child(3) { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>On Page Optimization System</h1>
    <p>Cloud dashboard backed by Cloudflare D1 and R2. Cora desktop automation still runs on the local Windows machine.</p>
  </header>
  <main>
    <div id="app"><div class="empty">Loading cloud dashboard...</div></div>
  </main>
  <script>
    const fmtNum = (value) => Number(value || 0).toLocaleString();
    const fmtDate = (value) => value ? new Date(value).toLocaleString() : "";
    const fmtBytes = (value) => {
      let size = Number(value || 0);
      const units = ["B", "KB", "MB", "GB"];
      let i = 0;
      while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
      return size.toLocaleString(undefined, { maximumFractionDigits: i ? 1 : 0 }) + " " + units[i];
    };
    const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const reportUrl = (token) => "/share/report/" + encodeURIComponent(token);
    const downloadUrl = (token) => reportUrl(token) + "/download";
    function render(data) {
      const counts = data.counts || {};
      const artifactBytes = (data.artifacts || []).reduce((sum, row) => sum + Number(row.total_bytes || 0), 0);
      const artifactFiles = (data.artifacts || []).reduce((sum, row) => sum + Number(row.artifact_count || 0), 0);
      const lastSync = (data.sync?.tables || []).map((row) => row.last_received_at).filter(Boolean).sort().pop();
      const cards = [
        ["Clients", counts.projects],
        ["Keywords", counts.keywords],
        ["Cora Runs", counts.runs],
        ["Reports", counts.reports],
        ["Ranking Snapshots", counts.ranking_snapshots],
      ["Optimization Targets", counts.ranking_optimization_targets],
        ["Pending Commands", counts.pending_commands],
        ["Cloud Files", artifactFiles],
        ["R2 Storage", fmtBytes(artifactBytes)]
      ].map(([label, value]) => '<div class="card"><strong>' + esc(typeof value === "number" ? fmtNum(value) : value) + '</strong><span>' + esc(label) + '</span></div>').join("");
      const reports = (data.reports || []).map((report) => '<tr>'
        + '<td><strong>' + esc(report.title || report.keyword || "Cora Report") + '</strong><br><span class="muted">' + esc(report.project_name || "") + '</span></td>'
        + '<td>' + esc(report.level || "") + '</td>'
        + '<td>' + esc(fmtDate(report.created_at)) + '</td>'
        + '<td><span class="pill">' + esc(fmtNum(report.artifact_count || 0)) + ' files</span><br><span class="muted">' + esc(fmtBytes(report.total_bytes || 0)) + '</span></td>'
        + '<td><a href="' + reportUrl(report.token) + '" target="_blank" rel="noopener">Open</a><br><a href="' + downloadUrl(report.token) + '">XLSX</a></td>'
        + '</tr>').join("");
      const clients = (data.clients || []).map((client) => '<tr>'
        + '<td><strong>' + esc(client.name || "") + '</strong><br><span class="muted">' + esc(client.site_domain || client.client || "") + '</span></td>'
        + '<td>' + esc(fmtNum(client.keyword_count)) + '</td>'
        + '<td>' + esc(fmtNum(client.run_count)) + '</td>'
        + '<td>' + esc(fmtNum(client.snapshot_count)) + '</td>'
        + '<td>' + esc(fmtNum(client.target_count)) + '</td>'
        + '</tr>').join("");
      const syncRows = (data.sync?.tables || []).slice(-12).map((row) => '<div class="status-row"><span>' + esc(row.table_name) + '</span><strong>' + esc(fmtNum(row.rows_received)) + '</strong></div>').join("");
      const artifactRows = (data.artifacts || []).map((row) => '<div class="status-row"><span>' + esc(row.artifact_type) + '</span><strong>' + esc(fmtNum(row.artifact_count)) + ' / ' + esc(fmtBytes(row.total_bytes)) + '</strong></div>').join("");
      document.getElementById("app").innerHTML = '<div class="grid cards">' + cards + '</div>'
        + '<div class="grid sections">'
        + '<section><div class="section-head"><div><h2>Cloud Cora Reports</h2><div class="muted">Synced customer report pages and source XLSX files.</div></div><div class="toolbar"><button onclick="location.reload()">Refresh</button></div></div>'
        + (reports ? '<table><thead><tr><th>Report</th><th>Level</th><th>Created</th><th>Files</th><th></th></tr></thead><tbody>' + reports + '</tbody></table>' : '<div class="empty">No cloud reports synced yet.</div>') + '</section>'
        + '<section><div class="section-head"><div><h2>Production Status</h2><div class="muted">Last data sync: ' + esc(fmtDate(lastSync) || "Never") + '</div></div><span class="pill ok">Live</span></div>'
        + '<div class="status-list">' + (artifactRows || '<div class="muted">No artifacts yet.</div>') + '</div>'
        + '<div class="section-head"><h2>Recent Sync Tables</h2></div><div class="status-list">' + (syncRows || '<div class="muted">No sync batches yet.</div>') + '</div></section>'
        + '<section><div class="section-head"><h2>Clients</h2></div>'
        + (clients ? '<table><thead><tr><th>Client</th><th>Keywords</th><th>Runs</th><th>Snapshots</th><th>Targets</th></tr></thead><tbody>' + clients + '</tbody></table>' : '<div class="empty">No clients synced yet.</div>') + '</section>'
        + '</div>';
    }
    fetch("/api/dashboard/data").then((r) => r.json()).then(render).catch((error) => {
      document.getElementById("app").innerHTML = '<div class="empty warn">Failed to load cloud dashboard: ' + esc(error.message || error) + '</div>';
    });
  </script>
</body>
</html>`;
}

function cloudMirrorHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>On Page Optimization System Dashboard</title>
  <style>
    :root { color-scheme: dark; --bg:#0d1117; --panel:#151b23; --soft:#1d2630; --line:#303b47; --text:#edf2f7; --muted:#9aa8b8; --accent:#4db6ac; --accent2:#6ee7dc; --danger:#ff7b72; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 Inter, Segoe UI, Arial, sans-serif; }
    .shell { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 100vh; }
    aside { border-right: 1px solid var(--line); background: #111821; padding: 16px 12px; }
    .brand { padding: 4px 8px 16px; border-bottom: 1px solid var(--line); margin-bottom: 12px; }
    .brand h1 { font-size: 18px; margin: 0; line-height: 1.15; }
    .brand p { color: var(--muted); margin: 5px 0 0; font-size: 12px; }
    nav { display: grid; gap: 4px; }
    nav button { width: 100%; text-align: left; background: transparent; color: var(--text); border: 0; border-radius: 6px; padding: 9px 10px; cursor: pointer; }
    nav button.active, nav button:hover { background: var(--soft); color: var(--accent2); }
    main { min-width: 0; padding: 18px 20px 36px; }
    .topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; }
    .topbar h2 { margin:0; font-size:22px; }
    .muted { color: var(--muted); }
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; color:var(--muted); padding:2px 7px; font-size:12px; }
    .ok { color: var(--accent2); }
    .warn { color: var(--danger); }
    .cards { display:grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap:10px; margin-bottom:14px; }
    .card, section { background:var(--panel); border:1px solid var(--line); border-radius:8px; }
    .card { padding:13px; }
    .card strong { display:block; font-size:24px; }
    .card span { color:var(--muted); font-size:12px; }
    .grid2 { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr); gap:14px; align-items:start; }
    section { overflow:hidden; margin-bottom:14px; }
    .head { padding:13px 14px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .head h3 { margin:0; font-size:16px; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:9px 11px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:var(--soft); color:var(--muted); font-size:12px; }
    a { color:var(--accent2); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .empty { padding:18px; color:var(--muted); }
    .status-list { padding:12px; display:grid; gap:8px; }
    .status-row { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid var(--line); padding-bottom:8px; }
    .status-row:last-child { border-bottom:0; padding-bottom:0; }
    .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .toolbar button { background:var(--accent); color:#061312; border:0; border-radius:6px; font-weight:700; padding:8px 10px; cursor:pointer; }
    .toolbar button.secondary, button.secondary { background:var(--soft); color:var(--accent2); border:1px solid var(--line); }
    input, select, textarea { background:var(--soft); border:1px solid var(--line); border-radius:6px; color:var(--text); padding:8px 10px; min-width:240px; }
    textarea { width:100%; min-height:72px; resize:vertical; font:inherit; }
    .access { display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:flex-end; margin-bottom:14px; }
    .access input { min-width:180px; }
    .access button { background:var(--accent); color:#061312; border:0; border-radius:6px; font-weight:700; padding:8px 10px; cursor:pointer; }
    .access button.secondary { background:var(--soft); color:var(--accent2); border:1px solid var(--line); }
    .review { background:rgba(77,182,172,.08); border:1px solid rgba(110,231,220,.35); border-radius:8px; margin:12px; padding:12px; }
    .review pre { white-space:pre-wrap; word-break:break-word; color:var(--muted); }
    .review.danger { background:rgba(255,123,114,.08); border-color:rgba(255,123,114,.45); }
    .command-group { border-color:rgba(110,231,220,.25); }
    .command-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding:12px; }
    .command-card { border:1px solid var(--line); border-radius:8px; padding:12px; background:rgba(29,38,48,.45); display:grid; gap:8px; }
    .command-card h4 { margin:0; font-size:14px; }
    .command-card button { justify-self:start; background:var(--accent); color:#061312; border:0; border-radius:6px; font-weight:700; padding:8px 10px; cursor:pointer; }
    .field-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .field-row input { min-width:150px; flex:1 1 150px; }
    .check-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .check-item { display:flex; gap:8px; align-items:flex-start; border:1px solid var(--line); border-radius:8px; padding:8px; background:rgba(29,38,48,.45); }
    .check-item input { min-width:auto; margin-top:2px; }
    .mini-btn { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:5px 7px; cursor:pointer; font-size:12px; }
    .bridge-flags { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:12px; }
    .bridge-flag { border:1px solid var(--line); border-radius:8px; padding:10px; background:rgba(29,38,48,.45); }
    .bridge-flag strong { display:block; font-size:15px; }
    .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:12px; border-bottom:1px solid var(--line); background:rgba(29,38,48,.55); }
    .filters select { min-width:180px; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    .action-link, .copy-btn { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:6px 8px; display:inline-block; font-size:12px; cursor:pointer; text-decoration:none; }
    .copy-btn { font:inherit; font-size:12px; }
    .copy-btn:hover, .action-link:hover { border-color:var(--accent2); text-decoration:none; }
    .detail-btn { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:6px 8px; cursor:pointer; font-size:12px; }
    .detail-panel { border-color:rgba(110,231,220,.45); }
    .detail-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:14px; }
    .scroll-table { overflow:auto; max-height:520px; }
    .scroll-table table { min-width:860px; }
    .close-detail { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:7px 9px; cursor:pointer; }
    @media (max-width: 920px) { .shell { grid-template-columns:1fr; } aside { position:static; } .cards,.grid2,.command-grid,.bridge-flags,.check-list { grid-template-columns:1fr; } th:nth-child(4), td:nth-child(4) { display:none; } }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="brand"><h1>On Page Optimization System</h1><p>Cloud mirror. Local Cora automation stays on Windows.</p></div>
      <nav id="nav"></nav>
    </aside>
    <main>
      <div class="topbar">
        <div><h2 id="page-title">Overview</h2><div id="page-note" class="muted">Loading synced production data...</div></div>
        <div class="toolbar"><input id="search" placeholder="Filter current page"><button id="refresh">Refresh</button></div>
      </div>
      <div class="access">
        <span class="muted">Dashboard access</span>
        <input id="login-email" type="email" placeholder="Email login">
        <input id="login-code" placeholder="6-digit code">
        <button id="request-login">Send Code</button>
        <button id="verify-login" class="secondary">Verify</button>
        <input id="read-token" type="password" placeholder="Read/admin token">
        <button id="save-read-token">Unlock</button>
        <button id="lock-dashboard" class="secondary">Lock</button>
      </div>
      <div id="app"><div class="empty">Loading cloud mirror...</div></div>
    </main>
  </div>
  <script>
    let state = { data: null, page: "overview", q: "", pendingWrite: null, reportClient: "all", reportLevel: "all", commandStatus: "all", commandType: "all", auditActor: "all", auditAction: "all", auditObject: "all", detail: null };
    const pages = [
      ["overview", "Overview"],
      ["clients", "Clients"],
      ["reports", "Cora Reports"],
      ["runs", "Cora Runs"],
      ["jobs", "Cora Jobs"],
      ["ranking", "Ranking Snapshots"],
      ["targets", "Optimization Targets"],
      ["entities", "Entity Explorer"],
      ["plans", "Content Plans"],
      ["audit", "Audit Trail"],
      ["commands", "Cloud Commands"],
      ["admin", "Admin"]
    ];
    const fmtNum = (v) => Number(v || 0).toLocaleString();
    const fmtDate = (v) => v ? new Date(v).toLocaleString() : "";
    const fmtBytes = (v) => { let n = Number(v || 0), u = ["B","KB","MB","GB"], i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return n.toLocaleString(undefined, { maximumFractionDigits: i ? 1 : 0 }) + " " + u[i]; };
    const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
    const reportUrl = (token) => "/share/report/" + encodeURIComponent(token);
    const downloadUrl = (token) => reportUrl(token) + "/download";
    const readToken = () => localStorage.getItem("opos_read_token") || localStorage.getItem("opos_admin_token") || "";
    const adminToken = () => localStorage.getItem("opos_admin_token") || "";
    const authHeaders = (token) => token ? { "authorization": "Bearer " + token } : {};
    const writeHeaders = () => {
      const headers = { "content-type": "application/json" };
      const token = adminToken();
      if (token) headers.authorization = "Bearer " + token;
      return headers;
    };
    const absoluteUrl = (path) => new URL(path, location.origin).href;
    function rows(items, predicate) {
      const q = state.q.toLowerCase();
      return (items || []).filter((item) => !q || JSON.stringify(item).toLowerCase().includes(q)).filter(predicate || (() => true));
    }
    function table(headers, body, empty) {
      return body.length ? '<table><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join("") + '</tr></thead><tbody>' + body.join("") + '</tbody></table>' : '<div class="empty">' + esc(empty || "No synced data found.") + '</div>';
    }
    function setPage(page) {
      state.page = page;
      state.detail = null;
      document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
      render();
    }
    function renderNav() {
      document.getElementById("nav").innerHTML = pages.map(([id, label]) => '<button data-page="' + id + '">' + esc(label) + '</button>').join("");
      document.querySelectorAll("nav button").forEach((b) => b.onclick = () => setPage(b.dataset.page));
    }
    function cards(items) {
      return '<div class="cards">' + items.map(([label, value]) => '<div class="card"><strong>' + esc(typeof value === "number" ? fmtNum(value) : value) + '</strong><span>' + esc(label) + '</span></div>').join("") + '</div>';
    }
    function overview(data) {
      const counts = data.counts || {};
      const artifactBytes = (data.artifacts || []).reduce((s, r) => s + Number(r.total_bytes || 0), 0);
      const artifactFiles = (data.artifacts || []).reduce((s, r) => s + Number(r.artifact_count || 0), 0);
      const lastSync = (data.sync?.tables || []).map((r) => r.last_received_at).filter(Boolean).sort().pop();
      const syncRows = (data.sync?.tables || []).slice(-14).map((r) => '<div class="status-row"><span>' + esc(r.table_name) + '</span><strong>' + esc(fmtNum(r.rows_received)) + '</strong></div>').join("");
      const artifactRows = (data.artifacts || []).map((r) => '<div class="status-row"><span>' + esc(r.artifact_type) + '</span><strong>' + esc(fmtNum(r.artifact_count)) + ' / ' + esc(fmtBytes(r.total_bytes)) + '</strong></div>').join("");
      const bridgeRows = (data.bridges || []).map((b) => '<div class="status-row"><span>' + esc(b.bridge_id) + '<br><small class="muted">' + esc(fmtDate(b.last_seen_at)) + '</small><br><small class="muted">Cora ' + esc(b.allow_cora ? 'enabled' : 'off') + ' | Paid tools ' + esc(b.allow_paid_tools ? 'enabled' : 'off') + '</small></span><strong class="' + (b.online ? 'ok' : 'warn') + '">' + esc(b.online ? 'Online' : 'Offline') + '</strong></div>').join("");
      return cards([["Clients", counts.projects],["Keywords", counts.keywords],["Cora Runs", counts.runs],["Reports", counts.reports],["Ranking Snapshots", counts.ranking_snapshots],["Optimization Targets", counts.ranking_optimization_targets],["Pending Commands", counts.pending_commands],["Cloud Files", artifactFiles],["R2 Storage", fmtBytes(artifactBytes)]])
        + '<div class="grid2"><section><div class="head"><h3>Recent Reports</h3><span class="pill ok">Live</span></div>' + reportTable(data.reports || []) + '</section>'
        + '<section><div class="head"><h3>Bridge Status</h3><span class="muted">' + esc(fmtDate(lastSync) || "Never") + '</span></div><div class="status-list">' + (bridgeRows || '<div class="muted">No local bridge heartbeat yet.</div>') + '</div><div class="head"><h3>Cloud Files</h3></div><div class="status-list">' + (artifactRows || '<div class="muted">No files.</div>') + '</div><div class="head"><h3>Tables</h3></div><div class="status-list">' + (syncRows || '<div class="muted">No sync batches.</div>') + '</div></section></div>';
    }
    function reportTable(items) {
      return table(["Report", "Client", "Keyword / URL", "Level", "Created", "Files", "Actions"], rows(items).map((r) => '<tr><td><strong>' + esc(r.title || r.keyword || "Report") + '</strong><br><span class="muted">Run #' + esc(r.run_id || "") + '</span></td><td>' + esc(r.project_name || r.client_name || "") + '<br><span class="muted">' + esc(r.site_domain || "") + '</span></td><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.target_domain || r.target_url || "") + '</span></td><td><span class="pill">' + esc(r.level || "") + '</span></td><td>' + esc(fmtDate(r.created_at)) + '<br><span class="muted">Uploaded ' + esc(fmtDate(r.last_uploaded_at)) + '</span></td><td><span class="pill">' + esc(fmtNum(r.artifact_count || 0)) + ' files</span><br><span class="muted">' + esc(fmtBytes(r.total_bytes || 0)) + '</span></td><td><div class="actions"><a class="action-link" href="' + reportUrl(r.token) + '" target="_blank">Open</a><a class="action-link" href="' + downloadUrl(r.token) + '">XLSX</a><button class="copy-btn" data-copy="' + esc(absoluteUrl(reportUrl(r.token))) + '">Copy report</button><button class="copy-btn" data-copy="' + esc(absoluteUrl(downloadUrl(r.token))) + '">Copy XLSX</button></div></td></tr>'), "No cloud reports synced yet.");
    }
    function reportPortal(data) {
      const allReports = data.reports || [];
      const clients = [...new Map(allReports.map((r) => [String(r.project_id || r.project_name || ""), r.project_name || r.client_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const levels = ["basic", "medium", "comprehensive"];
      const filtered = allReports.filter((r) => (state.reportClient === "all" || String(r.project_id || r.project_name || "") === state.reportClient) && (state.reportLevel === "all" || String(r.level || "").toLowerCase() === state.reportLevel));
      const latest = filtered.map((r) => r.created_at).filter(Boolean).sort().pop();
      const files = filtered.reduce((sum, r) => sum + Number(r.artifact_count || 0), 0);
      const bytes = filtered.reduce((sum, r) => sum + Number(r.total_bytes || 0), 0);
      const filters = '<div class="filters"><select id="report-client-filter"><option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.reportClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("") + '</select><select id="report-level-filter"><option value="all">All report levels</option>' + levels.map((level) => '<option value="' + level + '"' + (state.reportLevel === level ? ' selected' : '') + '>' + esc(level[0].toUpperCase() + level.slice(1)) + '</option>').join("") + '</select><span class="muted">Use the search box above for keyword, URL, or report title.</span></div>';
      setTimeout(bindReportControls, 0);
      return cards([["Visible Reports", filtered.length],["Report Files", files],["Report Storage", fmtBytes(bytes)],["Latest Report", fmtDate(latest) || "None"]])
        + '<section><div class="head"><h3>Cora Reports</h3><span class="pill ok">Share-ready</span></div>' + filters + reportTable(filtered) + '</section>';
    }
    function clientsTable(items) {
      return table(["Client", "Site", "Keywords", "Runs", "Snapshots", "Targets", ""], rows(items).map((c) => '<tr><td><strong>' + esc(c.name || "") + '</strong><br><span class="muted">' + esc(c.client || "") + '</span></td><td>' + esc(c.site_domain || "") + '</td><td>' + esc(fmtNum(c.keyword_count)) + '</td><td>' + esc(fmtNum(c.run_count)) + '</td><td>' + esc(fmtNum(c.snapshot_count)) + '</td><td>' + esc(fmtNum(c.target_count)) + '</td><td><button class="detail-btn" data-detail-type="client" data-detail-id="' + esc(c.id) + '">Open</button></td></tr>'));
    }
    function runsTable(items) {
      return table(["Keyword", "Client", "Target", "Imported", "Data", ""], rows(items).map((r) => '<tr><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.file_name || "") + '</span></td><td>' + esc(r.project_name || "") + '</td><td>' + esc(r.target_domain || r.target_url || "") + '</td><td>' + esc(fmtDate(r.imported_at)) + '</td><td>' + esc(fmtNum(r.serp_count)) + ' SERP<br>' + esc(fmtNum(r.recommendation_count)) + ' recs<br>' + esc(fmtNum(r.lsi_count)) + ' LSI</td><td><button class="detail-btn" data-detail-type="run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>'));
    }
    function jobsTable(items) {
      return table(["Keyword", "Client", "Tool/Profile", "Status", "Updated"], rows(items).map((j) => '<tr><td><strong>' + esc(j.keyword || "") + '</strong><br><span class="muted">' + esc(j.target_domain || "") + '</span></td><td>' + esc(j.project_name || "") + '</td><td>' + esc(j.tool || "cora") + '<br><span class="muted">' + esc(j.cora_profile || "") + '</span></td><td><span class="pill">' + esc(j.status || "") + '</span><br><span class="muted">' + esc(j.status_message || "") + '</span></td><td>' + esc(fmtDate(j.updated_at || j.last_activity_at || j.started_at)) + '</td></tr>'));
    }
    function snapshotsTable(items) {
      return table(["Target", "Client", "Locale", "Keywords", "Pages", "Created", ""], rows(items).map((s) => '<tr><td><strong>' + esc(s.target || "") + '</strong><br><span class="muted">' + esc(s.source || "") + ' / ' + esc(s.freshness || "") + '</span></td><td>' + esc(s.project_name || "") + '</td><td>' + esc(s.location_code || "") + ' / ' + esc(s.language_code || "") + '</td><td>' + esc(fmtNum(s.keyword_count)) + '</td><td>' + esc(fmtNum(s.page_count)) + '</td><td>' + esc(fmtDate(s.created_at)) + '</td><td><button class="detail-btn" data-detail-type="snapshot" data-detail-id="' + esc(s.id) + '">Open</button></td></tr>'));
    }
    function targetsTable(items) {
      return table(["URL", "Client", "Keyword", "Position", "Score", "Status"], rows(items).map((t) => '<tr><td><strong>' + esc(t.url || "") + '</strong><br><span class="muted">' + esc(t.recommended_action || "") + '</span></td><td>' + esc(t.project_name || "") + '</td><td>' + esc(t.keyword || "") + '</td><td>' + esc(fmtNum(t.best_position)) + '</td><td>' + esc(fmtNum(t.opportunity_score)) + '</td><td><span class="pill">' + esc(t.status || "") + '</span></td></tr>'));
    }
    function entitiesView(data) {
      const batches = table(["Seed", "Client", "Depth", "Progress", "Status"], rows(data.entity_batches || []).map((b) => '<tr><td><strong>' + esc(b.seed_keyword || "") + '</strong></td><td>' + esc(b.project_name || "") + '</td><td>' + esc(b.depth || "") + '</td><td>' + esc(fmtNum(b.completed_count)) + ' / ' + esc(fmtNum(b.target_count)) + '</td><td><span class="pill">' + esc(b.status || "") + '</span></td></tr>'));
      const runs = table(["Seed", "Provider", "Model", "Status", "Completed", ""], rows(data.entity_runs || []).map((r) => '<tr><td>' + esc(r.seed_keyword || "") + '</td><td>' + esc(r.provider || "") + '</td><td>' + esc(r.model || "") + '</td><td><span class="pill">' + esc(r.status || "") + '</span><br><span class="muted">' + esc(r.error || r.summary || "") + '</span></td><td>' + esc(fmtDate(r.completed_at || r.created_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>'));
      const sets = table(["Set", "Client", "Terms", "Updated", ""], rows(data.entity_sets || []).map((s) => '<tr><td><strong>' + esc(s.name || "") + '</strong><br><span class="muted">' + esc(s.notes || "") + '</span></td><td>' + esc(s.project_name || "") + '</td><td>' + esc(fmtNum(s.term_count)) + '</td><td>' + esc(fmtDate(s.updated_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-set" data-detail-id="' + esc(s.id) + '">Open</button></td></tr>'));
      return '<div class="grid2"><section><div class="head"><h3>Entity Batches</h3></div>' + batches + '</section><section><div class="head"><h3>Entity Sets</h3></div>' + sets + '</section></div><section><div class="head"><h3>Model Runs</h3></div>' + runs + '</section>';
    }
    function plansTable(items) {
      return table(["Title", "Client", "Keyword", "Type", "Status", "Due"], rows(items).map((p) => '<tr><td><strong>' + esc(p.title || "") + '</strong><br><span class="muted">' + esc(p.notes || "") + '</span></td><td>' + esc(p.project_name || "") + '</td><td>' + esc(p.keyword || "") + '</td><td>' + esc(p.content_type || "") + '</td><td><span class="pill">' + esc(p.status || "") + '</span><br><span class="muted">' + esc(p.priority || "") + '</span></td><td>' + esc(p.due_date || "") + '</td></tr>'));
    }
    function projectOptions() {
      return (state.data?.clients || []).map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name || ("Client " + p.id)) + '</option>').join("");
    }
    function runOptions() {
      return (state.data?.runs || []).map((r) => '<option value="' + esc(r.id) + '">' + esc((r.keyword || "Run") + " | " + (r.project_name || "")) + '</option>').join("");
    }
    function commandLabel(type) {
      const labels = {
        create_project: "Create Client",
        add_keyword: "Add Keyword",
        create_content_plan: "Content Plan",
        create_share_report: "Customer Report",
        run_cora: "Run Cora",
        create_ranking_snapshot: "Ranking Snapshot",
        run_entity_lsi: "Entity Explorer",
        sync_cloud_data: "Sync Cloud Data",
        sync_cloud_to_local: "Pull Cloud Changes",
        sync_report_artifacts: "Sync Report Files"
      };
      return labels[type] || type;
    }
    function commandStatusLabel(status) {
      if (status === "pending") return "Queued";
      if (status === "claimed") return "Claimed locally";
      if (status === "complete") return "Complete";
      if (status === "failed") return "Failed";
      return status || "";
    }
    function commandStatusClass(status) {
      return status === "complete" ? "ok" : status === "failed" ? "warn" : "";
    }
    function isPaidLiveCommand(command_type, payload) {
      return ["create_ranking_snapshot", "run_entity_lsi"].includes(command_type) && !payload?.dry_run;
    }
    function commandRisk(command_type, payload) {
      if (command_type === "run_cora") return "Needs local bridge with Cora enabled.";
      if (payload?.execution_mode === "cloud") return "Runs in Cloudflare and then needs cloud-to-local sync for local parity.";
      if (isPaidLiveCommand(command_type, payload)) return "Paid/API run. This can use DataForSEO or LLM credits.";
      if (["create_ranking_snapshot", "run_entity_lsi"].includes(command_type)) return "Dry run only. No paid/API execution.";
      if (["sync_cloud_data", "sync_report_artifacts"].includes(command_type)) return "Local bridge sync command.";
      return "Cloud write command.";
    }
    function commandResultActions(c) {
      const result = c.result || {};
      const actions = [];
      const reportToken = result.report?.token || result.token;
      const snapshotId = result.snapshot?.id || result.snapshot_id;
      const entityRunId = result.runs?.[0]?.id || result.run?.id || result.entity_run_id;
      if (reportToken) actions.push('<a class="action-link" href="' + reportUrl(reportToken) + '" target="_blank">Open Report</a>');
      if (snapshotId) actions.push('<button class="detail-btn" data-detail-type="snapshot" data-detail-id="' + esc(snapshotId) + '">Open Snapshot</button>');
      if (entityRunId) actions.push('<button class="detail-btn" data-detail-type="entity-run" data-detail-id="' + esc(entityRunId) + '">Open Entity Run</button>');
      if (result.batch_id) actions.push('<button class="detail-btn" data-detail-type="client" data-detail-id="' + esc(c.payload?.project_id || "") + '">Open Client</button>');
      return actions.join("");
    }
    function commandResultSummary(c) {
      const result = c.result || {};
      if (!result || !Object.keys(result).length) return c.error || "";
      if (result.sync) return 'Synced ' + esc(fmtNum(result.sync.total_rows || 0)) + ' rows ' + esc(result.sync.direction || 'local_to_cloud') + '.';
      if (result.project) return (result.duplicate ? 'Reused ' : 'Created ') + 'client #' + esc(result.project.id || "");
      if (result.keyword) return (result.duplicate ? 'Reused ' : 'Created ') + 'keyword #' + esc(result.keyword.id || "");
      if (result.content_plan) return (result.duplicate ? 'Reused ' : 'Created ') + 'content plan #' + esc(result.content_plan.id || "");
      if (result.report) return (result.duplicate ? 'Reused ' : 'Created ') + 'report #' + esc(result.report.id || "");
      if (result.snapshot) return 'Created ranking snapshot #' + esc(result.snapshot.id || "");
      if (result.runs) return 'Completed ' + esc(fmtNum(result.runs.filter((run) => run.status === "complete").length || 0)) + ' of ' + esc(fmtNum(result.runs.length || 0)) + ' Entity Explorer model runs.';
      if (result.dry_run) return 'Dry run complete.';
      return 'Completed.';
    }
    function commandsTable(items) {
      return table(["Command", "Status", "Queued By", "Timeline", "Result", ""], rows(items).map((c) => {
        const actions = commandResultActions(c);
        const retry = c.status === "failed" ? '<button class="retry-command" data-command-id="' + esc(c.id) + '">Retry</button>' : '';
        const reset = c.status === "claimed" ? '<button class="retry-command" data-command-id="' + esc(c.id) + '">Reset</button>' : '';
        return '<tr><td><strong>' + esc(commandLabel(c.command_type || "")) + '</strong><br><span class="muted">' + esc(JSON.stringify(c.payload || {})) + '</span></td><td><span class="pill ' + commandStatusClass(c.status) + '">' + esc(commandStatusLabel(c.status)) + '</span><br><span class="muted">' + esc(c.error || commandRisk(c.command_type, c.payload || {})) + '</span></td><td>' + esc(c.created_by || "") + '</td><td><span class="muted">Queued ' + esc(fmtDate(c.created_at)) + '<br>Claimed ' + esc(fmtDate(c.claimed_at)) + '<br>Done ' + esc(fmtDate(c.completed_at)) + '</span></td><td><strong>' + commandResultSummary(c) + '</strong><details><summary class="muted">View raw</summary><pre class="muted">' + esc(c.result ? JSON.stringify(c.result, null, 2) : "") + '</pre></details><div class="actions">' + actions + '</div></td><td><div class="actions">' + retry + reset + '</div></td></tr>';
      }), "No cloud commands yet.");
    }
    function auditTable(items) {
      return table(["When", "Actor", "Action", "Object", "Metadata"], rows(items).map((event) => '<tr><td>' + esc(fmtDate(event.created_at)) + '</td><td>' + esc(event.actor || "") + '<br><span class="muted">' + esc(event.ip_address || "") + '</span></td><td><span class="pill">' + esc(event.action || "") + '</span></td><td>' + esc(event.object_type || "") + '<br><span class="muted">' + esc(event.object_id || "") + '</span></td><td><span class="muted">' + esc(JSON.stringify(event.metadata || {})) + '</span></td></tr>'), "No audit events match the filters.");
    }
    function auditView(data) {
      const allEvents = data.audit_events || [];
      const actors = [...new Set(allEvents.map((event) => event.actor || "").filter(Boolean))].sort();
      const actions = [...new Set(allEvents.map((event) => event.action || "").filter(Boolean))].sort();
      const objects = [...new Set(allEvents.map((event) => event.object_type || "").filter(Boolean))].sort();
      const filtered = allEvents.filter((event) =>
        (state.auditActor === "all" || String(event.actor || "") === state.auditActor) &&
        (state.auditAction === "all" || String(event.action || "") === state.auditAction) &&
        (state.auditObject === "all" || String(event.object_type || "") === state.auditObject)
      );
      const filters = '<div class="filters"><select id="audit-actor-filter"><option value="all">All actors</option>' + actors.map((actor) => '<option value="' + esc(actor) + '"' + (state.auditActor === actor ? ' selected' : '') + '>' + esc(actor) + '</option>').join("") + '</select><select id="audit-action-filter"><option value="all">All actions</option>' + actions.map((action) => '<option value="' + esc(action) + '"' + (state.auditAction === action ? ' selected' : '') + '>' + esc(action) + '</option>').join("") + '</select><select id="audit-object-filter"><option value="all">All object types</option>' + objects.map((object) => '<option value="' + esc(object) + '"' + (state.auditObject === object ? ' selected' : '') + '>' + esc(object) + '</option>').join("") + '</select><span class="muted">' + esc(filtered.length) + ' of ' + esc(allEvents.length) + ' events</span></div>';
      return '<section><div class="head"><h3>Audit Trail</h3><span class="muted">Recent report, sync, bridge, auth, and command events.</span></div>' + filters + auditTable(filtered) + '</section>';
    }
    function bindAuditFilters() {
      const actor = document.getElementById("audit-actor-filter");
      const action = document.getElementById("audit-action-filter");
      const object = document.getElementById("audit-object-filter");
      if (actor) actor.onchange = (event) => { state.auditActor = event.target.value || "all"; render(); };
      if (action) action.onchange = (event) => { state.auditAction = event.target.value || "all"; render(); };
      if (object) object.onchange = (event) => { state.auditObject = event.target.value || "all"; render(); };
    }
    async function apiGet(path) {
      const token = readToken();
      const response = await fetch(path, { headers: authHeaders(token) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Detail load failed");
      return data;
    }
    async function openDetail(type, id) {
      const paths = {
        client: "/api/clients/" + encodeURIComponent(id) + "/detail",
        run: "/api/runs/" + encodeURIComponent(id) + "/detail",
        snapshot: "/api/ranking-snapshots/" + encodeURIComponent(id) + "/detail",
        "entity-run": "/api/entity-runs/" + encodeURIComponent(id) + "/detail",
        "entity-set": "/api/entity-sets/" + encodeURIComponent(id) + "/detail"
      };
      state.detail = { type, loading: true, id };
      render();
      state.detail = { type, id, data: await apiGet(paths[type]) };
      render();
    }
    async function openSheetDetail(runId, sheet, source) {
      state.detail = { type: "sheet", loading: true, id: runId + ":" + sheet };
      render();
      const query = "?sheet=" + encodeURIComponent(sheet) + (source ? "&source=" + encodeURIComponent(source) : "");
      state.detail = { type: "sheet", id: runId + ":" + sheet, data: await apiGet("/api/runs/" + encodeURIComponent(runId) + "/sheet-rows" + query) };
      render();
    }
    function smallCards(items) {
      return '<div class="detail-grid">' + items.map(([label, value]) => '<div class="card"><strong>' + esc(value) + '</strong><span>' + esc(label) + '</span></div>').join("") + '</div>';
    }
    function detailTable(headers, body, empty) {
      return '<div class="scroll-table">' + table(headers, body, empty) + '</div>';
    }
    function runDetail(data) {
      const run = data.run || {};
      const recs = data.recommendations || [];
      const serp = data.serp_results || [];
      const lsi = data.lsi_keywords || [];
      const sheets = data.sheets || [];
      const recRows = recs.map((r) => '<tr><td><strong>' + esc(r.factor || "") + '</strong><br><span class="muted">' + esc(r.factor_id || "") + '</span></td><td><span class="pill">' + esc(r.status || "") + '</span></td><td>' + esc(r.recommendation || "") + '<br><span class="muted">' + esc(r.details || "") + '</span></td><td>' + esc(r.percent || "") + '</td><td>' + esc(r.pages || "") + '</td></tr>');
      const serpRows = serp.map((r) => '<tr><td>' + esc(r.rank || "") + '</td><td>' + esc(r.title || "") + '</td><td><a href="' + esc(r.url || "") + '" target="_blank">' + esc(r.host || r.url || "") + '</a></td><td>' + (r.is_target ? '<span class="pill ok">Target</span>' : '') + '</td></tr>');
      const lsiRows = lsi.map((r) => '<tr><td><strong>' + esc(r.keyword || "") + '</strong></td><td>' + esc(r.spearman || "") + '</td><td>' + esc(r.pearson || "") + '</td><td>' + esc(r.best_of_both || "") + '</td><td>' + esc(r.deficit || "") + '</td></tr>');
      const sheetRows = sheets.map((s) => '<tr><td><strong>' + esc(s.sheet || "") + '</strong></td><td>' + esc(fmtNum(s.sheet_rows || 0)) + '</td><td>' + esc(fmtNum(s.workbook_rows || 0)) + '</td><td>' + esc(fmtNum(s.row_count || 0)) + '</td><td><button class="detail-btn sheet-btn" data-run-id="' + esc(run.id) + '" data-sheet="' + esc(s.sheet || "") + '">Open Rows</button></td></tr>');
      return smallCards([["Keyword", run.keyword || ""],["Client", run.project_name || ""],["Target", run.target_domain || run.target_url || ""],["Recommendations", recs.length],["SERP Results", serp.length],["LSI Keywords", lsi.length]])
        + '<section><div class="head"><h3>Worksheet Rows</h3><span class="muted">Uses synced sheet rows; raw workbook rows appear when enabled.</span></div>' + detailTable(["Sheet","Sheet Rows","Workbook Rows","Total",""], sheetRows, "No worksheet rows synced for this run.") + '</section>'
        + '<section><div class="head"><h3>Recommendations</h3></div>' + detailTable(["Factor","Status","Recommendation","Percent","Pages"], recRows, "No recommendations synced for this run.") + '</section>'
        + '<section><div class="head"><h3>SERP Results</h3></div>' + detailTable(["Rank","Title","URL","Target"], serpRows, "No SERP rows synced for this run.") + '</section>'
        + '<section><div class="head"><h3>LSI Keywords</h3></div>' + detailTable(["Keyword","Spearman","Pearson","Best","Deficit"], lsiRows, "No LSI rows synced for this run.") + '</section>';
    }
    function snapshotDetail(data) {
      const snapshot = data.snapshot || {};
      const keywords = data.keywords || [];
      const pages = data.pages || [];
      const targets = data.targets || [];
      const keywordRows = keywords.map((k) => '<tr><td><strong>' + esc(k.keyword || "") + '</strong><br><span class="muted">' + esc(k.intent || "") + '</span></td><td>' + esc(k.position || "") + '</td><td>' + esc(k.previous_position || "") + '</td><td><a href="' + esc(k.ranking_url || "") + '" target="_blank">' + esc(k.ranking_url || "") + '</a></td><td>' + esc(fmtNum(k.search_volume)) + '</td><td>' + esc(k.estimated_traffic || "") + '</td><td>' + (k.ai_overview_present ? 'AIO' : '') + (k.ai_overview_reference ? ' / Ref' : '') + '</td></tr>');
      const pageRows = pages.map((p) => '<tr><td><a href="' + esc(p.url || "") + '" target="_blank">' + esc(p.url || "") + '</a></td><td>' + esc(fmtNum(p.organic_keywords)) + '</td><td>' + esc(p.organic_traffic || "") + '</td><td>' + esc(p.organic_traffic_cost || "") + '</td><td>' + esc(p.top3 || "") + '</td><td>' + esc(p.top10 || "") + '</td></tr>');
      const targetRows = targets.map((t) => '<tr><td><a href="' + esc(t.url || "") + '" target="_blank">' + esc(t.url || "") + '</a></td><td>' + esc(t.keyword || "") + '</td><td>' + esc(t.best_position || "") + '</td><td>' + esc(t.opportunity_score || "") + '</td><td><span class="pill">' + esc(t.status || "") + '</span></td><td>' + esc(t.recommended_action || "") + '</td></tr>');
      return smallCards([["Target", snapshot.target || ""],["Client", snapshot.project_name || ""],["Locale", (snapshot.location_code || "") + " / " + (snapshot.language_code || "")],["Keywords", keywords.length],["Pages", pages.length],["Targets", targets.length]])
        + '<section><div class="head"><h3>Ranking Keywords</h3></div>' + detailTable(["Keyword","Pos","Prev","URL","Volume","Traffic","AI"], keywordRows, "No ranking keywords synced for this snapshot.") + '</section>'
        + '<section><div class="head"><h3>Ranking Pages</h3></div>' + detailTable(["URL","Keywords","Traffic","Cost","Top 3","Top 10"], pageRows, "No ranking pages synced for this snapshot.") + '</section>'
        + '<section><div class="head"><h3>Optimization Targets</h3></div>' + detailTable(["URL","Keyword","Best Pos","Score","Status","Action"], targetRows, "No optimization targets synced for this snapshot.") + '</section>';
    }
    function entitySetDetail(data) {
      const set = data.entity_set || {};
      const terms = data.terms || [];
      const termRows = terms.map((t) => '<tr><td><strong>' + esc(t.term || "") + '</strong><br><span class="muted">' + esc(t.normalized || "") + '</span></td><td>' + esc(t.type || "") + '</td><td>' + esc(fmtNum(t.source_count)) + '</td><td><span class="muted">' + esc(JSON.stringify(t.sources || [])) + '</span></td><td>' + esc(t.notes || "") + '</td></tr>');
      return smallCards([["Entity Set", set.name || ""],["Client", set.project_name || ""],["Terms", terms.length],["Created", fmtDate(set.created_at)],["Updated", fmtDate(set.updated_at)],["Source Batch", set.source_batch_id || ""]])
        + '<section><div class="head"><h3>Entity Terms</h3></div>' + detailTable(["Term","Type","Sources","Source Detail","Notes"], termRows, "No entity terms synced for this set.") + '</section>';
    }
    function listItemsTable(values, label) {
      const items = Array.isArray(values) ? values : [];
      const body = items.map((item) => {
        if (item && typeof item === "object") {
          const name = item.term || item.entity || item.keyword || item.question || item.topic || item.name || item.text || "";
          const type = item.type || item.category || item.intent || "";
          const score = item.score || item.relevance || item.source_count || item.count || "";
          return '<tr><td><strong>' + esc(name || JSON.stringify(item)) + '</strong></td><td>' + esc(type) + '</td><td>' + esc(score) + '</td><td><span class="muted">' + esc(JSON.stringify(item)) + '</span></td></tr>';
        }
        return '<tr><td><strong>' + esc(item) + '</strong></td><td></td><td></td><td></td></tr>';
      });
      return detailTable(["Term", "Type", "Score", "Raw"], body, "No " + label + " synced for this run.");
    }
    function entityRunDetail(data) {
      const run = data.entity_run || {};
      const rawPreview = String(run.raw_response || "").slice(0, 6000);
      return smallCards([["Seed", run.seed_keyword || ""],["Client", run.project_name || ""],["Provider", run.provider || ""],["Model", run.model || ""],["Status", run.status || ""],["Depth", run.depth || ""],["Entities", (run.entities || []).length],["LSI", (run.lsi_keywords || []).length],["Related", (run.related_keywords || []).length]])
        + '<section><div class="head"><h3>Summary</h3></div><div class="empty">' + esc(run.summary || run.error || "No summary synced.") + '</div></section>'
        + '<section><div class="head"><h3>Entities</h3></div>' + listItemsTable(run.entities, "entities") + '</section>'
        + '<section><div class="head"><h3>LSI Keywords</h3></div>' + listItemsTable(run.lsi_keywords, "LSI keywords") + '</section>'
        + '<section><div class="head"><h3>Related Keywords</h3></div>' + listItemsTable(run.related_keywords, "related keywords") + '</section>'
        + '<section><div class="head"><h3>Questions</h3></div>' + listItemsTable(run.questions, "questions") + '</section>'
        + '<section><div class="head"><h3>Topics</h3></div>' + listItemsTable(run.topics, "topics") + '</section>'
        + '<section><div class="head"><h3>Raw Response Preview</h3></div><div class="empty"><pre>' + esc(rawPreview || "No raw response synced.") + '</pre></div></section>';
    }
    function sheetDetail(data) {
      const rowsData = data.rows || [];
      const objectRows = rowsData.map((row) => row.values).filter((value) => value && typeof value === "object" && !Array.isArray(value));
      const columns = objectRows.length ? [...new Set(objectRows.flatMap((value) => Object.keys(value)))].slice(0, 12) : [];
      const body = rowsData.map((row) => {
        const values = row.values;
        if (columns.length && values && typeof values === "object" && !Array.isArray(values)) {
          return '<tr><td>' + esc(row.row_index) + '</td>' + columns.map((key) => '<td>' + esc(values[key] ?? "") + '</td>').join("") + '<td><span class="muted">' + esc(JSON.stringify(values)) + '</span></td></tr>';
        }
        if (Array.isArray(values)) {
          return '<tr><td>' + esc(row.row_index) + '</td><td colspan="' + Math.max(columns.length, 1) + '">' + esc(values.join(" | ")) + '</td><td><span class="muted">' + esc(JSON.stringify(values)) + '</span></td></tr>';
        }
        return '<tr><td>' + esc(row.row_index) + '</td><td colspan="' + Math.max(columns.length, 1) + '">' + esc(values) + '</td><td><span class="muted">' + esc(JSON.stringify(values)) + '</span></td></tr>';
      });
      const headers = ["Row"].concat(columns.length ? columns : ["Value"]).concat(["Raw"]);
      return smallCards([["Run", data.run?.keyword || data.run?.id || ""],["Sheet", data.sheet || ""],["Source", data.source || ""],["Sheet Rows", fmtNum(data.counts?.sheet_rows || 0)],["Workbook Rows", fmtNum(data.counts?.workbook_rows || 0)],["Displayed", rowsData.length]])
        + '<section><div class="head"><h3>Worksheet Rows</h3><span class="muted">Showing up to ' + esc(data.limit || "") + ' rows.</span></div>' + detailTable(headers, body, "No rows found for this worksheet.") + '</section>';
    }
    function clientDetail(data) {
      const client = data.client || {};
      const keywordRows = (data.keywords || []).map((k) => '<tr><td><strong>' + esc(k.keyword || "") + '</strong></td><td>' + esc(k.intent || "") + '</td><td>' + esc(k.priority || "") + '</td><td>' + esc(fmtDate(k.created_at)) + '</td></tr>');
      const runRows = (data.runs || []).map((r) => '<tr><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.file_name || "") + '</span></td><td>' + esc(r.target_domain || r.target_url || "") + '</td><td>' + esc(fmtDate(r.imported_at)) + '</td><td><button class="detail-btn" data-detail-type="run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>');
      const reportRows = (data.reports || []).map((r) => '<tr><td><strong>' + esc(r.title || r.keyword || "Report") + '</strong><br><span class="muted">' + esc(r.keyword || "") + '</span></td><td><span class="pill">' + esc(r.level || "") + '</span></td><td>' + esc(fmtDate(r.created_at)) + '</td><td>' + esc(fmtNum(r.artifact_count || 0)) + ' files</td><td><a class="action-link" href="' + reportUrl(r.token) + '" target="_blank">Open</a></td></tr>');
      const snapshotRows = (data.snapshots || []).map((s) => '<tr><td><strong>' + esc(s.target || "") + '</strong></td><td>' + esc(s.location_code || "") + ' / ' + esc(s.language_code || "") + '</td><td>' + esc(fmtDate(s.created_at)) + '</td><td><button class="detail-btn" data-detail-type="snapshot" data-detail-id="' + esc(s.id) + '">Open</button></td></tr>');
      const targetRows = (data.targets || []).map((t) => '<tr><td><a href="' + esc(t.url || "") + '" target="_blank">' + esc(t.url || "") + '</a></td><td>' + esc(t.keyword || "") + '</td><td>' + esc(t.best_position || "") + '</td><td>' + esc(t.opportunity_score || "") + '</td><td><span class="pill">' + esc(t.status || "") + '</span></td></tr>');
      const jobRows = (data.jobs || []).map((j) => '<tr><td><strong>' + esc(j.keyword || "") + '</strong><br><span class="muted">' + esc(j.target_domain || "") + '</span></td><td>' + esc(j.tool || "cora") + '<br><span class="muted">' + esc(j.cora_profile || "") + '</span></td><td><span class="pill">' + esc(j.status || "") + '</span></td><td>' + esc(fmtDate(j.updated_at || j.last_activity_at || j.started_at)) + '</td></tr>');
      const planRows = (data.content_plans || []).map((p) => '<tr><td><strong>' + esc(p.title || "") + '</strong><br><span class="muted">' + esc(p.notes || "") + '</span></td><td>' + esc(p.keyword || "") + '</td><td>' + esc(p.content_type || "") + '</td><td><span class="pill">' + esc(p.status || "") + '</span></td><td>' + esc(p.due_date || "") + '</td></tr>');
      const entityRows = (data.entity_batches || []).map((b) => '<tr><td><strong>' + esc(b.seed_keyword || "") + '</strong></td><td>' + esc(b.depth || "") + '</td><td>' + esc(fmtNum(b.completed_count)) + ' / ' + esc(fmtNum(b.target_count)) + '</td><td><span class="pill">' + esc(b.status || "") + '</span></td><td>' + esc(fmtDate(b.updated_at || b.created_at)) + '</td></tr>');
      const entityRunRows = (data.entity_runs || []).map((r) => '<tr><td><strong>' + esc(r.seed_keyword || "") + '</strong></td><td>' + esc(r.provider || "") + '</td><td>' + esc(r.model || "") + '</td><td><span class="pill">' + esc(r.status || "") + '</span></td><td><button class="detail-btn" data-detail-type="entity-run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>');
      const setRows = (data.entity_sets || []).map((s) => '<tr><td><strong>' + esc(s.name || "") + '</strong><br><span class="muted">' + esc(s.notes || "") + '</span></td><td>' + esc(fmtNum(s.term_count)) + '</td><td>' + esc(fmtDate(s.updated_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-set" data-detail-id="' + esc(s.id) + '">Open</button></td></tr>');
      const firstKeyword = (data.keywords || [])[0]?.keyword || "";
      const actionButtons = '<section><div class="head"><h3>Client Actions</h3><span class="muted">Pre-filled from this client.</span></div><div class="status-list"><div class="toolbar"><button class="client-command" data-client-command="ranking" data-project-id="' + esc(client.id || "") + '" data-target="' + esc(client.site_domain || "") + '">Run Ranking Snapshot</button><button class="client-command secondary" data-client-command="cora" data-project-id="' + esc(client.id || "") + '" data-keyword="' + esc(firstKeyword) + '" data-target="' + esc(client.site_domain || "") + '">Run Cora</button><button class="client-command secondary" data-client-command="entity" data-project-id="' + esc(client.id || "") + '" data-keyword="' + esc(firstKeyword) + '">Run Entity Explorer</button><button class="client-command secondary" data-client-command="pull" data-project-id="' + esc(client.id || "") + '">Pull Cloud Changes</button></div><div class="muted">Cora remains local-only. Ranking and Entity commands can run locally now; cloud execution for paid/API tools is staged behind provider secrets.</div></div></section>';
      return smallCards([["Client", client.name || ""],["Main URL", client.site_domain || ""],["Keywords", (data.keywords || []).length],["Runs", (data.runs || []).length],["Reports", (data.reports || []).length],["Snapshots", (data.snapshots || []).length],["Targets", (data.targets || []).length],["Jobs", (data.jobs || []).length],["Plans", (data.content_plans || []).length]])
        + actionButtons
        + '<section><div class="head"><h3>Keywords</h3></div>' + detailTable(["Keyword","Intent","Priority","Created"], keywordRows, "No keywords synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Cora Runs</h3></div>' + detailTable(["Keyword","Target","Imported",""], runRows, "No Cora runs synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Reports</h3></div>' + detailTable(["Report","Level","Created","Files",""], reportRows, "No reports synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Ranking Snapshots</h3></div>' + detailTable(["Target","Locale","Created",""], snapshotRows, "No ranking snapshots synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Optimization Targets</h3></div>' + detailTable(["URL","Keyword","Best Pos","Score","Status"], targetRows, "No optimization targets synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Jobs</h3></div>' + detailTable(["Keyword","Tool/Profile","Status","Updated"], jobRows, "No jobs synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Content Plans</h3></div>' + detailTable(["Title","Keyword","Type","Status","Due"], planRows, "No content plans synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Entity Activity</h3></div>' + detailTable(["Seed","Depth","Progress","Status","Updated"], entityRows, "No entity batches synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Entity Model Runs</h3></div>' + detailTable(["Seed","Provider","Model","Status",""], entityRunRows, "No entity model runs synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Entity Sets</h3></div>' + detailTable(["Set","Terms","Updated",""], setRows, "No entity sets synced for this client.") + '</section>';
    }
    function detailPanel() {
      const detail = state.detail;
      if (!detail) return "";
      if (detail.loading) return '<section class="detail-panel"><div class="head"><h3>Loading Details</h3><button class="close-detail">Close</button></div><div class="empty">Loading detail data...</div></section>';
      const renderers = { client: clientDetail, run: runDetail, sheet: sheetDetail, snapshot: snapshotDetail, "entity-run": entityRunDetail, "entity-set": entitySetDetail };
      const title = detail.type === "client" ? "Client Workspace" : detail.type === "run" ? "Cora Run Detail" : detail.type === "sheet" ? "Worksheet Rows" : detail.type === "snapshot" ? "Ranking Snapshot Detail" : detail.type === "entity-run" ? "Entity Explorer Run Detail" : "Entity Set Detail";
      return '<section class="detail-panel"><div class="head"><h3>' + esc(title) + '</h3><button class="close-detail">Close</button></div>' + (renderers[detail.type] ? renderers[detail.type](detail.data || {}) : '<div class="empty">Unsupported detail type.</div>') + '</section>';
    }
    function commandSummary(command_type, payload) {
      if (command_type === "create_project") return 'Create or reuse client "' + (payload.name || "") + '" for ' + (payload.site_domain || "no domain");
      if (command_type === "add_keyword") return 'Add or reuse keyword "' + (payload.keyword || "") + '" on client ID ' + (payload.project_id || "");
      if (command_type === "create_content_plan") return 'Create or reuse content plan "' + (payload.title || "") + '" on client ID ' + (payload.project_id || "");
      if (command_type === "create_share_report") return 'Create or reuse ' + (payload.level || "medium") + ' report for run ID ' + (payload.run_id || "");
      if (command_type === "run_cora") return 'Queue Cora locally for "' + (payload.keyword || "") + '" against ' + (payload.target_url || "") + '. Local bridge must allow Cora execution.';
      if (command_type === "create_ranking_snapshot") return (payload.dry_run ? "Dry-run " : "") + 'Run Ranking Snapshot for ' + (payload.target || "") + '. Real runs require paid/API tools enabled on the local bridge.';
      if (command_type === "run_entity_lsi") return (payload.dry_run ? "Dry-run " : "") + 'Run Entity Explorer for "' + (payload.seed_keyword || "") + '" across ' + ((payload.targets || []).length || 0) + ' model(s)' + (payload.execution_mode === "cloud" ? ' in Cloudflare.' : '. Real local runs require paid/API tools enabled on the local bridge.');
      if (command_type === "sync_cloud_data") return 'Ask the local bridge to push dashboard data to Cloudflare' + (payload.tables?.length ? ': ' + payload.tables.join(', ') : ' for all sync tables') + '.';
      if (command_type === "sync_cloud_to_local") return 'Ask the local bridge to pull Cloudflare changes into the local dashboard' + (payload.tables?.length ? ': ' + payload.tables.join(', ') : '.') ;
      if (command_type === "sync_report_artifacts") return 'Ask the local bridge to upload report HTML/XLSX artifacts' + (payload.force ? ' and force re-upload existing files.' : '.');
      return command_type;
    }
    function setPendingCommand(command_type, payload) {
      const error = validateCommand(command_type, payload);
      if (error) {
        alert(error);
        return;
      }
      state.pendingWrite = { command_type, payload, summary: commandSummary(command_type, payload) };
      render();
    }
    function validateCommand(command_type, payload) {
      if (command_type === "create_project" && !(payload.name || "").trim()) return "Client name is required.";
      if (command_type === "add_keyword" && (!(payload.project_id) || !(payload.keyword || "").trim())) return "Select a client and enter a keyword.";
      if (command_type === "create_content_plan" && (!(payload.project_id) || !(payload.title || "").trim())) return "Select a client and enter a plan title.";
      if (command_type === "create_share_report" && !payload.run_id) return "Select a Cora run for the report.";
      if (command_type === "run_cora" && (!(payload.project_id) || !(payload.keyword || "").trim() || !(payload.target_url || "").trim())) return "Select a client, keyword, and target URL for Cora.";
      if (command_type === "create_ranking_snapshot" && (!(payload.project_id) || !(payload.target || "").trim())) return "Select a client and enter a target domain.";
      if (command_type === "run_entity_lsi") {
        if (!payload.project_id || !(payload.seed_keyword || "").trim()) return "Select a client and enter a seed keyword.";
        if (!Array.isArray(payload.targets) || !payload.targets.length) return "Add at least one Entity Explorer model target.";
        if (payload.execution_mode === "cloud" && payload.targets.some((target) => !target.provider || !target.model)) return "Cloud Entity Explorer targets must use provider:model, for example openai:gpt-5.5.";
        if (payload.execution_mode !== "cloud" && payload.targets.some((target) => !target.api_key_id || !target.model)) return "Local Entity Explorer targets must use apiKeyId:model.";
      }
      return "";
    }
    async function sendPendingCommand() {
      const pending = state.pendingWrite;
      if (!pending) return;
      if (isPaidLiveCommand(pending.command_type, pending.payload) && !document.getElementById("confirm-paid-command")?.checked) {
        throw new Error("Confirm the paid/API run before queueing.");
      }
      const operator = localStorage.getItem("opos_operator_name") || "cloud-dashboard";
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ command_type: pending.command_type, payload: { ...pending.payload, reviewed_at: new Date().toISOString() }, created_by: operator })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Command failed");
      state.pendingWrite = null;
      await load();
      if (data.duplicate) alert("Matching command already exists; not queued again.");
    }
    async function retryCommand(id) {
      const response = await fetch("/api/commands/" + encodeURIComponent(id), {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ status: "pending" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Retry failed");
      await load();
    }
    function adminView(data) {
      if (!data.is_admin) return '<section><div class="head"><h3>Admin</h3><span class="pill warn">Admin required</span></div><div class="empty">Use an admin session or admin/sync token to manage users and cloud tool policies.</div></section>';
      const admin = data.admin || {};
      const users = admin.users || [];
      const policies = admin.tool_policies || [];
      const secrets = admin.secret_status || {};
      const clients = data.clients || [];
      const clientName = (id) => (clients.find((client) => String(client.id) === String(id))?.name || ("Client #" + id));
      const today = Object.fromEntries((admin.tool_usage_today || []).map((row) => [row.command_type, row.runs]));
      const month = Object.fromEntries((admin.tool_usage_month || []).map((row) => [row.command_type, row.runs]));
      const secretRows = Object.entries(secrets).map(([name, present]) => '<div class="status-row"><span>' + esc(name) + '</span><strong class="' + (present ? 'ok' : 'warn') + '">' + esc(present ? 'Configured' : 'Missing') + '</strong></div>').join("");
      const userRows = users.map((u) => {
        const clientScope = (u.client_ids || []).length ? (u.client_ids || []).map(clientName).join(", ") : "All clients";
        const encoded = encodeURIComponent(JSON.stringify({ email: u.email || "", name: u.name || "", role: u.role || "read", status: u.status || "active", client_ids: u.client_ids || [] }));
        return '<tr><td><strong>' + esc(u.email || "") + '</strong><br><span class="muted">' + esc(u.name || "") + '</span></td><td><span class="pill">' + esc(u.role || "") + '</span></td><td>' + esc(u.status || "") + '</td><td>' + esc(clientScope) + '</td><td>' + esc(fmtDate(u.last_login_at)) + '</td><td><button class="admin-edit-user mini-btn" data-user="' + encoded + '">Edit</button></td></tr>';
      });
      const policyRows = policies.map((p) => '<tr><td><strong>' + esc(commandLabel(p.tool_key || p.tool_key)) + '</strong><br><span class="muted">' + esc(p.tool_key || "") + '</span></td><td>' + esc(p.cloud_enabled ? 'Cloud enabled' : 'Cloud disabled') + '</td><td>' + esc(p.daily_limit ?? "") + '</td><td>' + esc(p.monthly_limit ?? "") + '</td><td>' + esc(p.per_client_daily_limit ?? "") + '</td><td>' + esc(today[p.tool_key] || 0) + ' today<br><span class="muted">' + esc(month[p.tool_key] || 0) + ' this month</span></td></tr>');
      const clientChecks = clients.map((client) => '<label class="check-item"><input class="admin-client-check" type="checkbox" value="' + esc(client.id) + '"><span><strong>' + esc(client.name || client.client || ("Client #" + client.id)) + '</strong><br><span class="muted">' + esc(client.site_domain || "") + '</span></span></label>').join("");
      const userForm = '<section><div class="head"><h3>Create / Update User</h3><span class="muted">Email login, roles, client scope.</span></div><div class="status-list"><div class="field-row"><input id="admin-user-email" type="email" placeholder="user@example.com"><input id="admin-user-name" placeholder="Name"><select id="admin-user-role"><option value="read">Read - view only</option><option value="write">Write - queue client tools</option><option value="admin">Admin - full access</option></select><select id="admin-user-status"><option value="active">Active</option><option value="disabled">Disabled</option></select></div><div><div class="muted">Client access. Leave all unchecked for all clients.</div><div class="toolbar" style="margin:8px 0"><button id="admin-select-all-clients" type="button" class="secondary">Select All</button><button id="admin-clear-clients" type="button" class="secondary">Clear Clients</button></div><div class="check-list">' + (clientChecks || '<div class="muted">No clients synced yet.</div>') + '</div></div><div class="toolbar"><button id="admin-save-user">Save User</button><button id="admin-clear-user" type="button" class="secondary">Clear Form</button></div></div></section>';
      const policyForm = '<section><div class="head"><h3>Tool Guardrails</h3><span class="muted">Controls paid cloud tool execution.</span></div><div class="status-list"><div class="field-row"><select id="policy-tool"><option value="create_ranking_snapshot">Ranking Snapshot</option><option value="run_entity_lsi">Entity Explorer</option></select><select id="policy-cloud"><option value="true">Cloud enabled</option><option value="false">Cloud disabled</option></select><input id="policy-daily" placeholder="Daily limit"><input id="policy-monthly" placeholder="Monthly limit"><input id="policy-client-daily" placeholder="Per-client daily"></div><div class="toolbar"><button id="admin-save-policy">Save Policy</button></div></div>' + table(["Tool","Cloud","Daily","Monthly","Client Daily","Usage"], policyRows, "No tool policies yet.") + '</section>';
      return '<div class="grid2"><section><div class="head"><h3>Current Access</h3><span class="pill ok">' + esc(data.user?.role || "") + '</span></div><div class="status-list"><div class="status-row"><span>User</span><strong>' + esc(data.user?.email || "") + '</strong></div><div class="head"><h3>Provider Secrets</h3></div>' + (secretRows || '<div class="muted">No secret status available.</div>') + '</div></section>' + userForm + '</div>' + policyForm + '<section><div class="head"><h3>Users</h3><span class="muted">Click Edit to load a user into the form.</span></div>' + table(["Email","Role","Status","Client Scope","Last Login",""], userRows, "No cloud users yet.") + '</section>';
    }
    function bindAdminForms() {
      const byId = (id) => document.getElementById(id);
      const checkedClientIds = () => Array.from(document.querySelectorAll(".admin-client-check:checked")).map((input) => Number(input.value)).filter(Boolean);
      const setClientChecks = (ids) => {
        const wanted = new Set((ids || []).map((id) => String(id)));
        document.querySelectorAll(".admin-client-check").forEach((input) => { input.checked = wanted.has(String(input.value)); });
      };
      const clearUserForm = () => {
        byId("admin-user-email").value = "";
        byId("admin-user-name").value = "";
        byId("admin-user-role").value = "read";
        byId("admin-user-status").value = "active";
        setClientChecks([]);
      };
      byId("admin-select-all-clients")?.addEventListener("click", () => document.querySelectorAll(".admin-client-check").forEach((input) => { input.checked = true; }));
      byId("admin-clear-clients")?.addEventListener("click", () => setClientChecks([]));
      byId("admin-clear-user")?.addEventListener("click", clearUserForm);
      document.querySelectorAll(".admin-edit-user").forEach((button) => {
        button.addEventListener("click", () => {
          const user = JSON.parse(decodeURIComponent(button.dataset.user || "%7B%7D"));
          byId("admin-user-email").value = user.email || "";
          byId("admin-user-name").value = user.name || "";
          byId("admin-user-role").value = user.role || "read";
          byId("admin-user-status").value = user.status || "active";
          setClientChecks(user.client_ids || []);
          byId("admin-user-email").focus();
        });
      });
      byId("admin-save-user")?.addEventListener("click", () => (async () => {
        const payload = {
          email: byId("admin-user-email").value,
          name: byId("admin-user-name").value,
          role: byId("admin-user-role").value,
          status: byId("admin-user-status").value,
          client_ids: checkedClientIds()
        };
        const response = await fetch("/api/admin/users", { method: "POST", headers: writeHeaders(), body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "User save failed");
        await load();
      })().catch((error) => alert(error.message || error)));
      byId("admin-save-policy")?.addEventListener("click", () => (async () => {
        const payload = {
          tool_key: byId("policy-tool").value,
          cloud_enabled: byId("policy-cloud").value === "true",
          daily_limit: byId("policy-daily").value ? Number(byId("policy-daily").value) : null,
          monthly_limit: byId("policy-monthly").value ? Number(byId("policy-monthly").value) : null,
          per_client_daily_limit: byId("policy-client-daily").value ? Number(byId("policy-client-daily").value) : null
        };
        const response = await fetch("/api/admin/tool-policy", { method: "POST", headers: writeHeaders(), body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Policy save failed");
        await load();
      })().catch((error) => alert(error.message || error)));
    }
    function commandsView(data) {
      const pending = state.pendingWrite;
      const paidLive = pending && isPaidLiveCommand(pending.command_type, pending.payload);
      const review = pending ? '<section><div class="head"><h3>Review Command</h3><span class="pill ' + (paidLive ? 'warn' : '') + '">' + esc(paidLive ? 'Paid/API review' : 'Not queued yet') + '</span></div><div class="review ' + (paidLive ? 'danger' : '') + '"><strong>' + esc(pending.summary) + '</strong><div class="muted">' + esc(commandRisk(pending.command_type, pending.payload)) + '</div>' + (paidLive ? '<label class="muted"><input id="confirm-paid-command" type="checkbox" style="min-width:auto"> I understand this can use paid API credits.</label>' : '') + '<pre>' + esc(JSON.stringify(pending.payload, null, 2)) + '</pre><div class="toolbar"><button id="confirm-command">Queue Reviewed Command</button><button id="cancel-command" class="secondary">Cancel</button></div></div></section>' : '';
      const bridge = (data.bridges || [])[0] || {};
      const bridgePanel = '<section><div class="head"><h3>Bridge Control</h3><span class="pill ' + (bridge.online ? 'ok' : 'warn') + '">' + esc(bridge.online ? 'Online' : 'Offline') + '</span></div><div class="bridge-flags"><div class="bridge-flag"><strong>' + esc(bridge.allow_cora ? 'Enabled' : 'Off') + '</strong><span class="muted">Cora execution</span></div><div class="bridge-flag"><strong>' + esc(bridge.allow_paid_tools ? 'Enabled' : 'Off') + '</strong><span class="muted">Paid/API tools</span></div><div class="bridge-flag"><strong>' + esc(bridge.poll_interval || 0) + 's</strong><span class="muted">Poll interval</span></div></div><div class="status-list"><div class="muted">Last seen ' + esc(fmtDate(bridge.last_seen_at)) + '. Real Cora and paid/API runs require the matching local bridge permission. Dry runs are safe for validation.</div><div class="toolbar"><button id="cmd-bridge-dry-sync">Review Sync Dry Run</button><button id="cmd-bridge-dry-ranking" class="secondary">Review Ranking Dry Run</button></div></div></section>';
      const access = '<section><div class="head"><h3>Unlock Writes</h3><span class="pill warn">Protected</span></div><div class="status-list"><div class="muted">Writes can use a write/admin email session or the admin/sync token. Scoped users can only queue commands for assigned clients.</div><input id="admin-token" type="password" placeholder="Admin token" value="' + esc(adminToken()) + '"><input id="operator-name" placeholder="Operator name" value="' + esc(localStorage.getItem("opos_operator_name") || "") + '"><div class="toolbar"><button id="save-token">Save Write Access</button><button id="clear-token" class="secondary">Clear</button></div></div></section>';
      const syncGroup = '<section class="command-group"><div class="head"><h3>Sync</h3><span class="muted">Cloud mirror maintenance</span></div><div class="command-grid"><div class="command-card"><h4>Sync Local to Cloud</h4><div class="muted">Push local dashboard tables back to Cloudflare.</div><input id="cmd-sync-tables" placeholder="Optional tables: projects,keywords,runs"><label class="muted"><input id="cmd-sync-dry" type="checkbox" style="min-width:auto"> Dry run</label><button id="cmd-sync-cloud">Review Data Push</button></div><div class="command-card"><h4>Pull Cloud to Local</h4><div class="muted">Import cloud-created clients, keywords, plans, and report metadata into the local dashboard.</div><input id="cmd-pull-tables" placeholder="Optional tables: projects,sites,keywords,content_plans,share_reports"><label class="muted"><input id="cmd-pull-dry" type="checkbox" checked style="min-width:auto"> Dry run</label><button id="cmd-pull-cloud">Review Pull Sync</button></div><div class="command-card"><h4>Sync Report Files</h4><div class="muted">Upload report HTML and source XLSX artifacts to R2.</div><input id="cmd-artifact-report-ids" placeholder="Optional report IDs: 1,2,3"><label class="muted"><input id="cmd-artifact-force" type="checkbox" style="min-width:auto"> Force re-upload</label><label class="muted"><input id="cmd-artifact-dry" type="checkbox" style="min-width:auto"> Dry run</label><button id="cmd-sync-artifacts">Review Artifact Sync</button></div></div></section>';
      const clientGroup = '<section class="command-group"><div class="head"><h3>Clients & Reports</h3><span class="muted">Lightweight cloud writes</span></div><div class="command-grid"><div class="command-card"><h4>Create Client</h4><input id="cmd-client-name" placeholder="Client name"><input id="cmd-client-site" placeholder="Main URL or domain"><input id="cmd-client-notes" placeholder="Notes"><button id="cmd-create-client">Review Create Client</button></div><div class="command-card"><h4>Add Keyword</h4><select id="cmd-keyword-project">' + projectOptions() + '</select><input id="cmd-keyword" placeholder="Keyword"><button id="cmd-add-keyword">Review Keyword</button></div><div class="command-card"><h4>Content Plan</h4><select id="cmd-plan-project">' + projectOptions() + '</select><input id="cmd-plan-title" placeholder="Plan title"><input id="cmd-plan-keyword" placeholder="Optional keyword id"><input id="cmd-plan-notes" placeholder="Notes"><button id="cmd-content-plan">Review Content Plan</button></div><div class="command-card"><h4>Customer Report</h4><select id="cmd-report-run">' + runOptions() + '</select><select id="cmd-report-level"><option value="medium">Medium</option><option value="basic">Basic</option><option value="comprehensive">Comprehensive</option></select><input id="cmd-report-title" placeholder="Optional title"><button id="cmd-share-report">Review Report</button></div></div></section>';
      const toolGroup = '<section class="command-group"><div class="head"><h3>Run Tools</h3><span class="pill warn">Local bridge for Cora</span></div><div class="command-grid"><div class="command-card"><h4>Run Cora</h4><div class="muted">Queues local Cora. Requires Cora execution enabled on the bridge.</div><select id="cmd-cora-project">' + projectOptions() + '</select><input id="cmd-cora-keyword" placeholder="Keyword"><input id="cmd-cora-url" placeholder="Target URL"><input id="cmd-cora-profile" placeholder="Optional Cora profile"><button id="cmd-run-cora">Review Cora Run</button></div><div class="command-card"><h4>Ranking Snapshot</h4><div class="muted">Runs DataForSEO Labs. Cloud mode runs directly in Cloudflare.</div><select id="cmd-ranking-project">' + projectOptions() + '</select><input id="cmd-ranking-target" placeholder="Domain, example.com"><div class="field-row"><input id="cmd-ranking-location" placeholder="Location code" value="2840"><input id="cmd-ranking-language" placeholder="Language" value="en"><input id="cmd-ranking-limit" placeholder="Limit" value="1000"></div><label class="muted"><input id="cmd-ranking-cloud" type="checkbox" checked style="min-width:auto"> Run in Cloudflare</label><label class="muted"><input id="cmd-ranking-subdomains" type="checkbox" style="min-width:auto"> Include subdomains</label><label class="muted"><input id="cmd-ranking-force" type="checkbox" style="min-width:auto"> Force refresh</label><label class="muted"><input id="cmd-ranking-dry" type="checkbox" checked style="min-width:auto"> Dry run</label><button id="cmd-ranking-snapshot">Review Ranking Snapshot</button></div><div class="command-card"><h4>Entity Explorer</h4><div class="muted">Cloud targets use provider:model. Local targets use apiKeyId:model.</div><select id="cmd-entity-project">' + projectOptions() + '</select><input id="cmd-entity-seed" placeholder="Seed keyword"><input id="cmd-entity-depth" placeholder="Depth 1-5" value="3"><textarea id="cmd-entity-targets" placeholder="openai:gpt-5.5&#10;anthropic:claude-opus-4-8"></textarea><label class="muted"><input id="cmd-entity-cloud" type="checkbox" checked style="min-width:auto"> Run in Cloudflare</label><label class="muted"><input id="cmd-entity-async" type="checkbox" checked style="min-width:auto"> Run async</label><label class="muted"><input id="cmd-entity-dry" type="checkbox" checked style="min-width:auto"> Dry run</label><button id="cmd-entity-lsi">Review Entity Explorer</button></div></div></section>';
      const commandTypes = [...new Set((data.commands || []).map((c) => c.command_type).filter(Boolean))];
      const filteredCommands = (data.commands || []).filter((c) => (state.commandStatus === "all" || c.status === state.commandStatus) && (state.commandType === "all" || c.command_type === state.commandType));
      const commandFilters = '<div class="filters"><select id="command-status-filter"><option value="all">All statuses</option>' + ["pending", "claimed", "complete", "failed"].map((status) => '<option value="' + status + '"' + (state.commandStatus === status ? ' selected' : '') + '>' + esc(commandStatusLabel(status)) + '</option>').join("") + '</select><select id="command-type-filter"><option value="all">All command types</option>' + commandTypes.map((type) => '<option value="' + esc(type) + '"' + (state.commandType === type ? ' selected' : '') + '>' + esc(commandLabel(type)) + '</option>').join("") + '</select></div>';
      const forms = '<div class="grid2">' + access + bridgePanel + '</div>' + review + syncGroup + clientGroup + toolGroup + '<section><div class="head"><h3>Command History</h3><span class="muted">Queued, claimed locally, completed, failed, and local result are tracked here.</span></div>' + commandFilters + commandsTable(filteredCommands) + '</section>';
      setTimeout(bindCommandForms, 0);
      return forms;
    }
    function bindCommandForms() {
      const byId = (id) => document.getElementById(id);
      byId("save-token")?.addEventListener("click", () => { localStorage.setItem("opos_admin_token", byId("admin-token").value || ""); localStorage.setItem("opos_operator_name", byId("operator-name").value || "cloud-dashboard"); alert("Write access saved."); });
      byId("clear-token")?.addEventListener("click", () => { localStorage.removeItem("opos_admin_token"); byId("admin-token").value = ""; });
      byId("cmd-bridge-dry-sync")?.addEventListener("click", () => setPendingCommand("sync_cloud_data", { tables: ["projects"], dry_run: true }));
      byId("cmd-bridge-dry-ranking")?.addEventListener("click", () => {
        const projectId = Number((state.data?.clients || [])[0]?.id || 0);
        setPendingCommand("create_ranking_snapshot", { project_id: projectId, target: "example.com", location_code: 2840, language_code: "en", limit: 100, dry_run: true });
      });
      byId("cmd-create-client")?.addEventListener("click", () => setPendingCommand("create_project", { execution_mode: "cloud", name: byId("cmd-client-name").value, site_domain: byId("cmd-client-site").value, notes: byId("cmd-client-notes").value }));
      byId("cmd-add-keyword")?.addEventListener("click", () => setPendingCommand("add_keyword", { execution_mode: "cloud", project_id: Number(byId("cmd-keyword-project").value), keyword: byId("cmd-keyword").value }));
      byId("cmd-content-plan")?.addEventListener("click", () => setPendingCommand("create_content_plan", { execution_mode: "cloud", project_id: Number(byId("cmd-plan-project").value), title: byId("cmd-plan-title").value, keyword_id: Number(byId("cmd-plan-keyword").value || 0) || null, notes: byId("cmd-plan-notes").value }));
      byId("cmd-share-report")?.addEventListener("click", () => setPendingCommand("create_share_report", { execution_mode: "cloud", run_id: Number(byId("cmd-report-run").value), level: byId("cmd-report-level").value, title: byId("cmd-report-title").value }));
      byId("cmd-run-cora")?.addEventListener("click", () => setPendingCommand("run_cora", { project_id: Number(byId("cmd-cora-project").value), keyword: byId("cmd-cora-keyword").value, target_url: byId("cmd-cora-url").value, cora_profile: byId("cmd-cora-profile").value }));
      byId("cmd-ranking-snapshot")?.addEventListener("click", () => setPendingCommand("create_ranking_snapshot", { execution_mode: Boolean(byId("cmd-ranking-cloud").checked) ? "cloud" : "local", project_id: Number(byId("cmd-ranking-project").value), target: byId("cmd-ranking-target").value, location_code: Number(byId("cmd-ranking-location").value || 2840), language_code: byId("cmd-ranking-language").value || "en", limit: Number(byId("cmd-ranking-limit").value || 1000), include_subdomains: Boolean(byId("cmd-ranking-subdomains").checked), force_refresh: Boolean(byId("cmd-ranking-force").checked), dry_run: Boolean(byId("cmd-ranking-dry").checked) }));
      byId("cmd-entity-lsi")?.addEventListener("click", () => setPendingCommand("run_entity_lsi", { execution_mode: Boolean(byId("cmd-entity-cloud").checked) ? "cloud" : "local", project_id: Number(byId("cmd-entity-project").value), seed_keyword: byId("cmd-entity-seed").value, depth: Number(byId("cmd-entity-depth").value || 3), targets: parseEntityTargets(byId("cmd-entity-targets").value), run_async: Boolean(byId("cmd-entity-async").checked), dry_run: Boolean(byId("cmd-entity-dry").checked) }));
      byId("cmd-sync-cloud")?.addEventListener("click", () => setPendingCommand("sync_cloud_data", { tables: (byId("cmd-sync-tables").value || "").split(",").map((v) => v.trim()).filter(Boolean), dry_run: Boolean(byId("cmd-sync-dry").checked) }));
      byId("cmd-pull-cloud")?.addEventListener("click", () => setPendingCommand("sync_cloud_to_local", { tables: (byId("cmd-pull-tables").value || "").split(",").map((v) => v.trim()).filter(Boolean), dry_run: Boolean(byId("cmd-pull-dry").checked) }));
      byId("cmd-sync-artifacts")?.addEventListener("click", () => setPendingCommand("sync_report_artifacts", { report_ids: (byId("cmd-artifact-report-ids").value || "").split(",").map((v) => Number(v.trim())).filter(Boolean), dry_run: Boolean(byId("cmd-artifact-dry").checked), force: Boolean(byId("cmd-artifact-force").checked) }));
      byId("confirm-command")?.addEventListener("click", () => sendPendingCommand().catch((e) => alert(e.message)));
      byId("cancel-command")?.addEventListener("click", () => { state.pendingWrite = null; render(); });
      byId("command-status-filter")?.addEventListener("change", (event) => { state.commandStatus = event.target.value || "all"; render(); });
      byId("command-type-filter")?.addEventListener("change", (event) => { state.commandType = event.target.value || "all"; render(); });
      document.querySelectorAll(".retry-command").forEach((button) => button.addEventListener("click", () => retryCommand(button.dataset.commandId).catch((e) => alert(e.message))));
    }
    function parseEntityTargets(value) {
      return String(value || "").split(/[,\\n]/).map((raw) => raw.trim()).filter(Boolean).map((raw) => {
        const parts = raw.split(":");
        const first = parts.shift() || "";
        const model = parts.join(":").trim();
        const apiKeyId = Number(first);
        return Number.isFinite(apiKeyId) && apiKeyId > 0 ? { api_key_id: apiKeyId, model } : { provider: first.trim(), model };
      }).filter((target) => (target.api_key_id || target.provider) && target.model);
    }
    function bindReportControls() {
      const client = document.getElementById("report-client-filter");
      const level = document.getElementById("report-level-filter");
      if (client) client.onchange = (event) => { state.reportClient = event.target.value || "all"; render(); };
      if (level) level.onchange = (event) => { state.reportLevel = event.target.value || "all"; render(); };
      document.querySelectorAll(".copy-btn").forEach((button) => {
        button.onclick = async () => {
          const value = button.dataset.copy || "";
          try {
            await navigator.clipboard.writeText(value);
            button.textContent = "Copied";
            setTimeout(() => { button.textContent = button.dataset.copy?.includes("/download") ? "Copy XLSX" : "Copy report"; }, 1200);
          } catch (_err) {
            prompt("Copy URL", value);
          }
        };
      });
    }
    function bindDetailControls() {
      document.querySelectorAll(".detail-btn").forEach((button) => {
        if (button.classList.contains("sheet-btn")) return;
        button.onclick = () => openDetail(button.dataset.detailType, button.dataset.detailId).catch((error) => {
          state.detail = { type: button.dataset.detailType, id: button.dataset.detailId, data: null };
          document.getElementById("app").insertAdjacentHTML("beforeend", '<div class="empty warn">' + esc(error.message || error) + '</div>');
        });
      });
      document.querySelectorAll(".sheet-btn").forEach((button) => {
        button.onclick = () => openSheetDetail(button.dataset.runId, button.dataset.sheet, button.dataset.source || "").catch((error) => {
          state.detail = { type: "sheet", id: button.dataset.runId + ":" + button.dataset.sheet, data: null };
          document.getElementById("app").insertAdjacentHTML("beforeend", '<div class="empty warn">' + esc(error.message || error) + '</div>');
        });
      });
      document.querySelectorAll(".close-detail").forEach((button) => {
        button.onclick = () => { state.detail = null; render(); };
      });
      document.querySelectorAll(".client-command").forEach((button) => {
        button.onclick = () => {
          const projectId = Number(button.dataset.projectId || 0);
          const keyword = button.dataset.keyword || "";
          const target = button.dataset.target || "";
          if (button.dataset.clientCommand === "ranking") {
            setPage("commands");
            setPendingCommand("create_ranking_snapshot", { project_id: projectId, target, location_code: 2840, language_code: "en", limit: 1000, dry_run: true });
          } else if (button.dataset.clientCommand === "cora") {
            setPage("commands");
            setPendingCommand("run_cora", { project_id: projectId, keyword, target_url: target });
          } else if (button.dataset.clientCommand === "entity") {
            setPage("commands");
            setTimeout(() => alert("Entity Explorer needs at least one model target. The Commands page is open; select this client and add apiKeyId:model targets."), 0);
          } else if (button.dataset.clientCommand === "pull") {
            setPage("commands");
            setPendingCommand("sync_cloud_to_local", { tables: ["projects", "sites", "keywords", "content_plans", "share_reports"], dry_run: true });
          }
        };
      });
    }
    function render() {
      const data = state.data;
      if (!data) return;
      const names = Object.fromEntries(pages);
      document.getElementById("page-title").textContent = names[state.page] || "Overview";
      document.getElementById("page-note").textContent = "Synced from local dashboard at " + fmtDate(data.generated_at);
      const content = {
        overview: () => overview(data),
        clients: () => '<section><div class="head"><h3>Clients</h3></div>' + clientsTable(data.clients || []) + '</section>',
        reports: () => reportPortal(data),
        runs: () => '<section><div class="head"><h3>Cora Runs</h3></div>' + runsTable(data.runs || []) + '</section>',
        jobs: () => '<section><div class="head"><h3>Cora Jobs</h3><span class="pill warn">Read only</span></div>' + jobsTable(data.jobs || []) + '</section>',
        ranking: () => '<section><div class="head"><h3>Ranking Snapshots</h3></div>' + snapshotsTable(data.snapshots || []) + '</section>',
        targets: () => '<section><div class="head"><h3>Optimization Targets</h3></div>' + targetsTable(data.targets || []) + '</section>',
        entities: () => entitiesView(data),
        plans: () => '<section><div class="head"><h3>Content Plans</h3></div>' + plansTable(data.content_plans || []) + '</section>',
        audit: () => auditView(data),
        commands: () => commandsView(data),
        admin: () => adminView(data)
      }[state.page] || (() => overview(data));
      document.getElementById("app").innerHTML = content() + detailPanel();
      setTimeout(bindReportControls, 0);
      setTimeout(bindDetailControls, 0);
      if (state.page === "audit") setTimeout(bindAuditFilters, 0);
      if (state.page === "admin") setTimeout(bindAdminForms, 0);
    }
    function lockedView(message) {
      document.getElementById("page-title").textContent = "Locked";
      document.getElementById("page-note").textContent = "Enter an email login code or read/admin token to view cloud dashboard data.";
      document.getElementById("app").innerHTML = '<section><div class="head"><h3>Dashboard Locked</h3><span class="pill warn">Auth required</span></div><div class="empty">' + esc(message || "Cloud dashboard data is protected. Public customer report links still work without login.") + '</div></section>';
    }
    async function load() {
      const token = readToken();
      const response = await fetch("/api/dashboard/mirror", { headers: authHeaders(token) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mirror load failed");
      state.data = data;
      render();
    }
    async function requestLoginCode() {
      const email = document.getElementById("login-email").value || "";
      const response = await fetch("/api/auth/request", { method: "POST", headers: writeHeaders(), body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login code request failed");
      if (data.dev_code) document.getElementById("login-code").value = data.dev_code;
      alert(data.dev_code ? "Code generated and filled for admin setup." : data.message || "If the account exists, a login code was sent.");
    }
    async function verifyLoginCode() {
      const email = document.getElementById("login-email").value || "";
      const code = document.getElementById("login-code").value || "";
      const response = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      await load();
    }
    async function logoutSession() {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("opos_read_token");
      localStorage.removeItem("opos_admin_token");
      state.data = null;
      document.getElementById("read-token").value = "";
      lockedView("Dashboard locked in this browser.");
    }
    renderNav();
    document.getElementById("refresh").onclick = () => load().catch((error) => document.getElementById("app").innerHTML = '<div class="empty warn">' + esc(error.message || error) + '</div>');
    document.getElementById("search").oninput = (event) => { state.q = event.target.value || ""; render(); };
    document.getElementById("read-token").value = readToken();
    document.getElementById("request-login").onclick = () => requestLoginCode().catch((error) => alert(error.message || error));
    document.getElementById("verify-login").onclick = () => verifyLoginCode().catch((error) => alert(error.message || error));
    document.getElementById("save-read-token").onclick = () => { localStorage.setItem("opos_read_token", document.getElementById("read-token").value || ""); load().catch((error) => lockedView(error.message || error)); };
    document.getElementById("lock-dashboard").onclick = () => logoutSession().catch((error) => alert(error.message || error));
    load().catch((error) => lockedView(error.message || error));
    setPage("overview");
  </script>
</body>
</html>`;
}

async function serveReportArtifact(request, env, token, artifactType) {
  const row = await env.DB.prepare(
    "SELECT * FROM report_artifacts WHERE token = ? AND artifact_type = ? ORDER BY uploaded_at DESC LIMIT 1"
  ).bind(token, artifactType).first();
  if (!row) return json({ ok: false, error: "Report artifact not found" }, 404);
  const object = await env.REPORTS.get(row.r2_key);
  if (!object) return json({ ok: false, error: "Report file missing" }, 404);
  const headers = new Headers();
  headers.set("content-type", row.content_type || "application/octet-stream");
  headers.set("cache-control", artifactType === "report_html" ? "no-store, max-age=0" : "private, max-age=300");
  if (artifactType === "source_xlsx") {
    const fileName = String(row.file_name || "cora-report.xlsx").replace(/"/g, "");
    headers.set("content-disposition", `attachment; filename="${fileName}"`);
    if (request.method !== "HEAD") {
      await logAudit(request, env, "report_download", "share_report", token, {
        artifact_type: artifactType,
        file_name: fileName
      }, "public-report-viewer");
    }
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  }
  if (request.method === "HEAD") return new Response(null, { headers });
  const sourceHtml = await object.text();
  const meta = await reportShareMetadata(env, token);
  await logAudit(request, env, "report_view", "share_report", token, {
    level: meta?.level || "",
    keyword: meta?.keyword || "",
    project_name: meta?.project_name || ""
  }, "public-report-viewer");
  return html(reportShareShell(request, meta, sourceHtml));
}

async function reportShareMetadata(env, token) {
  return await env.DB.prepare(
    `SELECT sr.id, sr.token, sr.level, sr.title, sr.notes, sr.created_at,
            r.keyword, r.target_url, r.target_domain, r.imported_at, r.file_name,
            p.name AS project_name, p.client AS client_name, p.site_domain,
            a.file_size, a.uploaded_at
     FROM share_reports sr
     LEFT JOIN runs r ON r.id = sr.run_id
     LEFT JOIN projects p ON p.id = r.project_id
     LEFT JOIN report_artifacts a ON a.token = sr.token AND a.artifact_type = 'report_html'
     WHERE sr.token = ? AND sr.revoked_at IS NULL
     ORDER BY a.uploaded_at DESC
     LIMIT 1`
  ).bind(token).first();
}

function reportShareShell(request, meta, sourceHtml) {
  const url = new URL(request.url);
  const title = meta?.title || meta?.keyword || "Cora Report";
  const client = meta?.project_name || meta?.client_name || "Client Report";
  const download = `${url.pathname.replace(/\/$/, "")}/download`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | On Page Optimization System</title>
  <style>
    :root { color-scheme: light; --bg:#f5f7fb; --panel:#ffffff; --line:#d9e1ea; --text:#16202c; --muted:#607083; --accent:#00796b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 Inter, Segoe UI, Arial, sans-serif; }
    header { background:var(--panel); border-bottom:1px solid var(--line); padding:18px 22px; position:sticky; top:0; z-index:5; }
    .bar { max-width:1280px; margin:0 auto; display:flex; justify-content:space-between; gap:18px; align-items:center; }
    h1 { margin:0; font-size:20px; line-height:1.2; }
    .meta { color:var(--muted); margin-top:4px; display:flex; gap:10px; flex-wrap:wrap; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    a, button { color:var(--accent); }
    .button { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:8px 10px; text-decoration:none; cursor:pointer; font-weight:700; }
    .primary { background:var(--accent); color:white; border-color:var(--accent); }
    main { max-width:1280px; margin:14px auto 28px; padding:0 14px; }
    .frame { background:white; border:1px solid var(--line); border-radius:8px; overflow:hidden; min-height:78vh; }
    iframe { display:block; border:0; width:100%; height:78vh; background:white; }
    @media (max-width:760px) { .bar { align-items:flex-start; flex-direction:column; } .actions { justify-content:flex-start; } iframe { height:75vh; } }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">
          <span>${escapeHtml(client)}</span>
          <span>${escapeHtml(meta?.keyword || "")}</span>
          <span>${escapeHtml(meta?.target_domain || meta?.target_url || "")}</span>
          <span>${escapeHtml((meta?.level || "").toUpperCase())}</span>
          <span>Created ${escapeHtml(meta?.created_at ? new Date(meta.created_at).toLocaleDateString() : "")}</span>
        </div>
      </div>
      <div class="actions">
        <a class="button primary" href="${escapeHtml(download)}">Download XLSX</a>
        <button class="button" id="copy-link">Copy report link</button>
      </div>
    </div>
  </header>
  <main>
    <div class="frame"><iframe title="Cora report" sandbox="allow-same-origin allow-popups allow-forms" srcdoc="${escapeHtml(sourceHtml)}"></iframe></div>
  </main>
  <script>
    document.getElementById("copy-link").onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        document.getElementById("copy-link").textContent = "Copied";
      } catch (_err) {
        prompt("Copy report link", location.href);
      }
    };
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/" && request.method === "GET") return html(cloudMirrorHtml());
      if (url.pathname === "/health") return json({ ok: true, app: env.APP_NAME || "OPOS" });
      if (url.pathname === "/api/auth/request" && request.method === "POST") return await handleAuthRequest(request, env);
      if (url.pathname === "/api/auth/verify" && request.method === "POST") return await handleAuthVerify(request, env);
      if (url.pathname === "/api/auth/me" && request.method === "GET") return await handleAuthMe(request, env);
      if (url.pathname === "/api/auth/logout" && request.method === "POST") return await handleAuthLogout(request, env);
      if (url.pathname === "/api/admin/users" && ["GET", "POST"].includes(request.method)) return await handleAdminUsers(request, env);
      if (url.pathname === "/api/admin/tool-policy" && ["GET", "POST"].includes(request.method)) return await handleAdminToolPolicy(request, env);
      if (url.pathname === "/api/dashboard/data" && request.method === "GET") return await handleDashboardData(request, env);
      if (url.pathname === "/api/dashboard/mirror" && request.method === "GET") return await handleDashboardMirrorData(request, env);
      if (url.pathname === "/api/secrets/status" && request.method === "GET") return await handleSecretsStatus(request, env);
      const clientDetailRoute = url.pathname.match(/^\/api\/clients\/(\d+)\/detail$/);
      if (clientDetailRoute && request.method === "GET") return await handleClientDetail(request, env, Number(clientDetailRoute[1]));
      const runDetailRoute = url.pathname.match(/^\/api\/runs\/(\d+)\/detail$/);
      if (runDetailRoute && request.method === "GET") return await handleRunDetail(request, env, Number(runDetailRoute[1]));
      const runSheetRowsRoute = url.pathname.match(/^\/api\/runs\/(\d+)\/sheet-rows$/);
      if (runSheetRowsRoute && request.method === "GET") return await handleRunSheetRows(request, env, Number(runSheetRowsRoute[1]));
      const rankingSnapshotDetailRoute = url.pathname.match(/^\/api\/ranking-snapshots\/(\d+)\/detail$/);
      if (rankingSnapshotDetailRoute && request.method === "GET") return await handleRankingSnapshotDetail(request, env, Number(rankingSnapshotDetailRoute[1]));
      const entityRunDetailRoute = url.pathname.match(/^\/api\/entity-runs\/(\d+)\/detail$/);
      if (entityRunDetailRoute && request.method === "GET") return await handleEntityRunDetail(request, env, Number(entityRunDetailRoute[1]));
      const entitySetDetailRoute = url.pathname.match(/^\/api\/entity-sets\/(\d+)\/detail$/);
      if (entitySetDetailRoute && request.method === "GET") return await handleEntitySetDetail(request, env, Number(entitySetDetailRoute[1]));
      if (url.pathname === "/api/commands" && request.method === "GET") return await listCommands(request, env);
      if (url.pathname === "/api/commands" && request.method === "POST") return await createCommand(request, env);
      const commandRoute = url.pathname.match(/^\/api\/commands\/(\d+)$/);
      if (commandRoute && request.method === "POST") return await updateCommand(request, env, Number(commandRoute[1]));
      if (url.pathname === "/api/bridge/heartbeat" && request.method === "POST") return await bridgeHeartbeat(request, env);
      const shareDownload = url.pathname.match(/^\/share\/report\/([^/]+)\/download$/);
      if (shareDownload && ["GET", "HEAD"].includes(request.method)) return await serveReportArtifact(request, env, decodeURIComponent(shareDownload[1]), "source_xlsx");
      const shareReport = url.pathname.match(/^\/share\/report\/([^/]+)$/);
      if (shareReport && ["GET", "HEAD"].includes(request.method)) return await serveReportArtifact(request, env, decodeURIComponent(shareReport[1]), "report_html");
      if (url.pathname === "/api/sync/status" && request.method === "GET") {
        if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
        return await handleStatus(env);
      }
      if (url.pathname === "/api/sync/push" && request.method === "POST") return await handleSyncPush(request, env);
      if (url.pathname === "/api/sync/export" && request.method === "GET") return await handleSyncExport(request, env);
      if (url.pathname === "/api/artifacts/status" && request.method === "GET") {
        if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
        return await handleArtifactStatus(env);
      }
      if (url.pathname === "/api/artifacts/upload" && request.method === "POST") return await handleArtifactUpload(request, env);
      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      return json({ ok: false, error: error.message || String(error) }, error.status || 500);
    }
  }
};
