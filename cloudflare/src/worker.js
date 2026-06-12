import { EmailMessage } from "cloudflare:email";

const TABLE_COLUMNS = {
  profiles: ["id", "name", "client", "notes", "created_at", "updated_at", "archived_at"],
  cora_domain_lists: ["id", "project_id", "profile_id", "scope", "list_type", "value", "notes", "created_at", "updated_at", "archived_at"],
  projects: ["id", "profile_id", "name", "client", "site_domain", "notes", "created_at", "updated_at"],
  sites: ["id", "project_id", "domain", "name", "created_at"],
  pages: ["id", "site_id", "url", "title", "created_at"],
  keywords: ["id", "project_id", "site_id", "page_id", "keyword", "intent", "priority", "created_at"],
  api_keys: ["id", "provider", "label", "key_value", "notes", "base_url", "default_model", "status", "last_tested_at", "last_error", "created_at", "updated_at"],
  runs: ["id", "project_id", "site_id", "page_id", "keyword_id", "keyword", "target_url", "target_domain", "report_date", "imported_at", "source_path", "archive_path", "file_name", "file_size", "sha256", "notes", "status"],
  serp_results: ["id", "run_id", "rank", "title", "url", "host", "is_target"],
  recommendations: ["id", "run_id", "factor_id", "factor", "recommendation", "status", "details", "percent", "pages", "max_value", "min_value", "average"],
  lsi_keywords: ["id", "run_id", "keyword", "spearman", "pearson", "best_of_both", "pages", "max_value", "average", "tracked_value", "deficit"],
  sheet_rows: ["id", "run_id", "sheet", "row_index", "row_json"],
  workbook_rows: ["id", "run_id", "sheet", "row_index", "row_json"],
  managed_jobs: ["id", "project_id", "keyword_id", "keyword", "target_url", "target_domain", "cora_profile", "tool", "status", "status_message", "cora_running", "cora_action", "progress", "report_path", "run_id", "error", "started_at", "updated_at", "completed_at", "last_activity_at", "retry_count", "max_retries", "next_retry_at", "stall_detected_at"],
  content_plans: ["id", "project_id", "site_id", "page_id", "keyword_id", "title", "content_type", "intent", "priority", "status", "due_date", "notes", "created_at", "updated_at"],
  entity_lsi_batches: ["id", "project_id", "seed_keyword", "depth", "target_count", "completed_count", "failed_count", "status", "created_at", "updated_at"],
  entity_lsi_runs: ["id", "project_id", "batch_id", "seed_keyword", "depth", "api_key_id", "provider", "model", "status", "summary", "entities_json", "lsi_keywords_json", "related_keywords_json", "questions_json", "topics_json", "raw_response", "error", "created_at", "completed_at"],
  nlp_category_batches: ["id", "project_id", "source_type", "source_value", "status", "provider", "api_key_id", "target_count", "complete_count", "failed_count", "skipped_count", "max_urls", "same_host_only", "error", "created_at", "updated_at"],
  nlp_category_urls: ["id", "batch_id", "url", "status", "title", "category", "confidence", "primary_result", "categories_json", "word_count", "error", "raw_response", "created_at", "updated_at"],
  nlp_llm_comparison_runs: ["id", "batch_id", "project_id", "provider", "provider_key", "api_key_id", "model", "taxonomy", "status", "target_count", "complete_count", "failed_count", "prompt_version", "error", "created_at", "updated_at"],
  nlp_llm_comparison_results: ["id", "comparison_run_id", "batch_url_id", "url", "status", "llm_category", "confidence", "page_type", "explanation", "recommended_action", "raw_response", "error", "created_at", "updated_at"],
  entity_sets: ["id", "project_id", "source_batch_id", "name", "notes", "created_at", "updated_at"],
  entity_set_terms: ["id", "set_id", "term", "normalized", "type", "source_count", "sources_json", "notes", "created_at"],
  share_reports: ["id", "token", "run_id", "level", "title", "notes", "ranking_snapshot_id", "entity_set_id", "optimization_target_ids_json", "created_at", "revoked_at"],
  ranking_snapshots: ["id", "project_id", "target", "location_code", "language_code", "limit_value", "include_subdomains", "overview_json", "errors_json", "source", "freshness", "created_at"],
  ranking_snapshot_keywords: ["id", "snapshot_id", "keyword", "ranking_url", "position", "previous_position", "search_volume", "cpc", "competition", "competition_level", "keyword_difficulty", "estimated_traffic", "traffic_cost", "serp_features_json", "ai_overview_present", "ai_overview_reference", "intent", "last_updated", "created_at"],
  ranking_snapshot_pages: ["id", "snapshot_id", "url", "organic_keywords", "organic_traffic", "organic_traffic_cost", "top1", "top3", "top10", "top20", "top100", "paid_keywords", "paid_traffic", "created_at"],
  ranking_optimization_targets: ["id", "snapshot_id", "project_id", "url", "keyword", "best_position", "ranking_keywords", "opportunity_count", "total_search_volume", "estimated_traffic", "page_organic_traffic", "page_organic_keywords", "top10", "priority_type", "opportunity_score", "recommended_action", "top_keywords_json", "status", "notes", "created_at", "updated_at"]
};

const CLOUD_NLP_DEFAULT_MAX_URLS = 25;
const CLOUD_NLP_HARD_MAX_URLS = 50;
const CLOUD_NLP_MAX_TEXT_CHARS = 5000;
const CLOUD_NLP_MIN_WORDS = 20;
const CLOUD_NLP_FETCH_BYTES = 3000000;
const CLOUD_NLP_STATIC_ASSET_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".avif", ".bmp", ".tif", ".tiff",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".rar", ".7z", ".gz",
  ".mp4", ".mov", ".avi", ".wmv", ".mp3", ".wav", ".css", ".js", ".json", ".xml", ".txt"
]);

const NLP_LLM_COMPARISON_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string" },
    page_type: { type: "string", enum: ["homepage", "service", "location", "blog", "product", "category", "pricing", "faq", "other"] },
    confidence: { type: "number" },
    explanation: { type: "string" },
    recommended_action: { type: "string" }
  },
  required: ["category", "page_type", "confidence", "explanation", "recommended_action"]
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
  // Bearer-token callers (READ/ADMIN/SYNC) run in single-user mode; session users
  // need the write role so read-role accounts cannot queue commands or paid tools.
  const singleUserWrite = requireReadAuth(request, env) || requireSyncAuth(request, env);
  if (!scope.write && !singleUserWrite) {
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

const COMMAND_TYPES = new Set(["create_project", "create_profile", "update_profile", "attach_profile", "detach_profile", "archive_profile", "apply_cora_profile", "push_cora_profile", "create_cora_domain_entry", "update_cora_domain_entry", "archive_cora_domain_entry", "apply_cora_domain_lists", "pull_cora_domain_lists", "add_keyword", "create_content_plan", "create_share_report", "revoke_share_report", "run_cora", "create_ranking_snapshot", "run_entity_lsi", "run_nlp_categorizer", "run_nlp_llm_comparison", "sync_cloud_data", "sync_cloud_to_local", "sync_report_artifacts"]);
const RANKING_TARGET_STATUSES = new Set(["new", "selected", "in_cora", "in_entity_explorer", "content_plan_created", "optimized", "archived"]);
const CONTENT_PLAN_STATUSES = new Set(["planned", "in_progress", "drafting", "review", "published", "paused", "done", "archived"]);
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

const CORA_DOMAIN_LIST_TYPES = new Set(["tracked", "competitors", "banned", "slowRender", "stopWords"]);

function normalizeCoraDomainListType(value) {
  const raw = cleanText(value);
  const aliases = {
    competitor: "competitors",
    slow_render: "slowRender",
    "slow-render": "slowRender",
    slowrender: "slowRender",
    stop_words: "stopWords",
    "stop-words": "stopWords",
    stopwords: "stopWords"
  };
  const listType = aliases[raw] || raw;
  if (!CORA_DOMAIN_LIST_TYPES.has(listType)) throw new Error("Unsupported Cora domain list type.");
  return listType;
}

function normalizeCoraDomainValue(value) {
  let text = cleanText(value).replace(/^https?:\/\//i, "");
  text = text.includes("/") ? text.split("/", 1)[0] : text;
  text = text.toLowerCase();
  if (!text) throw new Error("Domain value is required.");
  return text;
}

function normalizeDomainScope(value) {
  return cleanText(value) || "global";
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numericValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function domainFromUrl(value) {
  const raw = cleanText(value).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  return raw.toLowerCase();
}

function comparableUrl(value) {
  return cleanText(value).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
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
  const aliases = { "open ai": "openai", "chatgpt": "openai", "claude": "anthropic", "gemini": "google", "google ai": "google", "google gemini": "google", "google nlp": "google_nlp", "google natural language": "google_nlp", "grok": "xai", "x.ai": "xai", "xai / grok": "xai", "pplx": "perplexity", "perplexity ai": "perplexity" };
  return aliases[key] || key;
}

function providerSecret(provider, env, secretOverride = "") {
  const key = normalizeProvider(provider);
  const secrets = {
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    google: env.GOOGLE_API_KEY,
    xai: env.XAI_API_KEY,
    perplexity: env.PERPLEXITY_API_KEY
  };
  if (secretOverride) return { provider: key, secret: secretOverride };
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

async function callCloudLlm(provider, model, prompt, env, secretOverride = "", options = {}) {
  const { provider: key, secret } = providerSecret(provider, env, secretOverride);
  if (key === "anthropic") {
    const tool = options.anthropic_tool;
    const body = { model, max_tokens: 5000, messages: [{ role: "user", content: prompt }] };
    if (tool?.name && tool?.input_schema) {
      body.tools = [{
        name: tool.name,
        description: tool.description || "Return the requested structured result.",
        input_schema: tool.input_schema
      }];
      body.tool_choice = { type: "tool", name: tool.name };
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": secret, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `Anthropic HTTP ${response.status}`);
    for (const part of data.content || []) {
      if (part?.type === "tool_use" && part.input && typeof part.input === "object") return JSON.stringify(part.input);
    }
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

function googleNlpSecret(env, secretOverride = "") {
  const secret = secretOverride || env.GOOGLE_NLP_API_KEY || env.GOOGLE_CLOUD_LANGUAGE_API_KEY || env.GOOGLE_API_KEY;
  if (!secret) throw new Error("Missing Cloudflare secret GOOGLE_NLP_API_KEY or GOOGLE_CLOUD_LANGUAGE_API_KEY.");
  return secret;
}

function normalizeNlpUrl(value) {
  const raw = cleanText(value);
  if (!raw) return "";
  try {
    const candidate = raw.toLowerCase().startsWith("http://") || raw.toLowerCase().startsWith("https://") ? raw : `https://${raw}`;
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return "";
    url.hash = "";
    return url.toString();
  } catch (_error) {
    return "";
  }
}

function nlpUrlHost(value) {
  try {
    const host = new URL(normalizeNlpUrl(value)).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch (_error) {
    return "";
  }
}

function nlpSameHost(url, host) {
  const current = nlpUrlHost(url);
  const expected = String(host || "").toLowerCase().replace(/^www\./, "");
  return Boolean(current && expected && (current === expected || current.endsWith(`.${expected}`)));
}

function nlpStaticAssetExtension(value) {
  try {
    const path = decodeURIComponent(new URL(normalizeNlpUrl(value)).pathname || "").toLowerCase();
    const index = path.lastIndexOf(".");
    if (index < 0) return "";
    const ext = path.slice(index);
    return CLOUD_NLP_STATIC_ASSET_EXTENSIONS.has(ext) ? ext : "";
  } catch (_error) {
    return "";
  }
}

function parseNlpUrlList(value) {
  const seen = new Set();
  const urls = [];
  for (const raw of String(value || "").split(/[\r\n,]+/)) {
    const url = normalizeNlpUrl(raw);
    if (url && !nlpStaticAssetExtension(url) && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

async function nlpFetchText(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "OPOSCloudNLP/1.0 (+https://onpage.localblitz.io)",
        "accept": "text/html,application/xml,text/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    const bytes = await response.arrayBuffer();
    const body = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, CLOUD_NLP_FETCH_BYTES));
    return { body, contentType };
  } finally {
    clearTimeout(timer);
  }
}

function extractSitemapLocs(textValue) {
  const textValueClean = String(textValue || "");
  const locs = [...textValueClean.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => cleanText(match[1])).filter(Boolean);
  const isIndex = /<sitemapindex[\s>]/i.test(textValueClean);
  return { pageLocs: isIndex ? [] : locs, sitemapLocs: isIndex ? locs : [] };
}

async function discoverCloudNlpUrls(sourceType, sourceValue, maxUrls, sameHostOnly = true) {
  const source = cleanText(sourceType) || "urls";
  const limit = Math.max(1, Math.min(Number(maxUrls || CLOUD_NLP_DEFAULT_MAX_URLS), CLOUD_NLP_HARD_MAX_URLS));
  if (source === "urls") {
    const urls = parseNlpUrlList(sourceValue).slice(0, limit);
    if (!urls.length) throw new Error("No crawlable URLs were found for that source.");
    return urls;
  }
  const sitemaps = [];
  let rootHost = "";
  if (source === "sitemap") {
    const sitemap = normalizeNlpUrl(sourceValue);
    if (!sitemap) throw new Error("Enter a valid sitemap URL.");
    sitemaps.push(sitemap);
    rootHost = nlpUrlHost(sitemap);
  } else if (source === "domain") {
    const root = normalizeNlpUrl(sourceValue);
    if (!root) throw new Error("Enter a valid domain.");
    const parsed = new URL(root);
    rootHost = nlpUrlHost(root);
    const base = `${parsed.protocol}//${parsed.host}`;
    try {
      const robots = await nlpFetchText(`${base}/robots.txt`, 8000);
      for (const line of robots.body.split(/\r?\n/)) {
        if (line.toLowerCase().startsWith("sitemap:")) {
          const candidate = normalizeNlpUrl(line.slice(line.indexOf(":") + 1).trim());
          if (candidate) sitemaps.push(candidate);
        }
      }
    } catch (_error) {}
    for (const path of ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"]) {
      const candidate = `${base}${path}`;
      if (!sitemaps.includes(candidate)) sitemaps.push(candidate);
    }
  } else {
    throw new Error("Choose URL list, sitemap, or domain source.");
  }
  const seenSitemaps = new Set();
  const queue = [...new Set(sitemaps)];
  const seenUrls = new Set();
  const urls = [];
  while (queue.length && seenSitemaps.size < 20 && urls.length < limit) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);
    let sitemap;
    try {
      sitemap = await nlpFetchText(sitemapUrl, 10000);
    } catch (_error) {
      continue;
    }
    const { pageLocs, sitemapLocs } = extractSitemapLocs(sitemap.body);
    for (const child of sitemapLocs) {
      const childUrl = normalizeNlpUrl(child);
      if (childUrl && !seenSitemaps.has(childUrl) && seenSitemaps.size + queue.length < 20) queue.push(childUrl);
    }
    for (const loc of pageLocs) {
      const url = normalizeNlpUrl(loc);
      if (!url || seenUrls.has(url) || nlpStaticAssetExtension(url)) continue;
      if (sameHostOnly && rootHost && !nlpSameHost(url, rootHost)) continue;
      seenUrls.add(url);
      urls.push(url);
      if (urls.length >= limit) break;
    }
  }
  if (!urls.length) throw new Error("No crawlable URLs were found for that source.");
  return urls;
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

async function fetchCloudNlpPageText(url) {
  const { body, contentType } = await nlpFetchText(url, 12000);
  const lowerType = String(contentType || "").toLowerCase();
  if (lowerType && !lowerType.includes("html") && !lowerType.includes("text/plain") && !lowerType.includes("xml")) {
    throw new Error(`Unsupported content type: ${contentType.split(";", 1)[0]}`);
  }
  const title = decodeHtmlEntities((body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const cleaned = decodeHtmlEntities(body)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const textValue = cleaned.slice(0, CLOUD_NLP_MAX_TEXT_CHARS);
  const wordCount = textValue ? textValue.split(/\s+/).filter(Boolean).length : 0;
  if (wordCount < CLOUD_NLP_MIN_WORDS) throw new Error(`Only ${wordCount} words found after extraction`);
  return { title: cleanText(title), text: textValue, word_count: wordCount };
}

function fakeCloudNlpCategories(url, title, textValue) {
  const haystack = `${url} ${title} ${String(textValue || "").slice(0, 500)}`.toLowerCase();
  const rules = [
    ["/Home & Garden", ["home", "pool", "roof", "plumbing", "hvac", "landscape"]],
    ["/Health", ["health", "doctor", "medical", "clinic", "dental"]],
    ["/Law & Government", ["law", "attorney", "legal", "government"]],
    ["/Internet & Telecom", ["software", "seo", "website", "hosting", "api"]],
    ["/Business & Industrial", ["service", "company", "business", "pricing", "quote"]]
  ];
  for (const [category, tokens] of rules) {
    if (tokens.some((token) => haystack.includes(token))) return [{ name: category, confidence: 0.72 }];
  }
  return [{ name: "/Business & Industrial", confidence: 0.51 }];
}

async function googleCloudNlpClassifyText(textValue, env, secretOverride = "") {
  const response = await fetch(`https://language.googleapis.com/v1/documents:classifyText?key=${encodeURIComponent(googleNlpSecret(env, secretOverride))}`, {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({
      document: { type: "PLAIN_TEXT", content: String(textValue || "").slice(0, CLOUD_NLP_MAX_TEXT_CHARS) },
      classificationModelOptions: { v2Model: { contentCategoriesVersion: "V2" } }
    })
  });
  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch (_error) {}
  if (!response.ok) throw new Error(data.error?.message || `Google Natural Language HTTP ${response.status}`);
  return {
    categories: (data.categories || [])
      .map((item) => ({ name: cleanText(item.name), confidence: Number(item.confidence || 0) }))
      .filter((item) => item.name)
      .sort((a, b) => b.confidence - a.confidence),
    raw
  };
}

async function refreshCloudNlpBatchStatus(env, batchId) {
  const counts = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) AS complete_count,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
       SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped_count,
       SUM(CASE WHEN status IN ('queued', 'running') THEN 1 ELSE 0 END) AS active_count,
       COUNT(*) AS target_count
     FROM nlp_category_urls
     WHERE batch_id = ?`
  ).bind(batchId).first();
  const complete = Number(counts?.complete_count || 0);
  const failed = Number(counts?.failed_count || 0);
  const skipped = Number(counts?.skipped_count || 0);
  const active = Number(counts?.active_count || 0);
  const target = Number(counts?.target_count || 0);
  const current = await env.DB.prepare("SELECT status FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
  const status = current?.status === "cancelled"
    ? "cancelled"
    : active ? "running" : failed && complete + skipped ? "partial" : failed ? "failed" : "complete";
  await env.DB.prepare(
    "UPDATE nlp_category_batches SET status = ?, target_count = ?, complete_count = ?, failed_count = ?, skipped_count = ?, updated_at = ? WHERE id = ?"
  ).bind(status, target, complete, failed, skipped, new Date().toISOString(), batchId).run();
  return await env.DB.prepare("SELECT * FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
}

async function createCloudNlpCategorizer(payload, env) {
  const projectId = Number(payload.project_id || 0);
  if (!projectId) throw new Error("Client is required.");
  const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) throw new Error("Client project not found.");
  const sourceType = cleanText(payload.source_type) || "urls";
  const sourceValue = cleanText(payload.source_value) || project.site_domain || "";
  const maxUrls = Math.max(1, Math.min(Number(payload.max_urls || CLOUD_NLP_DEFAULT_MAX_URLS), CLOUD_NLP_HARD_MAX_URLS));
  const sameHostOnly = payload.same_host_only !== false;
  const dryRun = Boolean(payload.dry_run);
  const savedKey = payload.api_key_id ? await cloudApiKeyById(env, payload.api_key_id) : null;
  const googleNlpKey = savedKey && savedKey.provider_key === "google_nlp" ? savedKey.key_value : "";
  if (!dryRun) googleNlpSecret(env, googleNlpKey);
  const urls = await discoverCloudNlpUrls(sourceType, sourceValue, maxUrls, sameHostOnly);
  const now = new Date().toISOString();
  const provider = dryRun ? "Dry Run" : "Google Natural Language";
  const inserted = await env.DB.prepare(
    `INSERT INTO nlp_category_batches
     (project_id, source_type, source_value, status, provider, api_key_id, target_count, complete_count, failed_count, skipped_count, max_urls, same_host_only, created_at, updated_at)
     VALUES (?, ?, ?, 'running', ?, ?, ?, 0, 0, 0, ?, ?, ?, ?)`
  ).bind(projectId, sourceType, sourceValue, provider, savedKey && !savedKey.pseudo ? savedKey.id : null, urls.length, maxUrls, sameHostOnly ? 1 : 0, now, now).run();
  const batchId = inserted.meta.last_row_id;
  for (const url of urls) {
    await env.DB.prepare("INSERT INTO nlp_category_urls (batch_id, url, status, created_at, updated_at) VALUES (?, ?, 'queued', ?, ?)").bind(batchId, url, now, now).run();
  }
  const rows = await env.DB.prepare("SELECT * FROM nlp_category_urls WHERE batch_id = ? ORDER BY id").bind(batchId).all();
  for (const row of rows.results || []) {
    const updatedAt = new Date().toISOString();
    const extension = nlpStaticAssetExtension(row.url);
    if (extension) {
      await env.DB.prepare("UPDATE nlp_category_urls SET status = 'skipped', categories_json = '[]', word_count = 0, error = ?, updated_at = ? WHERE id = ?").bind(`Skipped static asset URL (${extension})`, updatedAt, row.id).run();
      continue;
    }
    await env.DB.prepare("UPDATE nlp_category_urls SET status = 'running', error = NULL, updated_at = ? WHERE id = ?").bind(updatedAt, row.id).run();
    try {
      const page = await fetchCloudNlpPageText(row.url);
      const classified = dryRun
        ? { categories: fakeCloudNlpCategories(row.url, page.title, page.text), raw: JSON.stringify({ dry_run: true }) }
        : await googleCloudNlpClassifyText(page.text, env, googleNlpKey);
      if (!classified.categories.length) throw new Error("No category returned");
      const primary = classified.categories[0];
      await env.DB.prepare(
        `UPDATE nlp_category_urls
         SET status = 'complete', title = ?, category = ?, confidence = ?, primary_result = 1,
             categories_json = ?, word_count = ?, error = NULL, raw_response = ?, updated_at = ?
         WHERE id = ?`
      ).bind(page.title, primary.name, primary.confidence, JSON.stringify(classified.categories), page.word_count, String(classified.raw || "").slice(0, 200000), new Date().toISOString(), row.id).run();
    } catch (error) {
      await env.DB.prepare("UPDATE nlp_category_urls SET status = 'failed', error = ?, updated_at = ? WHERE id = ?").bind(error.message || String(error), new Date().toISOString(), row.id).run();
    }
  }
  const batch = await refreshCloudNlpBatchStatus(env, batchId);
  const resultRows = await env.DB.prepare("SELECT * FROM nlp_category_urls WHERE batch_id = ? ORDER BY id").bind(batchId).all();
  return { batch, urls: resultRows.results || [] };
}

function normalizeNlpTaxonomy(value) {
  const taxonomy = cleanText(value) || "seo_page_type";
  return ["seo_page_type", "google_like", "custom"].includes(taxonomy) ? taxonomy : "seo_page_type";
}

function nlpLlmComparisonPrompt(row, taxonomy) {
  let categories = [];
  try { categories = JSON.parse(row.categories_json || "[]"); } catch (_error) {}
  const categoryLines = (Array.isArray(categories) ? categories : []).slice(0, 5).map((item) => {
    const name = cleanText(item?.name);
    return name ? `- ${name}: ${Number(item?.confidence || 0).toFixed(3)}` : "";
  }).filter(Boolean).join("\n");
  const instructions = {
    seo_page_type: "Classify the URL by practical SEO page type and content intent.",
    google_like: "Classify the URL into a concise topic category similar to a Google Natural Language category.",
    custom: "Classify the URL into the best reusable content inventory category for this website."
  };
  return `You are reviewing a URL categorization batch for an SEO content inventory.

Return only valid JSON with these exact keys:
category: string
page_type: one of homepage, service, location, blog, product, category, pricing, faq, other
confidence: number from 0 to 1
explanation: string, one short sentence
recommended_action: string, one short sentence

${instructions[normalizeNlpTaxonomy(taxonomy)]}

URL: ${row.url || ""}
Title: ${row.title || "Not available"}
Google NLP primary category: ${row.category || "Not available"}
Google NLP confidence: ${Number(row.baseline_confidence || row.confidence || 0).toFixed(3)}
Google NLP category candidates:
${categoryLines || "- Not available"}
Extracted word count: ${Number(row.word_count || 0)}

Use the URL path, title, baseline category, and available confidence signals. Do not invent crawl facts beyond the provided fields.`;
}

function normalizeNlpLlmComparisonResult(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The LLM response JSON must be an object.");
  if (!cleanText(parsed.category)) throw new Error("The LLM response JSON did not include a category.");
  if (!Object.prototype.hasOwnProperty.call(parsed, "confidence")) throw new Error("The LLM response JSON did not include confidence.");
  let pageType = cleanText(parsed.page_type).toLowerCase().replaceAll(" ", "_") || "other";
  if (!["homepage", "service", "location", "blog", "product", "category", "pricing", "faq", "other"].includes(pageType)) pageType = "other";
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence || 0) || 0));
  return {
    category: cleanText(parsed.category) || "Uncategorized",
    page_type: pageType,
    confidence,
    explanation: cleanText(parsed.explanation).slice(0, 800),
    recommended_action: cleanText(parsed.recommended_action).slice(0, 800)
  };
}

async function refreshCloudNlpLlmRunStatus(env, runId) {
  const counts = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) AS complete_count,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
       SUM(CASE WHEN status IN ('queued', 'running') THEN 1 ELSE 0 END) AS active_count,
       COUNT(*) AS target_count
     FROM nlp_llm_comparison_results
     WHERE comparison_run_id = ?`
  ).bind(runId).first();
  const complete = Number(counts?.complete_count || 0);
  const failed = Number(counts?.failed_count || 0);
  const active = Number(counts?.active_count || 0);
  const target = Number(counts?.target_count || 0);
  const status = active ? "running" : failed && complete ? "partial" : failed ? "failed" : target ? "complete" : "failed";
  await env.DB.prepare(
    "UPDATE nlp_llm_comparison_runs SET status = ?, target_count = ?, complete_count = ?, failed_count = ?, updated_at = ? WHERE id = ?"
  ).bind(status, target, complete, failed, new Date().toISOString(), runId).run();
  return await env.DB.prepare("SELECT * FROM nlp_llm_comparison_runs WHERE id = ?").bind(runId).first();
}

async function createCloudNlpLlmComparison(payload, env) {
  const batchId = Number(payload.batch_id || 0);
  if (!batchId) throw new Error("NLP batch ID is required.");
  const targets = Array.isArray(payload.targets) ? payload.targets : [];
  if (!targets.length) throw new Error("Choose at least one cloud provider:model target.");
  const taxonomy = normalizeNlpTaxonomy(payload.taxonomy);
  const batch = await env.DB.prepare("SELECT * FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
  if (!batch) throw new Error("NLP categorizer batch not found.");
  const limit = Math.max(1, Math.min(Number(payload.max_urls || 25), 50));
  const urlRows = await env.DB.prepare(
    `SELECT id, url, title, category, confidence AS baseline_confidence, categories_json, word_count
     FROM nlp_category_urls
     WHERE batch_id = ? AND status = 'complete'
     ORDER BY id
     LIMIT ?`
  ).bind(batchId, limit).all();
  const urls = urlRows.results || [];
  if (!urls.length) throw new Error("Run the categorizer successfully before comparing LLMs.");
  const now = new Date().toISOString();
  const runs = [];
  const results = [];
  const seen = new Set();
  for (const target of targets.slice(0, 10)) {
    const resolved = target.secret ? target : await cloudProviderSecretForTarget(env, target);
    const provider = normalizeProvider(resolved.provider || "");
    const model = cleanText(resolved.model);
    if (!provider || !model) throw new Error("Cloud NLP comparison targets must use provider:model.");
    const dedupe = `${provider}:${model}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const inserted = await env.DB.prepare(
      `INSERT INTO nlp_llm_comparison_runs
       (batch_id, project_id, provider, provider_key, api_key_id, model, taxonomy, status, target_count, complete_count, failed_count, prompt_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, 0, 0, 'nlp-llm-v1', ?, ?)`
    ).bind(batchId, batch.project_id, provider, provider, resolved.api_key_id || null, model, taxonomy, urls.length, now, now).run();
    const runId = inserted.meta.last_row_id;
    for (const urlRow of urls) {
      const resultInsert = await env.DB.prepare(
        "INSERT INTO nlp_llm_comparison_results (comparison_run_id, batch_url_id, url, status, created_at, updated_at) VALUES (?, ?, ?, 'running', ?, ?)"
      ).bind(runId, urlRow.id, urlRow.url, now, now).run();
      const resultId = resultInsert.meta.last_row_id;
      let raw = "";
      try {
        raw = await callCloudLlm(provider, model, nlpLlmComparisonPrompt(urlRow, taxonomy), env, resolved.secret || "", {
          anthropic_tool: {
            name: "save_nlp_llm_classification",
            description: "Save the structured NLP/LLM URL classification result.",
            input_schema: NLP_LLM_COMPARISON_OUTPUT_SCHEMA
          }
        });
        const parsed = normalizeNlpLlmComparisonResult(extractJsonText(raw));
        await env.DB.prepare(
          `UPDATE nlp_llm_comparison_results
           SET status = 'complete', llm_category = ?, confidence = ?, page_type = ?, explanation = ?,
               recommended_action = ?, raw_response = ?, error = NULL, updated_at = ?
           WHERE id = ?`
        ).bind(parsed.category, parsed.confidence, parsed.page_type, parsed.explanation, parsed.recommended_action, raw.slice(0, 200000), new Date().toISOString(), resultId).run();
      } catch (error) {
        await env.DB.prepare("UPDATE nlp_llm_comparison_results SET status = 'failed', raw_response = ?, error = ?, updated_at = ? WHERE id = ?")
          .bind(String(raw || "").slice(0, 200000), error.message || String(error), new Date().toISOString(), resultId).run();
      }
      results.push(await env.DB.prepare("SELECT * FROM nlp_llm_comparison_results WHERE id = ?").bind(resultId).first());
    }
    runs.push(await refreshCloudNlpLlmRunStatus(env, runId));
  }
  if (!runs.length) throw new Error("Choose at least one cloud provider:model target.");
  return { batch_id: batchId, runs, results };
}

function publicNlpCategoryUrl(row, llmResults = []) {
  if (!row) return null;
  let categories = [];
  try { categories = JSON.parse(row.categories_json || "[]"); } catch (_error) {}
  return {
    ...row,
    categories,
    raw_response: undefined,
    llm_results: llmResults
  };
}

function nlpBatchProgress(batch) {
  const total = Number(batch?.target_count || 0);
  const done = Number(batch?.complete_count || 0) + Number(batch?.failed_count || 0) + Number(batch?.skipped_count || 0);
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0
  };
}

async function listCloudNlpBatches(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("project_id") || 0);
  if (projectId) await assertProjectAccess(request, env, projectId);
  const scopeSql = projectId ? "WHERE b.project_id = ?" : (scope.scoped ? `WHERE b.project_id IN (${scope.clientIds.map(() => "?").join(",")})` : "");
  const params = projectId ? [projectId] : (scope.scoped ? scope.clientIds : []);
  const rows = await env.DB.prepare(
    `SELECT b.*, p.name AS project_name
     FROM nlp_category_batches b
     LEFT JOIN projects p ON p.id = b.project_id
     ${scopeSql}
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT 100`
  ).bind(...params).all();
  return json({ batches: rows.results || [] });
}

async function getCloudNlpBatch(request, env, batchId) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const batch = await env.DB.prepare(
    `SELECT b.*, p.name AS project_name
     FROM nlp_category_batches b
     LEFT JOIN projects p ON p.id = b.project_id
     WHERE b.id = ?`
  ).bind(batchId).first();
  if (!batch) return json({ ok: false, error: "NLP categorizer batch not found" }, 404);
  await assertProjectAccess(request, env, batch.project_id);
  const [urlRows, runs, results] = await Promise.all([
    env.DB.prepare("SELECT * FROM nlp_category_urls WHERE batch_id = ? ORDER BY id LIMIT 1000").bind(batchId).all(),
    env.DB.prepare("SELECT * FROM nlp_llm_comparison_runs WHERE batch_id = ? ORDER BY created_at DESC, id DESC").bind(batchId).all(),
    env.DB.prepare(
      `SELECT r.*
       FROM nlp_llm_comparison_results r
       JOIN nlp_llm_comparison_runs cr ON cr.id = r.comparison_run_id
       WHERE cr.batch_id = ?
       ORDER BY r.id`
    ).bind(batchId).all()
  ]);
  const byUrlId = new Map();
  for (const result of results.results || []) {
    const key = String(result.batch_url_id || "");
    byUrlId.set(key, (byUrlId.get(key) || []).concat(result));
  }
  const urls = (urlRows.results || []).map((row) => publicNlpCategoryUrl(row, byUrlId.get(String(row.id)) || []));
  const categoryMap = new Map();
  for (const row of urls) {
    if (row.status !== "complete" || !row.category) continue;
    const item = categoryMap.get(row.category) || { category: row.category, count: 0, avg_confidence: 0 };
    item.count += 1;
    item.avg_confidence += Number(row.confidence || 0);
    categoryMap.set(row.category, item);
  }
  const categories = [...categoryMap.values()].map((item) => ({ ...item, avg_confidence: item.avg_confidence / Math.max(1, item.count) }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  const providerColumns = ["Google NLP"].concat((runs.results || []).map((run) => `${run.provider || run.provider_key || "provider"} (${run.model || "model"})`));
  return json({
    batch,
    urls,
    categories,
    category_count: categories.length,
    progress: nlpBatchProgress(batch),
    comparison_runs: runs.results || [],
    comparison: {
      baseline_provider: batch.provider || "Google NLP",
      provider_columns: providerColumns,
      next_provider_slots: ["OpenAI", "Anthropic", "Google Gemini", "xAI", "Perplexity"]
    },
    hcu_impact: buildCloudHcuImpactForNlp({ batch, urls, comparison_runs: runs.results || [] })
  });
}

function buildCloudHcuImpactForNlp(data) {
  const urls = (data.urls || []).filter((row) => row.status === "complete").map((row) => {
    const wordCount = Number(row.word_count || 0);
    const confidence = Number(row.confidence || 0);
    const reasons = [];
    let score = 0;
    if (!row.category) { score += 1; reasons.push("No primary NLP category"); }
    if (wordCount && wordCount < 300) { score += 2; reasons.push("Very thin word count"); }
    else if (wordCount && wordCount < 650) { score += 1; reasons.push("Lower word count"); }
    if (confidence && confidence < 0.55) { score += 1; reasons.push("Low NLP confidence"); }
    const pageTypes = new Set((row.llm_results || []).map((item) => String(item.page_type || "").toLowerCase()).filter(Boolean));
    const categories = new Set((row.llm_results || []).map((item) => String(item.llm_category || "").toLowerCase()).filter(Boolean));
    if (pageTypes.size > 1) { score += 1; reasons.push("LLM page types disagree"); }
    if (categories.size > 1) { score += 1; reasons.push("LLM categories disagree"); }
    if (!reasons.length) reasons.push("No obvious HCU risk signal from synced data");
    const level = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
    return {
      url: row.url,
      title: row.title,
      category: row.category,
      page_type: pageTypes.values().next().value || "other",
      risk_level: level,
      risk_score: score,
      reasons,
      word_count: row.word_count,
      confidence: row.confidence,
      traffic_delta: null,
      keyword_delta: null
    };
  });
  const summary = urls.reduce((acc, row) => {
    acc.analyzed_urls += 1;
    if (row.risk_level === "high") acc.high_risk += 1;
    if (row.risk_level === "medium") acc.medium_risk += 1;
    if (row.risk_level === "low") acc.low_risk += 1;
    return acc;
  }, { analyzed_urls: 0, high_risk: 0, medium_risk: 0, low_risk: 0, traffic_matched_urls: 0, organic_traffic_delta: 0 });
  return { summary, urls, by_page_type: [], by_category: [], notes: ["Cloud API response uses NLP/LLM risk signals; ranking snapshot HCU deltas are shown in the cloud client workspace."] };
}

async function createCloudNlpBatchRoute(request, env) {
  const payload = await request.json().catch(() => ({}));
  await assertCommandAccess(request, env, "run_nlp_categorizer", payload);
  await enforceToolPolicy(request, env, "run_nlp_categorizer", { ...payload, execution_mode: "cloud" });
  const result = await createCloudNlpCategorizer({ ...payload, execution_mode: "cloud" }, env);
  await recordToolUsage(request, env, "run_nlp_categorizer", { ...payload, execution_mode: "cloud" });
  return await getCloudNlpBatch(request, env, result.batch.id);
}

async function createCloudNlpLlmComparisonRoute(request, env, batchId) {
  const payload = await request.json().catch(() => ({}));
  const batch = await env.DB.prepare("SELECT * FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
  if (!batch) return json({ ok: false, error: "NLP categorizer batch not found" }, 404);
  await assertCommandAccess(request, env, "run_nlp_llm_comparison", { ...payload, project_id: batch.project_id, batch_id: batchId });
  await enforceToolPolicy(request, env, "run_nlp_llm_comparison", { ...payload, project_id: batch.project_id, execution_mode: "cloud" });
  const targets = Array.isArray(payload.targets) ? payload.targets : [];
  const normalizedTargets = await cloudLlmTargetsFromApiKeys(env, targets);
  const result = await createCloudNlpLlmComparison({ ...payload, batch_id: batchId, targets: normalizedTargets, execution_mode: "cloud" }, env);
  await recordToolUsage(request, env, "run_nlp_llm_comparison", { ...payload, project_id: batch.project_id, batch_id: batchId, execution_mode: "cloud" });
  return await getCloudNlpBatch(request, env, result.batch_id);
}

async function exportCloudNlpBatch(request, env, batchId) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const batch = await env.DB.prepare("SELECT * FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
  if (!batch) return json({ ok: false, error: "NLP categorizer batch not found" }, 404);
  await assertProjectAccess(request, env, batch.project_id);
  const rows = await env.DB.prepare("SELECT * FROM nlp_category_urls WHERE batch_id = ? ORDER BY id").bind(batchId).all();
  const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [["URL", "Status", "Title", "Primary Category", "Confidence", "Word Count", "All Categories", "Error"].map(csvEscape).join(",")];
  for (const row of rows.results || []) {
    let categories = [];
    try { categories = JSON.parse(row.categories_json || "[]"); } catch (_error) {}
    const categoryText = categories.map((item) => `${item.name || ""} (${Number(item.confidence || 0).toFixed(3)})`).join("; ");
    lines.push([row.url, row.status, row.title, row.category, row.confidence ?? "", row.word_count ?? "", categoryText, row.error || ""].map(csvEscape).join(","));
  }
  return new Response(lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="nlp-categories-${batchId}.csv"`,
      "cache-control": "no-store"
    }
  });
}

async function cancelCloudNlpBatch(request, env, batchId) {
  await assertCommandAccess(request, env, "run_nlp_categorizer", {});
  const batch = await env.DB.prepare("SELECT * FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
  if (!batch) return json({ ok: false, error: "NLP categorizer batch not found" }, 404);
  await assertProjectAccess(request, env, batch.project_id);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE nlp_category_batches SET status = 'cancelled', updated_at = ? WHERE id = ?").bind(now, batchId).run();
  await env.DB.prepare("UPDATE nlp_category_urls SET status = 'cancelled', error = 'Cancelled before run started', updated_at = ? WHERE batch_id = ? AND status IN ('queued', 'running')").bind(now, batchId).run();
  await refreshCloudNlpBatchStatus(env, batchId);
  return await getCloudNlpBatch(request, env, batchId);
}

async function deleteCloudNlpBatch(request, env, batchId) {
  const batch = await env.DB.prepare("SELECT * FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
  if (!batch) return json({ ok: true, deleted: false, already_deleted: true, batch_id: batchId });
  await requireProjectWriteAccess(request, env, batch.project_id);
  const runs = await env.DB.prepare("SELECT id FROM nlp_llm_comparison_runs WHERE batch_id = ?").bind(batchId).all();
  const runIds = (runs.results || []).map((row) => Number(row.id)).filter(Boolean);
  const statements = [];
  for (const runId of runIds) {
    statements.push(env.DB.prepare("DELETE FROM nlp_llm_comparison_results WHERE comparison_run_id = ?").bind(runId));
  }
  statements.push(env.DB.prepare("DELETE FROM nlp_llm_comparison_runs WHERE batch_id = ?").bind(batchId));
  statements.push(env.DB.prepare("DELETE FROM nlp_category_urls WHERE batch_id = ?").bind(batchId));
  statements.push(env.DB.prepare("DELETE FROM nlp_category_batches WHERE id = ?").bind(batchId));
  await env.DB.batch(statements);
  return json({ ok: true, deleted: true, batch_id: batchId, project_id: batch.project_id });
}

async function retryCloudNlpBatch(request, env, batchId) {
  await assertCommandAccess(request, env, "run_nlp_categorizer", {});
  const batch = await env.DB.prepare("SELECT * FROM nlp_category_batches WHERE id = ?").bind(batchId).first();
  if (!batch) return json({ ok: false, error: "NLP categorizer batch not found" }, 404);
  await assertProjectAccess(request, env, batch.project_id);
  const retryPayload = {
    project_id: batch.project_id,
    source_type: batch.source_type,
    source_value: batch.source_value,
    max_urls: batch.max_urls,
    same_host_only: Boolean(batch.same_host_only),
    dry_run: String(batch.provider || "").toLowerCase().includes("dry")
  };
  await enforceToolPolicy(request, env, "run_nlp_categorizer", { ...retryPayload, execution_mode: "cloud" });
  const result = await createCloudNlpCategorizer(retryPayload, env);
  await recordToolUsage(request, env, "run_nlp_categorizer", { ...retryPayload, execution_mode: "cloud" });
  return await getCloudNlpBatch(request, env, result.batch.id);
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
    const resolved = target.secret ? target : await cloudProviderSecretForTarget(env, target);
    const provider = normalizeProvider(resolved.provider || "");
    const model = cleanText(resolved.model);
    if (!provider || !model) throw new Error("Cloud Entity targets must use provider:model.");
    const runInsert = await env.DB.prepare(
      "INSERT INTO entity_lsi_runs (project_id, batch_id, seed_keyword, depth, api_key_id, provider, model, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?)"
    ).bind(projectId, batchId, seed, depth, resolved.api_key_id || null, provider, model, now).run();
    const runId = runInsert.meta.last_row_id;
    try {
      const raw = await callCloudLlm(provider, model, prompt, env, resolved.secret || "");
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
  if (["run_cora", "apply_cora_profile", "push_cora_profile", "apply_cora_domain_lists", "pull_cora_domain_lists"].includes(commandType)) throw new Error("This action is local-only. Use the local bridge mode.");
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
  if (commandType === "create_profile") {
    const name = cleanText(payload.name);
    if (!name) throw new Error("Profile name is required.");
    const existing = await env.DB.prepare("SELECT * FROM profiles WHERE lower(name) = lower(?) ORDER BY id LIMIT 1").bind(name).first();
    if (existing) {
      if (existing.archived_at) {
        await env.DB.prepare("UPDATE profiles SET client = ?, notes = ?, updated_at = ?, archived_at = NULL WHERE id = ?")
          .bind(cleanText(payload.client) || existing.client || null, cleanText(payload.notes) || existing.notes || null, now, existing.id).run();
        result.profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(existing.id).first();
        changedTables.push("profiles");
        return result;
      }
      result.duplicate = true;
      result.profile = existing;
      return result;
    }
    const inserted = await env.DB.prepare(
      "INSERT INTO profiles (name, client, notes, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL)"
    ).bind(name, cleanText(payload.client) || null, cleanText(payload.notes) || null, now, now).run();
    result.profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(inserted.meta.last_row_id).first();
    changedTables.push("profiles");
    return result;
  }
  if (commandType === "update_profile") {
    const profileId = Number(payload.profile_id || 0);
    const name = cleanText(payload.name);
    if (!profileId) throw new Error("Profile is required.");
    if (!name) throw new Error("Profile name is required.");
    const profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();
    if (!profile) throw new Error("Profile not found.");
    const duplicate = await env.DB.prepare("SELECT id FROM profiles WHERE lower(name) = lower(?) AND id != ? AND archived_at IS NULL ORDER BY id LIMIT 1").bind(name, profileId).first();
    if (duplicate) throw new Error("Another active profile already uses that name.");
    await env.DB.prepare(
      "UPDATE profiles SET name = ?, client = ?, notes = ?, updated_at = ?, archived_at = NULL WHERE id = ?"
    ).bind(name, cleanText(payload.client) || null, cleanText(payload.notes) || null, now, profileId).run();
    result.profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();
    changedTables.push("profiles");
    return result;
  }
  if (commandType === "attach_profile") {
    const projectId = Number(payload.project_id || 0);
    const profileName = cleanText(payload.profile_name);
    let profileId = Number(payload.profile_id || 0);
    if (!projectId) throw new Error("Client is required for profile attachment.");
    const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first();
    if (!project) throw new Error("Client not found.");
    let profile = profileId ? await env.DB.prepare("SELECT * FROM profiles WHERE id = ? AND archived_at IS NULL").bind(profileId).first() : null;
    if (!profile && profileName) {
      profile = await env.DB.prepare("SELECT * FROM profiles WHERE lower(name) = lower(?) ORDER BY id LIMIT 1").bind(profileName).first();
      if (profile?.archived_at) {
        await env.DB.prepare("UPDATE profiles SET archived_at = NULL, updated_at = ? WHERE id = ?").bind(now, profile.id).run();
        profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(profile.id).first();
        changedTables.push("profiles");
      }
      if (!profile) {
        const inserted = await env.DB.prepare(
          "INSERT INTO profiles (name, client, notes, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL)"
        ).bind(profileName, project.name || null, cleanText(payload.notes) || "Created from cloud Cora Profiles", now, now).run();
        profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(inserted.meta.last_row_id).first();
        changedTables.push("profiles");
      }
    }
    if (!profile) throw new Error("Select an existing profile or enter a new profile name.");
    profileId = Number(profile.id);
    await env.DB.prepare("UPDATE projects SET profile_id = ?, updated_at = ? WHERE id = ?").bind(profileId, now, projectId).run();
    await env.DB.prepare("UPDATE profiles SET updated_at = ? WHERE id = ?").bind(now, profileId).run();
    result.profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();
    result.project = await env.DB.prepare(
      `SELECT p.*, pr.name AS profile_name
       FROM projects p
       LEFT JOIN profiles pr ON pr.id = p.profile_id
       WHERE p.id = ?`
    ).bind(projectId).first();
    changedTables.push("projects", "profiles");
    return result;
  }
  if (commandType === "detach_profile") {
    const projectId = Number(payload.project_id || 0);
    if (!projectId) throw new Error("Client is required for profile detachment.");
    const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first();
    if (!project) throw new Error("Client not found.");
    await env.DB.prepare("UPDATE projects SET profile_id = NULL, updated_at = ? WHERE id = ?").bind(now, projectId).run();
    result.project = await env.DB.prepare(
      `SELECT p.*, pr.name AS profile_name
       FROM projects p
       LEFT JOIN profiles pr ON pr.id = p.profile_id
       WHERE p.id = ?`
    ).bind(projectId).first();
    changedTables.push("projects");
    return result;
  }
  if (commandType === "archive_profile") {
    const profileId = Number(payload.profile_id || 0);
    if (!profileId) throw new Error("Profile is required.");
    const profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();
    if (!profile) throw new Error("Profile not found.");
    await env.DB.prepare("UPDATE projects SET profile_id = NULL, updated_at = ? WHERE profile_id = ?").bind(now, profileId).run();
    await env.DB.prepare("UPDATE profiles SET archived_at = ?, updated_at = ? WHERE id = ?").bind(now, now, profileId).run();
    result.profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();
    result.detached_clients = Number(profile.client_count || 0);
    changedTables.push("profiles", "projects");
    return result;
  }
  if (commandType === "create_cora_domain_entry") {
    const listType = normalizeCoraDomainListType(payload.list_type);
    const value = normalizeCoraDomainValue(payload.value);
    const scope = normalizeDomainScope(payload.scope);
    const projectId = Number(payload.project_id || 0) || null;
    const profileId = Number(payload.profile_id || 0) || null;
    const existing = await env.DB.prepare(
      `SELECT *
       FROM cora_domain_lists
       WHERE scope = ? AND list_type = ? AND lower(value) = lower(?)
         AND COALESCE(project_id, 0) = COALESCE(?, 0)
         AND COALESCE(profile_id, 0) = COALESCE(?, 0)
       ORDER BY id LIMIT 1`
    ).bind(scope, listType, value, projectId, profileId).first();
    if (existing) {
      if (existing.archived_at) {
        await env.DB.prepare("UPDATE cora_domain_lists SET notes = COALESCE(?, notes), updated_at = ?, archived_at = NULL WHERE id = ?")
          .bind(cleanText(payload.notes) || null, now, existing.id).run();
        result.entry = await env.DB.prepare("SELECT * FROM cora_domain_lists WHERE id = ?").bind(existing.id).first();
        changedTables.push("cora_domain_lists");
        return result;
      }
      result.duplicate = true;
      result.entry = existing;
      return result;
    }
    const inserted = await env.DB.prepare(
      `INSERT INTO cora_domain_lists
       (project_id, profile_id, scope, list_type, value, notes, created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    ).bind(projectId, profileId, scope, listType, value, cleanText(payload.notes) || null, now, now).run();
    result.entry = await env.DB.prepare("SELECT * FROM cora_domain_lists WHERE id = ?").bind(inserted.meta.last_row_id).first();
    changedTables.push("cora_domain_lists");
    return result;
  }
  if (commandType === "update_cora_domain_entry") {
    const entryId = Number(payload.entry_id || 0);
    const listType = normalizeCoraDomainListType(payload.list_type);
    const value = normalizeCoraDomainValue(payload.value);
    const scope = normalizeDomainScope(payload.scope);
    const projectId = Number(payload.project_id || 0) || null;
    const profileId = Number(payload.profile_id || 0) || null;
    if (!entryId) throw new Error("Domain list entry is required.");
    const existing = await env.DB.prepare("SELECT * FROM cora_domain_lists WHERE id = ?").bind(entryId).first();
    if (!existing) throw new Error("Domain list entry not found.");
    const duplicate = await env.DB.prepare(
      `SELECT id
       FROM cora_domain_lists
       WHERE id != ? AND archived_at IS NULL
         AND scope = ? AND list_type = ? AND lower(value) = lower(?)
         AND COALESCE(project_id, 0) = COALESCE(?, 0)
         AND COALESCE(profile_id, 0) = COALESCE(?, 0)
       LIMIT 1`
    ).bind(entryId, scope, listType, value, projectId, profileId).first();
    if (duplicate) throw new Error("That domain list entry already exists.");
    await env.DB.prepare(
      `UPDATE cora_domain_lists
       SET project_id = ?, profile_id = ?, scope = ?, list_type = ?, value = ?, notes = ?, updated_at = ?, archived_at = NULL
       WHERE id = ?`
    ).bind(projectId, profileId, scope, listType, value, cleanText(payload.notes) || null, now, entryId).run();
    result.entry = await env.DB.prepare("SELECT * FROM cora_domain_lists WHERE id = ?").bind(entryId).first();
    changedTables.push("cora_domain_lists");
    return result;
  }
  if (commandType === "archive_cora_domain_entry") {
    const entryId = Number(payload.entry_id || 0);
    if (!entryId) throw new Error("Domain list entry is required.");
    const existing = await env.DB.prepare("SELECT * FROM cora_domain_lists WHERE id = ?").bind(entryId).first();
    if (!existing) throw new Error("Domain list entry not found.");
    await env.DB.prepare("UPDATE cora_domain_lists SET archived_at = ?, updated_at = ? WHERE id = ?").bind(now, now, entryId).run();
    result.entry = await env.DB.prepare("SELECT * FROM cora_domain_lists WHERE id = ?").bind(entryId).first();
    changedTables.push("cora_domain_lists");
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
    const run = await env.DB.prepare("SELECT * FROM runs WHERE id = ?").bind(runId).first();
    if (!run) throw new Error("Cora run not found.");
    const snapshotId = Number(payload.ranking_snapshot_id || 0) || null;
    const entitySetId = Number(payload.entity_set_id || 0) || null;
    const optimizationTargetIds = Array.isArray(payload.optimization_target_ids)
      ? payload.optimization_target_ids.map((value) => Number(value)).filter(Boolean).slice(0, 250)
      : [];
    if (snapshotId) {
      const snapshot = await env.DB.prepare("SELECT id, project_id FROM ranking_snapshots WHERE id = ?").bind(snapshotId).first();
      if (!snapshot) throw new Error("Ranking Snapshot not found.");
      if (snapshot.project_id && run.project_id && Number(snapshot.project_id) !== Number(run.project_id)) throw new Error("Ranking Snapshot must belong to the same client as the Cora run.");
    }
    if (entitySetId) {
      const entitySet = await env.DB.prepare("SELECT id, project_id FROM entity_sets WHERE id = ?").bind(entitySetId).first();
      if (!entitySet) throw new Error("Entity Set not found.");
      if (entitySet.project_id && run.project_id && Number(entitySet.project_id) !== Number(run.project_id)) throw new Error("Entity Set must belong to the same client as the Cora run.");
    }
    if (optimizationTargetIds.length) {
      const placeholders = optimizationTargetIds.map(() => "?").join(",");
      const rows = await env.DB.prepare(
        `SELECT id, project_id, snapshot_id FROM ranking_optimization_targets WHERE id IN (${placeholders})`
      ).bind(...optimizationTargetIds).all();
      const found = rows.results || [];
      if (found.length !== optimizationTargetIds.length) throw new Error("One or more Optimization Targets were not found.");
      if (found.some((target) => run.project_id && target.project_id && Number(target.project_id) !== Number(run.project_id))) throw new Error("Optimization Targets must belong to the same client as the Cora run.");
      if (snapshotId && found.some((target) => Number(target.snapshot_id || 0) !== Number(snapshotId))) throw new Error("Optimization Targets must belong to the attached Ranking Snapshot.");
    }
    const optimizationTargetIdsJson = JSON.stringify(optimizationTargetIds);
    const existing = await env.DB.prepare(
      `SELECT * FROM share_reports
       WHERE run_id = ? AND level = ? AND lower(COALESCE(title, '')) = lower(?)
         AND COALESCE(ranking_snapshot_id, 0) = COALESCE(?, 0)
         AND COALESCE(entity_set_id, 0) = COALESCE(?, 0)
         AND COALESCE(optimization_target_ids_json, '[]') = ?
         AND revoked_at IS NULL
       ORDER BY id LIMIT 1`
    ).bind(runId, level, title, snapshotId, entitySetId, optimizationTargetIdsJson).first();
    if (existing) {
      result.duplicate = true;
      result.report = existing;
      return result;
    }
    const token = crypto.randomUUID().replaceAll("-", "");
    const inserted = await env.DB.prepare(
      "INSERT INTO share_reports (token, run_id, level, title, notes, ranking_snapshot_id, entity_set_id, optimization_target_ids_json, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)"
    ).bind(token, runId, level, title || null, cleanText(payload.notes) || null, snapshotId, entitySetId, optimizationTargetIdsJson, now).run();
    result.report = await env.DB.prepare("SELECT * FROM share_reports WHERE id = ?").bind(inserted.meta.last_row_id).first();
    result.artifact_note = "Cloud-created report metadata will get shareable artifacts after local report generation/upload sync.";
    changedTables.push("share_reports");
    return result;
  }
  if (commandType === "revoke_share_report") {
    const reportId = Number(payload.report_id || 0);
    if (!reportId) throw new Error("Report ID is required.");
    const report = await env.DB.prepare("SELECT * FROM share_reports WHERE id = ?").bind(reportId).first();
    if (!report) throw new Error("Shared report not found.");
    await env.DB.prepare("UPDATE share_reports SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").bind(now, reportId).run();
    result.report = await env.DB.prepare("SELECT * FROM share_reports WHERE id = ?").bind(reportId).first();
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
  if (commandType === "run_nlp_categorizer") {
    if (payload.dry_run) {
      result.dry_run = true;
      result.nlp_categorizer_request = {
        project_id: Number(payload.project_id || 0),
        source_type: cleanText(payload.source_type) || "urls",
        source_value: cleanText(payload.source_value),
        max_urls: Math.max(1, Math.min(Number(payload.max_urls || CLOUD_NLP_DEFAULT_MAX_URLS), CLOUD_NLP_HARD_MAX_URLS)),
        same_host_only: payload.same_host_only !== false,
        execution_mode: "cloud"
      };
      return result;
    }
    const nlp = await createCloudNlpCategorizer(payload, env);
    result.batch = nlp.batch;
    result.urls = nlp.urls;
    result.batch_id = nlp.batch?.id;
    changedTables.push("nlp_category_batches", "nlp_category_urls");
    return result;
  }
  if (commandType === "run_nlp_llm_comparison") {
    if (payload.dry_run) {
      const targets = Array.isArray(payload.targets) ? payload.targets : [];
      result.dry_run = true;
      result.nlp_llm_comparison_request = {
        batch_id: Number(payload.batch_id || 0),
        taxonomy: normalizeNlpTaxonomy(payload.taxonomy),
        target_count: targets.length,
        max_urls: Math.max(1, Math.min(Number(payload.max_urls || 25), 50)),
        execution_mode: "cloud"
      };
      return result;
    }
    const comparison = await createCloudNlpLlmComparison(payload, env);
    result.batch_id = comparison.batch_id;
    result.runs = comparison.runs;
    result.results = comparison.results;
    changedTables.push("nlp_llm_comparison_runs", "nlp_llm_comparison_results");
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
  const tables = selected.length ? selected : ["profiles", "cora_domain_lists", "projects", "sites", "keywords", "content_plans", "ranking_snapshots", "ranking_snapshot_keywords", "ranking_snapshot_pages", "ranking_optimization_targets", "entity_lsi_batches", "entity_lsi_runs", "nlp_category_batches", "nlp_category_urls", "nlp_llm_comparison_runs", "nlp_llm_comparison_results", "entity_sets", "entity_set_terms", "share_reports"];
  const limit = Math.min(Number(url.searchParams.get("limit") || 5000), 25000);
  const exported = [];
  for (const table of tables) {
    const columns = TABLE_COLUMNS[table];
    if (!columns) return json({ ok: false, error: `Unsupported table: ${table}` }, 400);
    // Never export stored provider secrets; sync consumers only need key metadata.
    const exportColumns = table === "api_keys" ? columns.filter((column) => column !== "key_value") : columns;
    const rows = await env.DB.prepare(`SELECT ${exportColumns.join(", ")} FROM ${table} ORDER BY id LIMIT ?`).bind(limit).all();
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
    google_nlp: Boolean(env.GOOGLE_NLP_API_KEY || env.GOOGLE_CLOUD_LANGUAGE_API_KEY || env.GOOGLE_API_KEY),
    xai: Boolean(env.XAI_API_KEY),
    perplexity: Boolean(env.PERPLEXITY_API_KEY)
  };
}

const CLOUD_AI_PROVIDERS = [
  { key: "openai", name: "OpenAI", placeholder: "sk-...", base_url: "https://api.openai.com", default_model: "gpt-5.5", models: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"] },
  { key: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", base_url: "https://api.anthropic.com", default_model: "claude-opus-4-8", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
  { key: "google", name: "Google Gemini", placeholder: "AIza...", base_url: "https://generativelanguage.googleapis.com", default_model: "gemini-3.5-flash", models: ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"] },
  { key: "google_nlp", name: "Google NLP", placeholder: "AIza...", base_url: "https://language.googleapis.com", default_model: "classifyText-v2", models: [] },
  { key: "xai", name: "xAI / Grok", placeholder: "xai-...", base_url: "https://api.x.ai", default_model: "grok-4.3", models: ["grok-4.3", "grok-4.3-latest", "grok-latest", "grok-build-0.1", "grok-code-fast"] },
  { key: "perplexity", name: "Perplexity", placeholder: "pplx-...", base_url: "https://api.perplexity.ai", default_model: "perplexity/sonar", models: ["perplexity/sonar", "openai/gpt-5.4", "anthropic/claude-sonnet-4-6", "xai/grok-4.3", "xai/grok-4.20-reasoning", "xai/grok-4.20-non-reasoning", "xai/grok-4.20-multi-agent"] },
  { key: "dataforseo", name: "DataForSEO", placeholder: "API password", login_placeholder: "api-login@example.com", base_url: "https://api.dataforseo.com", default_model: "", models: [], auth_type: "basic", test_path: "/v3/appendix/user_data" }
];

function cloudPseudoApiKeys(env) {
  const configured = secretStatusData(env);
  return CLOUD_AI_PROVIDERS
    .filter((provider) => configured[provider.key])
    .map((provider, index) => ({
      id: 9000 + index + 1,
      provider: provider.name,
      provider_key: provider.key,
      provider_name: provider.name,
      label: "Cloudflare Worker Secret",
      key_preview: "Cloudflare secret",
      key_length: null,
      default_model: provider.default_model || "",
      base_url: provider.base_url || "",
      status: "configured",
      last_tested_at: "configured",
      last_error: null,
      pseudo: true,
      notes: "Configured as a Cloudflare Worker secret."
    }));
}

function cloudPseudoApiKeyById(env, id) {
  return cloudPseudoApiKeys(env).find((key) => Number(key.id) === Number(id)) || null;
}

function maskSecret(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 8) return "*".repeat(text.length);
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function apiKeyPublic(row) {
  if (!row) return null;
  const providerKey = normalizeProvider(row.provider || "");
  const provider = CLOUD_AI_PROVIDERS.find((item) => item.key === providerKey) || {};
  const keyValue = String(row.key_value || "");
  return {
    id: row.id,
    provider: provider.name || row.provider,
    provider_key: providerKey,
    provider_name: provider.name || row.provider,
    label: row.label || "Production",
    notes: row.notes || "",
    base_url: row.base_url || provider.base_url || "",
    default_model: row.default_model || provider.default_model || "",
    status: row.status || "untested",
    last_tested_at: row.last_tested_at || null,
    last_error: row.last_error || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    key_preview: providerKey === "dataforseo" ? "login:********" : maskSecret(keyValue),
    key_length: keyValue.length
  };
}

function apiKeyValueFromPayload(provider, payload) {
  const keyValue = cleanText(payload.key_value);
  if (normalizeProvider(provider) !== "dataforseo" || keyValue) return keyValue;
  const login = cleanText(payload.api_login);
  const password = cleanText(payload.api_password);
  return login && password ? `${login}:${password}` : "";
}

async function storedCloudApiKeys(env) {
  const rows = await env.DB.prepare("SELECT * FROM api_keys ORDER BY provider COLLATE NOCASE, label COLLATE NOCASE, id DESC").all();
  return rows.results || [];
}

async function cloudApiKeyById(env, id) {
  const pseudo = cloudPseudoApiKeyById(env, id);
  if (pseudo) return { ...pseudo, key_value: "", pseudo: true };
  const row = await env.DB.prepare("SELECT * FROM api_keys WHERE id = ?").bind(Number(id || 0)).first();
  return row ? { ...apiKeyPublic(row), key_value: row.key_value || "", pseudo: false } : null;
}

async function cloudProviderSecretForTarget(env, target) {
  const saved = target.api_key_id ? await cloudApiKeyById(env, target.api_key_id) : null;
  return {
    provider: target.provider || target.provider_key || saved?.provider_key || "",
    model: target.model || saved?.default_model || "",
    api_key_id: saved && !saved.pseudo ? saved.id : null,
    secret: saved?.key_value || ""
  };
}

async function handleLocalApiKeys(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method === "POST") {
    const scope = await requireProjectWriteAccess(request, env, null);
    if (!scope.write) return json({ ok: false, error: "Write access required" }, 401);
    const payload = await request.json().catch(() => ({}));
    const providerKey = normalizeProvider(payload.provider);
    const provider = CLOUD_AI_PROVIDERS.find((item) => item.key === providerKey);
    if (!provider) return json({ ok: false, error: "Unsupported provider" }, 400);
    const keyValue = apiKeyValueFromPayload(providerKey, payload);
    const label = cleanText(payload.label) || "Production";
    if (!keyValue) return json({ ok: false, error: providerKey === "dataforseo" ? "API login/password or API key is required" : "API key is required" }, 400);
    const now = new Date().toISOString();
    const inserted = await env.DB.prepare(
      `INSERT INTO api_keys
       (provider, label, key_value, notes, base_url, default_model, status, last_tested_at, last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'untested', NULL, NULL, ?, ?)`
    ).bind(provider.name, label, keyValue, cleanText(payload.notes) || null, cleanText(payload.base_url) || provider.base_url || null, cleanText(payload.default_model) || provider.default_model || null, now, now).run();
    const row = await env.DB.prepare("SELECT * FROM api_keys WHERE id = ?").bind(inserted.meta.last_row_id).first();
    return json({ ok: true, api_key: apiKeyPublic(row) }, 201);
  }
  const rows = await storedCloudApiKeys(env);
  return json({ ok: true, api_keys: [...rows.map(apiKeyPublic), ...cloudPseudoApiKeys(env)], providers: CLOUD_AI_PROVIDERS });
}

async function handleLocalApiKeyTest(request, env) {
  await requireProjectWriteAccess(request, env, null);
  const payload = await request.json().catch(() => ({}));
  if (payload.key_id) {
    const key = await cloudApiKeyById(env, payload.key_id);
    if (!key) return json({ ok: true, test: { ok: false, message: "Saved API key was not found." } });
    const now = new Date().toISOString();
    let ok = true;
    let message = `${key.provider_name} key is stored and selectable.`;
    let errorMessage = null;
    if (key.provider_key === "google_nlp") {
      try {
        const sampleText = "Search engine optimization services help businesses improve local visibility, website content quality, organic rankings, and customer acquisition through technical SEO, content strategy, and digital marketing analysis.";
        await googleCloudNlpClassifyText(sampleText, env, key.key_value || "");
        message = "Google Natural Language classifyText verified successfully.";
      } catch (error) {
        ok = false;
        errorMessage = error.message || String(error);
        message = errorMessage;
      }
    }
    if (!key.pseudo) {
      await env.DB.prepare("UPDATE api_keys SET status = ?, last_tested_at = ?, last_error = ?, updated_at = ? WHERE id = ?").bind(ok ? "valid" : "failed", now, errorMessage, now, key.id).run();
      const row = await env.DB.prepare("SELECT * FROM api_keys WHERE id = ?").bind(key.id).first();
      return json({ ok: true, test: { ok, message }, api_key: apiKeyPublic(row) });
    }
    return json({ ok: true, test: { ok, message }, api_key: { ...key, status: ok ? "valid" : "failed", last_tested_at: now, last_error: errorMessage } });
  }
  const providerKey = normalizeProvider(payload.provider);
  const keyValue = apiKeyValueFromPayload(providerKey, payload);
  if (providerKey === "google_nlp" && keyValue) {
    try {
      const sampleText = "Search engine optimization services help businesses improve local visibility, website content quality, organic rankings, and customer acquisition through technical SEO, content strategy, and digital marketing analysis.";
      await googleCloudNlpClassifyText(sampleText, env, keyValue);
      return json({ ok: true, test: { ok: true, message: "Google Natural Language classifyText verified successfully." } });
    } catch (error) {
      return json({ ok: true, test: { ok: false, message: error.message || String(error) } });
    }
  }
  return json({ ok: true, test: { ok: Boolean(providerKey && keyValue), message: providerKey && keyValue ? "Key format is present and can be saved." : "Provider and API key are required." } });
}

async function handleLocalApiKeyDelete(request, env, id) {
  await requireProjectWriteAccess(request, env, null);
  if (cloudPseudoApiKeyById(env, id)) return json({ ok: false, error: "Worker secret keys cannot be deleted from the dashboard." }, 400);
  await env.DB.prepare("DELETE FROM api_keys WHERE id = ?").bind(Number(id || 0)).run();
  return json({ ok: true, deleted: Number(id || 0) });
}

async function sendLoginEmail(env, email, code) {
  if (!env.EMAIL) return false;
  const from = env.LOGIN_EMAIL_FROM || "noreply@localblitz.io";
  const fromDomain = from.split("@")[1] || "localblitz.io";
  const text = `Your On Page Optimization System login code is ${code}. It expires in 10 minutes.`;
  const html = `<p>Your On Page Optimization System login code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`;
  const boundary = `opos-${crypto.randomUUID()}`;
  const raw = [
    `From: ${from}`,
    `To: ${email}`,
    "Subject: On Page Optimization System login code",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${fromDomain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "",
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "",
    html,
    `--${boundary}--`,
    ""
  ].join("\r\n");
  await env.EMAIL.send(new EmailMessage(from, email, raw));
  return true;
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
  const emailSent = await sendLoginEmail(env, email, code).catch((error) => {
    console.error("Login email delivery failed:", error?.message || error);
    return false;
  });
  const revealCode = await hasAdminAccess(request, env);
  await logAudit(request, env, "login_code_requested", "cloud_user", user.id, { email_sent: emailSent }, email);
  return json({
    ok: true,
    email_sent: emailSent,
    message: emailSent ? "Login code sent." : "Cloudflare email delivery is not configured yet. Admin-token callers receive a setup code.",
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
  run_entity_lsi: { tool_key: "run_entity_lsi", cloud_enabled: true, daily_limit: 25, monthly_limit: 500, per_client_daily_limit: 10, updated_at: null },
  run_nlp_categorizer: { tool_key: "run_nlp_categorizer", cloud_enabled: true, daily_limit: 50, monthly_limit: 1000, per_client_daily_limit: 20, updated_at: null },
  run_nlp_llm_comparison: { tool_key: "run_nlp_llm_comparison", cloud_enabled: true, daily_limit: 50, monthly_limit: 1000, per_client_daily_limit: 20, updated_at: null }
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
  let result;
  try {
    result = await env.DB.prepare(
      "INSERT INTO cloud_commands (command_key, command_type, payload_json, status, created_by, created_at, claimed_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(commandKey, commandType, JSON.stringify(commandPayload), initialStatus, String(payload.created_by || "cloud-dashboard"), now, executionMode === "cloud" ? now : null).run();
  } catch (error) {
    const message = error?.message || String(error);
    if (!payload.force_duplicate && /UNIQUE constraint failed: cloud_commands\.command_key|SQLITE_CONSTRAINT/i.test(message)) {
      const duplicate = await env.DB.prepare("SELECT * FROM cloud_commands WHERE command_key = ?").bind(commandKey).first();
      if (duplicate) {
        await logAudit(request, env, "command_duplicate", "cloud_command", duplicate.id, {
          command_type: commandType,
          status: duplicate.status,
          race: true
        }, String(payload.created_by || "cloud-dashboard"));
        return json({ ok: true, duplicate: true, command: normalizeCommand(duplicate) }, 200);
      }
    }
    throw error;
  }
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
    "SELECT table_name, SUM(row_count) AS rows_received, COUNT(*) AS batch_count, MAX(received_at) AS last_received_at FROM sync_batches GROUP BY table_name ORDER BY table_name"
  ).all();
  const recent = await env.DB.prepare(
    "SELECT table_name, row_count, source, received_at FROM sync_batches ORDER BY received_at DESC, id DESC LIMIT 80"
  ).all();
  const tableRows = rows.results || [];
  const seen = new Set(tableRows.map((row) => row.table_name));
  const coreTables = ["profiles", "cora_domain_lists", "projects", "sites", "pages", "keywords", "api_keys", "runs", "managed_jobs", "content_plans", "share_reports", "ranking_snapshots", "ranking_optimization_targets", "entity_lsi_batches", "entity_lsi_runs", "nlp_category_batches", "nlp_category_urls", "nlp_llm_comparison_runs", "nlp_llm_comparison_results", "entity_sets", "entity_set_terms"];
  for (const table of coreTables) {
    if (!seen.has(table)) tableRows.push({ table_name: table, rows_received: 0, batch_count: 0, last_received_at: null });
  }
  const enriched = [];
  for (const row of tableRows) {
    const table = row.table_name;
    const columns = TABLE_COLUMNS[table];
    let cloudRows = null;
    if (columns) {
      try {
        cloudRows = await countTable(env, table);
      } catch (_err) {
        cloudRows = null;
      }
    }
    enriched.push({ ...row, cloud_rows: cloudRows });
  }
  enriched.sort((a, b) => String(a.table_name || "").localeCompare(String(b.table_name || "")));
  return { tables: enriched, recent_batches: recent.results || [], artifacts: await artifactStatusData(env) };
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
  const [profiles, projects, keywords, runs, reports, rankingSnapshots, targets, contentPlans, entitySets, nlpBatches, pendingCommands, bridges, artifacts, sync] = await Promise.all([
    countTable(env, "profiles"),
    countProjectTable(env, "projects", scope, "id"),
    countProjectTable(env, "keywords", scope),
    countProjectTable(env, "runs", scope),
    countReportRows(env, scope),
    countProjectTable(env, "ranking_snapshots", scope),
    countProjectTable(env, "ranking_optimization_targets", scope),
    countProjectTable(env, "content_plans", scope),
    countProjectTable(env, "entity_sets", scope),
    countProjectTable(env, "nlp_category_batches", scope),
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
    `SELECT p.id, p.name, p.client,
            COALESCE(p.site_domain, (SELECT s.domain FROM sites s WHERE s.project_id = p.id ORDER BY s.id LIMIT 1)) AS site_domain,
            p.profile_id, pr.name AS profile_name,
            (SELECT COUNT(*) FROM keywords k WHERE k.project_id = p.id) AS keyword_count,
            (SELECT COUNT(*) FROM runs r WHERE r.project_id = p.id) AS run_count,
            (SELECT COUNT(*) FROM ranking_snapshots rs WHERE rs.project_id = p.id) AS snapshot_count,
            (SELECT COUNT(*) FROM ranking_optimization_targets rot WHERE rot.project_id = p.id) AS target_count,
            (SELECT COUNT(*) FROM content_plans cp WHERE cp.project_id = p.id) AS plan_count,
            (SELECT COUNT(*) FROM nlp_category_batches nb WHERE nb.project_id = p.id) AS nlp_category_count
     FROM projects p
     LEFT JOIN profiles pr ON pr.id = p.profile_id
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
    counts: { profiles, projects, keywords, runs, reports, ranking_snapshots: rankingSnapshots, ranking_optimization_targets: targets, content_plans: contentPlans, entity_sets: entitySets, nlp_category_batches: nlpBatches, pending_commands: pendingCommands },
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
  const profileScope = scopeClause(scope, "p.id");
  const profileWhere = scope.scoped && profileScope.sql ? `WHERE ${profileScope.sql}` : "";
  const domainScope = scopeClause(scope, "dl.project_id");
  const domainWhere = scope.scoped && domainScope.sql ? `AND (dl.project_id IS NULL OR ${domainScope.sql})` : "";
  const [runs, jobs, snapshots, targets, entityBatches, entityRuns, entitySets, contentPlans, nlpBatches, nlpUrls, nlpComparisonRuns, nlpComparisonResults, profileRows, domainLists, keywordRows, commands, audits] = await Promise.all([
    env.DB.prepare(
      `SELECT r.id, r.project_id, r.keyword, r.target_url, r.target_domain, r.imported_at, r.file_name, r.status,
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
      `SELECT j.id, j.project_id, j.keyword, j.target_url, j.target_domain, j.cora_profile, j.tool, j.status,
              j.status_message, j.cora_running, j.cora_action, j.progress, j.error,
              j.started_at, j.updated_at, j.completed_at, j.last_activity_at,
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
    env.DB.prepare(
      `SELECT b.id, b.project_id, b.source_type, b.source_value, b.status, b.provider,
              b.target_count, b.complete_count, b.failed_count, b.skipped_count, b.max_urls,
              b.same_host_only, b.error, b.created_at, b.updated_at, p.name AS project_name
       FROM nlp_category_batches b
       LEFT JOIN projects p ON p.id = b.project_id
       ORDER BY b.created_at DESC, b.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT u.id, u.batch_id, u.url, u.status, u.title, u.category, u.confidence,
              u.primary_result, u.categories_json, u.word_count, u.error, u.created_at, u.updated_at,
              b.project_id, p.name AS project_name
       FROM nlp_category_urls u
       JOIN nlp_category_batches b ON b.id = u.batch_id
       LEFT JOIN projects p ON p.id = b.project_id
       ORDER BY u.updated_at DESC, u.id DESC
       LIMIT 500`
    ).all(),
    env.DB.prepare(
      `SELECT cr.*, p.name AS project_name
       FROM nlp_llm_comparison_runs cr
       LEFT JOIN projects p ON p.id = cr.project_id
       ORDER BY cr.created_at DESC, cr.id DESC
       LIMIT 200`
    ).all(),
    env.DB.prepare(
      `SELECT r.*, cr.batch_id, cr.project_id, cr.provider, cr.model, cr.taxonomy, p.name AS project_name
       FROM nlp_llm_comparison_results r
       JOIN nlp_llm_comparison_runs cr ON cr.id = r.comparison_run_id
       LEFT JOIN projects p ON p.id = cr.project_id
       ORDER BY r.updated_at DESC, r.id DESC
       LIMIT 800`
    ).all(),
    env.DB.prepare(
      `SELECT pr.id, pr.name, pr.client, pr.notes, pr.created_at, pr.updated_at, pr.archived_at,
              COUNT(p.id) AS client_count,
              GROUP_CONCAT(p.name, ', ') AS client_names
       FROM profiles pr
       LEFT JOIN projects p ON p.profile_id = pr.id
       ${profileWhere ? profileWhere + " AND pr.archived_at IS NULL" : "WHERE pr.archived_at IS NULL"}
       GROUP BY pr.id
       ORDER BY pr.updated_at DESC, pr.id DESC
       LIMIT 150`
    ).bind(...profileScope.binds).all(),
    env.DB.prepare(
      `SELECT dl.*, p.name AS project_name, pr.name AS profile_name
       FROM cora_domain_lists dl
       LEFT JOIN projects p ON p.id = dl.project_id
       LEFT JOIN profiles pr ON pr.id = dl.profile_id
       WHERE dl.archived_at IS NULL ${domainWhere}
       ORDER BY dl.updated_at DESC, dl.id DESC
       LIMIT 300`
    ).bind(...domainScope.binds).all(),
    env.DB.prepare(
      `SELECT k.id, k.project_id, k.keyword, k.intent, k.priority, k.created_at, p.name AS project_name
       FROM keywords k
       LEFT JOIN projects p ON p.id = k.project_id
       ORDER BY k.created_at DESC, k.id DESC
       LIMIT 500`
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
    nlp_category_batches: filterScope(nlpBatches.results || [], scope),
    nlp_category_urls: filterScope(nlpUrls.results || [], scope),
    nlp_llm_comparison_runs: filterScope(nlpComparisonRuns.results || [], scope),
    nlp_llm_comparison_results: filterScope(nlpComparisonResults.results || [], scope),
    profiles: profileRows.results || [],
    domain_lists: domainLists.results || [],
    keywords: filterScope(keywordRows.results || [], scope),
    commands: filterScope(normalizedCommands.map((command) => ({ ...command, project_id: command.payload?.project_id || command.result?.project?.id || command.result?.snapshot?.project_id || null })), scope),
    audit_events: scope.scoped ? [] : audits
  });
}

function parseJsonField(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback; } catch (_err) { return fallback; }
}

function entityTermText(item, type) {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  if (type === "question") return item.question || item.query || item.text || item.term || "";
  if (type === "topic_cluster") return item.cluster || item.name || item.topic || item.term || "";
  return item.name || item.entity || item.term || item.keyword || item.text || "";
}

function normalizeEntityTerm(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function addEntityTerms(map, run, type, items) {
  const source = `${run.provider || "provider"} / ${run.model || "model"}`;
  for (const item of Array.isArray(items) ? items : []) {
    const term = cleanText(entityTermText(item, type));
    const normalized = normalizeEntityTerm(term);
    if (!normalized) continue;
    if (!map.has(`${type}:${normalized}`)) {
      map.set(`${type}:${normalized}`, {
        term,
        normalized,
        type,
        source_count: 0,
        sources: [],
        relevance_score: 0
      });
    }
    const row = map.get(`${type}:${normalized}`);
    if (!row.sources.some((entry) => entry.run_id === run.id)) {
      row.sources.push({ run_id: run.id, provider: run.provider || "", model: run.model || "", source });
      row.source_count = row.sources.length;
      row.relevance_score = row.source_count * 25 + (type === "entity" ? 10 : type === "lsi" ? 6 : 0);
    }
  }
}

function entityRunPayload(run) {
  return {
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
  };
}

function entityCrossoverRows(runs) {
  const map = new Map();
  for (const run of runs.map(entityRunPayload)) {
    addEntityTerms(map, run, "entity", run.entities);
    addEntityTerms(map, run, "lsi", run.lsi_keywords);
    addEntityTerms(map, run, "related_keyword", run.related_keywords);
    addEntityTerms(map, run, "question", run.questions);
    addEntityTerms(map, run, "topic_cluster", run.topics);
  }
  return [...map.values()].sort((a, b) => (b.source_count - a.source_count) || (b.relevance_score - a.relevance_score) || a.term.localeCompare(b.term));
}

async function handleEntityBatchDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const batch = await env.DB.prepare(
    `SELECT b.*, p.name AS project_name
     FROM entity_lsi_batches b
     LEFT JOIN projects p ON p.id = b.project_id
     WHERE b.id = ?`
  ).bind(id).first();
  if (!batch) return json({ ok: false, error: "Entity batch not found" }, 404);
  await assertProjectAccess(request, env, batch.project_id);
  const runs = await env.DB.prepare(
    "SELECT * FROM entity_lsi_runs WHERE batch_id = ? ORDER BY created_at ASC, id ASC"
  ).bind(id).all();
  const runRows = runs.results || [];
  const crossover = entityCrossoverRows(runRows);
  await logAudit(request, env, "entity_batch_detail_view", "entity_lsi_batch", id, { seed_keyword: batch.seed_keyword || "" }, "cloud-dashboard");
  return json({ ok: true, batch, runs: runRows.map(entityRunPayload), crossover });
}

async function requireProjectWriteAccess(request, env, projectId) {
  const scope = await accessContext(request, env);
  if (!scope.write) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  if (scope.scoped && !scope.clientIds.map(String).includes(String(projectId || ""))) {
    const error = new Error("Forbidden: this user can only write assigned clients.");
    error.status = 403;
    throw error;
  }
  return scope;
}

async function handleEntitySetSave(request, env) {
  const payload = await request.json().catch(() => ({}));
  const projectId = Number(payload.project_id || 0);
  if (!projectId) return json({ ok: false, error: "Client is required" }, 400);
  await requireProjectWriteAccess(request, env, projectId);
  const terms = Array.isArray(payload.terms) ? payload.terms.slice(0, 500) : [];
  if (!terms.length) return json({ ok: false, error: "Select at least one term" }, 400);
  const now = new Date().toISOString();
  const name = cleanText(payload.name) || "Saved entity set";
  const result = await env.DB.prepare(
    "INSERT INTO entity_sets (project_id, source_batch_id, name, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(projectId, Number(payload.source_batch_id || 0) || null, name, cleanText(payload.notes), now, now).run();
  const setId = result.meta.last_row_id;
  const statements = terms.map((term) => {
    const text = cleanText(term.term);
    const normalized = normalizeEntityTerm(term.normalized || text);
    return env.DB.prepare(
      "INSERT INTO entity_set_terms (set_id, term, normalized, type, source_count, sources_json, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(setId, text, normalized, cleanText(term.type) || "entity", Number(term.source_count || 0), JSON.stringify(term.sources || []), cleanText(term.notes), now);
  });
  await env.DB.batch(statements);
  const set = await env.DB.prepare("SELECT * FROM entity_sets WHERE id = ?").bind(setId).first();
  await logAudit(request, env, "entity_set_created", "entity_set", setId, { name, terms: terms.length }, "cloud-dashboard");
  return json({ ok: true, set, terms_saved: terms.length }, 201);
}

async function handleEntitySetDelete(request, env, id) {
  const set = await env.DB.prepare("SELECT * FROM entity_sets WHERE id = ?").bind(id).first();
  if (!set) return json({ ok: false, error: "Entity set not found" }, 404);
  await requireProjectWriteAccess(request, env, set.project_id);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM entity_set_terms WHERE set_id = ?").bind(id),
    env.DB.prepare("DELETE FROM entity_sets WHERE id = ?").bind(id)
  ]);
  await logAudit(request, env, "entity_set_deleted", "entity_set", id, { name: set.name || "" }, "cloud-dashboard");
  return json({ ok: true, deleted: id });
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

async function rankingSnapshotBundle(request, env, id) {
  const snapshot = await env.DB.prepare(
    `SELECT rs.*, p.name AS project_name
     FROM ranking_snapshots rs
     LEFT JOIN projects p ON p.id = rs.project_id
     WHERE rs.id = ?`
  ).bind(id).first();
  if (!snapshot) {
    const error = new Error("Ranking snapshot not found");
    error.status = 404;
    throw error;
  }
  await assertProjectAccess(request, env, snapshot.project_id);
  const [keywords, pages] = await Promise.all([
    env.DB.prepare("SELECT * FROM ranking_snapshot_keywords WHERE snapshot_id = ? LIMIT 5000").bind(id).all(),
    env.DB.prepare("SELECT * FROM ranking_snapshot_pages WHERE snapshot_id = ? LIMIT 2000").bind(id).all()
  ]);
  return { snapshot, keywords: keywords.results || [], pages: pages.results || [] };
}

async function handleRankingSnapshotCompare(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const baseId = Number(url.searchParams.get("base_id") || 0);
  const compareId = Number(url.searchParams.get("compare_id") || 0);
  if (!baseId || !compareId) return json({ ok: false, error: "base_id and compare_id are required" }, 400);
  if (baseId === compareId) return json({ ok: false, error: "Choose two different snapshots to compare" }, 400);
  const [base, compare] = await Promise.all([
    rankingSnapshotBundle(request, env, baseId),
    rankingSnapshotBundle(request, env, compareId)
  ]);
  if (base.snapshot.project_id && compare.snapshot.project_id && Number(base.snapshot.project_id) !== Number(compare.snapshot.project_id)) {
    return json({ ok: false, error: "Snapshots must belong to the same client" }, 400);
  }
  const baseKeywords = new Map(base.keywords.map((row) => [cleanText(row.keyword).toLowerCase(), row]).filter(([key]) => key));
  const compareKeywords = new Map(compare.keywords.map((row) => [cleanText(row.keyword).toLowerCase(), row]).filter(([key]) => key));
  const keywordRows = [];
  const newKeywords = [];
  const lostKeywords = [];
  const improvedKeywords = [];
  const declinedKeywords = [];
  for (const key of [...new Set([...baseKeywords.keys(), ...compareKeywords.keys()])].sort()) {
    const before = baseKeywords.get(key);
    const after = compareKeywords.get(key);
    if (before && !after) {
      const row = { keyword: before.keyword, rankingUrl: before.ranking_url, basePosition: numericValue(before.position), comparePosition: null, positionDelta: null, searchVolume: numericValue(before.search_volume), estimatedTrafficDelta: -(numericValue(before.estimated_traffic) || 0), status: "lost" };
      lostKeywords.push(row);
      keywordRows.push(row);
      continue;
    }
    if (after && !before) {
      const row = { keyword: after.keyword, rankingUrl: after.ranking_url, basePosition: null, comparePosition: numericValue(after.position), positionDelta: null, searchVolume: numericValue(after.search_volume), estimatedTrafficDelta: numericValue(after.estimated_traffic) || 0, status: "new" };
      newKeywords.push(row);
      keywordRows.push(row);
      continue;
    }
    if (!before || !after) continue;
    const basePosition = numericValue(before.position);
    const comparePosition = numericValue(after.position);
    const positionDelta = basePosition !== null && comparePosition !== null ? comparePosition - basePosition : null;
    const estimatedTrafficDelta = (numericValue(after.estimated_traffic) || 0) - (numericValue(before.estimated_traffic) || 0);
    let status = "unchanged";
    if (positionDelta !== null && positionDelta < 0) status = "improved";
    if (positionDelta !== null && positionDelta > 0) status = "declined";
    const row = { keyword: after.keyword || before.keyword, rankingUrl: after.ranking_url || before.ranking_url, basePosition, comparePosition, positionDelta, searchVolume: numericValue(after.search_volume ?? before.search_volume), estimatedTrafficDelta, status };
    keywordRows.push(row);
    if (status === "improved") improvedKeywords.push(row);
    if (status === "declined") declinedKeywords.push(row);
  }
  const basePages = new Map(base.pages.map((row) => [comparableUrl(row.url), row]).filter(([key]) => key));
  const comparePages = new Map(compare.pages.map((row) => [comparableUrl(row.url), row]).filter(([key]) => key));
  const pageRows = [];
  for (const key of [...new Set([...basePages.keys(), ...comparePages.keys()])].sort()) {
    const before = basePages.get(key);
    const after = comparePages.get(key);
    const source = after || before || {};
    const baseOrganicTraffic = before ? numericValue(before.organic_traffic) : null;
    const compareOrganicTraffic = after ? numericValue(after.organic_traffic) : null;
    const baseOrganicKeywords = before ? numericValue(before.organic_keywords) : null;
    const compareOrganicKeywords = after ? numericValue(after.organic_keywords) : null;
    const organicTrafficDelta = (compareOrganicTraffic || 0) - (baseOrganicTraffic || 0);
    const organicKeywordDelta = (compareOrganicKeywords || 0) - (baseOrganicKeywords || 0);
    let status = "unchanged";
    if (before && !after) status = "lost";
    else if (after && !before) status = "new";
    else if (organicTrafficDelta > 0) status = "gained";
    else if (organicTrafficDelta < 0) status = "lost_traffic";
    pageRows.push({ url: source.url, baseOrganicTraffic, compareOrganicTraffic, organicTrafficDelta, baseOrganicKeywords, compareOrganicKeywords, organicKeywordDelta, status });
  }
  pageRows.sort((a, b) => Math.abs(b.organicTrafficDelta || 0) - Math.abs(a.organicTrafficDelta || 0));
  keywordRows.sort((a, b) => {
    const aPriority = ["improved", "declined", "new", "lost"].includes(a.status) ? 0 : 1;
    const bPriority = ["improved", "declined", "new", "lost"].includes(b.status) ? 0 : 1;
    return aPriority - bPriority || Math.abs(b.positionDelta || 0) - Math.abs(a.positionDelta || 0);
  });
  await logAudit(request, env, "ranking_snapshot_compare", "ranking_snapshot", compareId, { base_id: baseId, compare_id: compareId }, "cloud-dashboard");
  return json({
    ok: true,
    base: base.snapshot,
    compare: compare.snapshot,
    summary: {
      newKeywords: newKeywords.length,
      lostKeywords: lostKeywords.length,
      improvedKeywords: improvedKeywords.length,
      declinedKeywords: declinedKeywords.length,
      pageGains: pageRows.filter((row) => ["new", "gained"].includes(row.status)).length,
      pageLosses: pageRows.filter((row) => ["lost", "lost_traffic"].includes(row.status)).length
    },
    keywords: keywordRows,
    newKeywords,
    lostKeywords,
    improvedKeywords,
    declinedKeywords,
    pages: pageRows
  });
}

async function handleOptimizationTargetStatus(request, env) {
  const payload = await request.json().catch(() => ({}));
  const ids = Array.isArray(payload.target_ids) ? payload.target_ids.map((id) => Number(id)).filter(Boolean).slice(0, 250) : [];
  const status = cleanText(payload.status) || "";
  const projectId = Number(payload.project_id || 0) || null;
  if (!ids.length) return json({ ok: false, error: "Select at least one optimization target" }, 400);
  if (!RANKING_TARGET_STATUSES.has(status)) return json({ ok: false, error: "Invalid optimization target status" }, 400);
  await requireProjectWriteAccess(request, env, projectId);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `SELECT id, project_id FROM ranking_optimization_targets WHERE id IN (${placeholders})`
  ).bind(...ids).all();
  const found = rows.results || [];
  if (found.length !== ids.length) return json({ ok: false, error: "One or more optimization targets were not found" }, 404);
  const wrongProject = found.some((row) => String(row.project_id || "") !== String(projectId || ""));
  if (wrongProject) return json({ ok: false, error: "Optimization targets must belong to the selected client" }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE ranking_optimization_targets SET status = ?, updated_at = ? WHERE id IN (${placeholders})`
  ).bind(status, now, ...ids).run();
  const updated = await env.DB.prepare(
    `SELECT rot.*, p.name AS project_name
     FROM ranking_optimization_targets rot
     LEFT JOIN projects p ON p.id = rot.project_id
     WHERE rot.id IN (${placeholders})
     ORDER BY rot.opportunity_score DESC, rot.updated_at DESC`
  ).bind(...ids).all();
  await logAudit(request, env, "optimization_target_status", "ranking_optimization_target", ids[0], { count: ids.length, status, project_id: projectId }, "cloud-dashboard");
  return json({ ok: true, targets: updated.results || [], updated: ids.length });
}

async function handleOptimizationTargetSave(request, env) {
  const payload = await request.json().catch(() => ({}));
  const snapshotId = Number(payload.snapshot_id || 0);
  const projectId = Number(payload.project_id || 0) || null;
  const status = RANKING_TARGET_STATUSES.has(cleanText(payload.status)) ? cleanText(payload.status) : "selected";
  const targets = Array.isArray(payload.targets) ? payload.targets.slice(0, 250) : [];
  if (!snapshotId) return json({ ok: false, error: "snapshot_id is required" }, 400);
  if (!targets.length) return json({ ok: false, error: "Select at least one optimization target" }, 400);
  const snapshot = await env.DB.prepare("SELECT id, project_id FROM ranking_snapshots WHERE id = ?").bind(snapshotId).first();
  if (!snapshot) return json({ ok: false, error: "Ranking snapshot not found" }, 404);
  const resolvedProjectId = Number(snapshot.project_id || projectId || 0) || null;
  if (projectId && resolvedProjectId && Number(projectId) !== Number(resolvedProjectId)) {
    return json({ ok: false, error: "Optimization targets must be saved to the same client as the Ranking Snapshot" }, 400);
  }
  await requireProjectWriteAccess(request, env, resolvedProjectId);
  const now = new Date().toISOString();
  const savedIds = [];
  for (const item of targets) {
    const url = cleanText(item.url || item.rankingUrl);
    if (!url) continue;
    const existing = await env.DB.prepare("SELECT id FROM ranking_optimization_targets WHERE snapshot_id = ? AND url = ? ORDER BY id LIMIT 1").bind(snapshotId, url).first();
    const values = [
      snapshotId,
      resolvedProjectId,
      url,
      cleanText(item.keyword),
      Number(item.bestPosition ?? item.best_position ?? 0) || null,
      Number(item.rankingKeywords ?? item.ranking_keywords ?? 0) || null,
      Number(item.opportunityCount ?? item.opportunity_count ?? 0) || null,
      Number(item.totalSearchVolume ?? item.total_search_volume ?? 0) || null,
      Number(item.estimatedTraffic ?? item.estimated_traffic ?? 0) || null,
      Number(item.pageOrganicTraffic ?? item.page_organic_traffic ?? 0) || null,
      Number(item.pageOrganicKeywords ?? item.page_organic_keywords ?? 0) || null,
      Number(item.top10 ?? 0) || null,
      cleanText(item.priorityType || item.priority_type),
      Number(item.opportunityScore ?? item.opportunity_score ?? 0) || null,
      cleanText(item.recommendedAction || item.recommended_action),
      JSON.stringify(Array.isArray(item.topKeywords) ? item.topKeywords : []),
      status,
      cleanText(item.notes),
      now
    ];
    if (existing) {
      await env.DB.prepare(
        `UPDATE ranking_optimization_targets
         SET snapshot_id = ?, project_id = ?, url = ?, keyword = ?, best_position = ?, ranking_keywords = ?,
             opportunity_count = ?, total_search_volume = ?, estimated_traffic = ?, page_organic_traffic = ?,
             page_organic_keywords = ?, top10 = ?, priority_type = ?, opportunity_score = ?, recommended_action = ?,
             top_keywords_json = ?, status = ?, notes = COALESCE(NULLIF(?, ''), notes), updated_at = ?
         WHERE id = ?`
      ).bind(...values, existing.id).run();
      savedIds.push(existing.id);
    } else {
      const inserted = await env.DB.prepare(
        `INSERT INTO ranking_optimization_targets
         (snapshot_id, project_id, url, keyword, best_position, ranking_keywords, opportunity_count,
          total_search_volume, estimated_traffic, page_organic_traffic, page_organic_keywords, top10,
          priority_type, opportunity_score, recommended_action, top_keywords_json, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(...values, now).run();
      savedIds.push(inserted.meta.last_row_id);
    }
  }
  if (!savedIds.length) return json({ ok: false, error: "No valid target URLs were selected" }, 400);
  const placeholders = savedIds.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `SELECT rot.*, p.name AS project_name
     FROM ranking_optimization_targets rot
     LEFT JOIN projects p ON p.id = rot.project_id
     WHERE rot.id IN (${placeholders})
     ORDER BY rot.opportunity_score DESC, rot.updated_at DESC`
  ).bind(...savedIds).all();
  await logAudit(request, env, "optimization_target_saved", "ranking_snapshot", snapshotId, { count: savedIds.length, project_id: resolvedProjectId }, "cloud-dashboard");
  return json({ ok: true, targets: rows.results || [], saved_ids: savedIds }, 201);
}

async function handleContentPlanStatus(request, env) {
  const payload = await request.json().catch(() => ({}));
  const ids = Array.isArray(payload.plan_ids) ? payload.plan_ids.map((id) => Number(id)).filter(Boolean).slice(0, 250) : [];
  const status = cleanText(payload.status) || "";
  const projectId = Number(payload.project_id || 0) || null;
  if (!ids.length) return json({ ok: false, error: "Select at least one content plan" }, 400);
  if (!CONTENT_PLAN_STATUSES.has(status)) return json({ ok: false, error: "Invalid content plan status" }, 400);
  await requireProjectWriteAccess(request, env, projectId);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `SELECT id, project_id FROM content_plans WHERE id IN (${placeholders})`
  ).bind(...ids).all();
  const found = rows.results || [];
  if (found.length !== ids.length) return json({ ok: false, error: "One or more content plans were not found" }, 404);
  const wrongProject = found.some((row) => String(row.project_id || "") !== String(projectId || ""));
  if (wrongProject) return json({ ok: false, error: "Content plans must belong to the selected client" }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE content_plans SET status = ?, updated_at = ? WHERE id IN (${placeholders})`
  ).bind(status, now, ...ids).run();
  const updated = await env.DB.prepare(
    `SELECT cp.id, cp.project_id, cp.title, cp.content_type, cp.intent, cp.priority, cp.status,
            cp.due_date, cp.notes, cp.created_at, cp.updated_at, p.name AS project_name, k.keyword
     FROM content_plans cp
     LEFT JOIN projects p ON p.id = cp.project_id
     LEFT JOIN keywords k ON k.id = cp.keyword_id
     WHERE cp.id IN (${placeholders})
     ORDER BY cp.updated_at DESC`
  ).bind(...ids).all();
  await logAudit(request, env, "content_plan_status", "content_plan", ids[0], { count: ids.length, status, project_id: projectId }, "cloud-dashboard");
  return json({ ok: true, content_plans: updated.results || [], updated: ids.length });
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
  const client = await env.DB.prepare(
    `SELECT p.*,
            COALESCE(p.site_domain, (SELECT s.domain FROM sites s WHERE s.project_id = p.id ORDER BY s.id LIMIT 1)) AS site_domain,
            pr.name AS profile_name, pr.client AS profile_client
     FROM projects p
     LEFT JOIN profiles pr ON pr.id = p.profile_id
     WHERE p.id = ?`
  ).bind(id).first();
  if (!client) return json({ ok: false, error: "Client not found" }, 404);
  const [keywords, runs, jobs, snapshots, rankingPages, targets, reports, plans, entityBatches, entityRuns, entitySets, nlpBatches, nlpUrls, nlpComparisonRuns, nlpComparisonResults, commands] = await Promise.all([
    env.DB.prepare("SELECT * FROM keywords WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 250").bind(id).all(),
    env.DB.prepare("SELECT * FROM runs WHERE project_id = ? ORDER BY imported_at DESC, id DESC LIMIT 150").bind(id).all(),
    env.DB.prepare("SELECT * FROM managed_jobs WHERE project_id = ? ORDER BY updated_at DESC, id DESC LIMIT 150").bind(id).all(),
    env.DB.prepare("SELECT * FROM ranking_snapshots WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").bind(id).all(),
    env.DB.prepare(
      `SELECT rsp.*, rs.project_id, rs.target, rs.created_at AS snapshot_created_at
       FROM ranking_snapshot_pages rsp
       JOIN ranking_snapshots rs ON rs.id = rsp.snapshot_id
       WHERE rs.project_id = ?
       ORDER BY rs.created_at DESC, rsp.organic_traffic DESC, rsp.organic_keywords DESC
       LIMIT 2000`
    ).bind(id).all(),
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
    ).bind(id).all(),
    env.DB.prepare("SELECT * FROM nlp_category_batches WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").bind(id).all(),
    env.DB.prepare(
      `SELECT u.*
       FROM nlp_category_urls u
       JOIN nlp_category_batches b ON b.id = u.batch_id
       WHERE b.project_id = ?
       ORDER BY u.updated_at DESC, u.id DESC
       LIMIT 500`
    ).bind(id).all(),
    env.DB.prepare("SELECT * FROM nlp_llm_comparison_runs WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 150").bind(id).all(),
    env.DB.prepare(
      `SELECT r.*, cr.batch_id, cr.project_id, cr.provider, cr.model, cr.taxonomy
       FROM nlp_llm_comparison_results r
       JOIN nlp_llm_comparison_runs cr ON cr.id = r.comparison_run_id
       WHERE cr.project_id = ?
       ORDER BY r.updated_at DESC, r.id DESC
       LIMIT 800`
    ).bind(id).all(),
    env.DB.prepare("SELECT * FROM cloud_commands ORDER BY created_at DESC, id DESC LIMIT 150").all()
  ]);
  const clientCommands = (commands.results || [])
    .map(normalizeCommand)
    .filter((command) => String(command.payload?.project_id || command.result?.project?.id || command.result?.snapshot?.project_id || "") === String(id))
    .slice(0, 20);
  await logAudit(request, env, "client_detail_view", "project", id, { name: client.name || "" }, "cloud-dashboard");
  return json({
    ok: true,
    client,
    keywords: keywords.results || [],
    runs: runs.results || [],
    jobs: jobs.results || [],
    snapshots: snapshots.results || [],
    ranking_snapshot_pages: rankingPages.results || [],
    targets: targets.results || [],
    reports: reports.results || [],
    content_plans: plans.results || [],
    entity_batches: entityBatches.results || [],
    entity_runs: entityRuns.results || [],
    entity_sets: entitySets.results || [],
    nlp_category_batches: nlpBatches.results || [],
    nlp_category_urls: nlpUrls.results || [],
    nlp_llm_comparison_runs: nlpComparisonRuns.results || [],
    nlp_llm_comparison_results: nlpComparisonResults.results || [],
    commands: clientCommands
  });
}

async function countScopedPages(env, scope) {
  if (!scope?.scoped) return await countTable(env, "pages");
  const clause = scopeClause(scope, "s.project_id");
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM pages p
     JOIN sites s ON s.id = p.site_id
     WHERE ${clause.sql}`
  ).bind(...clause.binds).first();
  return Number(row?.count || 0);
}

async function handleLocalCoraStatus(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  return json({
    connected: false,
    running: false,
    cloud_mode: true,
    status: "cloud",
    message: "Cora desktop execution is local-only. Cloud tools run here; Cora jobs use the local bridge."
  });
}

async function handleLocalCloudflareStatus(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const [projects, runs, jobs, apiKeys, artifacts, bridge] = await Promise.all([
    countTable(env, "projects"),
    countTable(env, "runs"),
    countTable(env, "managed_jobs"),
    countTable(env, "api_keys").catch(() => 0),
    artifactStatusData(env),
    bridgeStatus(env)
  ]);
  const latestBridge = Array.isArray(bridge) ? bridge[0] : null;
  return json({
    configured: true,
    state: "cloud",
    counts: { projects, runs, jobs, api_keys: apiKeys + cloudPseudoApiKeys(env).length },
    artifacts,
    bridge: {
      enabled: Boolean(latestBridge),
      allow_cora: Boolean(latestBridge?.allow_cora),
      allow_paid_tools: Boolean(latestBridge?.allow_paid_tools),
      last_error: null,
      last_poll_at: latestBridge?.last_poll_at || null,
      poll_interval: latestBridge?.poll_interval || null,
      last_result: latestBridge?.last_result || null
    },
    sync_url: new URL(request.url).origin,
    credential_source: "cloudflare-worker",
    batch_size: 500,
    has_token: true
  });
}

async function handleLocalProfiles(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const rows = await env.DB.prepare("SELECT * FROM profiles WHERE archived_at IS NULL ORDER BY updated_at DESC, name ASC LIMIT 250").all();
  return json({ profiles: rows.results || [], selected_cora_profile: "" });
}

async function handleLocalProjects(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  if (request.method === "POST") {
    const payload = await request.json().catch(() => ({}));
    await requireProjectWriteAccess(request, env, payload.project_id || null);
    const result = await executeCloudCommand("create_project", payload, env);
    return json({ ok: true, project: result.project, duplicate: Boolean(result.duplicate) }, result.duplicate ? 200 : 201);
  }
  const scope = await accessContext(request, env);
  const clause = scopeClause(scope, "p.id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT p.id, p.profile_id, p.name, p.client, p.site_domain, p.notes, p.created_at, p.updated_at,
            pr.name AS profile_name,
            (SELECT COUNT(*) FROM sites s WHERE s.project_id = p.id) AS site_count,
            (SELECT COUNT(*) FROM keywords k WHERE k.project_id = p.id) AS keyword_count,
            (SELECT COUNT(*) FROM runs r WHERE r.project_id = p.id) AS run_count,
            (SELECT COUNT(*) FROM managed_jobs j WHERE j.project_id = p.id) AS job_count
     FROM projects p
     LEFT JOIN profiles pr ON pr.id = p.profile_id
     ${where}
     ORDER BY p.updated_at DESC, p.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ projects: rows.results || [] });
}

async function handleLocalProjectDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  await assertProjectAccess(request, env, id);
  const project = await env.DB.prepare(
    `SELECT p.*, pr.name AS profile_name
     FROM projects p
     LEFT JOIN profiles pr ON pr.id = p.profile_id
     WHERE p.id = ?`
  ).bind(id).first();
  if (!project) return json({ ok: false, error: "Project not found" }, 404);
  const [sites, pages, keywords, runs, jobs, contentPlans] = await Promise.all([
    env.DB.prepare("SELECT * FROM sites WHERE project_id = ? ORDER BY id LIMIT 500").bind(id).all(),
    env.DB.prepare(
      `SELECT pg.*, s.domain AS site_domain
       FROM pages pg
       LEFT JOIN sites s ON s.id = pg.site_id
       WHERE s.project_id = ?
       ORDER BY pg.id
       LIMIT 1000`
    ).bind(id).all(),
    env.DB.prepare("SELECT * FROM keywords WHERE project_id = ? ORDER BY id LIMIT 1000").bind(id).all(),
    env.DB.prepare("SELECT * FROM runs WHERE project_id = ? ORDER BY imported_at DESC, id DESC LIMIT 250").bind(id).all(),
    env.DB.prepare("SELECT * FROM managed_jobs WHERE project_id = ? ORDER BY updated_at DESC, id DESC LIMIT 250").bind(id).all(),
    env.DB.prepare("SELECT * FROM content_plans WHERE project_id = ? ORDER BY updated_at DESC, id DESC LIMIT 250").bind(id).all()
  ]);
  return json({
    project,
    sites: sites.results || [],
    pages: pages.results || [],
    keywords: keywords.results || [],
    runs: runs.results || [],
    jobs: jobs.results || [],
    content_plans: contentPlans.results || []
  });
}

async function handleLocalOverview(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const runScope = scopeClause(scope, "r.project_id");
  const runWhere = runScope.sql ? `WHERE ${runScope.sql}` : "";
  const jobScope = scopeClause(scope, "j.project_id");
  const jobWhere = jobScope.sql ? `WHERE ${jobScope.sql}` : "";
  const planScope = scopeClause(scope, "cp.project_id");
  const planWhere = planScope.sql ? `WHERE ${planScope.sql}` : "";
  const [profiles, projects, keywords, runs, sites, pages, workbookRows, plans, jobs, recentRuns, recentJobs, recentPlans] = await Promise.all([
    countTable(env, "profiles"),
    countProjectTable(env, "projects", scope, "id"),
    countProjectTable(env, "keywords", scope),
    countProjectTable(env, "runs", scope),
    countProjectTable(env, "sites", scope),
    countScopedPages(env, scope),
    countTable(env, "workbook_rows").catch(() => 0),
    countProjectTable(env, "content_plans", scope),
    env.DB.prepare(`SELECT status, COUNT(*) AS count FROM managed_jobs j ${jobWhere} GROUP BY status ORDER BY count DESC`).bind(...jobScope.binds).all(),
    env.DB.prepare(
      `SELECT r.*, p.name AS project_name
       FROM runs r
       LEFT JOIN projects p ON p.id = r.project_id
       ${runWhere}
       ORDER BY r.imported_at DESC, r.id DESC
       LIMIT 10`
    ).bind(...runScope.binds).all(),
    env.DB.prepare(
      `SELECT j.*, p.name AS project_name
       FROM managed_jobs j
       LEFT JOIN projects p ON p.id = j.project_id
       ${jobWhere}
       ORDER BY j.updated_at DESC, j.id DESC
       LIMIT 10`
    ).bind(...jobScope.binds).all(),
    env.DB.prepare(
      `SELECT cp.*, p.name AS project_name
       FROM content_plans cp
       LEFT JOIN projects p ON p.id = cp.project_id
       ${planWhere}
       ORDER BY cp.updated_at DESC, cp.id DESC
       LIMIT 10`
    ).bind(...planScope.binds).all()
  ]);
  const storedKeys = await storedCloudApiKeys(env).catch(() => []);
  const keys = [...storedKeys.map(apiKeyPublic), ...cloudPseudoApiKeys(env)];
  return json({
    counts: { profiles, projects, runs, keywords, workbook_rows: workbookRows, sites, pages, content_plans: plans, api_keys: keys.length },
    job_counts: jobs.results || [],
    recent_runs: recentRuns.results || [],
    recent_jobs: recentJobs.results || [],
    recent_content_plans: recentPlans.results || [],
    api_key_providers: keys.map((key) => ({ provider: key.provider_name, provider_key: key.provider_key, count: 1 }))
  });
}

async function handleLocalRuns(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("project_id") || 0);
  if (projectId) await assertProjectAccess(request, env, projectId);
  const clause = projectId ? { sql: "r.project_id = ?", binds: [projectId] } : scopeClause(scope, "r.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT r.*, p.name AS project_name
     FROM runs r
     LEFT JOIN projects p ON p.id = r.project_id
     ${where}
     ORDER BY r.imported_at DESC, r.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ runs: rows.results || [] });
}

async function handleLocalJobs(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const clause = scopeClause(scope, "j.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT j.*, p.name AS project_name
     FROM managed_jobs j
     LEFT JOIN projects p ON p.id = j.project_id
     ${where}
     ORDER BY j.updated_at DESC, j.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ jobs: rows.results || [] });
}

async function handleLocalShareReports(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const clause = scopeClause(scope, "r.project_id");
  const where = `sr.revoked_at IS NULL${clause.sql ? ` AND ${clause.sql}` : ""}`;
  const rows = await env.DB.prepare(
    `SELECT sr.*, r.keyword, r.target_url, r.target_domain, p.name AS project_name
     FROM share_reports sr
     LEFT JOIN runs r ON r.id = sr.run_id
     LEFT JOIN projects p ON p.id = r.project_id
     WHERE ${where}
     ORDER BY sr.created_at DESC, sr.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ reports: rows.results || [] });
}

async function handleLocalContentPlans(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const clause = scopeClause(scope, "cp.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT cp.*, p.name AS project_name, k.keyword
     FROM content_plans cp
     LEFT JOIN projects p ON p.id = cp.project_id
     LEFT JOIN keywords k ON k.id = cp.keyword_id
     ${where}
     ORDER BY cp.updated_at DESC, cp.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ content_plans: rows.results || [] });
}

async function handleLocalRankingSnapshots(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const clause = scopeClause(scope, "rs.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT rs.*, p.name AS project_name,
            (SELECT COUNT(*) FROM ranking_snapshot_keywords rsk WHERE rsk.snapshot_id = rs.id) AS keyword_count,
            (SELECT COUNT(*) FROM ranking_snapshot_pages rsp WHERE rsp.snapshot_id = rs.id) AS page_count,
            (SELECT COUNT(*) FROM ranking_optimization_targets rot WHERE rot.snapshot_id = rs.id) AS target_count
     FROM ranking_snapshots rs
     LEFT JOIN projects p ON p.id = rs.project_id
     ${where}
     ORDER BY rs.created_at DESC, rs.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ snapshots: rows.results || [] });
}

async function handleLocalOptimizationTargets(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const clause = scopeClause(scope, "rot.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT rot.*, p.name AS project_name
     FROM ranking_optimization_targets rot
     LEFT JOIN projects p ON p.id = rot.project_id
     ${where}
     ORDER BY rot.opportunity_score DESC, rot.updated_at DESC, rot.id DESC
     LIMIT 500`
  ).bind(...clause.binds).all();
  return json({ targets: rows.results || [] });
}

async function handleLocalEntityRuns(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("project_id") || 0);
  if (projectId) await assertProjectAccess(request, env, projectId);
  const clause = projectId ? { sql: "r.project_id = ?", binds: [projectId] } : scopeClause(scope, "r.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT r.*, p.name AS project_name
     FROM entity_lsi_runs r
     LEFT JOIN projects p ON p.id = r.project_id
     ${where}
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ runs: rows.results || [] });
}

async function handleLocalEntityBatches(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("project_id") || 0);
  if (projectId) await assertProjectAccess(request, env, projectId);
  const clause = projectId ? { sql: "b.project_id = ?", binds: [projectId] } : scopeClause(scope, "b.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT b.*, p.name AS project_name
     FROM entity_lsi_batches b
     LEFT JOIN projects p ON p.id = b.project_id
     ${where}
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ batches: rows.results || [] });
}

async function handleLocalEntitySets(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const scope = await accessContext(request, env);
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("project_id") || 0);
  if (projectId) await assertProjectAccess(request, env, projectId);
  const clause = projectId ? { sql: "es.project_id = ?", binds: [projectId] } : scopeClause(scope, "es.project_id");
  const where = clause.sql ? `WHERE ${clause.sql}` : "";
  const rows = await env.DB.prepare(
    `SELECT es.*, p.name AS project_name,
            (SELECT COUNT(*) FROM entity_set_terms est WHERE est.set_id = es.id) AS term_count
     FROM entity_sets es
     LEFT JOIN projects p ON p.id = es.project_id
     ${where}
     ORDER BY es.updated_at DESC, es.id DESC
     LIMIT 250`
  ).bind(...clause.binds).all();
  return json({ entity_sets: rows.results || [] });
}

async function cloudLlmTargetsFromApiKeys(env, targets) {
  const resolved = [];
  for (const target of Array.isArray(targets) ? targets : []) {
    const saved = target.api_key_id ? await cloudApiKeyById(env, target.api_key_id) : null;
    const item = {
      provider: target.provider || target.provider_key || saved?.provider_key,
      model: target.model || saved?.default_model,
      api_key_id: saved && !saved.pseudo ? saved.id : null,
      secret: saved?.key_value || ""
    };
    if (item.provider && item.model) resolved.push(item);
  }
  return resolved;
}

function localRankingKeyword(row) {
  return {
    ...row,
    rankingUrl: row.ranking_url,
    previousPosition: row.previous_position,
    searchVolume: row.search_volume,
    competitionLevel: row.competition_level,
    keywordDifficulty: row.keyword_difficulty,
    estimatedTraffic: row.estimated_traffic,
    trafficCost: row.traffic_cost,
    serpFeatures: parseJsonField(row.serp_features_json, []),
    aiOverviewPresent: Boolean(row.ai_overview_present),
    aiOverviewReference: Boolean(row.ai_overview_reference),
    lastUpdated: row.last_updated
  };
}

function localRankingPage(row) {
  return {
    ...row,
    organicKeywords: row.organic_keywords,
    organicTraffic: row.organic_traffic,
    organicTrafficCost: row.organic_traffic_cost,
    paidKeywords: row.paid_keywords,
    paidTraffic: row.paid_traffic
  };
}

function localOptimizationTarget(row) {
  return {
    ...row,
    snapshotId: row.snapshot_id,
    projectId: row.project_id,
    bestPosition: row.best_position,
    rankingKeywords: row.ranking_keywords,
    opportunityCount: row.opportunity_count,
    totalSearchVolume: row.total_search_volume,
    estimatedTraffic: row.estimated_traffic,
    pageOrganicTraffic: row.page_organic_traffic,
    pageOrganicKeywords: row.page_organic_keywords,
    priorityType: row.priority_type,
    opportunityScore: row.opportunity_score,
    recommendedAction: row.recommended_action,
    topKeywords: parseJsonField(row.top_keywords_json, []),
    snapshotTarget: row.snapshot_target,
    snapshotCreatedAt: row.snapshot_created_at
  };
}

async function localRankingSnapshotData(request, env, id) {
  const snapshot = await env.DB.prepare(
    `SELECT rs.*, p.name AS project_name
     FROM ranking_snapshots rs
     LEFT JOIN projects p ON p.id = rs.project_id
     WHERE rs.id = ?`
  ).bind(id).first();
  if (!snapshot) {
    const error = new Error("Ranking snapshot not found");
    error.status = 404;
    throw error;
  }
  await assertProjectAccess(request, env, snapshot.project_id);
  const [keywords, pages, targets] = await Promise.all([
    env.DB.prepare("SELECT * FROM ranking_snapshot_keywords WHERE snapshot_id = ? ORDER BY position ASC, search_volume DESC LIMIT 5000").bind(id).all(),
    env.DB.prepare("SELECT * FROM ranking_snapshot_pages WHERE snapshot_id = ? ORDER BY organic_traffic DESC, organic_keywords DESC LIMIT 2000").bind(id).all(),
    env.DB.prepare(
      `SELECT rot.*, rs.target AS snapshot_target, rs.created_at AS snapshot_created_at
       FROM ranking_optimization_targets rot
       LEFT JOIN ranking_snapshots rs ON rs.id = rot.snapshot_id
       WHERE rot.snapshot_id = ?
       ORDER BY rot.opportunity_score DESC, rot.id ASC
       LIMIT 1000`
    ).bind(id).all()
  ]);
  const keywordRows = (keywords.results || []).map(localRankingKeyword);
  const pageRows = (pages.results || []).map(localRankingPage);
  return {
    ok: true,
    snapshot: {
      ...snapshot,
      overview: parseJsonField(snapshot.overview_json, {}),
      errors: parseJsonField(snapshot.errors_json, [])
    },
    meta: {
      source: snapshot.source || "DataForSEO Labs",
      freshness: snapshot.freshness || "weekly",
      generated_at: snapshot.created_at,
      cached: false,
      partial: Boolean(snapshot.errors_json && snapshot.errors_json !== "{}")
    },
    overview: parseJsonField(snapshot.overview_json, {}),
    keywords: keywordRows,
    pages: pageRows,
    opportunities: keywordRows,
    savedTargets: (targets.results || []).map(localOptimizationTarget),
    targets: (targets.results || []).map(localOptimizationTarget)
  };
}

async function handleLocalRankingSnapshotDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  return json(await localRankingSnapshotData(request, env, id));
}

async function handleLocalRankingSnapshotCreate(request, env) {
  const payload = await request.json().catch(() => ({}));
  await assertCommandAccess(request, env, "create_ranking_snapshot", payload);
  await enforceToolPolicy(request, env, "create_ranking_snapshot", { ...payload, execution_mode: "cloud" });
  const result = await createCloudRankingSnapshot(payload, env);
  await recordToolUsage(request, env, "create_ranking_snapshot", { ...payload, execution_mode: "cloud" });
  return json({ ...(await localRankingSnapshotData(request, env, result.snapshot.id)), meta: result.meta || {} }, 201);
}

async function handleLocalSites(request, env) {
  const payload = await request.json().catch(() => ({}));
  const projectId = Number(payload.project_id || 0);
  const domain = domainFromUrl(payload.domain || payload.url || "");
  if (!projectId || !domain) return json({ ok: false, error: "Client and domain are required" }, 400);
  await requireProjectWriteAccess(request, env, projectId);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM sites WHERE project_id = ? AND lower(domain) = lower(?) ORDER BY id LIMIT 1").bind(projectId, domain).first();
  if (existing) return json({ ok: true, duplicate: true, site: existing }, 200);
  const inserted = await env.DB.prepare("INSERT INTO sites (project_id, domain, name, created_at) VALUES (?, ?, ?, ?)").bind(projectId, domain, cleanText(payload.name) || null, now).run();
  const site = await env.DB.prepare("SELECT * FROM sites WHERE id = ?").bind(inserted.meta.last_row_id).first();
  return json({ ok: true, site }, 201);
}

async function handleLocalPages(request, env) {
  const payload = await request.json().catch(() => ({}));
  const siteId = Number(payload.site_id || 0);
  const url = cleanText(payload.url);
  if (!siteId || !url) return json({ ok: false, error: "Site and URL are required" }, 400);
  const site = await env.DB.prepare("SELECT * FROM sites WHERE id = ?").bind(siteId).first();
  if (!site) return json({ ok: false, error: "Site not found" }, 404);
  await requireProjectWriteAccess(request, env, site.project_id);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM pages WHERE site_id = ? AND url = ? ORDER BY id LIMIT 1").bind(siteId, url).first();
  if (existing) return json({ ok: true, duplicate: true, page: existing }, 200);
  const inserted = await env.DB.prepare("INSERT INTO pages (site_id, url, title, created_at) VALUES (?, ?, ?, ?)").bind(siteId, url, cleanText(payload.title) || null, now).run();
  const page = await env.DB.prepare("SELECT * FROM pages WHERE id = ?").bind(inserted.meta.last_row_id).first();
  return json({ ok: true, page }, 201);
}

async function handleLocalKeywords(request, env) {
  const payload = await request.json().catch(() => ({}));
  const projectId = Number(payload.project_id || 0);
  await requireProjectWriteAccess(request, env, projectId);
  const result = await executeCloudCommand("add_keyword", payload, env);
  return json({ ok: true, keyword: result.keyword, duplicate: Boolean(result.duplicate) }, result.duplicate ? 200 : 201);
}

async function handleLocalContentPlanCreate(request, env) {
  const payload = await request.json().catch(() => ({}));
  await requireProjectWriteAccess(request, env, payload.project_id);
  const result = await executeCloudCommand("create_content_plan", payload, env);
  return json({ ok: true, content_plan: result.content_plan, duplicate: Boolean(result.duplicate) }, result.duplicate ? 200 : 201);
}

async function handleLocalShareReportCreate(request, env) {
  const payload = await request.json().catch(() => ({}));
  const run = await env.DB.prepare("SELECT project_id FROM runs WHERE id = ?").bind(Number(payload.run_id || 0)).first();
  await requireProjectWriteAccess(request, env, run?.project_id);
  const result = await executeCloudCommand("create_share_report", payload, env);
  const origin = new URL(request.url).origin;
  const report = result.report ? { ...result.report, url: `/share/report/${result.report.token}`, absolute_url: `${origin}/share/report/${result.report.token}` } : null;
  return json({ ok: true, report, duplicate: Boolean(result.duplicate) }, result.duplicate ? 200 : 201);
}

async function handleLocalShareReportDelete(request, env, id) {
  const report = await env.DB.prepare(
    `SELECT sr.*, r.project_id
     FROM share_reports sr
     LEFT JOIN runs r ON r.id = sr.run_id
     WHERE sr.id = ?`
  ).bind(id).first();
  if (!report) return json({ ok: false, error: "Shared report not found" }, 404);
  await requireProjectWriteAccess(request, env, report.project_id);
  const result = await executeCloudCommand("revoke_share_report", { report_id: id }, env);
  return json({ ok: true, report: result.report });
}

async function handleLocalEntityRunCreate(request, env) {
  const payload = await request.json().catch(() => ({}));
  const targets = await cloudLlmTargetsFromApiKeys(env, payload.targets);
  await assertCommandAccess(request, env, "run_entity_lsi", { ...payload, targets, execution_mode: "cloud" });
  await enforceToolPolicy(request, env, "run_entity_lsi", { ...payload, execution_mode: "cloud" });
  const result = await createCloudEntityRuns({ ...payload, targets, execution_mode: "cloud" }, env);
  await recordToolUsage(request, env, "run_entity_lsi", { ...payload, project_id: payload.project_id, execution_mode: "cloud" });
  return await handleLocalEntityBatchDetail(request, env, result.batch.id);
}

function entityBatchProgress(batch, runs = []) {
  const total = Number(batch?.target_count || runs.length || 0);
  const complete = Number(batch?.completed_count || runs.filter((run) => run.status === "complete").length);
  const failed = Number(batch?.failed_count || runs.filter((run) => run.status === "failed").length);
  const cancelled = runs.filter((run) => run.status === "cancelled").length;
  const finished = complete + failed + cancelled;
  return {
    total,
    complete,
    failed,
    cancelled,
    finished,
    queued: Math.max(0, total - finished),
    percent: total ? Math.round((finished / total) * 100) : 0,
    current_run: runs.find((run) => run.status === "running") || null,
    up_next: runs.find((run) => run.status === "queued") || null,
    queued_runs: runs.filter((run) => run.status === "queued"),
    events: runs.filter((run) => ["complete", "failed", "cancelled"].includes(run.status)).map((run) => ({ status: run.status, message: run.error || `${run.provider} ${run.model}`, updated_at: run.completed_at || run.created_at }))
  };
}

async function handleLocalEntityBatchDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const response = await handleEntityBatchDetail(request, env, id);
  const data = await response.json();
  return json({ ...data, progress: entityBatchProgress(data.batch, data.runs || []) }, response.status);
}

async function handleLocalEntityRunDelete(request, env, id) {
  const run = await env.DB.prepare("SELECT * FROM entity_lsi_runs WHERE id = ?").bind(id).first();
  if (!run) return json({ ok: false, error: "Entity Explorer run not found" }, 404);
  await requireProjectWriteAccess(request, env, run.project_id);
  await env.DB.prepare("DELETE FROM entity_lsi_runs WHERE id = ?").bind(id).run();
  return json({ ok: true, deleted: id });
}

async function handleLocalEntityBatchRetry(request, env, id) {
  const batch = await env.DB.prepare("SELECT * FROM entity_lsi_batches WHERE id = ?").bind(id).first();
  if (!batch) return json({ ok: false, error: "Entity batch not found" }, 404);
  await requireProjectWriteAccess(request, env, batch.project_id);
  return await handleLocalEntityBatchDetail(request, env, id);
}

async function handleLocalEntityBatchCancel(request, env, id) {
  const batch = await env.DB.prepare("SELECT * FROM entity_lsi_batches WHERE id = ?").bind(id).first();
  if (!batch) return json({ ok: false, error: "Entity batch not found" }, 404);
  await requireProjectWriteAccess(request, env, batch.project_id);
  const now = new Date().toISOString();
  const result = await env.DB.prepare("UPDATE entity_lsi_runs SET status = 'cancelled', completed_at = COALESCE(completed_at, ?) WHERE batch_id = ? AND status IN ('queued', 'running')").bind(now, id).run();
  await env.DB.prepare("UPDATE entity_lsi_batches SET status = CASE WHEN completed_count > 0 THEN 'partial' ELSE 'cancelled' END, updated_at = ? WHERE id = ?").bind(now, id).run();
  const response = await handleLocalEntityBatchDetail(request, env, id);
  const data = await response.json();
  return json({ ...data, cancelled_count: result.meta?.changes || 0 });
}

async function handleLocalRunDetail(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const response = await handleRunDetail(request, env, id);
  const data = await response.json();
  return json({
    ok: data.ok,
    run: data.run,
    results: data.serp_results || [],
    recommendations: data.recommendations || [],
    lsi: data.lsi_keywords || [],
    target_matches: []
  }, response.status);
}

async function handleLocalRunWorkbook(request, env, id) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const sheet = String(url.searchParams.get("sheet") || "").trim();
  const run = await env.DB.prepare("SELECT id, project_id FROM runs WHERE id = ?").bind(id).first();
  if (!run) return json({ ok: false, error: "Run not found" }, 404);
  await assertProjectAccess(request, env, run.project_id);
  if (!sheet) {
    const rows = await env.DB.prepare(
      `SELECT sheet, COUNT(*) AS row_count
       FROM workbook_rows
       WHERE run_id = ?
       GROUP BY sheet
       UNION ALL
       SELECT sheet, COUNT(*) AS row_count
       FROM sheet_rows
       WHERE run_id = ? AND sheet NOT IN (SELECT DISTINCT sheet FROM workbook_rows WHERE run_id = ?)
       GROUP BY sheet
       ORDER BY sheet`
    ).bind(id, id, id).all();
    return json({ ok: true, rows: rows.results || [] });
  }
  const tableName = await env.DB.prepare("SELECT COUNT(*) AS count FROM workbook_rows WHERE run_id = ? AND sheet = ?").bind(id, sheet).first()
    .then((row) => Number(row?.count || 0) ? "workbook_rows" : "sheet_rows");
  const rows = await env.DB.prepare(`SELECT * FROM ${tableName} WHERE run_id = ? AND sheet = ? ORDER BY row_index ASC, id ASC LIMIT 500`).bind(id, sheet).all();
  return json({
    ok: true,
    rows: (rows.results || []).map((row) => {
      const values = parseJsonField(row.row_json, []);
      return { ...row, column_count: Array.isArray(values) ? values.length : 0 };
    })
  });
}

async function handleLocalRunAssign(request, env, id) {
  const payload = await request.json().catch(() => ({}));
  const projectId = Number(payload.project_id || 0) || null;
  const run = await env.DB.prepare("SELECT id, project_id FROM runs WHERE id = ?").bind(id).first();
  if (!run) return json({ ok: false, error: "Run not found" }, 404);
  await requireProjectWriteAccess(request, env, projectId || run.project_id || null);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE runs SET project_id = ?, site_id = ?, page_id = ?, keyword_id = ? WHERE id = ?")
    .bind(projectId, Number(payload.site_id || 0) || null, Number(payload.page_id || 0) || null, Number(payload.keyword_id || 0) || null, id).run();
  return await handleLocalRunDetail(request, env, id);
}

async function handleLocalCloudflareNoop(request, env, action) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  return json({
    ok: true,
    action,
    cloud_mode: true,
    message: "This dashboard is already running in Cloudflare. Local sync and bridge controls are only active in the local dashboard.",
    status: await handleLocalCloudflareStatus(request, env).then((response) => response.json())
  });
}

async function handleLocalToolRun(request, env) {
  if (!(await hasReadAccess(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json().catch(() => ({}));
  const tool = cleanText(payload.tool || "cora").toLowerCase();
  if (!tool || tool === "cora") {
    return json({ ok: false, error: "Cora runs are local-only. Use the local bridge dashboard for Cora jobs." }, 400);
  }
  return json({
    ok: true,
    placeholder: true,
    message: `${tool} is wired to the shared dashboard, but has no cloud execution handler yet.`,
    jobs: []
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
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>On Page Optimization System Dashboard</title>
  <style>
    :root { color-scheme: dark; --bg:#0f141b; --panel:#171d26; --panel-soft:#121922; --sidebar-bg:#111820; --soft:#1d2835; --line:#2d3949; --text:#e8edf5; --muted:#9aa8ba; --accent:#5ca8ff; --accent2:#91c5ff; --danger:#e15b50; --input-bg:#101720; --hover-bg:#1d2835; --table-head:#202a37; --good:#5bd28a; --warn:#f2c14e; --radius:8px; }
    :root[data-theme="light"] { color-scheme: light; --bg:#f5f7fa; --panel:#ffffff; --panel-soft:#fbfcfe; --sidebar-bg:#ffffff; --soft:#eef3f9; --line:#d8dee8; --text:#172033; --muted:#657184; --accent:#0b6bcb; --accent2:#084c91; --danger:#b42318; --input-bg:#ffffff; --hover-bg:#eef3f9; --table-head:#f0f3f8; --good:#157347; --warn:#a15c00; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 Inter, Segoe UI, Arial, sans-serif; }
    .topbar { min-height:72px; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:12px 20px; background:var(--panel); border-bottom:1px solid var(--line); }
    .topbar h1 { margin:0; font-size:22px; line-height:1.15; }
    .topbar p { margin:4px 0 0; color:var(--muted); }
    .topbar .actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; align-items:center; }
    .app-shell { display:grid; grid-template-columns:190px minmax(0,1fr); min-height:calc(100vh - 72px); }
    .app-sidebar { border-right:1px solid var(--line); background:var(--sidebar-bg); padding:12px; }
    .app-content { min-width:0; padding:0 0 36px; }
    .profile-context, .theme-context { border-bottom:1px solid var(--line); margin-bottom:12px; padding-bottom:12px; }
    .profile-context label, .theme-context label { color:var(--muted); display:grid; font-size:12px; font-weight:700; gap:6px; text-transform:uppercase; }
    .profile-context select { background:rgba(92,168,255,.12); border-color:rgba(92,168,255,.45); color:var(--text); font-weight:650; min-width:0; width:100%; }
    .theme-context select { background:var(--input-bg); border-color:var(--line); color:var(--text); font-weight:650; min-width:0; width:100%; }
    .main-menu { display:grid; gap:5px; align-items:stretch; }
    .main-menu button { width:100%; text-align:left; background:transparent; color:var(--muted); border:1px solid transparent; border-radius:6px; padding:8px 10px; cursor:pointer; }
    .main-menu button:hover { background:var(--hover-bg); color:var(--text); }
    .main-menu button.active { border-color:var(--accent); background:rgba(92,168,255,.12); color:var(--accent2); }
    .nav-group { display:grid; gap:5px; margin:10px 0 12px; }
    .nav-label { color:var(--muted); font-size:11px; font-weight:750; letter-spacing:.04em; text-transform:uppercase; padding:0 2px; margin:10px 0 2px; }
    .main-menu button.subnav { font-size:13px; margin-left:14px; padding-left:16px; position:relative; width:calc(100% - 14px); color:var(--muted); }
    .main-menu button.subnav::before { content:""; position:absolute; left:7px; top:11px; bottom:11px; border-left:2px solid var(--line); }
    .main-menu button.subnav.active, .main-menu button.subnav:hover { color:var(--accent2); }
    .page-strip { min-height:56px; display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; padding:12px 20px; background:var(--panel); border-bottom:1px solid var(--line); }
    .page-strip h2 { margin:0; font-size:18px; }
    .muted { color: var(--muted); }
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; color:var(--muted); padding:2px 7px; font-size:12px; }
    .ok { color: var(--accent2); }
    .warn { color: var(--danger); }
    .cards { display:grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap:10px; margin-bottom:14px; }
    .card, section { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); }
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
    .toolbar button, .topbar .actions button { background:var(--accent); color:#061312; border:0; border-radius:6px; font-weight:700; padding:8px 10px; cursor:pointer; }
    .toolbar button.secondary, button.secondary { background:var(--soft); color:var(--accent2); border:1px solid var(--line); }
    button.danger { background:rgba(255,123,114,.15); color:var(--danger); border:1px solid rgba(255,123,114,.45); }
    button:disabled { opacity:.55; cursor:not-allowed; }
    input, select, textarea { background:var(--input-bg); border:1px solid var(--line); border-radius:6px; color:var(--text); padding:8px 10px; min-width:240px; }
    textarea { width:100%; min-height:72px; resize:vertical; font:inherit; }
    .access { margin:0 20px 14px; background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:0; }
    .access summary { cursor:pointer; color:var(--muted); font-weight:700; padding:10px 12px; }
    .access-body { border-top:1px solid var(--line); display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:flex-end; padding:10px; }
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
    .command-card button.danger { background:rgba(255,123,114,.15); color:var(--danger); border:1px solid rgba(255,123,114,.45); }
    .field-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .field-row input { min-width:150px; flex:1 1 150px; }
    .check-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .check-item { display:flex; gap:8px; align-items:flex-start; border:1px solid var(--line); border-radius:8px; padding:8px; background:rgba(29,38,48,.45); }
    .check-item input { min-width:auto; margin-top:2px; }
    .mini-btn { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:5px 7px; cursor:pointer; font-size:12px; }
    .bridge-flags { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:12px; }
    .bridge-flag { border:1px solid var(--line); border-radius:8px; padding:10px; background:rgba(29,38,48,.45); }
    .bridge-flag strong { display:block; font-size:15px; }
    .inline-status { border:1px solid rgba(110,231,220,.35); border-radius:8px; padding:10px; background:rgba(77,182,172,.08); display:grid; gap:8px; }
    .inline-status.warn { border-color:rgba(255,123,114,.45); background:rgba(255,123,114,.08); }
    .progress-track { height:8px; border-radius:999px; background:var(--soft); overflow:hidden; border:1px solid var(--line); }
    .progress-fill { height:100%; background:var(--accent); width:0; }
    .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:12px; border-bottom:1px solid var(--line); background:rgba(29,38,48,.55); }
    .filters select { min-width:180px; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    .action-link, .copy-btn { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:6px 8px; display:inline-block; font-size:12px; cursor:pointer; text-decoration:none; }
    .copy-btn { font:inherit; font-size:12px; }
    .copy-btn:hover, .action-link:hover { border-color:var(--accent2); text-decoration:none; }
    .detail-btn { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:6px 8px; cursor:pointer; font-size:12px; }
    .detail-panel { border-color:rgba(110,231,220,.45); }
    .detail-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:14px; }
    .workspace-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,.55fr); gap:14px; align-items:start; margin-bottom:14px; }
    .client-vars { display:grid; gap:8px; padding:12px; }
    .client-var { display:grid; grid-template-columns:120px minmax(0,1fr); gap:10px; border-bottom:1px solid var(--line); padding-bottom:8px; }
    .client-var:last-child { border-bottom:0; padding-bottom:0; }
    .tool-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; padding:12px; }
    .tool-card { border:1px solid var(--line); border-radius:8px; padding:11px; background:rgba(29,38,48,.45); display:grid; gap:8px; align-content:start; min-height:116px; }
    .tool-card strong { font-size:14px; }
    .tool-card button { justify-self:start; background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:7px 9px; cursor:pointer; font-size:12px; }
    .editable-list-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding:12px; }
    .editable-list-panel { border:1px solid var(--line); border-radius:8px; background:var(--panel-soft); padding:12px; display:grid; gap:10px; }
    .editable-list-panel h4 { margin:0; font-size:14px; }
    .inline-add { display:flex; gap:8px; align-items:center; }
    .inline-add input { min-width:0; flex:1; }
    .editable-list { display:grid; gap:7px; }
    .editable-list-row { display:flex; justify-content:space-between; gap:10px; align-items:center; border:1px solid var(--line); border-radius:7px; background:var(--panel); padding:7px 9px; }
    .editable-list-row span { overflow-wrap:anywhere; }
    .domain-textareas { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; padding:0 12px 12px; }
    .domain-textareas label { display:grid; gap:6px; color:var(--muted); font-weight:700; font-size:12px; text-transform:uppercase; }
    .provider-grid { display:grid; grid-template-columns:repeat(5,minmax(150px,1fr)); gap:10px; }
    .provider-card { border:1px solid var(--line); border-radius:8px; padding:10px; background:rgba(29,38,48,.45); display:grid; gap:7px; align-content:start; }
    .provider-card h4 { margin:0; font-size:13px; }
    .provider-card label { display:flex; gap:7px; align-items:flex-start; color:var(--text); font-size:12px; line-height:1.25; }
    .provider-card input { min-width:auto; margin-top:1px; }
    .provider-card small { display:block; color:var(--muted); }
    .hidden { display:none !important; }
    .ranking-tabs { display:flex; gap:6px; flex-wrap:wrap; padding:12px 12px 0; }
    .ranking-tab { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:8px 10px; cursor:pointer; font-weight:700; }
    .ranking-tab.active { background:rgba(92,168,255,.16); border-color:var(--accent); color:var(--text); }
    .ranking-tab-content { padding:12px; }
    .ranking-overview-grid { display:grid; grid-template-columns:repeat(5,minmax(120px,1fr)); gap:10px; }
    .overview-card { background:var(--panel-soft); border:1px solid var(--line); border-radius:8px; padding:12px; }
    .overview-card span { display:block; font-size:22px; font-weight:800; }
    .overview-card label { color:var(--muted); font-size:12px; }
    .note-box { border:1px solid var(--line); background:var(--panel-soft); border-radius:8px; color:var(--muted); padding:12px; margin:12px 0; }
    .scroll-table { overflow:auto; max-height:520px; }
    .scroll-table table { min-width:860px; }
    .close-detail { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:7px 9px; cursor:pointer; }
    @media (max-width: 1200px) { .provider-grid { grid-template-columns:repeat(3,minmax(150px,1fr)); } }
    #app { padding:0 20px; }
    @media (max-width: 920px) { .app-shell { grid-template-columns:1fr; } .app-sidebar { position:static; } .topbar { align-items:flex-start; flex-direction:column; } .cards,.grid2,.command-grid,.bridge-flags,.check-list,.workspace-grid,.tool-grid,.provider-grid,.ranking-overview-grid,.editable-list-grid,.domain-textareas { grid-template-columns:1fr; } th:nth-child(4), td:nth-child(4) { display:none; } #app { padding:0 12px; } }
  </style>
</head>
<body>
  <header class="topbar">
    <div>
      <h1>On Page Optimization System Dashboard</h1>
      <p id="cora-status">Cloud mirror connected. Cora runs on the remote Windows bridge.</p>
    </div>
    <div class="actions">
      <button id="top-open-cora" type="button">Run Cora</button>
      <button id="top-import-latest" type="button">Import Latest Report</button>
      <button id="refresh">Refresh</button>
    </div>
  </header>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="profile-context">
        <label>Current Client<select id="active-client"></select></label>
      </div>
      <div class="theme-context">
        <label>Theme<select id="theme-mode"><option value="dark">Dark</option><option value="light">Light</option></select></label>
      </div>
      <nav id="nav" class="main-menu" aria-label="Main menu"></nav>
    </aside>
    <div class="app-content">
      <div class="page-strip">
        <div><h2 id="page-title">Client Dashboard</h2><div id="page-note" class="muted">Loading synced production data...</div></div>
        <div class="toolbar"><input id="search" placeholder="Filter current page"></div>
      </div>
      <details class="access">
        <summary>Access</summary>
        <div class="access-body">
        <span class="muted">Dashboard access</span>
        <input id="login-email" type="email" placeholder="Email login">
        <input id="login-code" placeholder="6-digit code">
        <button id="request-login">Send Code</button>
        <button id="verify-login" class="secondary">Verify</button>
        <input id="read-token" type="password" placeholder="Read/admin token">
        <button id="save-read-token">Unlock</button>
        <button id="lock-dashboard" class="secondary">Lock</button>
        </div>
      </details>
      <div id="app"><div class="empty">Loading cloud mirror...</div></div>
    </div>
  </div>
  <script>
    let state = { data: null, page: "clients", activeClient: localStorage.getItem("opos_active_client") || "all", q: "", pendingWrite: null, toolFeedback: {}, reportClient: "all", reportLevel: "all", reportCreateClient: "all", reportCreateRun: "", reportCreateSnapshot: "", reportTargetSelection: {}, runClient: "all", jobClient: "all", jobStatus: "all", coraClient: "all", commandClient: "all", commandStatus: "all", commandType: "all", auditActor: "all", auditAction: "all", auditObject: "all", entityBatch: "all", entityClient: "all", entitySetClient: "all", entityCrossoverDetail: null, rankingClient: "all", rankingComparison: null, targetClient: "all", targetStatus: "all", targetSelection: {}, planClient: "all", planStatus: "all", planPriority: "all", planSelection: {}, profileEditId: "", domainEditId: "", domainListType: "all", commandPrefill: null, detail: null };
    let toolRefreshTimer = null;
    const toolRefreshTimers = {};
    const pages = [
      ["clients", "Client Dashboard"],
      ["new-client", "New Client"],
      ["cora", "Run Cora"],
      ["reports", "Cora Reports"],
      ["runs", "Cora Runs"],
      ["jobs", "Cora Jobs"],
      ["cora-profiles", "Cora Profiles"],
      ["ranking", "Ranking Snapshot"],
      ["targets", "Optimization Targets"],
      ["entities", "Entity & LSI Explorer"],
      ["entity-crossover", "Entity Crossover"],
      ["entity-sets", "Entity Sets"],
      ["plans", "Content Planner"],
      ["overview", "Overview"],
      ["sync", "Cloud Sync"],
      ["audit", "Audit Trail"],
      ["commands", "Command Review"],
      ["admin", "Users & Settings"]
    ];
    const navGroups = [
      ["Clients", [["clients", "Client Dashboard"],["new-client", "New Client"]]],
      ["Cora", [["cora", "Run Cora"],["cora-profiles", "Cora Profiles"],["reports", "Cora Reports"]]],
      ["Entity Explorer", [["entities", "Entity & LSI Explorer"],["entity-crossover", "Entity Crossover"],["entity-sets", "Entity Sets"]]],
      ["Ranking", [["ranking", "Ranking Snapshot"],["targets", "Saved Targets"]]],
      ["Planning", [["plans", "Content Planner"]]],
      ["System", [["overview", "Overview"],["sync", "Cloud Sync"],["admin", "Users & Settings"]]]
    ];
    const fmtNum = (v) => Number(v || 0).toLocaleString();
    const fmtDate = (v) => v ? new Date(v).toLocaleString() : "";
    const fmtBytes = (v) => { let n = Number(v || 0), u = ["B","KB","MB","GB"], i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return n.toLocaleString(undefined, { maximumFractionDigits: i ? 1 : 0 }) + " " + u[i]; };
    const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
    const reportUrl = (token) => "/share/report/" + encodeURIComponent(token);
    const downloadUrl = (token) => reportUrl(token) + "/download";
    const readToken = () => localStorage.getItem("opos_read_token") || localStorage.getItem("opos_admin_token") || "";
    const adminToken = () => localStorage.getItem("opos_admin_token") || "";
    const canWrite = () => Boolean(readToken()) || ["read", "write", "admin", "owner"].includes(String(state.data?.user?.role || "").toLowerCase());
    const authHeaders = (token) => token ? { "authorization": "Bearer " + token } : {};
    const entityProviderCatalog = [
      { key: "openai", label: "OpenAI", models: [["gpt-5.5", "Latest flagship"], ["gpt-5.4", "Strong reasoning"], ["gpt-5.1-mini", "Fast utility"]] },
      { key: "anthropic", label: "Anthropic", models: [["claude-opus-4-8", "Deep analysis"], ["claude-sonnet-4-6", "Balanced"], ["claude-haiku-4-5-20251001", "Fast"]] },
      { key: "google", label: "Google", models: [["gemini-3.1-pro-preview", "Pro reasoning"], ["gemini-3.5-flash", "Fast"]] },
      { key: "xai", label: "xAI / Grok", models: [["grok-4.3", "General"], ["grok-build-0.1", "Experimental"]] },
      { key: "perplexity", label: "Perplexity", models: [["perplexity/sonar", "Search-grounded"]] }
    ];
    const recommendedEntityTargets = new Set(["openai:gpt-5.4", "anthropic:claude-sonnet-4-6", "google:gemini-3.5-flash", "perplexity:perplexity/sonar"]);
    const writeHeaders = () => {
      const headers = { "content-type": "application/json" };
      const token = adminToken() || readToken();
      if (token) headers.authorization = "Bearer " + token;
      return headers;
    };
    const absoluteUrl = (path) => new URL(path, location.origin).href;
    function rows(items, predicate) {
      const q = state.q.toLowerCase();
      return (items || []).filter((item) => !q || JSON.stringify(item).toLowerCase().includes(q)).filter(predicate || (() => true));
    }
    function table(headers, body, empty) {
      const rowHtml = Array.isArray(body) ? body : (body ? [String(body)] : []);
      return rowHtml.length ? '<table><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join("") + '</tr></thead><tbody>' + rowHtml.join("") + '</tbody></table>' : '<div class="empty">' + esc(empty || "No synced data found.") + '</div>';
    }
    function setPage(page) {
      state.page = page;
      state.detail = null;
      document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
      render();
    }
    function renderNav() {
      document.getElementById("nav").innerHTML = navGroups.map(([group, items]) => '<div class="nav-group"><div class="nav-label">' + esc(group) + '</div>' + items.map(([id, label], index) => '<button class="' + (index ? 'subnav' : '') + '" data-page="' + esc(id) + '">' + esc(label) + '</button>').join("") + '</div>').join("");
      document.querySelectorAll("nav button").forEach((b) => b.onclick = () => setPage(b.dataset.page));
    }
    function renderClientContext() {
      const select = document.getElementById("active-client");
      if (!select) return;
      const clients = state.data?.clients || [];
      if (state.activeClient !== "all" && !clients.some((client) => String(client.id) === String(state.activeClient))) {
        state.activeClient = "all";
        localStorage.setItem("opos_active_client", "all");
      }
      syncToolClients(state.activeClient);
      select.innerHTML = '<option value="all">All clients</option>' + clients.map((client) => '<option value="' + esc(client.id) + '"' + (String(client.id) === String(state.activeClient) ? ' selected' : '') + '>' + esc(client.name || ("Client " + client.id)) + '</option>').join("");
    }
    function applyActiveClient(clientId) {
      state.activeClient = clientId || "all";
      localStorage.setItem("opos_active_client", state.activeClient);
      syncToolClients(state.activeClient);
      state.detail = null;
      render();
    }
    function syncToolClients(clientId) {
      const value = clientId || "all";
      state.coraClient = value;
      state.reportClient = value;
      state.reportCreateClient = value;
      state.runClient = value;
      state.jobClient = value;
      state.entityClient = value;
      state.entitySetClient = value;
      state.rankingClient = value;
      state.targetClient = value;
      state.planClient = value;
      state.commandClient = value;
    }
    function openClientTool(page, projectId, options = {}) {
      const clientId = projectId || "all";
      state.activeClient = clientId;
      localStorage.setItem("opos_active_client", state.activeClient);
      syncToolClients(clientId);
      if (page === "jobs") state.jobStatus = "all";
      if (page === "commands") {
        state.commandStatus = "all";
        state.commandType = "all";
        state.commandPrefill = {
          project_id: clientId === "all" ? 0 : Number(clientId || 0),
          keyword: options.keyword || "",
          seed_keyword: options.keyword || "",
          target: options.target || "",
          target_url: options.target || "",
          command: "cloud-tools"
        };
      }
      if (page === "ranking") {
        state.rankingBase = "";
        state.rankingCompare = "";
        state.rankingComparison = null;
      }
      if (page === "targets") state.targetSelection = {};
      if (page === "plans") state.planSelection = {};
      if (page === "cora") {
        state.commandPrefill = {
          project_id: clientId === "all" ? 0 : Number(clientId || 0),
          keyword: options.keyword || "",
          target: options.target || "",
          target_url: options.target || "",
          cora_profile: options.profile || "",
          command: "cora"
        };
      }
      if (page === "entities") {
        state.commandPrefill = {
          project_id: clientId,
          keyword: options.keyword || "",
          seed_keyword: options.keyword || "",
          target: options.target || "",
          command: "entity"
        };
      }
      if (page === "entity-crossover") state.entityBatch = options.latestBatch || "all";
      state.detail = null;
      setPage(page || "clients");
    }
    function applyTheme(theme) {
      const value = theme === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = value;
      localStorage.setItem("opos_cloud_theme", value);
      const select = document.getElementById("theme-mode");
      if (select) select.value = value;
    }
    function cards(items) {
      return '<div class="cards">' + items.map(([label, value]) => '<div class="card"><strong>' + esc(typeof value === "number" ? fmtNum(value) : value) + '</strong><span>' + esc(label) + '</span></div>').join("") + '</div>';
    }
    function toolFeedbackHtml(feedback) {
      if (!feedback) return "";
      const total = Number(feedback.total || 0);
      const done = Number(feedback.done || 0);
      const percent = total ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
      const rows = (feedback.rows || []).map((row) => '<div class="status-row"><span>' + esc(row.label || "") + '</span><strong class="' + esc(row.status === "failed" ? "warn" : row.status === "complete" || row.status === "queued" ? "ok" : "") + '">' + esc(row.status || "") + '</strong></div>').join("");
      const refreshNote = feedback.refreshNote ? '<div class="muted">' + esc(feedback.refreshNote) + '</div>' : '';
      return '<div class="inline-status ' + (feedback.status === "failed" ? "warn" : "") + '"><div class="status-row"><span><strong>' + esc(feedback.title || "Tool Status") + '</strong><br><small class="muted">' + esc(feedback.message || "") + '</small></span><strong class="' + (feedback.status === "failed" ? "warn" : feedback.status === "complete" ? "ok" : "") + '">' + esc(feedback.status || "") + '</strong></div>' + (total ? '<div class="progress-track"><div class="progress-fill" style="width:' + esc(percent) + '%"></div></div><div class="muted">' + esc(done) + ' of ' + esc(total) + ' complete</div>' : '') + refreshNote + rows + '</div>';
    }
    function setToolFeedback(key, feedback, renderNow) {
      state.toolFeedback = { ...(state.toolFeedback || {}), [key]: feedback };
      const target = document.getElementById(key + "-inline-status");
      if (target) target.innerHTML = toolFeedbackHtml(feedback);
      if (renderNow) render();
    }
    function updateToolRefreshNote(key, message) {
      const feedback = state.toolFeedback?.[key];
      if (!feedback) return;
      setToolFeedback(key, { ...feedback, refreshNote: message }, false);
    }
    function userIsEditing() {
      const el = document.activeElement;
      return Boolean(el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable));
    }
    function startToolAutoRefresh(key, durationMs) {
      if (toolRefreshTimer) {
        clearInterval(toolRefreshTimer);
        toolRefreshTimer = null;
      }
      if (toolRefreshTimers[key]) clearInterval(toolRefreshTimers[key]);
      const allowedPages = { cora: ["cora"], ranking: ["ranking"], entity: ["entities", "entity-crossover"], reports: ["reports"], profiles: ["cora-profiles"], domains: ["cora-profiles"] }[key] || [];
      const until = Date.now() + (durationMs || 120000);
      updateToolRefreshNote(key, "Auto-refreshing status on this page. Form editing pauses refresh.");
      toolRefreshTimers[key] = setInterval(async () => {
        if (Date.now() > until || !allowedPages.includes(state.page)) {
          clearInterval(toolRefreshTimers[key]);
          delete toolRefreshTimers[key];
          updateToolRefreshNote(key, "Auto-refresh window ended. Use Refresh for the latest status.");
          return;
        }
        if (userIsEditing()) {
          updateToolRefreshNote(key, "Auto-refresh paused while you edit this form.");
          return;
        }
        try {
          updateToolRefreshNote(key, "Refreshing status...");
          await load({ preserveScroll: true });
          updateToolRefreshNote(key, "Status refreshed " + new Date().toLocaleTimeString() + ".");
        } catch (error) {
          console.warn("Tool status refresh failed", error);
          updateToolRefreshNote(key, "Status refresh failed: " + (error.message || error));
        }
      }, 8000);
    }
    function overview(data) {
      const counts = data.counts || {};
      const artifactBytes = (data.artifacts || []).reduce((s, r) => s + Number(r.total_bytes || 0), 0);
      const artifactFiles = (data.artifacts || []).reduce((s, r) => s + Number(r.artifact_count || 0), 0);
      const lastSync = (data.sync?.tables || []).map((r) => r.last_received_at).filter(Boolean).sort().pop();
      const syncRows = (data.sync?.tables || []).slice(-14).map((r) => '<div class="status-row"><span>' + esc(r.table_name) + '</span><strong>' + esc(fmtNum(r.rows_received)) + '</strong></div>').join("");
      const artifactRows = (data.artifacts || []).map((r) => '<div class="status-row"><span>' + esc(r.artifact_type) + '</span><strong>' + esc(fmtNum(r.artifact_count)) + ' / ' + esc(fmtBytes(r.total_bytes)) + '</strong></div>').join("");
      const bridgeRows = (data.bridges || []).map((b) => '<div class="status-row"><span>' + esc(b.bridge_id) + '<br><small class="muted">' + esc(fmtDate(b.last_seen_at)) + '</small><br><small class="muted">Cora ' + esc(b.allow_cora ? 'enabled' : 'off') + ' | Paid tools ' + esc(b.allow_paid_tools ? 'enabled' : 'off') + '</small></span><strong class="' + (b.online ? 'ok' : 'warn') + '">' + esc(b.online ? 'Online' : 'Offline') + '</strong></div>').join("");
      return cards([["Clients", counts.projects],["Keywords", counts.keywords],["Cora Runs", counts.runs],["Reports", counts.reports],["Ranking Snapshots", counts.ranking_snapshots],["Optimization Targets", counts.ranking_optimization_targets],["Content Plans", counts.content_plans],["NLP Batches", counts.nlp_category_batches],["Entity Sets", counts.entity_sets],["Pending Commands", counts.pending_commands],["Cloud Files", artifactFiles],["R2 Storage", fmtBytes(artifactBytes)]])
        + '<div class="grid2"><section><div class="head"><h3>Recent Reports</h3><span class="pill ok">Live</span></div>' + reportTable(data.reports || []) + '</section>'
        + '<section><div class="head"><h3>Bridge Status</h3><span class="muted">' + esc(fmtDate(lastSync) || "Never") + '</span></div><div class="status-list">' + (bridgeRows || '<div class="muted">No local bridge heartbeat yet.</div>') + '</div><div class="head"><h3>Cloud Files</h3></div><div class="status-list">' + (artifactRows || '<div class="muted">No files.</div>') + '</div><div class="head"><h3>Tables</h3></div><div class="status-list">' + (syncRows || '<div class="muted">No sync batches.</div>') + '</div></section></div>';
    }
    function syncAgeInfo(value) {
      if (!value) return { label: "Never", cls: "warn" };
      const age = Date.now() - Date.parse(value);
      if (!Number.isFinite(age)) return { label: fmtDate(value), cls: "warn" };
      const minutes = Math.max(0, Math.round(age / 60000));
      if (minutes < 60) return { label: minutes + "m ago", cls: "ok" };
      const hours = Math.round(minutes / 60);
      if (hours < 24) return { label: hours + "h ago", cls: "ok" };
      const days = Math.round(hours / 24);
      return { label: days + "d ago", cls: days > 7 ? "warn" : "" };
    }
    function syncView(data) {
      const sync = data.sync || {};
      const bridgeRows = data.bridges || [];
      const tableRows = sync.tables || [];
      const recent = sync.recent_batches || [];
      const artifacts = data.artifacts || [];
      const online = bridgeRows.filter((bridge) => bridge.online).length;
      const lastSync = tableRows.map((row) => row.last_received_at).filter(Boolean).sort().pop();
      const staleTables = tableRows.filter((row) => !row.last_received_at || (Date.now() - Date.parse(row.last_received_at || 0)) > 7 * 86400000).length;
      const tableHtml = tableRows.map((row) => {
        const age = syncAgeInfo(row.last_received_at);
        return '<tr><td><strong>' + esc(row.table_name || "") + '</strong></td><td>' + esc(fmtNum(row.cloud_rows ?? 0)) + '</td><td>' + esc(fmtNum(row.rows_received || 0)) + '</td><td>' + esc(fmtNum(row.batch_count || 0)) + '</td><td><span class="pill ' + age.cls + '">' + esc(age.label) + '</span><br><span class="muted">' + esc(fmtDate(row.last_received_at)) + '</span></td></tr>';
      });
      const bridgeHtml = bridgeRows.map((bridge) => '<tr><td><strong>' + esc(bridge.bridge_id || "") + '</strong><br><span class="muted">' + esc(bridge.version || "") + '</span></td><td><span class="pill ' + (bridge.online ? "ok" : "warn") + '">' + esc(bridge.online ? "Online" : "Offline") + '</span></td><td>' + esc(bridge.allow_cora ? "Enabled" : "Off") + '</td><td>' + esc(bridge.allow_paid_tools ? "Enabled" : "Off") + '</td><td>' + esc(bridge.poll_interval || "") + 's</td><td>' + esc(fmtDate(bridge.last_seen_at)) + '</td></tr>');
      const artifactHtml = artifacts.map((item) => '<tr><td><strong>' + esc(item.artifact_type || "") + '</strong></td><td>' + esc(fmtNum(item.artifact_count || 0)) + '</td><td>' + esc(fmtBytes(item.total_bytes || 0)) + '</td><td>' + esc(fmtDate(item.last_uploaded_at)) + '</td></tr>');
      const recentHtml = recent.slice(0, 30).map((batch) => '<tr><td>' + esc(batch.table_name || "") + '</td><td>' + esc(fmtNum(batch.row_count || 0)) + '</td><td>' + esc(batch.source || "") + '</td><td>' + esc(fmtDate(batch.received_at)) + '</td></tr>');
      const shortcuts = '<section><div class="head"><h3>Sync Shortcuts</h3><span class="muted">Creates reviewed commands; local bridge performs local-only sync work.</span></div><div class="toolbar"><button id="sync-review-push">Review Full Push</button><button id="sync-review-pull" class="secondary">Review Pull Core Tables</button><button id="sync-review-files" class="secondary">Review Report File Sync</button><button id="sync-open-commands" class="secondary">Command Review</button><button id="sync-open-audit" class="secondary">Audit Trail</button></div></section>';
      setTimeout(bindSyncControls, 0);
      return cards([["Last Sync", syncAgeInfo(lastSync).label],["Online Bridges", online],["Tracked Tables", tableRows.length],["Stale Tables", staleTables],["Artifact Types", artifacts.length]])
        + shortcuts
        + '<div class="grid2"><section><div class="head"><h3>Bridge Health</h3></div>' + detailTable(["Bridge","Status","Cora","Paid/API","Poll","Last Seen"], bridgeHtml, "No local bridge heartbeat yet.") + '</section>'
        + '<section><div class="head"><h3>Report Artifacts</h3></div>' + detailTable(["Type","Files","Storage","Uploaded"], artifactHtml, "No report files synced to R2 yet.") + '</section></div>'
        + '<section><div class="head"><h3>Table Freshness</h3><span class="muted">Cloud row counts and latest received sync batch.</span></div>' + detailTable(["Table","Cloud Rows","Rows Received","Batches","Freshness"], tableHtml, "No sync table status yet.") + '</section>'
        + '<section><div class="head"><h3>Recent Sync Batches</h3></div>' + detailTable(["Table","Rows","Source","Received"], recentHtml, "No recent sync batches.") + '</section>';
    }
    function reportTable(items) {
      return table(["Report", "Client", "Keyword / URL", "Level", "Created", "Files", "Actions"], rows(items).map((r) => {
        const hasHtml = Boolean(r.cloud_url);
        const actions = hasHtml
          ? '<a class="action-link" href="' + reportUrl(r.token) + '" target="_blank">Open</a><a class="action-link" href="' + downloadUrl(r.token) + '">XLSX</a><button class="copy-btn" data-copy="' + esc(absoluteUrl(reportUrl(r.token))) + '">Copy report</button><button class="copy-btn" data-copy="' + esc(absoluteUrl(downloadUrl(r.token))) + '">Copy XLSX</button><button class="copy-btn report-archive" data-report-id="' + esc(r.id || "") + '" data-project-id="' + esc(r.project_id || "") + '">Archive</button>'
          : '<span class="pill warn">Files pending</span><button class="copy-btn report-sync-files" data-report-id="' + esc(r.id || "") + '">Sync files</button><button class="copy-btn report-archive" data-report-id="' + esc(r.id || "") + '" data-project-id="' + esc(r.project_id || "") + '">Archive</button>';
        return '<tr><td><strong>' + esc(r.title || r.keyword || "Report") + '</strong><br><span class="muted">Run #' + esc(r.run_id || "") + '</span></td><td>' + esc(r.project_name || r.client_name || "") + '<br><span class="muted">' + esc(r.site_domain || "") + '</span></td><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.target_domain || r.target_url || "") + '</span></td><td><span class="pill">' + esc(r.level || "") + '</span></td><td>' + esc(fmtDate(r.created_at)) + '<br><span class="muted">Uploaded ' + esc(fmtDate(r.last_uploaded_at)) + '</span></td><td><span class="pill">' + esc(fmtNum(r.artifact_count || 0)) + ' files</span><br><span class="muted">' + esc(fmtBytes(r.total_bytes || 0)) + '</span></td><td><div class="actions">' + actions + '</div></td></tr>';
      }), "No cloud reports synced yet.");
    }
    function reportPortal(data) {
      const allReports = data.reports || [];
      const clientRows = data.clients || [];
      const clients = clientRows.length
        ? clientRows.map((client) => [String(client.id || ""), client.name || ("Client " + client.id)]).filter(([id]) => id)
        : [...new Map(allReports.map((r) => [String(r.project_id || r.project_name || ""), r.project_name || r.client_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const levels = ["basic", "medium", "comprehensive"];
      const filtered = allReports.filter((r) => (state.reportClient === "all" || String(r.project_id || r.project_name || "") === state.reportClient) && (state.reportLevel === "all" || String(r.level || "").toLowerCase() === state.reportLevel));
      const latest = filtered.map((r) => r.created_at).filter(Boolean).sort().pop();
      const files = filtered.reduce((sum, r) => sum + Number(r.artifact_count || 0), 0);
      const bytes = filtered.reduce((sum, r) => sum + Number(r.total_bytes || 0), 0);
      const filters = '<div class="filters"><select id="report-client-filter"><option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.reportClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("") + '</select><select id="report-level-filter"><option value="all">All report levels</option>' + levels.map((level) => '<option value="' + level + '"' + (state.reportLevel === level ? ' selected' : '') + '>' + esc(level[0].toUpperCase() + level.slice(1)) + '</option>').join("") + '</select><span class="muted">Use the search box above for keyword, URL, or report title.</span></div>';
      const selectedCreateClient = clients.some(([id]) => id === state.reportCreateClient) ? state.reportCreateClient : (clients[0]?.[0] || "all");
      const clientRuns = (data.runs || []).filter((run) => selectedCreateClient === "all" || String(run.project_id || "") === selectedCreateClient);
      const selectedCreateRun = clientRuns.some((run) => String(run.id) === String(state.reportCreateRun)) ? String(state.reportCreateRun) : String(clientRuns[0]?.id || "");
      const selectedRun = clientRuns.find((run) => String(run.id) === selectedCreateRun) || null;
      const attachmentProjectId = selectedRun?.project_id ? String(selectedRun.project_id) : (selectedCreateClient === "all" ? "" : selectedCreateClient);
      const clientSnapshots = (data.snapshots || []).filter((snapshot) => !attachmentProjectId || String(snapshot.project_id || "") === attachmentProjectId);
      const clientEntitySets = (data.entity_sets || []).filter((set) => !attachmentProjectId || String(set.project_id || "") === attachmentProjectId);
      const selectedSnapshot = clientSnapshots.some((snapshot) => String(snapshot.id) === String(state.reportCreateSnapshot)) ? String(state.reportCreateSnapshot) : "";
      const clientTargets = (data.targets || []).filter((target) =>
        (!attachmentProjectId || String(target.project_id || "") === attachmentProjectId) &&
        (!selectedSnapshot || String(target.snapshot_id || target.snapshotId || "") === selectedSnapshot)
      ).slice(0, 80);
      const runOptions = clientRuns.map((run) => '<option value="' + esc(run.id) + '"' + (String(run.id) === selectedCreateRun ? ' selected' : '') + '>' + esc((run.keyword || "Run " + run.id) + " | " + (run.target_domain || run.target_url || "") + " | " + fmtDate(run.imported_at)) + '</option>').join("");
      const snapshotOptions = '<option value="">No Ranking Snapshot</option>' + clientSnapshots.map((snapshot) => '<option value="' + esc(snapshot.id) + '"' + (String(snapshot.id) === selectedSnapshot ? ' selected' : '') + '>' + esc((snapshot.target || "Snapshot " + snapshot.id) + " | " + fmtDate(snapshot.created_at)) + '</option>').join("");
      const entitySetOptions = '<option value="">No Entity Set</option>' + clientEntitySets.map((set) => '<option value="' + esc(set.id) + '">' + esc((set.name || "Entity Set " + set.id) + " | " + fmtNum(set.term_count || 0) + " terms") + '</option>').join("");
      const targetRows = clientTargets.map((target) => '<label class="check-item"><input class="report-target-check" type="checkbox" value="' + esc(target.id || "") + '"' + (state.reportTargetSelection[String(target.id || "")] ? ' checked' : '') + '><span><strong>' + esc(target.keyword || target.url || "Optimization target") + '</strong><br><small class="muted">' + esc((target.url || "") + " | " + (target.status || "new") + " | score " + fmtNum(target.opportunity_score || target.opportunityScore || 0)) + '</small></span></label>').join("");
      const targetPicker = '<div><div class="head" style="padding:0 0 8px;border:0;"><h3>Optimization Targets</h3><button id="report-select-targets" class="secondary"' + (clientTargets.length ? "" : " disabled") + '>Select Visible</button></div><div class="check-list">' + (targetRows || '<div class="empty">No saved Optimization Targets for this client/snapshot. Save targets from Ranking Snapshot first.</div>') + '</div></div>';
      const createPanel = '<section><div class="head"><h3>Create Customer Report</h3><span class="pill ok">Cloud metadata</span></div><div class="status-list"><div class="field-row"><select id="report-create-client">' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (selectedCreateClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("") + '</select><select id="report-create-run">' + (runOptions || '<option value="">No synced Cora runs for this client</option>') + '</select><select id="report-create-level"><option value="medium">Medium</option><option value="basic">Basic</option><option value="comprehensive">Comprehensive</option></select></div><div class="field-row"><input id="report-create-title" placeholder="Optional report title"><input id="report-create-notes" placeholder="Optional notes"></div><div class="field-row"><select id="report-create-snapshot">' + snapshotOptions + '</select><select id="report-create-entity-set">' + entitySetOptions + '</select><button id="report-create-submit"' + (runOptions ? "" : " disabled") + '>Create Report</button></div>' + targetPicker + '<div class="muted">Cloud can create the report record now. Source XLSX and customer HTML are generated/uploaded by the local bridge with Sync Report Files.</div><div id="reports-inline-status">' + toolFeedbackHtml(state.toolFeedback?.reports) + '</div></div></section>';
      setTimeout(bindReportControls, 0);
      return cards([["Visible Reports", filtered.length],["Report Files", files],["Report Storage", fmtBytes(bytes)],["Latest Report", fmtDate(latest) || "None"]])
        + createPanel
        + '<section><div class="head"><h3>Cora Reports</h3><span class="pill ok">Share-ready</span></div>' + filters + reportTable(filtered) + '</section>';
    }
    function clientsTable(items) {
      return table(["Client", "Site / Profile", "Keywords", "Runs", "Snapshots", "Targets", "Plans", ""], rows(items).map((c) => '<tr><td><strong>' + esc(c.name || "") + '</strong><br><span class="muted">' + esc(c.client || "") + '</span></td><td>' + esc(c.site_domain || "") + '<br><span class="muted">' + esc(c.profile_name ? "Cora profile: " + c.profile_name : "No Cora profile") + '</span></td><td>' + esc(fmtNum(c.keyword_count)) + '</td><td>' + esc(fmtNum(c.run_count)) + '</td><td>' + esc(fmtNum(c.snapshot_count)) + '</td><td>' + esc(fmtNum(c.target_count)) + '</td><td>' + esc(fmtNum(c.plan_count)) + '</td><td><button class="client-open-page" data-page-target="clients" data-project-id="' + esc(c.id) + '">Open</button></td></tr>'));
    }
    function clientsView(data) {
      const clients = data.clients || [];
      const selected = state.activeClient !== "all" ? clients.find((client) => String(client.id) === String(state.activeClient)) : null;
      const totals = clients.reduce((acc, client) => {
        acc.keywords += Number(client.keyword_count || 0);
        acc.runs += Number(client.run_count || 0);
        acc.snapshots += Number(client.snapshot_count || 0);
        acc.targets += Number(client.target_count || 0);
        acc.plans += Number(client.plan_count || 0);
        return acc;
      }, { keywords: 0, runs: 0, snapshots: 0, targets: 0, plans: 0 });
      const summary = cards([["Clients", clients.length],["Keywords", totals.keywords],["Cora Runs", totals.runs],["Ranking Snapshots", totals.snapshots],["Saved Targets", totals.targets],["Content Plans", totals.plans]]);
      if (selected) {
        const detail = {
          client: selected,
          keywords: (data.keywords || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          runs: (data.runs || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          reports: (data.reports || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          snapshots: (data.snapshots || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          targets: (data.targets || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          jobs: (data.jobs || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          content_plans: (data.content_plans || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          entity_batches: (data.entity_batches || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          entity_runs: (data.entity_runs || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          entity_sets: (data.entity_sets || []).filter((row) => String(row.project_id || "") === String(selected.id)),
          commands: (data.commands || []).filter((row) => String(row.project_id || row.payload?.project_id || "") === String(selected.id))
        };
        return summary
          + '<section><div class="head"><h3>Client Dashboard</h3><div class="toolbar"><button class="client-open-page" data-page-target="new-client" data-project-id="all">New Client</button><button class="secondary" id="clear-active-client">All Clients</button></div></div><div class="empty">Current Client controls the URL, keywords, Cora profile, and tool defaults.</div></section>'
          + clientDetail(detail);
      }
      return summary
        + '<section><div class="head"><h3>Client Dashboard</h3><div class="toolbar"><button class="client-open-page" data-page-target="new-client" data-project-id="all">New Client</button></div></div><div class="empty">Select a Current Client in the sidebar or open a client below. Then launch Cora, Ranking Snapshot, Entity Explorer, reports, and plans from that workspace.</div>' + clientsTable(clients) + '</section>';
    }
    function newClientView() {
      return '<section><div class="head"><h3>New Client</h3><span class="muted">Creates a cloud command that the sync bridge can pull into the local dashboard.</span></div><div class="command-grid"><div class="command-card"><h4>Client Profile</h4><input id="quick-client-name" placeholder="Client name"><input id="quick-client-site" placeholder="Main URL or domain"><input id="quick-client-notes" placeholder="Notes"><button id="quick-create-client">Review Create Client</button></div><div class="command-card"><h4>What Happens Next</h4><div class="muted">The client is reviewed before it is queued. After queueing, use Sync Status or Command Review to confirm it reached the local dashboard.</div><button class="client-open-page secondary" data-page-target="clients" data-project-id="all">Back to Clients</button></div></div></section>';
    }
    function coraView(data) {
      const clients = data.clients || [];
      const prefill = state.commandPrefill || {};
      const selectedProject = String(state.coraClient !== "all" ? state.coraClient : (prefill.project_id || clients[0]?.id || ""));
      const client = clients.find((row) => String(row.id) === selectedProject) || clients[0] || {};
      const targetRaw = client.site_domain || client.client || prefill.target || "";
      const targetLower = String(targetRaw || "").toLowerCase();
      const target = targetRaw ? (targetLower.startsWith("http://") || targetLower.startsWith("https://") ? targetRaw : "https://" + targetRaw) : "";
      const bridge = (data.bridges || [])[0] || {};
      const bridgeReady = Boolean(bridge.online && bridge.allow_cora);
      const clientKeywords = (data.keywords || []).filter((keyword) => String(keyword.project_id || "") === String(client.id || ""));
      const prefillKeyword = String(prefill.keyword || "");
      const keywordChecks = clientKeywords.slice(0, 80).map((keyword, index) => {
        const checked = prefillKeyword ? String(keyword.keyword || "") === prefillKeyword : index === 0;
        return '<label class="check-item"><input class="cora-keyword-check" type="checkbox" value="' + esc(keyword.keyword || "") + '"' + (checked ? ' checked' : '') + '><span><strong>' + esc(keyword.keyword || "") + '</strong><br><small class="muted">' + esc([keyword.intent, keyword.priority].filter(Boolean).join(" / ") || "Synced keyword") + '</small></span></label>';
      }).join("");
      const clientOptions = clients.map((row) => '<option value="' + esc(row.id) + '"' + (String(row.id) === String(client.id || "") ? ' selected' : '') + '>' + esc(row.name || ("Client " + row.id)) + '</option>').join("");
      const recentCommands = (data.commands || []).filter((command) => command.command_type === "run_cora" && String(command.project_id || command.payload?.project_id || "") === String(client.id || "")).slice(0, 8);
      const commandRows = recentCommands.map((command) => '<div class="status-row"><span><strong>' + esc(command.payload?.keyword || "Cora run") + '</strong><br><small class="muted">' + esc(command.payload?.target_url || "") + '</small></span><strong class="' + commandStatusClass(command.status) + '">' + esc(commandStatusLabel(command.status)) + '</strong></div>').join("");
      const recentJobs = (data.jobs || []).filter((job) => String(job.project_id || "") === String(client.id || "")).slice(0, 8);
      const jobRows = recentJobs.map((job) => '<tr><td><strong>' + esc(job.keyword || "") + '</strong><br><span class="muted">' + esc(job.target_domain || job.target_url || "") + '</span></td><td>' + esc(job.cora_profile || "") + '</td><td><span class="pill">' + esc(job.status || "") + '</span></td><td>' + esc(fmtDate(job.updated_at || job.last_activity_at || job.started_at)) + '</td></tr>');
      if (!clients.length) return '<section><div class="head"><h3>Run Cora</h3><span class="pill warn">No clients</span></div><div class="empty">Sync or create a client before running Cora.</div></section>';
      return '<div class="grid2"><section><div class="head"><h3>Run Cora</h3><span class="pill ' + (bridgeReady ? 'ok' : 'warn') + '">' + esc(bridgeReady ? 'Remote bridge online' : 'Queued for remote bridge') + '</span></div><div class="status-list">'
        + '<div class="field-row"><select id="cora-client-select">' + clientOptions + '</select><input id="cora-target-url" placeholder="Target URL" value="' + esc(target) + '"><input id="cora-profile" placeholder="Cora profile" value="' + esc(client.profile_name || prefill.cora_profile || "") + '"></div>'
        + '<div class="muted">Cora runs on the connected Windows machine through the remote bridge. The workflow matches local; only execution happens remotely.</div>'
        + '<div><div class="head" style="padding:0 0 8px;border:0;"><h3>Keywords</h3><span class="muted">Select one or more</span></div><div class="check-list">' + (keywordChecks || '<div class="empty">No synced keywords for this client.</div>') + '</div></div>'
        + '<input id="cora-extra-keyword" placeholder="Optional extra keyword">'
        + '<div class="toolbar"><button id="cora-run-selected">' + esc(bridgeReady ? 'Run Selected Keywords' : 'Queue for Remote Cora') + '</button><button id="cora-refresh" class="secondary">Refresh</button></div>'
        + '<div id="cora-inline-status">' + toolFeedbackHtml(state.toolFeedback?.cora) + '</div>'
        + '</div></section><section><div class="head"><h3>Remote Cora Bridge</h3><span class="pill ' + (bridge.online ? 'ok' : 'warn') + '">' + esc(bridge.online ? 'Online' : 'Offline') + '</span></div><div class="bridge-flags"><div class="bridge-flag"><strong>' + esc(bridge.bridge_id || "No bridge") + '</strong><span class="muted">Machine</span></div><div class="bridge-flag"><strong>' + esc(bridge.allow_cora ? "Enabled" : "Off") + '</strong><span class="muted">Cora execution</span></div><div class="bridge-flag"><strong>' + esc(fmtDate(bridge.last_seen_at) || "Never") + '</strong><span class="muted">Last seen</span></div></div><div class="status-list">' + (commandRows || '<div class="muted">No Cora launch commands for this client yet.</div>') + '</div></section></div>'
        + '<section><div class="head"><h3>Recent Cora Jobs</h3><span class="muted">Synced from the local dashboard.</span></div>' + detailTable(["Keyword","Profile","Status","Updated"], jobRows, "No Cora jobs synced for this client.") + '</section>';
    }
    function profilesTable(items) {
      return table(["Profile", "Clients", "Attached Clients", "Updated", "Actions"], rows(items).map((p) => '<tr><td><strong>' + esc(p.name || "") + '</strong><br><span class="muted">' + esc(p.notes || "") + '</span></td><td>' + esc(fmtNum(p.client_count || 0)) + '</td><td>' + esc(p.client_names || p.client || "") + '</td><td>' + esc(fmtDate(p.updated_at || p.created_at)) + '</td><td><button class="profile-edit-row mini-btn" data-profile-id="' + esc(p.id || "") + '">Edit</button></td></tr>'), "No Cora profiles synced yet.");
    }
    function coraProfilesView(data) {
      const profiles = data.profiles || [];
      const clients = data.clients || [];
      const selectedClient = clients.find((client) => String(client.id || "") === String(state.activeClient)) || clients[0] || {};
      const selectedClientId = String(selectedClient.id || "");
      const attached = profiles.reduce((sum, profile) => sum + Number(profile.client_count || 0), 0);
      const clientOptions = clients.map((client) => '<option value="' + esc(client.id) + '"' + (String(client.id || "") === selectedClientId ? ' selected' : '') + '>' + esc(client.name || ("Client " + client.id)) + '</option>').join("");
      const profileOptions = '<option value="">Select existing Cora profile</option>' + profiles.map((profile) => '<option value="' + esc(profile.id) + '">' + esc(profile.name || ("Profile " + profile.id)) + '</option>').join("");
      const selectedProfile = profiles.find((profile) => String(profile.id) === String(state.profileEditId)) || profiles[0] || {};
      const selectedProfileId = String(selectedProfile.id || "");
      const editProfileOptions = profiles.map((profile) => '<option value="' + esc(profile.id) + '"' + (String(profile.id) === selectedProfileId ? ' selected' : '') + '>' + esc(profile.name || ("Profile " + profile.id)) + '</option>').join("");
      const attachedClientOptions = clients.filter((client) => String(client.profile_id || "") === selectedProfileId).map((client) => '<option value="' + esc(client.id) + '">' + esc(client.name || ("Client " + client.id)) + '</option>').join("");
      const statusStrip = '<section class="profile-status-strip"><div class="status-list"><div class="status-row"><span>Client</span><strong>' + esc(selectedClient.name || "No client selected") + '</strong></div><div class="status-row"><span>Attached Cora Profile</span><strong>' + esc(selectedClient.profile_name || "No profile attached") + '</strong></div><div class="status-row"><span>Main URL</span><strong>' + esc(selectedClient.site_domain || "No URL synced") + '</strong></div></div></section>';
      const setupPanel = '<section><div class="head"><h3>Profile Setup</h3><span class="muted">Attach Cora profiles to clients and manage shared Cora setup lists.</span></div><div class="command-grid"><div class="command-card"><h4>Create Profile</h4><input id="profile-create-name" placeholder="' + esc((selectedClient.name || "Client") + " Cora Profile") + '"><input id="profile-create-client" placeholder="Optional client label" value="' + esc(selectedClient.name || "") + '"><input id="profile-create-notes" placeholder="Notes"><button id="profile-create-submit">Create Profile</button></div><div class="command-card"><h4>Attach Profile</h4><select id="profile-attach-client">' + (clientOptions || '<option value="">No clients synced</option>') + '</select><select id="profile-attach-existing">' + profileOptions + '</select><input id="profile-attach-new" placeholder="' + esc((selectedClient.name || "Client") + " Cora Profile") + '"><button id="profile-attach-submit"' + (clients.length ? "" : " disabled") + '>Attach Profile</button><div class="muted">' + esc(selectedClient.profile_name ? "The attached profile is used by Cora runs for this client unless a run override is selected." : "Choose an existing profile or create a new one for this client.") + '</div></div></div><div id="profiles-inline-status">' + toolFeedbackHtml(state.toolFeedback?.profiles) + '</div></section>';
      const managePanel = '<section><div class="head"><h3>Manage Profile</h3><span class="muted">Edit metadata, detach clients, or queue native Cora actions for the local bridge.</span></div><div class="command-grid"><div class="command-card"><h4>Edit Metadata</h4><select id="profile-edit-select">' + (editProfileOptions || '<option value="">No profiles</option>') + '</select><input id="profile-edit-name" placeholder="Profile name" value="' + esc(selectedProfile.name || "") + '"><input id="profile-edit-client" placeholder="Optional client label" value="' + esc(selectedProfile.client || "") + '"><input id="profile-edit-notes" placeholder="Notes" value="' + esc(selectedProfile.notes || "") + '"><button id="profile-update-submit"' + (selectedProfileId ? "" : " disabled") + '>Save Profile</button></div><div class="command-card"><h4>Client Attachment</h4><select id="profile-detach-client">' + (attachedClientOptions || '<option value="">No clients attached to this profile</option>') + '</select><button id="profile-detach-submit"' + (attachedClientOptions ? "" : " disabled") + '>Detach Client</button><button id="profile-archive-submit" class="danger"' + (selectedProfileId ? "" : " disabled") + '>Archive Profile</button></div><div class="command-card"><h4>Native Cora Bridge</h4><div class="muted">These queue local bridge commands because Cloudflare cannot control the Windows Cora process directly.</div><button id="profile-apply-cora"' + (selectedProfileId ? "" : " disabled") + '>Apply in Cora</button><button id="profile-push-cora" class="secondary"' + (selectedProfileId ? "" : " disabled") + '>Push Current Cora Settings</button></div></div></section>';
      return cards([["Profiles", profiles.length],["Attached Clients", attached],["Unattached", profiles.filter((profile) => !Number(profile.client_count || 0)).length]])
        + statusStrip
        + setupPanel
        + managePanel
        + coraDomainListsPanel(data)
        + '<section><div class="head"><h3>Cora Profiles</h3><span class="muted">Synced profile metadata. Native Cora profile editing still happens through the local Cora bridge.</span></div>' + profilesTable(profiles) + '</section>';
    }
    function coraDomainListsPanel(data) {
      const allEntries = data.domain_lists || [];
      const entries = allEntries.filter((entry) => state.domainListType === "all" || entry.list_type === state.domainListType);
      const clients = data.clients || [];
      const profiles = data.profiles || [];
      const selectedEntry = allEntries.find((entry) => String(entry.id) === String(state.domainEditId)) || {};
      const listTypes = [["tracked", "Tracked Domain"],["competitors", "Competitor"],["banned", "Banned Domain"],["slowRender", "Slow Render"],["stopWords", "Stop Word"]];
      const typeOptions = listTypes.map(([value, label]) => '<option value="' + esc(value) + '"' + ((selectedEntry.list_type || "tracked") === value ? ' selected' : '') + '>' + esc(label) + '</option>').join("");
      const filterOptions = '<option value="all">All list types</option>' + listTypes.map(([value, label]) => '<option value="' + esc(value) + '"' + (state.domainListType === value ? ' selected' : '') + '>' + esc(label) + '</option>').join("");
      const clientOptions = '<option value="">Global / no client</option>' + clients.map((client) => '<option value="' + esc(client.id) + '"' + (String(selectedEntry.project_id || "") === String(client.id || "") ? ' selected' : '') + '>' + esc(client.name || ("Client " + client.id)) + '</option>').join("");
      const profileOptions = '<option value="">No profile scope</option>' + profiles.map((profile) => '<option value="' + esc(profile.id) + '"' + (String(selectedEntry.profile_id || "") === String(profile.id || "") ? ' selected' : '') + '>' + esc(profile.name || ("Profile " + profile.id)) + '</option>').join("");
      const rowsHtml = entries.map((entry) => '<tr><td><span class="pill">' + esc(entry.list_type || "") + '</span></td><td><strong>' + esc(entry.value || "") + '</strong><br><span class="muted">' + esc(entry.notes || "") + '</span></td><td>' + esc(entry.scope || "global") + '<br><span class="muted">' + esc(entry.project_name || entry.profile_name || "Global") + '</span></td><td>' + esc(fmtDate(entry.updated_at || entry.created_at)) + '</td><td><button class="domain-edit-row mini-btn" data-entry-id="' + esc(entry.id || "") + '">Edit</button><button class="domain-archive-row mini-btn secondary" data-entry-id="' + esc(entry.id || "") + '">Archive</button></td></tr>').join("");
      const editTitle = selectedEntry.id ? "Edit Domain Entry" : "Add Domain Entry";
      const form = '<section><div class="head"><h3>' + esc(editTitle) + '</h3><span class="muted">Synced dashboard list. Apply to native Cora through the local bridge.</span></div><div class="status-list"><div class="field-row"><select id="domain-list-type">' + typeOptions + '</select><input id="domain-list-value" placeholder="domain.com" value="' + esc(selectedEntry.value || "") + '"><input id="domain-list-notes" placeholder="Notes" value="' + esc(selectedEntry.notes || "") + '"></div><div class="field-row"><select id="domain-list-client">' + clientOptions + '</select><select id="domain-list-profile">' + profileOptions + '</select><button id="domain-list-save">' + esc(selectedEntry.id ? "Save Entry" : "Add Entry") + '</button><button id="domain-list-clear" class="secondary">Clear</button></div></div></section>';
      const bridge = '<section><div class="head"><h3>Native Cora Bridge</h3><span class="muted">Windows Cora stores these lists globally.</span></div><div class="status-list"><div class="muted">Apply pushes active cloud Domain Lists into the running Cora app. Pull reads current native Cora lists into this synced table.</div><div class="toolbar"><button id="domain-apply-cora">Apply Lists in Cora</button><button id="domain-pull-cora" class="secondary">Pull Lists from Cora</button><button class="client-open-page secondary" data-page-target="cora-profiles" data-project-id="all">Cora Profiles</button></div></div></section>';
      const filters = '<div class="filters"><select id="domain-type-filter">' + filterOptions + '</select><span class="muted">' + esc(entries.length) + ' of ' + esc(allEntries.length) + ' active entries</span></div>';
      const localPanel = renderCloudDomainListEditor(allEntries);
      return localPanel
        + form
        + bridge
        + '<section><div class="head"><h3>Advanced Domain Entry Management</h3><span class="muted">Use this table for scoped client/profile entries, notes, and archive actions.</span></div>' + filters + detailTable(["Type","Value","Scope","Updated","Actions"], rowsHtml, "No active Cora domain list entries yet.") + '</section>';
    }
    function activeDomainEntries(entries, type) {
      return (entries || []).filter((entry) => !entry.archived_at && entry.list_type === type && (!entry.project_id && !entry.profile_id));
    }
    function renderEditableDomainRows(entries, type) {
      return activeDomainEntries(entries, type).map((entry) => '<div class="editable-list-row"><span>' + esc(entry.value || "") + '</span><button type="button" class="secondary domain-archive-row" data-entry-id="' + esc(entry.id || "") + '">Delete</button></div>').join("") || '<div class="note-box">No entries.</div>';
    }
    function domainTextValue(entries, type) {
      return activeDomainEntries(entries, type).map((entry) => entry.value || "").filter(Boolean).join("\\n");
    }
    function renderCloudDomainListEditor(entries) {
      return '<section><div class="head"><h3>Cora Domain Lists</h3><span class="muted">Matches local Cora Settings: tracked domains, competitors, banned domains, slow render domains, and stop words.</span></div>'
        + '<div class="editable-list-grid">'
        + '<div class="editable-list-panel"><h4>Tracked Domains</h4><div class="inline-add"><input id="domain-quick-tracked" placeholder="domain.com"><button id="domain-add-tracked" type="button">Add</button></div><div class="editable-list">' + renderEditableDomainRows(entries, "tracked") + '</div></div>'
        + '<div class="editable-list-panel"><h4>Competitors</h4><div class="inline-add"><input id="domain-quick-competitors" placeholder="competitor.com"><button id="domain-add-competitors" type="button">Add</button></div><div class="editable-list">' + renderEditableDomainRows(entries, "competitors") + '</div></div>'
        + '</div>'
        + '<div class="domain-textareas">'
        + '<label>Banned Domains<textarea id="domain-banned-list" spellcheck="false">' + esc(domainTextValue(entries, "banned")) + '</textarea></label>'
        + '<label>Slow Render Domains<textarea id="domain-slow-render-list" spellcheck="false">' + esc(domainTextValue(entries, "slowRender")) + '</textarea></label>'
        + '<label>Stop Words<textarea id="domain-stop-words-list" spellcheck="false">' + esc(domainTextValue(entries, "stopWords")) + '</textarea></label>'
        + '</div>'
        + '<div class="toolbar" style="padding:0 12px 12px;"><button id="domain-save-lists" type="button">Save Cora Settings</button><button id="domain-apply-cora-inline" type="button" class="secondary">Apply Lists in Cora</button><button id="domain-pull-cora-inline" type="button" class="secondary">Pull Lists from Cora</button></div>'
        + '<div id="domains-inline-status">' + toolFeedbackHtml(state.toolFeedback?.domains) + '</div>'
        + '</section>';
    }
    function runsTable(items) {
      return table(["Keyword", "Client", "Target", "Imported", "Data", "Actions"], rows(items).map((r) => '<tr><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.file_name || "") + '</span></td><td>' + esc(r.project_name || "") + '</td><td>' + esc(r.target_domain || r.target_url || "") + '</td><td>' + esc(fmtDate(r.imported_at)) + '</td><td>' + esc(fmtNum(r.serp_count)) + ' SERP<br>' + esc(fmtNum(r.recommendation_count)) + ' recs<br>' + esc(fmtNum(r.lsi_count)) + ' LSI</td><td><button class="detail-btn" data-detail-type="run" data-detail-id="' + esc(r.id) + '">Open Run</button><button class="detail-btn" data-detail-type="client" data-detail-id="' + esc(r.project_id || "") + '">Open Client</button></td></tr>'));
    }
    function jobsTable(items) {
      return table(["Keyword", "Client", "Tool/Profile", "Status", "Updated", "Actions"], rows(items).map((j) => {
        const percent = j.progress == null ? "" : " · " + Math.round(Number(j.progress || 0) * 1000) / 10 + "%";
        const message = j.cora_action || j.status_message || j.error || "";
        return '<tr><td><strong>' + esc(j.keyword || "") + '</strong><br><span class="muted">' + esc(j.target_domain || "") + '</span></td><td>' + esc(j.project_name || "") + '</td><td>' + esc(j.tool || "cora") + '<br><span class="muted">' + esc(j.cora_profile || "") + '</span></td><td><span class="pill">' + esc(j.status || "") + '</span><br><span class="muted">' + esc(message) + esc(percent) + '</span></td><td>' + esc(fmtDate(j.updated_at || j.last_activity_at || j.started_at)) + '</td><td><button class="detail-btn" data-detail-type="client" data-detail-id="' + esc(j.project_id || "") + '">Open Client</button></td></tr>';
      }));
    }
    function coraRunsView(data) {
      const allRuns = data.runs || [];
      const clients = [...new Map(allRuns.map((run) => [String(run.project_id || ""), run.project_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const filtered = allRuns.filter((run) => state.runClient === "all" || String(run.project_id || "") === state.runClient);
      const latest = filtered.map((run) => run.imported_at).filter(Boolean).sort().pop();
      const clientOptions = '<option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.runClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("");
      const filters = '<div class="filters"><select id="run-client-filter">' + clientOptions + '</select><span class="muted">' + esc(filtered.length) + ' of ' + esc(allRuns.length) + ' runs</span></div>';
      return cards([["Cora Runs", allRuns.length],["Visible", filtered.length],["Clients", clients.length],["Latest Import", fmtDate(latest) || "None"]])
        + '<section><div class="head"><h3>Cora Runs</h3><span class="muted">Imported Cora report workbooks and extracted rows.</span></div>' + filters + runsTable(filtered) + '</section>';
    }
    function coraJobsView(data) {
      const allJobs = data.jobs || [];
      const clients = [...new Map(allJobs.map((job) => [String(job.project_id || ""), job.project_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const statuses = [...new Set(allJobs.map((job) => String(job.status || "").trim()).filter(Boolean))].sort();
      const filtered = allJobs.filter((job) => (state.jobClient === "all" || String(job.project_id || "") === state.jobClient) && (state.jobStatus === "all" || String(job.status || "") === state.jobStatus));
      const running = allJobs.filter((job) => ["queued", "running", "claimed"].includes(String(job.status || "").toLowerCase())).length;
      const clientOptions = '<option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.jobClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("");
      const statusOptions = '<option value="all">All statuses</option>' + statuses.map((status) => '<option value="' + esc(status) + '"' + (state.jobStatus === status ? ' selected' : '') + '>' + esc(status) + '</option>').join("");
      const filters = '<div class="filters"><select id="job-client-filter">' + clientOptions + '</select><select id="job-status-filter">' + statusOptions + '</select><span class="muted">' + esc(filtered.length) + ' of ' + esc(allJobs.length) + ' jobs</span></div>';
      return cards([["Cora Jobs", allJobs.length],["Visible", filtered.length],["Active", running],["Clients", clients.length]])
        + '<section><div class="head"><h3>Cora Jobs</h3><span class="pill warn">Read only</span></div>' + filters + jobsTable(filtered) + '</section>';
    }
    function snapshotsTable(items) {
      return table(["Target", "Client", "Locale", "Keywords", "Pages", "Created", ""], rows(items).map((s) => '<tr><td><strong>' + esc(s.target || "") + '</strong><br><span class="muted">' + esc(s.source || "") + ' / ' + esc(s.freshness || "") + '</span></td><td>' + esc(s.project_name || "") + '</td><td>' + esc(s.location_code || "") + ' / ' + esc(s.language_code || "") + '</td><td>' + esc(fmtNum(s.keyword_count)) + '</td><td>' + esc(fmtNum(s.page_count)) + '</td><td>' + esc(fmtDate(s.created_at)) + '</td><td><button class="detail-btn" data-detail-type="snapshot" data-detail-id="' + esc(s.id) + '">Open</button></td></tr>'));
    }
    function snapshotOptionLabel(snapshot) {
      return (snapshot.target || "Snapshot") + " | " + (snapshot.project_name || "No client") + " | " + fmtDate(snapshot.created_at) + " | " + fmtNum(snapshot.keyword_count || 0) + " keywords";
    }
    function defaultSnapshotPair(snapshots) {
      for (const snapshot of snapshots) {
        const pair = snapshots.filter((item) => String(item.project_id || "") === String(snapshot.project_id || "") && String(item.id) !== String(snapshot.id));
        if (pair.length) return { base: pair[0].id, compare: snapshot.id };
      }
      return { base: snapshots[1]?.id || "", compare: snapshots[0]?.id || "" };
    }
    function movementClass(value, lowerIsBetter) {
      const num = Number(value || 0);
      if (!num) return "";
      return (lowerIsBetter ? num < 0 : num > 0) ? "ok" : "warn";
    }
    function rankingComparisonResults(data) {
      const summary = data.summary || {};
      const keywordRows = (data.keywords || []).filter((row) => row.status !== "unchanged").slice(0, 80).map((row) => '<tr><td><span class="pill ' + (row.status === "improved" || row.status === "new" ? "ok" : row.status === "declined" || row.status === "lost" ? "warn" : "") + '">' + esc(String(row.status || "").replaceAll("_", " ")) + '</span></td><td><strong>' + esc(row.keyword || "") + '</strong><br><span class="muted">' + esc(row.rankingUrl || "") + '</span></td><td>' + esc(row.basePosition ?? "") + '</td><td>' + esc(row.comparePosition ?? "") + '</td><td><span class="' + movementClass(row.positionDelta, true) + '">' + esc(row.positionDelta ?? "") + '</span></td><td>' + esc(fmtNum(row.searchVolume || 0)) + '</td><td>' + esc(fmtNum(row.estimatedTrafficDelta || 0)) + '</td></tr>');
      const pageRows = (data.pages || []).filter((row) => row.status !== "unchanged").slice(0, 80).map((row) => '<tr><td><span class="pill ' + (row.status === "gained" || row.status === "new" ? "ok" : row.status === "lost" || row.status === "lost_traffic" ? "warn" : "") + '">' + esc(String(row.status || "").replaceAll("_", " ")) + '</span></td><td><a href="' + esc(row.url || "") + '" target="_blank">' + esc(row.url || "") + '</a></td><td>' + esc(fmtNum(row.baseOrganicTraffic || 0)) + '</td><td>' + esc(fmtNum(row.compareOrganicTraffic || 0)) + '</td><td><span class="' + movementClass(row.organicTrafficDelta, false) + '">' + esc(fmtNum(row.organicTrafficDelta || 0)) + '</span></td><td>' + esc(fmtNum(row.organicKeywordDelta || 0)) + '</td></tr>');
      return cards([["New Keywords", summary.newKeywords || 0],["Lost Keywords", summary.lostKeywords || 0],["Improved", summary.improvedKeywords || 0],["Declined", summary.declinedKeywords || 0],["Page Gains", summary.pageGains || 0],["Page Losses", summary.pageLosses || 0]])
        + '<div class="grid2"><section><div class="head"><h3>Keyword Movement</h3><span class="muted">' + esc(data.base?.target || "") + ' to ' + esc(data.compare?.target || "") + '</span></div>' + detailTable(["Status","Keyword","Before","After","Change","Volume","Traffic +/-"], keywordRows, "No keyword movement found between these snapshots.") + '</section>'
        + '<section><div class="head"><h3>Page Movement</h3></div>' + detailTable(["Status","URL","Before Traffic","After Traffic","Traffic +/-","Keyword +/-"], pageRows, "No page movement found between these snapshots.") + '</section></div>';
    }
    function normalizeRankingUrlKey(url) {
      return String(url || "").trim().replace(/\\/+$/, "");
    }
    function rankingTargetType(position, previousPosition, aiOverviewPresent, aiOverviewReference) {
      const pos = Number(position || 0);
      const prev = Number(previousPosition || 0);
      if (aiOverviewPresent && !aiOverviewReference) return "AI Overview Gap";
      if (prev && pos && pos > prev) return "Slipping Keyword";
      if (pos >= 4 && pos <= 10) return "Top 3 Push";
      if (pos >= 11 && pos <= 20) return "Page Two Lift";
      if (pos >= 21 && pos <= 30) return "Content Expansion";
      return "Monitor";
    }
    function rankingTargetRecommendedAction(type) {
      if (type === "Top 3 Push") return "Improve on-page optimization, internal links, title/meta, and content depth to push the strongest terms into top 3.";
      if (type === "Page Two Lift") return "Refresh the ranking page and strengthen topical coverage to move page-two keywords onto page one.";
      if (type === "Content Expansion") return "Expand content depth, add internal links, and consider whether a dedicated page is needed for weaker keyword clusters.";
      if (type === "AI Overview Gap") return "Add concise answer blocks, entity-rich explanations, citations, and schema where relevant.";
      if (type === "Slipping Keyword") return "Review SERP movement, refresh stale sections, and reinforce internal links before more rankings decline.";
      return "Monitor the page and use Cora or entity analysis when search volume or position movement justifies work.";
    }
    function buildSnapshotOptimizationTargets(data) {
      const pagesByUrl = new Map((data.pages || []).map((page) => [normalizeRankingUrlKey(page.url), page]));
      const savedByUrl = new Map((data.targets || []).map((target) => [normalizeRankingUrlKey(target.url), target]));
      const groups = new Map();
      (data.keywords || []).forEach((row) => {
        const url = normalizeRankingUrlKey(row.ranking_url || row.rankingUrl);
        if (!url) return;
        if (!groups.has(url)) groups.set(url, []);
        groups.get(url).push(row);
      });
      return Array.from(groups.entries()).map(([url, keywords]) => {
        const page = pagesByUrl.get(url) || {};
        const sortedKeywords = [...keywords].sort((a, b) => Number(b.search_volume || b.searchVolume || 0) - Number(a.search_volume || a.searchVolume || 0) || Number(a.position || 999) - Number(b.position || 999));
        const bestKeyword = [...keywords].sort((a, b) => Number(a.position || 999) - Number(b.position || 999))[0] || {};
        const opportunityRows = keywords.filter((row) => {
          const pos = Number(row.position || 0);
          const prev = Number(row.previous_position || row.previousPosition || 0);
          return (pos >= 4 && pos <= 30) || (prev && pos > prev) || (row.ai_overview_present && !row.ai_overview_reference);
        });
        const typeCounts = opportunityRows.reduce((acc, row) => {
          const type = rankingTargetType(row.position, row.previous_position || row.previousPosition, row.ai_overview_present || row.aiOverviewPresent, row.ai_overview_reference || row.aiOverviewReference);
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        const priorityType = ["AI Overview Gap", "Slipping Keyword", "Top 3 Push", "Page Two Lift", "Content Expansion"].find((type) => typeCounts[type]) || "Monitor";
        const totalSearchVolume = keywords.reduce((sum, row) => sum + Number(row.search_volume || row.searchVolume || 0), 0);
        const estimatedTraffic = keywords.reduce((sum, row) => sum + Number(row.estimated_traffic || row.estimatedTraffic || 0), 0);
        const bestPosition = keywords.reduce((best, row) => {
          const pos = Number(row.position || 0);
          return pos ? Math.min(best, pos) : best;
        }, 999);
        const score = Math.round((opportunityRows.length * 12) + (Math.log10(totalSearchVolume + 1) * 18) + (bestPosition === 999 ? 0 : Math.max(0, 31 - bestPosition)) + (typeCounts["AI Overview Gap"] ? 25 : 0) + (typeCounts["Slipping Keyword"] ? 18 : 0));
        const saved = savedByUrl.get(url) || {};
        return {
          id: saved.id || null,
          url,
          keyword: bestKeyword.keyword || sortedKeywords[0]?.keyword || "",
          bestPosition: bestPosition === 999 ? null : bestPosition,
          rankingKeywords: keywords.length,
          opportunityCount: opportunityRows.length,
          totalSearchVolume,
          estimatedTraffic,
          pageOrganicTraffic: page.organic_traffic ?? page.organicTraffic ?? null,
          pageOrganicKeywords: page.organic_keywords ?? page.organicKeywords ?? null,
          top10: page.top10 ?? null,
          priorityType: saved.priority_type || priorityType,
          opportunityScore: saved.opportunity_score ?? score,
          recommendedAction: saved.recommended_action || rankingTargetRecommendedAction(priorityType),
          topKeywords: sortedKeywords.slice(0, 3).map((row) => row.keyword).filter(Boolean),
          status: saved.status || "new",
          notes: saved.notes || ""
        };
      }).sort((a, b) => Number(b.opportunityScore || 0) - Number(a.opportunityScore || 0));
    }
    function rankingView(data) {
      const allSnapshots = data.snapshots || [];
      const clientRows = data.clients || [];
      const clients = clientRows.length ? clientRows.map((client) => [String(client.id || ""), client.name || "Client " + client.id]) : [...new Map(allSnapshots.map((snapshot) => [String(snapshot.project_id || ""), snapshot.project_name || "Unassigned"]).filter(([id]) => id)).entries()].map(([id, name]) => ({ id, name }));
      const effectiveRankingClient = state.rankingClient === "all" && clientRows.length ? String(clientRows[0]?.id || "") : state.rankingClient;
      const snapshots = allSnapshots.filter((snapshot) => effectiveRankingClient === "all" || String(snapshot.project_id || "") === effectiveRankingClient);
      const pair = defaultSnapshotPair(snapshots);
      const baseValue = state.rankingBase || pair.base || "";
      const compareValue = state.rankingCompare || pair.compare || "";
      const options = snapshots.map((snapshot) => '<option value="' + esc(snapshot.id) + '">' + esc(snapshotOptionLabel(snapshot)) + '</option>').join("");
      const selectedClientId = effectiveRankingClient !== "all" ? effectiveRankingClient : String(clientRows[0]?.id || "");
      const selectedClient = clientRows.find((client) => String(client.id || "") === String(selectedClientId)) || clientRows[0] || {};
      const targetRaw = selectedClient.site_domain || selectedClient.client || "";
      let target = targetRaw ? String(targetRaw).trim() : "";
      target = target.replace("https://", "").replace("http://", "");
      if (target.toLowerCase().startsWith("www.")) target = target.slice(4);
      if (target.endsWith("/")) target = target.slice(0, -1);
      const latestSnapshot = snapshots[0] || null;
      const latestDate = latestSnapshot?.created_at ? new Date(latestSnapshot.created_at) : null;
      const latestAgeDays = latestDate && !Number.isNaN(latestDate.getTime()) ? Math.floor((Date.now() - latestDate.getTime()) / 86400000) : null;
      const cacheFresh = latestAgeDays !== null && latestAgeDays <= 7;
      const freshnessLabel = latestAgeDays === null ? "No snapshot yet" : latestAgeDays === 0 ? "Created today" : latestAgeDays + " day" + (latestAgeDays === 1 ? "" : "s") + " old";
      const recentCommands = (data.commands || []).filter((command) => command.command_type === "create_ranking_snapshot" && String(command.project_id || command.payload?.project_id || "") === String(selectedClient.id || "")).slice(0, 6);
      const commandRows = recentCommands.map((command) => '<div class="status-row"><span><strong>' + esc(command.payload?.target || "Ranking snapshot") + '</strong><br><small class="muted">' + esc(fmtDate(command.created_at)) + '</small></span><strong class="' + commandStatusClass(command.status) + '">' + esc(commandStatusLabel(command.status)) + '</strong></div>').join("");
      const clientOptions = '<option value="all">All clients</option>' + clients.map((client) => {
        const id = Array.isArray(client) ? client[0] : String(client.id || "");
        const name = Array.isArray(client) ? client[1] : client.name || ("Client " + id);
        return '<option value="' + esc(id) + '"' + (effectiveRankingClient === id ? ' selected' : '') + '>' + esc(name) + '</option>';
      }).join("");
      const runClientOptions = clientRows.map((client) => '<option value="' + esc(client.id) + '"' + (String(client.id || "") === String(selectedClient.id || "") ? ' selected' : '') + '>' + esc(client.name || ("Client " + client.id)) + '</option>').join("");
      const filters = '<div class="filters"><select id="ranking-client-filter">' + clientOptions + '</select><span class="muted">' + esc(snapshots.length) + ' of ' + esc(allSnapshots.length) + ' snapshots</span></div>';
      const cacheNote = cacheFresh ? 'Existing weekly snapshot is probably still fresh. Use Force Refresh only when you intentionally want to spend API credits again.' : 'No fresh weekly snapshot is available for this client. Running a snapshot will pull current DataForSEO Labs data.';
      const runPanel = '<div class="grid2"><section><div class="head"><h3>Run Ranking Snapshot</h3><span class="pill ok">DataForSEO Labs</span></div><div class="status-list"><div class="field-row"><select id="ranking-run-client">' + runClientOptions + '</select><input id="ranking-run-target" placeholder="domain.com" value="' + esc(target) + '"></div><div class="field-row"><input id="ranking-run-location" placeholder="Location code" value="2840"><input id="ranking-run-language" placeholder="Language" value="en"><input id="ranking-run-limit" placeholder="Limit" value="1000"></div><div class="toolbar"><label class="muted"><input id="ranking-run-subdomains" type="checkbox" style="min-width:auto"> Include subdomains</label><label class="muted"><input id="ranking-run-force" type="checkbox" style="min-width:auto"> Force refresh</label><label class="muted"><input id="ranking-run-dry" type="checkbox" style="min-width:auto"> Dry run</label></div><button id="ranking-run-snapshot">Run Snapshot</button><div class="muted">DataForSEO Labs data is updated weekly. This is a ranking snapshot, not live rank tracking.</div><div id="ranking-inline-status">' + toolFeedbackHtml(state.toolFeedback?.ranking) + '</div></div></section><section><div class="head"><h3>Last Snapshot</h3><span class="pill ' + (cacheFresh ? 'ok' : 'warn') + '">' + esc(freshnessLabel) + '</span></div><div class="status-list"><div class="status-row"><span>Client</span><strong>' + esc(selectedClient.name || "No client") + '</strong></div><div class="status-row"><span>Target</span><strong>' + esc(latestSnapshot?.target || target || "No target") + '</strong></div><div class="status-row"><span>Keywords / Pages</span><strong>' + esc(fmtNum(latestSnapshot?.keyword_count || 0)) + ' / ' + esc(fmtNum(latestSnapshot?.page_count || 0)) + '</strong></div><div class="muted">' + esc(cacheNote) + '</div><div class="head" style="padding:8px 0 0;border:0;"><h3>Recent Snapshot Runs</h3></div>' + (commandRows || '<div class="muted">No recent snapshot commands for this client.</div>') + '</div></section></div>';
      const form = '<section><div class="head"><h3>Compare Snapshots</h3><span class="muted">Compare weekly DataForSEO Labs snapshots from the same client.</span></div>' + filters + '<div class="field-row" style="padding:12px;"><select id="ranking-compare-base"' + (snapshots.length >= 2 ? "" : " disabled") + '>' + options + '</select><select id="ranking-compare-to"' + (snapshots.length >= 2 ? "" : " disabled") + '>' + options + '</select><button id="ranking-compare-run"' + (snapshots.length >= 2 ? "" : " disabled") + '>Compare</button></div>' + (snapshots.length < 2 ? '<div class="empty">Run or sync at least two snapshots for this client to compare movement.</div>' : '') + '</section>';
      setTimeout(() => {
        const base = document.getElementById("ranking-compare-base");
        const compare = document.getElementById("ranking-compare-to");
        if (base && baseValue) base.value = String(baseValue);
        if (compare && compareValue) compare.value = String(compareValue);
        bindRankingControls();
      }, 0);
      return runPanel
        + form
        + (state.rankingComparison ? rankingComparisonResults(state.rankingComparison) : "")
        + '<section><div class="head"><h3>Ranking Snapshots</h3><span class="muted">Open a snapshot for keywords, pages, and saved optimization targets.</span></div>' + snapshotsTable(snapshots) + '</section>';
    }
    function targetsTable(items) {
      return table(["URL", "Client", "Keyword", "Position", "Score", "Status"], rows(items).map((t) => '<tr><td><strong>' + esc(t.url || "") + '</strong><br><span class="muted">' + esc(t.recommended_action || "") + '</span></td><td>' + esc(t.project_name || "") + '</td><td>' + esc(t.keyword || "") + '</td><td>' + esc(fmtNum(t.best_position)) + '</td><td>' + esc(fmtNum(t.opportunity_score)) + '</td><td><span class="pill">' + esc(t.status || "") + '</span></td></tr>'));
    }
    function targetActionPayload(target, type) {
      const projectId = Number(target.project_id || 0);
      if (type === "cora") return { project_id: projectId, keyword: target.keyword || "", target_url: target.url || "", execution_mode: "local" };
      return {
        execution_mode: "cloud",
        project_id: projectId,
        title: "Optimize ranking page for " + (target.keyword || target.url || "ranking target"),
        content_type: "Page Update",
        intent: "SEO Optimization",
        priority: "High",
        status: "planned",
        notes: ["Ranking URL: " + (target.url || ""), "Current position: " + (target.best_position || ""), "Recommended action: " + (target.recommended_action || "")].filter(Boolean).join("\\n")
      };
    }
    function targetsView(data) {
      const targets = data.targets || [];
      const clients = [...new Map(targets.map((target) => [String(target.project_id || ""), target.project_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const filtered = targets.filter((target) => (state.targetClient === "all" || String(target.project_id || "") === state.targetClient) && (state.targetStatus === "all" || String(target.status || "new") === state.targetStatus));
      const selectedCount = filtered.filter((target) => state.targetSelection[String(target.id)]).length;
      const statuses = ["all", "new", "selected", "in_cora", "in_entity_explorer", "content_plan_created", "optimized", "archived"];
      const statusOptions = statuses.map((status) => '<option value="' + esc(status) + '"' + (state.targetStatus === status ? ' selected' : '') + '>' + esc(status === "all" ? "All statuses" : status.replaceAll("_", " ")) + '</option>').join("");
      const clientOptions = '<option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.targetClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("");
      const rowsHtml = filtered.map((t) => '<tr><td><input class="target-check" type="checkbox" data-target-id="' + esc(t.id) + '" ' + (state.targetSelection[String(t.id)] ? "checked" : "") + '></td><td><strong><a href="' + esc(t.url || "") + '" target="_blank">' + esc(t.url || "") + '</a></strong><br><span class="muted">' + esc(t.recommended_action || "") + '</span></td><td>' + esc(t.project_name || "") + '</td><td>' + esc(t.keyword || "") + '</td><td>' + esc(fmtNum(t.best_position)) + '</td><td>' + esc(fmtNum(t.opportunity_count)) + '</td><td>' + esc(fmtNum(t.total_search_volume)) + '</td><td><span class="pill">' + esc(fmtNum(t.opportunity_score)) + '</span><br><span class="muted">' + esc(t.priority_type || "") + '</span></td><td><span class="pill">' + esc(t.status || "new") + '</span></td><td><button class="target-action mini-btn" data-target-id="' + esc(t.id) + '" data-action="cora">Open Cora</button><button class="target-action mini-btn" data-target-id="' + esc(t.id) + '" data-action="plan">Create Plan</button></td></tr>');
      const selectedProjectIds = [...new Set(filtered.filter((target) => state.targetSelection[String(target.id)]).map((target) => String(target.project_id || "")).filter(Boolean))];
      const canBulkStatus = selectedCount > 0 && selectedProjectIds.length === 1;
      const toolbar = '<div class="filters"><select id="target-client-filter">' + clientOptions + '</select><select id="target-status-filter">' + statusOptions + '</select><span class="muted">' + esc(filtered.length) + ' of ' + esc(targets.length) + ' targets</span></div>'
        + '<div class="toolbar"><button id="target-select-visible" class="secondary">Select Visible</button><button id="target-clear-selected" class="secondary">Clear</button><select id="target-bulk-status"><option value="selected">Selected</option><option value="in_cora">In Cora</option><option value="in_entity_explorer">In Entity Explorer</option><option value="content_plan_created">Content Plan Created</option><option value="optimized">Optimized</option><option value="archived">Archived</option></select><button id="target-update-status" ' + (canBulkStatus ? "" : "disabled") + '>Update Status</button></div>'
        + (selectedCount && selectedProjectIds.length > 1 ? '<div class="empty warn">Select targets from one client at a time before updating status.</div>' : '');
      setTimeout(bindTargetControls, 0);
      return cards([["Optimization Targets", targets.length],["Visible", filtered.length],["Selected", selectedCount],["Clients", clients.length]])
        + '<section><div class="head"><h3>Optimization Targets</h3><span class="muted">Saved ranking pages that need optimization work.</span></div>' + toolbar + detailTable(["","URL","Client","Keyword","Best Pos","Opps","Volume","Score","Status","Actions"], rowsHtml, "No optimization targets match the current filters.") + '</section>';
    }
    function entityBatchStatusClass(status) {
      return status === "complete" ? "ok" : status === "failed" || status === "partial" ? "warn" : "";
    }
    function entityBatchProgress(batch) {
      const total = Number(batch.target_count || 0);
      const complete = Number(batch.completed_count || 0);
      const failed = Number(batch.failed_count || 0);
      return esc(fmtNum(complete)) + ' complete' + (failed ? ', ' + esc(fmtNum(failed)) + ' failed' : '') + (total ? ' / ' + esc(fmtNum(total)) + ' total' : '');
    }
    function entityExplorerView(data) {
      const allBatches = data.entity_batches || [];
      const allRuns = data.entity_runs || [];
      const allSets = data.entity_sets || [];
      const clientRows = data.clients || [];
      const clients = clientRows.length ? clientRows.map((client) => [String(client.id || ""), client.name || ("Client " + client.id)]) : [...new Map(allBatches.concat(allRuns).concat(allSets).map((item) => [String(item.project_id || ""), item.project_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const clientOptions = '<option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.entityClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("");
      const selectedClientId = state.entityClient !== "all" ? state.entityClient : String((state.commandPrefill || {}).project_id || clientRows[0]?.id || "");
      const selectedClient = clientRows.find((client) => String(client.id || "") === String(selectedClientId)) || clientRows[0] || {};
      const runClientOptions = clientRows.map((client) => '<option value="' + esc(client.id) + '"' + (String(client.id || "") === String(selectedClient.id || "") ? ' selected' : '') + '>' + esc(client.name || ("Client " + client.id)) + '</option>').join("");
      const clientKeywords = (data.keywords || []).filter((keyword) => String(keyword.project_id || "") === String(selectedClient.id || ""));
      const keywordOptions = clientKeywords.map((keyword) => '<option value="' + esc(keyword.keyword || "") + '">').join("");
      const defaultSeed = (state.commandPrefill || {}).seed_keyword || (state.commandPrefill || {}).keyword || clientKeywords[0]?.keyword || "";
      const providerCards = entityProviderCatalog.map((provider) => '<div class="provider-card"><h4>' + esc(provider.label) + '</h4>' + provider.models.map(([model, note]) => {
        const value = provider.key + ":" + model;
        const checked = recommendedEntityTargets.has(value) ? " checked" : "";
        return '<label><input class="entity-model-check" type="checkbox" data-provider="' + esc(provider.key) + '" data-model="' + esc(model) + '"' + checked + '><span>' + esc(model) + '<small>' + esc(note) + '</small></span></label>';
      }).join("") + '</div>').join("");
      const batches = allBatches.filter((batch) => state.entityClient === "all" || String(batch.project_id || "") === state.entityClient);
      const runs = allRuns.filter((run) => state.entityClient === "all" || String(run.project_id || "") === state.entityClient);
      const sets = allSets.filter((set) => state.entityClient === "all" || String(set.project_id || "") === state.entityClient);
      const latest = batches.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
      const batchRows = batches.map((b) => '<tr><td><strong>' + esc(b.seed_keyword || "") + '</strong><br><span class="muted">' + esc(fmtDate(b.created_at)) + '</span></td><td>' + esc(b.project_name || "") + '</td><td>' + esc(b.depth || "") + '</td><td>' + entityBatchProgress(b) + '</td><td><span class="pill ' + entityBatchStatusClass(b.status) + '">' + esc(b.status || "") + '</span></td><td><button class="entity-batch-select detail-btn" data-batch-id="' + esc(b.id) + '">Open Crossover</button><button class="detail-btn" data-detail-type="entity-batch" data-detail-id="' + esc(b.id) + '">Detail</button></td></tr>');
      const runRows = runs.slice(0, 60).map((r) => '<tr><td>' + esc(r.seed_keyword || "") + '<br><span class="muted">' + esc(r.project_name || "") + '</span></td><td>' + esc(r.provider || "") + '</td><td>' + esc(r.model || "") + '</td><td><span class="pill ' + (r.status === "complete" ? "ok" : r.status === "failed" ? "warn" : "") + '">' + esc(r.status || "") + '</span><br><span class="muted">' + esc(r.error || r.summary || "") + '</span></td><td>' + esc(fmtDate(r.completed_at || r.created_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>');
      const actions = '<div class="filters"><select id="entity-client-filter">' + clientOptions + '</select><span class="muted">' + esc(batches.length) + ' of ' + esc(allBatches.length) + ' batches</span></div><div class="toolbar"><button class="entity-page-link" data-entity-page="entity-crossover">Entity Crossover</button><button class="entity-page-link secondary" data-entity-page="entity-sets">Entity Sets</button></div>';
      const runPanel = '<section><div class="head"><h3>Run Entity Explorer</h3><span class="pill ok">Cloud LLM APIs</span></div><div class="status-list"><div class="field-row"><select id="entity-run-client">' + runClientOptions + '</select><input id="entity-run-seed" list="entity-keyword-list" placeholder="Seed keyword" value="' + esc(defaultSeed) + '"><datalist id="entity-keyword-list">' + keywordOptions + '</datalist><select id="entity-run-depth"><option value="1">1 - Light</option><option value="2">2 - Focused</option><option value="3" selected>3 - Standard</option><option value="4">4 - Deep</option><option value="5">5 - Comprehensive</option></select></div><div class="toolbar"><button id="entity-select-recommended" class="secondary">Select Recommended</button><button id="entity-clear-models" class="secondary">Clear Models</button><span id="entity-model-count" class="muted"></span></div><div class="provider-grid">' + providerCards + '</div><details><summary class="muted">Advanced provider:model input</summary><textarea id="entity-run-targets" placeholder="openai:gpt-5.5&#10;anthropic:claude-opus-4-8&#10;google:gemini-3.1-pro-preview&#10;perplexity:perplexity/sonar"></textarea></details><div class="toolbar"><label class="muted"><input id="entity-run-async" type="checkbox" checked style="min-width:auto"> Run async</label><label class="muted"><input id="entity-run-dry" type="checkbox" style="min-width:auto"> Dry run</label></div><button id="entity-run-start">Run Entity Explorer</button><div id="entity-inline-status">' + toolFeedbackHtml(state.toolFeedback?.entity) + '</div></div></section>';
      setTimeout(bindEntityPageControls, 0);
      return cards([["Entity Batches", allBatches.length],["Visible Batches", batches.length],["Visible Model Runs", runs.length],["Visible Entity Sets", sets.length],["Latest Batch", latest ? latest.seed_keyword : "None"]])
        + runPanel
        + '<section><div class="head"><h3>Entity Explorer</h3><span class="muted">Cloud mirror of local Entity & LSI work.</span></div><div class="status-list">' + actions + '</div></section>'
        + '<section><div class="head"><h3>Entity Batches</h3></div>' + table(["Seed","Client","Depth","Progress","Status",""], rows(batchRows.map((html, i) => ({ html, _search: JSON.stringify(batches[i] || {}) }))).map((row) => row.html), "No entity batches synced yet.") + '</section>'
        + '<section><div class="head"><h3>Model Runs</h3></div>' + table(["Seed","Provider","Model","Status","Completed",""], rows(runRows.map((html, i) => ({ html, _search: JSON.stringify(runs[i] || {}) }))).map((row) => row.html), "No entity model runs synced yet.") + '</section>';
    }
    function entityCrossoverView(data) {
      const allBatches = data.entity_batches || [];
      const clients = [...new Map(allBatches.map((batch) => [String(batch.project_id || ""), batch.project_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const clientOptions = '<select id="entity-client-filter"><option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.entityClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("") + '</select>';
      const batches = allBatches.filter((batch) => state.entityClient === "all" || String(batch.project_id || "") === state.entityClient);
      const selected = state.entityBatch === "all" ? batches[0] : batches.find((batch) => String(batch.id) === String(state.entityBatch));
      const batchRuns = selected ? (data.entity_runs || []).filter((run) => String(run.batch_id || "") === String(selected.id)) : [];
      const batchOptions = '<select id="entity-batch-filter">' + (batches.length ? batches.map((batch) => '<option value="' + esc(batch.id) + '"' + (selected && String(batch.id) === String(selected.id) ? ' selected' : '') + '>' + esc((batch.seed_keyword || "Batch") + " | " + (batch.project_name || "") + " | " + fmtDate(batch.created_at)) + '</option>').join("") : '<option value="all">No batches</option>') + '</select>';
      const batchRows = batches.map((b) => '<tr><td><strong>' + esc(b.seed_keyword || "") + '</strong><br><span class="muted">' + esc(b.project_name || "") + '</span></td><td>' + esc(b.depth || "") + '</td><td>' + entityBatchProgress(b) + '</td><td><span class="pill ' + entityBatchStatusClass(b.status) + '">' + esc(b.status || "") + '</span></td><td>' + esc(fmtDate(b.updated_at || b.created_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-batch" data-detail-id="' + esc(b.id) + '">Open Detail</button></td></tr>');
      const runRows = batchRuns.map((r) => '<tr><td>' + esc(r.provider || "") + '</td><td>' + esc(r.model || "") + '</td><td><span class="pill ' + (r.status === "complete" ? "ok" : r.status === "failed" ? "warn" : "") + '">' + esc(r.status || "") + '</span></td><td><span class="muted">' + esc(r.error || r.summary || "") + '</span></td><td>' + esc(fmtDate(r.completed_at || r.created_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>');
      const detail = selected && state.entityCrossoverDetail && String(state.entityCrossoverDetail.id) === String(selected.id) ? state.entityCrossoverDetail : null;
      const crossoverPanel = selected
        ? '<div id="entity-crossover-workspace" data-batch-id="' + esc(selected.id) + '">' + (detail?.loading ? '<section><div class="head"><h3>Crossover Terms</h3><span class="pill warn">Loading</span></div><div class="empty">Loading crossover terms...</div></section>' : detail?.data ? entityCrossoverWorkspace(detail.data) : detail?.error ? entityCrossoverWorkspace({ error: detail.error }) : '<section><div class="head"><h3>Crossover Terms</h3><span class="pill warn">Loading</span></div><div class="empty">Loading crossover terms...</div></section>') + '</div>'
        : '<section><div class="head"><h3>Crossover Terms</h3></div><div class="empty">Select or run an entity batch first.</div></section>';
      setTimeout(bindEntityPageControls, 0);
      return '<section><div class="head"><h3>Entity Crossover</h3><span class="muted">Compare model output, auto-select terms, and save approved Entity Sets.</span></div><div class="filters">' + clientOptions + batchOptions + '<button class="entity-page-link secondary" data-entity-page="entity-sets">Entity Sets</button><span class="muted">' + esc(batches.length) + ' of ' + esc(allBatches.length) + ' batches</span></div></section>'
        + (selected ? cards([["Selected Batch", selected.seed_keyword || ""],["Client", selected.project_name || ""],["Progress", entityBatchProgress(selected)],["Models", batchRuns.length]]) : "")
        + crossoverPanel
        + '<section><div class="head"><h3>Selected Batch Model Runs</h3></div>' + table(["Provider","Model","Status","Summary / Error","Completed",""], runRows, "Select or run an entity batch first.") + '</section>'
        + '<section><div class="head"><h3>All Entity Batches</h3></div>' + table(["Seed","Depth","Progress","Status","Updated",""], rows(batchRows.map((html, i) => ({ html, _search: JSON.stringify(batches[i] || {}) }))).map((row) => row.html), "No entity batches synced yet.") + '</section>';
    }
    function entitySetsView(data) {
      const sets = data.entity_sets || [];
      const clients = [...new Map(sets.map((set) => [String(set.project_id || ""), set.project_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const filtered = sets.filter((set) => state.entitySetClient === "all" || String(set.project_id || "") === state.entitySetClient);
      const filters = '<div class="filters"><select id="entity-set-client-filter"><option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.entitySetClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("") + '</select><span class="muted">' + esc(filtered.length) + ' of ' + esc(sets.length) + ' sets</span></div>';
      const setRows = filtered.map((s) => '<tr><td><strong>' + esc(s.name || "") + '</strong><br><span class="muted">' + esc(s.notes || "") + '</span></td><td>' + esc(s.project_name || "") + '</td><td>' + esc(fmtNum(s.term_count)) + '</td><td>' + esc(s.source_batch_id || "") + '</td><td>' + esc(fmtDate(s.updated_at || s.created_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-set" data-detail-id="' + esc(s.id) + '">Open</button><button class="entity-set-delete mini-btn" data-set-id="' + esc(s.id) + '">Delete</button></td></tr>');
      setTimeout(bindEntityPageControls, 0);
      return cards([["Entity Sets", sets.length],["Visible Sets", filtered.length],["Saved Terms", sets.reduce((sum, set) => sum + Number(set.term_count || 0), 0)],["Clients", clients.length]])
        + '<section><div class="head"><h3>Entity Sets</h3><span class="muted">Saved approved entity/LSI terms from crossover analysis.</span></div>' + filters + table(["Set","Client","Terms","Source Batch","Updated",""], setRows, "No entity sets synced yet.") + '</section>';
    }
    function plansTable(items) {
      return table(["Title", "Client", "Keyword", "Type", "Status", "Due"], rows(items).map((p) => '<tr><td><strong>' + esc(p.title || "") + '</strong><br><span class="muted">' + esc(p.notes || "") + '</span></td><td>' + esc(p.project_name || "") + '</td><td>' + esc(p.keyword || "") + '</td><td>' + esc(p.content_type || "") + '</td><td><span class="pill">' + esc(p.status || "") + '</span><br><span class="muted">' + esc(p.priority || "") + '</span></td><td>' + esc(p.due_date || "") + '</td></tr>'));
    }
    function plansView(data) {
      const plans = data.content_plans || [];
      const clients = [...new Map(plans.map((plan) => [String(plan.project_id || ""), plan.project_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const priorities = [...new Set(plans.map((plan) => String(plan.priority || "").trim()).filter(Boolean))].sort();
      const filtered = plans.filter((plan) =>
        (state.planClient === "all" || String(plan.project_id || "") === state.planClient) &&
        (state.planStatus === "all" || String(plan.status || "planned") === state.planStatus) &&
        (state.planPriority === "all" || String(plan.priority || "") === state.planPriority)
      );
      const selectedCount = filtered.filter((plan) => state.planSelection[String(plan.id)]).length;
      const selectedProjectIds = [...new Set(filtered.filter((plan) => state.planSelection[String(plan.id)]).map((plan) => String(plan.project_id || "")).filter(Boolean))];
      const canBulkStatus = selectedCount > 0 && selectedProjectIds.length === 1;
      const statuses = ["all", "planned", "in_progress", "drafting", "review", "published", "paused", "done", "archived"];
      const statusOptions = statuses.map((status) => '<option value="' + esc(status) + '"' + (state.planStatus === status ? ' selected' : '') + '>' + esc(status === "all" ? "All statuses" : status.replaceAll("_", " ")) + '</option>').join("");
      const clientOptions = '<option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.planClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("");
      const priorityOptions = '<option value="all">All priorities</option>' + priorities.map((priority) => '<option value="' + esc(priority) + '"' + (state.planPriority === priority ? ' selected' : '') + '>' + esc(priority) + '</option>').join("");
      const rowsHtml = filtered.map((p) => '<tr><td><input class="plan-check" type="checkbox" data-plan-id="' + esc(p.id) + '" ' + (state.planSelection[String(p.id)] ? "checked" : "") + '></td><td><strong>' + esc(p.title || "") + '</strong><br><span class="muted">' + esc(p.notes || "") + '</span></td><td>' + esc(p.project_name || "") + '</td><td>' + esc(p.keyword || "") + '</td><td>' + esc(p.content_type || "") + '<br><span class="muted">' + esc(p.intent || "") + '</span></td><td><span class="pill">' + esc(p.status || "") + '</span></td><td>' + esc(p.priority || "") + '</td><td>' + esc(p.due_date || "") + '</td><td><button class="plan-action mini-btn" data-plan-id="' + esc(p.id) + '" data-action="client">Open Client</button><button class="plan-action mini-btn" data-plan-id="' + esc(p.id) + '" data-action="cora">Open Cora</button></td></tr>');
      const toolbar = '<div class="filters"><select id="plan-client-filter">' + clientOptions + '</select><select id="plan-status-filter">' + statusOptions + '</select><select id="plan-priority-filter">' + priorityOptions + '</select><span class="muted">' + esc(filtered.length) + ' of ' + esc(plans.length) + ' plans</span></div>'
        + '<div class="toolbar"><button id="plan-select-visible" class="secondary">Select Visible</button><button id="plan-clear-selected" class="secondary">Clear</button><select id="plan-bulk-status"><option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="drafting">Drafting</option><option value="review">Review</option><option value="published">Published</option><option value="paused">Paused</option><option value="done">Done</option><option value="archived">Archived</option></select><button id="plan-update-status" ' + (canBulkStatus ? "" : "disabled") + '>Update Status</button></div>'
        + (selectedCount && selectedProjectIds.length > 1 ? '<div class="empty warn">Select plans from one client at a time before updating status.</div>' : '');
      setTimeout(bindPlanControls, 0);
      return cards([["Content Plans", plans.length],["Visible", filtered.length],["Selected", selectedCount],["Clients", clients.length]])
        + '<section><div class="head"><h3>Content Plans</h3><span class="muted">Cloud working list for page updates, briefs, and optimization tasks.</span></div>' + toolbar + detailTable(["","Title","Client","Keyword","Type / Intent","Status","Priority","Due","Actions"], rowsHtml, "No content plans match the current filters.") + '</section>';
    }
    function projectOptions(selected) {
      return (state.data?.clients || []).map((p) => '<option value="' + esc(p.id) + '"' + (String(selected || "") === String(p.id) ? ' selected' : '') + '>' + esc(p.name || ("Client " + p.id)) + '</option>').join("");
    }
    function runOptions() {
      return (state.data?.runs || []).map((r) => '<option value="' + esc(r.id) + '">' + esc((r.keyword || "Run") + " | " + (r.project_name || "")) + '</option>').join("");
    }
    function commandLabel(type) {
      const labels = {
        create_project: "Create Client",
        create_profile: "Create Cora Profile",
        update_profile: "Update Cora Profile",
        attach_profile: "Attach Cora Profile",
        detach_profile: "Detach Cora Profile",
        archive_profile: "Archive Cora Profile",
        apply_cora_profile: "Apply Cora Profile",
        push_cora_profile: "Push Cora Profile",
        create_cora_domain_entry: "Add Cora Domain Entry",
        update_cora_domain_entry: "Update Cora Domain Entry",
        archive_cora_domain_entry: "Archive Cora Domain Entry",
        apply_cora_domain_lists: "Apply Cora Domain Lists",
        pull_cora_domain_lists: "Pull Cora Domain Lists",
        add_keyword: "Add Keyword",
        create_content_plan: "Content Plan",
        create_share_report: "Customer Report",
        revoke_share_report: "Archive Customer Report",
        run_cora: "Run Cora",
        create_ranking_snapshot: "Ranking Snapshot",
        run_entity_lsi: "Entity Explorer",
        run_nlp_categorizer: "NLP Categorizer",
        run_nlp_llm_comparison: "NLP LLM Comparison",
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
      return ["create_ranking_snapshot", "run_entity_lsi", "run_nlp_categorizer", "run_nlp_llm_comparison"].includes(command_type) && !payload?.dry_run;
    }
    function commandRisk(command_type, payload) {
      if (command_type === "run_cora") return "Needs local bridge with Cora enabled.";
      if (["apply_cora_profile", "push_cora_profile", "apply_cora_domain_lists", "pull_cora_domain_lists"].includes(command_type)) return "Native Cora action. This waits for the local Windows bridge.";
      if (payload?.execution_mode === "cloud") return "Runs in Cloudflare and then needs cloud-to-local sync for local parity.";
      if (isPaidLiveCommand(command_type, payload)) return "Paid/API run. This can use DataForSEO or LLM credits.";
      if (["create_ranking_snapshot", "run_entity_lsi", "run_nlp_categorizer", "run_nlp_llm_comparison"].includes(command_type)) return "Dry run only. No paid/API execution.";
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
      if (result.results && result.runs) return 'NLP LLM comparison: ' + esc(fmtNum(result.results.filter((row) => row.status === "complete").length || 0)) + ' complete, ' + esc(fmtNum(result.results.filter((row) => row.status === "failed").length || 0)) + ' failed.';
      if (result.runs) return 'Completed ' + esc(fmtNum(result.runs.filter((run) => run.status === "complete").length || 0)) + ' of ' + esc(fmtNum(result.runs.length || 0)) + ' Entity Explorer model runs.';
      if (result.urls && result.batch) return 'NLP batch #' + esc(result.batch.id || "") + ': ' + esc(fmtNum(result.batch.complete_count || 0)) + ' complete, ' + esc(fmtNum(result.batch.failed_count || 0)) + ' failed, ' + esc(fmtNum(result.batch.skipped_count || 0)) + ' skipped.';
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
    function bindSyncControls() {
      document.getElementById("sync-review-push")?.addEventListener("click", () => {
        setPage("commands");
        setPendingCommand("sync_cloud_data", { tables: [], dry_run: false });
      });
      document.getElementById("sync-review-pull")?.addEventListener("click", () => {
        setPage("commands");
        setPendingCommand("sync_cloud_to_local", { tables: ["profiles", "cora_domain_lists", "projects", "sites", "keywords", "content_plans", "ranking_snapshots", "ranking_snapshot_keywords", "ranking_snapshot_pages", "ranking_optimization_targets", "entity_lsi_batches", "entity_lsi_runs", "nlp_category_batches", "nlp_category_urls", "nlp_llm_comparison_runs", "nlp_llm_comparison_results", "entity_sets", "entity_set_terms", "share_reports"], dry_run: true });
      });
      document.getElementById("sync-review-files")?.addEventListener("click", () => {
        setPage("commands");
        setPendingCommand("sync_report_artifacts", { report_ids: [], dry_run: false, force: false });
      });
      document.getElementById("sync-open-commands")?.addEventListener("click", () => setPage("commands"));
      document.getElementById("sync-open-audit")?.addEventListener("click", () => setPage("audit"));
    }
    function bindRankingControls() {
      const client = document.getElementById("ranking-client-filter");
      if (client) client.onchange = (event) => { state.rankingBase = ""; state.rankingCompare = ""; state.rankingComparison = null; applyActiveClient(event.target.value || "all"); };
      const runClient = document.getElementById("ranking-run-client");
      if (runClient) runClient.onchange = (event) => { state.rankingBase = ""; state.rankingCompare = ""; state.rankingComparison = null; applyActiveClient(event.target.value || "all"); };
      const runButton = document.getElementById("ranking-run-snapshot");
      if (runButton) runButton.onclick = () => {
        (async () => {
          if (runButton.disabled) return;
          const originalLabel = runButton.textContent;
          const payload = {
            execution_mode: "cloud",
            project_id: Number(document.getElementById("ranking-run-client")?.value || 0),
            target: document.getElementById("ranking-run-target")?.value || "",
            location_code: Number(document.getElementById("ranking-run-location")?.value || 2840),
            language_code: document.getElementById("ranking-run-language")?.value || "en",
            limit: Number(document.getElementById("ranking-run-limit")?.value || 1000),
            include_subdomains: Boolean(document.getElementById("ranking-run-subdomains")?.checked),
            force_refresh: Boolean(document.getElementById("ranking-run-force")?.checked),
            dry_run: Boolean(document.getElementById("ranking-run-dry")?.checked)
          };
          runButton.disabled = true;
          runButton.textContent = "Running...";
          setToolFeedback("ranking", { status: "running", title: "Ranking Snapshot", message: "Starting DataForSEO Labs snapshot for " + payload.target + "." });
          try {
            const result = await postCommand("create_ranking_snapshot", payload);
            const command = result.command || {};
            await load();
            setToolFeedback("ranking", {
              status: command.status || (result.duplicate ? "duplicate" : "queued"),
              title: result.duplicate ? "Ranking Snapshot Already Queued" : "Ranking Snapshot Started",
              message: commandResultSummary(command) || (payload.dry_run ? "Dry run completed." : "Snapshot command is active."),
              rows: [{ label: payload.target, status: commandStatusLabel(command.status || (result.duplicate ? "duplicate" : "queued")) }]
            }, true);
            startToolAutoRefresh("ranking", 120000);
          } catch (error) {
            runButton.disabled = false;
            runButton.textContent = originalLabel;
            setToolFeedback("ranking", { status: "failed", title: "Ranking Snapshot Failed", message: error.message || String(error) });
          }
        })();
      };
      const button = document.getElementById("ranking-compare-run");
      if (!button) return;
      button.onclick = async () => {
        const baseId = document.getElementById("ranking-compare-base")?.value || "";
        const compareId = document.getElementById("ranking-compare-to")?.value || "";
        if (!baseId || !compareId || baseId === compareId) return alert("Choose two different snapshots.");
        state.rankingBase = baseId;
        state.rankingCompare = compareId;
        button.disabled = true;
        button.textContent = "Comparing...";
        try {
          state.rankingComparison = await apiGet("/api/ranking-snapshots/compare?base_id=" + encodeURIComponent(baseId) + "&compare_id=" + encodeURIComponent(compareId));
          render();
        } catch (error) {
          alert(error.message || error);
          button.disabled = false;
          button.textContent = "Compare";
        }
      };
    }
    function selectedTargets() {
      const selected = state.targetSelection || {};
      return (state.data?.targets || []).filter((target) => selected[String(target.id)]);
    }
    function bindTargetControls() {
      const client = document.getElementById("target-client-filter");
      const status = document.getElementById("target-status-filter");
      if (client) client.onchange = (event) => { state.targetSelection = {}; applyActiveClient(event.target.value || "all"); };
      if (status) status.onchange = (event) => { state.targetStatus = event.target.value || "all"; state.targetSelection = {}; render(); };
      document.querySelectorAll(".target-check").forEach((box) => {
        box.onchange = () => {
          state.targetSelection[String(box.dataset.targetId)] = box.checked;
          render();
        };
      });
      document.getElementById("target-select-visible")?.addEventListener("click", () => {
        (state.data?.targets || []).filter((target) => (state.targetClient === "all" || String(target.project_id || "") === state.targetClient) && (state.targetStatus === "all" || String(target.status || "new") === state.targetStatus)).forEach((target) => { state.targetSelection[String(target.id)] = true; });
        render();
      });
      document.getElementById("target-clear-selected")?.addEventListener("click", () => { state.targetSelection = {}; render(); });
      document.getElementById("target-update-status")?.addEventListener("click", () => updateTargetStatus().catch((error) => alert(error.message || error)));
      document.querySelectorAll(".target-action").forEach((button) => {
        button.onclick = () => {
          const target = (state.data?.targets || []).find((item) => String(item.id) === String(button.dataset.targetId));
          if (!target) return;
          if (button.dataset.action === "cora") {
            openClientTool("cora", String(target.project_id || "all"), { keyword: target.keyword || "", target: target.url || "" });
          } else {
            (async () => {
              const result = await postCommand("create_content_plan", targetActionPayload(target, "plan"));
              await load();
              alert(result.duplicate ? "Matching content plan already exists." : "Content plan created.");
            })().catch((error) => alert(error.message || error));
          }
        };
      });
    }
    async function updateTargetStatus() {
      const targets = selectedTargets();
      if (!targets.length) throw new Error("Select at least one optimization target.");
      const projectIds = [...new Set(targets.map((target) => String(target.project_id || "")).filter(Boolean))];
      if (projectIds.length !== 1) throw new Error("Select targets from one client at a time.");
      const response = await fetch("/api/optimization-targets/status", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ target_ids: targets.map((target) => target.id), project_id: Number(projectIds[0]), status: document.getElementById("target-bulk-status")?.value || "selected" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Target status update failed");
      await load();
    }
    function selectedPlans() {
      const selected = state.planSelection || {};
      return (state.data?.content_plans || []).filter((plan) => selected[String(plan.id)]);
    }
    function planMatchesFilters(plan) {
      return (state.planClient === "all" || String(plan.project_id || "") === state.planClient) &&
        (state.planStatus === "all" || String(plan.status || "planned") === state.planStatus) &&
        (state.planPriority === "all" || String(plan.priority || "") === state.planPriority);
    }
    function bindPlanControls() {
      const client = document.getElementById("plan-client-filter");
      const status = document.getElementById("plan-status-filter");
      const priority = document.getElementById("plan-priority-filter");
      if (client) client.onchange = (event) => { state.planSelection = {}; applyActiveClient(event.target.value || "all"); };
      if (status) status.onchange = (event) => { state.planStatus = event.target.value || "all"; state.planSelection = {}; render(); };
      if (priority) priority.onchange = (event) => { state.planPriority = event.target.value || "all"; state.planSelection = {}; render(); };
      document.querySelectorAll(".plan-check").forEach((box) => {
        box.onchange = () => {
          state.planSelection[String(box.dataset.planId)] = box.checked;
          render();
        };
      });
      document.getElementById("plan-select-visible")?.addEventListener("click", () => {
        (state.data?.content_plans || []).filter(planMatchesFilters).forEach((plan) => { state.planSelection[String(plan.id)] = true; });
        render();
      });
      document.getElementById("plan-clear-selected")?.addEventListener("click", () => { state.planSelection = {}; render(); });
      document.getElementById("plan-update-status")?.addEventListener("click", () => updatePlanStatus().catch((error) => alert(error.message || error)));
      document.querySelectorAll(".plan-action").forEach((button) => {
        button.onclick = () => {
          const plan = (state.data?.content_plans || []).find((item) => String(item.id) === String(button.dataset.planId));
          if (!plan) return;
          if (button.dataset.action === "client") openClientTool("clients", String(plan.project_id || "all"));
          if (button.dataset.action === "cora") {
            openClientTool("cora", String(plan.project_id || "all"), { keyword: plan.keyword || plan.title || "" });
          }
        };
      });
    }
    async function updatePlanStatus() {
      const plans = selectedPlans();
      if (!plans.length) throw new Error("Select at least one content plan.");
      const projectIds = [...new Set(plans.map((plan) => String(plan.project_id || "")).filter(Boolean))];
      if (projectIds.length !== 1) throw new Error("Select plans from one client at a time.");
      const response = await fetch("/api/content-plans/status", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ plan_ids: plans.map((plan) => plan.id), project_id: Number(projectIds[0]), status: document.getElementById("plan-bulk-status")?.value || "planned" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Content plan status update failed");
      await load();
    }
    function bindEntityPageControls() {
      const selectedEntityTargets = () => {
        const checkedTargets = [...document.querySelectorAll(".entity-model-check:checked")].map((box) => ({ provider: box.dataset.provider || "", model: box.dataset.model || "" })).filter((target) => target.provider && target.model);
        const advancedTargets = parseEntityTargets(document.getElementById("entity-run-targets")?.value || "");
        const seen = new Set();
        return checkedTargets.concat(advancedTargets).filter((target) => {
          const key = (target.provider || target.api_key_id || "") + ":" + target.model;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      const updateEntityModelCount = () => {
        const count = selectedEntityTargets().length;
        const target = document.getElementById("entity-model-count");
        if (target) target.textContent = count + " model" + (count === 1 ? "" : "s") + " selected";
      };
      document.querySelectorAll(".entity-model-check").forEach((box) => {
        box.onchange = updateEntityModelCount;
      });
      document.getElementById("entity-run-targets")?.addEventListener("input", updateEntityModelCount);
      document.getElementById("entity-select-recommended")?.addEventListener("click", () => {
        document.querySelectorAll(".entity-model-check").forEach((box) => {
          box.checked = recommendedEntityTargets.has((box.dataset.provider || "") + ":" + (box.dataset.model || ""));
        });
        updateEntityModelCount();
      });
      document.getElementById("entity-clear-models")?.addEventListener("click", () => {
        document.querySelectorAll(".entity-model-check").forEach((box) => { box.checked = false; });
        updateEntityModelCount();
      });
      updateEntityModelCount();
      document.querySelectorAll(".entity-page-link").forEach((button) => {
        button.onclick = () => openClientTool(button.dataset.entityPage || "entities", state.entityClient || state.activeClient || "all");
      });
      document.querySelectorAll(".entity-batch-select").forEach((button) => {
        button.onclick = () => {
          state.entityBatch = button.dataset.batchId || "all";
          state.entityCrossoverDetail = null;
          setPage("entity-crossover");
        };
      });
      const batchFilter = document.getElementById("entity-batch-filter");
      if (batchFilter) batchFilter.onchange = (event) => { state.entityBatch = event.target.value || "all"; state.entityCrossoverDetail = null; render(); };
      const entityClient = document.getElementById("entity-client-filter");
      if (entityClient) entityClient.onchange = (event) => { state.entityBatch = "all"; state.entityCrossoverDetail = null; applyActiveClient(event.target.value || "all"); };
      const entityRunClient = document.getElementById("entity-run-client");
      if (entityRunClient) entityRunClient.onchange = (event) => { state.entityBatch = "all"; state.commandPrefill = null; applyActiveClient(event.target.value || "all"); };
      document.getElementById("entity-run-start")?.addEventListener("click", (event) => {
        (async () => {
          const button = event.currentTarget;
          if (button.disabled) return;
          const originalLabel = button.textContent;
            const payload = {
              execution_mode: "cloud",
              project_id: Number(document.getElementById("entity-run-client")?.value || 0),
              seed_keyword: document.getElementById("entity-run-seed")?.value || "",
              depth: Number(document.getElementById("entity-run-depth")?.value || 3),
              targets: selectedEntityTargets(),
              run_async: Boolean(document.getElementById("entity-run-async")?.checked),
              dry_run: Boolean(document.getElementById("entity-run-dry")?.checked)
            };
          button.disabled = true;
          button.textContent = "Starting...";
          setToolFeedback("entity", {
            status: "running",
            title: "Entity Explorer",
            message: "Starting " + payload.targets.length + " model run(s) for " + payload.seed_keyword + ".",
            done: 0,
            total: payload.targets.length,
            rows: payload.targets.map((target) => ({ label: (target.provider || target.api_key_id || "model") + " / " + target.model, status: "queued" }))
          });
          try {
            const result = await postCommand("run_entity_lsi", payload);
            const command = result.command || {};
            const runs = command.result?.runs || [];
            const completeCount = runs.filter((run) => run.status === "complete").length;
            const failedCount = runs.filter((run) => run.status === "failed").length;
            state.commandPrefill = null;
            await load();
            setToolFeedback("entity", {
              status: failedCount ? "failed" : command.status || (result.duplicate ? "duplicate" : "queued"),
              title: result.duplicate ? "Entity Explorer Already Queued" : "Entity Explorer Started",
              message: commandResultSummary(command) || "Entity Explorer command is active.",
              done: runs.length ? completeCount + failedCount : 0,
              total: payload.targets.length,
              rows: runs.length ? runs.map((run) => ({ label: (run.provider || "") + " / " + (run.model || ""), status: run.status || "" })) : payload.targets.map((target) => ({ label: (target.provider || target.api_key_id || "model") + " / " + target.model, status: "queued" }))
            }, true);
            startToolAutoRefresh("entity", 120000);
          } catch (error) {
            button.disabled = false;
            button.textContent = originalLabel;
            setToolFeedback("entity", { status: "failed", title: "Entity Explorer Failed", message: error.message || String(error) });
          }
        })();
      });
      const setClient = document.getElementById("entity-set-client-filter");
      if (setClient) setClient.onchange = (event) => applyActiveClient(event.target.value || "all");
      document.querySelectorAll(".entity-run-prefill").forEach((button) => {
        button.onclick = () => {
          state.commandPrefill = { project_id: state.entityClient === "all" ? "" : state.entityClient, command: "entity" };
          setPage("commands");
        };
      });
      document.querySelectorAll(".entity-set-delete").forEach((button) => {
        button.onclick = () => deleteEntitySet(button.dataset.setId).catch((error) => alert(error.message || error));
      });
      document.getElementById("entity-auto-select")?.addEventListener("click", () => {
        const mode = document.getElementById("entity-auto-select-mode")?.value || "balanced";
        const thresholds = { conservative: 75, balanced: 55, comprehensive: 35 };
        const topRatios = { conservative: 0.2, balanced: 0.4, comprehensive: 0.65 };
        const boxes = Array.from(document.querySelectorAll(".entity-crossover-check"));
        const threshold = thresholds[mode] || thresholds.balanced;
        const topLimit = Math.max(1, Math.ceil(boxes.length * (topRatios[mode] || topRatios.balanced)));
        boxes.forEach((box, index) => {
          box.checked = index < topLimit || Number(box.dataset.relevance || 0) >= threshold;
        });
      });
      document.getElementById("entity-select-visible")?.addEventListener("click", () => {
        document.querySelectorAll(".entity-crossover-check").forEach((box) => { box.checked = true; });
      });
      document.getElementById("entity-clear-selected")?.addEventListener("click", () => {
        document.querySelectorAll(".entity-crossover-check").forEach((box) => { box.checked = false; });
      });
      document.getElementById("entity-save-set")?.addEventListener("click", (event) => {
        saveSelectedEntitySet(event.currentTarget).catch((error) => alert(error.message || error));
      });
      const crossoverRoot = document.getElementById("entity-crossover-workspace");
      const crossoverBatchId = crossoverRoot?.dataset.batchId || "";
      if (crossoverBatchId && (!state.entityCrossoverDetail || String(state.entityCrossoverDetail.id) !== String(crossoverBatchId))) {
        loadEntityCrossoverDetail(crossoverBatchId).catch((error) => console.warn("Entity crossover load failed", error));
      }
    }
    async function saveSelectedEntitySet(button) {
      const checked = Array.from(document.querySelectorAll(".entity-crossover-check:checked"));
      if (!checked.length) throw new Error("Select at least one crossover term.");
      const terms = checked.map((box) => JSON.parse(decodeURIComponent(box.dataset.term || "%7B%7D")));
      const payload = {
        project_id: Number(button.dataset.projectId || 0),
        source_batch_id: Number(button.dataset.batchId || 0),
        name: document.getElementById("entity-set-name")?.value || "Saved entity set",
        notes: document.getElementById("entity-set-notes")?.value || "",
        terms
      };
      const response = await fetch("/api/entity-sets", { method: "POST", headers: writeHeaders(), body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Entity set save failed");
      state.entitySetClient = String(payload.project_id || "all");
      await load();
      setPage("entity-sets");
    }
    async function saveSnapshotOptimizationTargets(button) {
      const checked = Array.from(document.querySelectorAll(".snapshot-target-check:checked"));
      if (!checked.length) throw new Error("Select at least one optimization target.");
      const targets = checked.map((box) => JSON.parse(decodeURIComponent(box.dataset.target || "%7B%7D")));
      const payload = {
        snapshot_id: Number(button.dataset.snapshotId || 0),
        project_id: Number(button.dataset.projectId || 0),
        status: document.getElementById("snapshot-target-status")?.value || "selected",
        targets
      };
      if (!payload.snapshot_id || !payload.project_id) throw new Error("Snapshot and client are required.");
      const originalLabel = button.textContent || "Save Selected Targets";
      button.disabled = true;
      button.textContent = "Saving...";
      try {
        const response = await fetch("/api/optimization-targets", { method: "POST", headers: writeHeaders(), body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Optimization target save failed");
        state.targetClient = String(payload.project_id);
        await load();
        await openDetail("snapshot", payload.snapshot_id);
      } catch (error) {
        button.disabled = false;
        button.textContent = originalLabel;
        throw error;
      }
    }
    async function deleteEntitySet(id) {
      if (!confirm("Delete this entity set?")) return;
      const response = await fetch("/api/entity-sets/" + encodeURIComponent(id), { method: "DELETE", headers: writeHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Entity set delete failed");
      await load();
    }
    async function loadEntityCrossoverDetail(batchId) {
      state.entityCrossoverDetail = { id: batchId, loading: true };
      render();
      try {
        const data = await apiGet("/api/entity-batches/" + encodeURIComponent(batchId) + "/detail");
        state.entityCrossoverDetail = { id: batchId, loading: false, data };
        if (state.page === "entity-crossover") render();
      } catch (error) {
        state.entityCrossoverDetail = { id: batchId, loading: false, error: error.message || String(error) };
        if (state.page === "entity-crossover") render();
      }
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
        "entity-batch": "/api/entity-batches/" + encodeURIComponent(id) + "/detail",
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
      const overview = snapshot.overview || {};
      const dist = overview.rankingDistribution || overview.ranking_distribution || {};
      const derivedTargets = buildSnapshotOptimizationTargets(data);
      const keywordRows = keywords.map((k) => '<tr><td><strong>' + esc(k.keyword || "") + '</strong><br><span class="muted">' + esc(k.intent || "") + '</span></td><td>' + esc(k.position || "") + '</td><td>' + esc(k.previous_position || "") + '</td><td><a href="' + esc(k.ranking_url || "") + '" target="_blank">' + esc(k.ranking_url || "") + '</a></td><td>' + esc(fmtNum(k.search_volume)) + '</td><td>' + esc(k.estimated_traffic || "") + '</td><td>' + (k.ai_overview_present ? 'AIO' : '') + (k.ai_overview_reference ? ' / Ref' : '') + '</td></tr>');
      const pageRows = pages.map((p) => '<tr><td><a href="' + esc(p.url || "") + '" target="_blank">' + esc(p.url || "") + '</a></td><td>' + esc(fmtNum(p.organic_keywords)) + '</td><td>' + esc(p.organic_traffic || "") + '</td><td>' + esc(p.organic_traffic_cost || "") + '</td><td>' + esc(p.top3 || "") + '</td><td>' + esc(p.top10 || "") + '</td><td>' + esc(p.top20 || "") + '</td><td>' + esc(p.paid_keywords || "") + '</td></tr>');
      const targetRows = targets.map((t) => '<tr><td><a href="' + esc(t.url || "") + '" target="_blank">' + esc(t.url || "") + '</a></td><td>' + esc(t.keyword || "") + '</td><td>' + esc(t.best_position || "") + '</td><td>' + esc(t.opportunity_score || "") + '</td><td><span class="pill">' + esc(t.status || "") + '</span></td><td>' + esc(t.recommended_action || "") + '</td></tr>');
      const opportunityRows = derivedTargets.slice(0, 150).map((target) => '<tr><td>' + esc(target.priorityType || "") + '</td><td>' + esc(target.keyword || "") + '</td><td>' + esc(target.bestPosition || "") + '</td><td><a href="' + esc(target.url || "") + '" target="_blank">' + esc(target.url || "") + '</a></td><td>' + esc(fmtNum(target.totalSearchVolume || 0)) + '</td><td>' + esc(fmtNum(target.estimatedTraffic || 0)) + '</td><td>' + esc(target.recommendedAction || "") + '</td></tr>');
      const saveRows = derivedTargets.slice(0, 100).map((target, index) => {
        const encoded = encodeURIComponent(JSON.stringify(target));
        const checked = target.id ? "" : " checked";
        return '<tr><td><input class="snapshot-target-check" type="checkbox" data-target-index="' + esc(index) + '" data-target="' + encoded + '"' + checked + '></td><td><a href="' + esc(target.url || "") + '" target="_blank">' + esc(target.url || "") + '</a><br><span class="muted">' + esc(target.recommendedAction || "") + '</span></td><td>' + esc(target.keyword || "") + '</td><td>' + esc(target.bestPosition || "") + '</td><td>' + esc(fmtNum(target.opportunityCount || 0)) + '</td><td>' + esc(fmtNum(target.totalSearchVolume || 0)) + '</td><td><span class="pill">' + esc(fmtNum(target.opportunityScore || 0)) + '</span><br><span class="muted">' + esc(target.priorityType || "") + '</span></td><td><span class="pill">' + esc(target.status || "new") + '</span></td></tr>';
      });
      const savePanel = '<section><div class="head"><h3>Save Optimization Targets</h3><span class="muted">Select ranking pages from this snapshot and save them to Saved Targets.</span></div><div class="toolbar"><button id="snapshot-target-select-visible" class="secondary">Select Visible</button><button id="snapshot-target-clear" class="secondary">Clear</button><select id="snapshot-target-status"><option value="selected">Selected</option><option value="in_cora">In Cora</option><option value="in_entity_explorer">In Entity Explorer</option><option value="content_plan_created">Plan Created</option><option value="optimized">Optimized</option><option value="archived">Archived</option></select><button id="snapshot-target-save" data-snapshot-id="' + esc(snapshot.id || "") + '" data-project-id="' + esc(snapshot.project_id || "") + '">Save Selected Targets</button></div>' + detailTable(["","URL","Keyword","Best Pos","Opps","Volume","Score","Status"], saveRows, "No ranking pages can be converted to optimization targets for this snapshot.") + '</section>';
      const overviewPanel = '<div class="ranking-overview-grid">'
        + [["Organic Keywords", overview.organicKeywords ?? overview.organic_keywords],["Estimated Organic Traffic", overview.organicTraffic ?? overview.organic_traffic],["Traffic Cost", overview.organicTrafficCost ?? overview.organic_traffic_cost],["Paid Keywords", overview.paidKeywords ?? overview.paid_keywords],["Top 1", dist.top1],["Top 3", dist.top3],["Top 10", dist.top10],["Top 20", dist.top20],["Top 100", dist.top100]].map(([label, value]) => '<div class="overview-card"><span>' + esc(fmtNum(value || 0)) + '</span><label>' + esc(label) + '</label></div>').join("")
        + '</div><div class="note-box">' + esc(overview.dataFreshnessNote || "DataForSEO Labs data is updated weekly; this is not live rank tracking.") + '</div>';
      const tabs = [
        ["overview", "Overview", overviewPanel],
        ["targets", "Optimization Targets", savePanel + '<section><div class="head"><h3>Saved Optimization Targets</h3></div>' + detailTable(["URL","Keyword","Best Pos","Score","Status","Action"], targetRows, "No optimization targets synced for this snapshot.") + '</section>'],
        ["keywords", "Ranking Keywords", '<section><div class="head"><h3>Ranking Keywords</h3><span class="muted">Keyword, position, URL, volume, traffic, and AI Overview fields.</span></div>' + detailTable(["Keyword","Pos","Prev","URL","Volume","Traffic","AI"], keywordRows, "No ranking keywords synced for this snapshot.") + '</section>'],
        ["pages", "Ranking Pages", '<section><div class="head"><h3>Ranking Pages</h3><span class="muted">Organic page traffic and keyword distribution.</span></div>' + detailTable(["URL","Keywords","Traffic","Cost","Top 3","Top 10","Top 20","Paid Keywords"], pageRows, "No ranking pages synced for this snapshot.") + '</section>'],
        ["opportunities", "Opportunities", '<section><div class="head"><h3>Opportunities</h3><span class="muted">Derived from ranking pages and keyword positions.</span></div>' + detailTable(["Type","Keyword","Best Pos","Ranking URL","Volume","Traffic","Recommended Action"], opportunityRows, "No opportunities derived for this snapshot.") + '</section>']
      ];
      const tabButtons = '<div class="ranking-tabs">' + tabs.map(([id, label], index) => '<button type="button" class="ranking-tab' + (index ? '' : ' active') + '" data-detail-tab="' + esc(id) + '">' + esc(label) + '</button>').join("") + '</div>';
      const tabPanels = tabs.map(([id, _label, html], index) => '<div class="ranking-tab-content detail-tab-panel' + (index ? ' hidden' : '') + '" data-detail-tab-panel="' + esc(id) + '">' + html + '</div>').join("");
      return smallCards([["Target", snapshot.target || ""],["Client", snapshot.project_name || ""],["Locale", (snapshot.location_code || "") + " / " + (snapshot.language_code || "")],["Keywords", keywords.length],["Pages", pages.length],["Targets", targets.length]])
        + '<section><div class="head"><h3>' + esc(snapshot.target || "Ranking Snapshot") + ' Ranking Snapshot</h3><span class="muted">' + esc(snapshot.source || "DataForSEO Labs") + ' / ' + esc(snapshot.freshness || "weekly") + ' / ' + esc(fmtDate(snapshot.created_at)) + '</span></div>' + tabButtons + tabPanels + '</section>';
    }
    function entitySetDetail(data) {
      const set = data.entity_set || {};
      const terms = data.terms || [];
      const termRows = terms.map((t) => '<tr><td><strong>' + esc(t.term || "") + '</strong><br><span class="muted">' + esc(t.normalized || "") + '</span></td><td>' + esc(t.type || "") + '</td><td>' + esc(fmtNum(t.source_count)) + '</td><td><span class="muted">' + esc(JSON.stringify(t.sources || [])) + '</span></td><td>' + esc(t.notes || "") + '</td></tr>');
      return smallCards([["Entity Set", set.name || ""],["Client", set.project_name || ""],["Terms", terms.length],["Created", fmtDate(set.created_at)],["Updated", fmtDate(set.updated_at)],["Source Batch", set.source_batch_id || ""]])
        + '<section><div class="head"><h3>Entity Terms</h3></div>' + detailTable(["Term","Type","Sources","Source Detail","Notes"], termRows, "No entity terms synced for this set.") + '</section>';
    }
    function entityCrossoverWorkspace(data) {
      if (data.error) return '<section><div class="head"><h3>Crossover Terms</h3><span class="pill warn">Error</span></div><div class="empty">' + esc(data.error) + '</div></section>';
      const batch = data.batch || {};
      const runs = data.runs || [];
      const crossover = data.crossover || [];
      const rowsHtml = crossover.slice(0, 500).map((row) => {
        const sourceIds = new Set((row.sources || []).map((source) => String(source.run_id)));
        const encoded = encodeURIComponent(JSON.stringify(row));
        const reasons = Array.isArray(row.relevance_reasons) && row.relevance_reasons.length ? '<br><span class="muted">' + esc(row.relevance_reasons.join(", ")) + '</span>' : "";
        return '<tr><td><input class="entity-crossover-check" type="checkbox" data-term="' + encoded + '" data-relevance="' + esc(row.relevance_score || 0) + '"></td><td><strong>' + esc(row.term || "") + '</strong><br><span class="muted">' + esc(row.normalized || "") + '</span></td><td>' + esc(row.type || "") + '</td><td>' + esc(fmtNum(row.source_count || 0)) + '</td><td>' + esc(fmtNum(row.relevance_score || 0)) + reasons + '</td>' + runs.map((run) => '<td>' + (sourceIds.has(String(run.id)) ? 'Yes' : '') + '</td>').join("") + '</tr>';
      });
      const saveBar = '<section><div class="head"><h3>Save Entity Set</h3><span class="muted">Auto-select or manually choose crossover rows, then save them for this client.</span></div><div class="status-list"><div class="toolbar"><select id="entity-auto-select-mode"><option value="balanced">Balanced</option><option value="conservative">Conservative</option><option value="comprehensive">Comprehensive</option></select><button id="entity-auto-select" class="secondary">Auto Select</button><button id="entity-select-visible" class="secondary">Select Visible</button><button id="entity-clear-selected" class="secondary">Clear</button></div><div class="field-row"><input id="entity-set-name" placeholder="Entity set name" value="' + esc((batch.seed_keyword || "Entity") + " approved terms") + '"><input id="entity-set-notes" placeholder="Notes"></div><div class="toolbar"><button id="entity-save-set" data-batch-id="' + esc(batch.id || "") + '" data-project-id="' + esc(batch.project_id || "") + '">Save Selected Terms</button><button class="entity-page-link secondary" data-entity-page="entity-sets">Entity Sets</button></div></div></section>';
      return saveBar
        + '<section><div class="head"><h3>Crossover Terms</h3><span class="muted">' + esc(crossover.length) + ' computed terms from ' + esc(runs.length) + ' model runs.</span></div><div class="scroll-table">' + table(["Save","Term","Type","Sources","Relevance"].concat(runs.map((run) => (run.provider || "") + " " + (run.model || ""))), rowsHtml, "No crossover terms available for this batch.") + '</div></section>';
    }
    function entityBatchDetail(data) {
      const batch = data.batch || {};
      const runs = data.runs || [];
      const crossover = data.crossover || [];
      const rowsHtml = crossover.slice(0, 500).map((row) => {
        const sourceIds = new Set((row.sources || []).map((source) => String(source.run_id)));
        const encoded = encodeURIComponent(JSON.stringify(row));
        return '<tr><td><input class="entity-crossover-check" type="checkbox" data-term="' + encoded + '"></td><td><strong>' + esc(row.term || "") + '</strong><br><span class="muted">' + esc(row.normalized || "") + '</span></td><td>' + esc(row.type || "") + '</td><td>' + esc(fmtNum(row.source_count || 0)) + '</td><td>' + esc(fmtNum(row.relevance_score || 0)) + '</td>' + runs.map((run) => '<td>' + (sourceIds.has(String(run.id)) ? 'Yes' : '') + '</td>').join("") + '</tr>';
      });
      const saveBar = '<section><div class="head"><h3>Save Entity Set</h3><span class="muted">Select crossover rows, then save them as an Entity Set.</span></div><div class="status-list"><div class="toolbar"><button id="entity-select-visible" class="secondary">Select Visible</button><button id="entity-clear-selected" class="secondary">Clear</button></div><div class="field-row"><input id="entity-set-name" placeholder="Entity set name" value="' + esc((batch.seed_keyword || "Entity") + " approved terms") + '"><input id="entity-set-notes" placeholder="Notes"></div><button id="entity-save-set" data-batch-id="' + esc(batch.id || "") + '" data-project-id="' + esc(batch.project_id || "") + '">Save Selected Terms</button></div></section>';
      return smallCards([["Seed", batch.seed_keyword || ""],["Client", batch.project_name || ""],["Depth", batch.depth || ""],["Progress", entityBatchProgress(batch)],["Model Runs", runs.length],["Crossover Terms", crossover.length]])
        + saveBar
        + '<section><div class="head"><h3>Crossover Terms</h3><span class="muted">Computed from synced model output.</span></div><div class="scroll-table">' + table(["Save","Term","Type","Sources","Score"].concat(runs.map((run) => (run.provider || "") + " " + (run.model || ""))), rowsHtml, "No crossover terms available for this batch.") + '</div></section>';
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
    function hcuUrlKey(value) {
      const raw = String(value || "").trim();
      if (!raw) return "";
      try {
        const lower = raw.toLowerCase();
        const url = new URL(lower.startsWith("http://") || lower.startsWith("https://") ? raw : "https://" + raw);
        url.hash = "";
        url.search = "";
        let path = url.pathname || "/";
        while (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
        let host = url.hostname.toLowerCase();
        if (host.startsWith("www.")) host = host.slice(4);
        return host + path.toLowerCase();
      } catch (_error) {
        let cleaned = raw.toLowerCase();
        if (cleaned.startsWith("https://")) cleaned = cleaned.slice(8);
        else if (cleaned.startsWith("http://")) cleaned = cleaned.slice(7);
        if (cleaned.startsWith("www.")) cleaned = cleaned.slice(4);
        cleaned = cleaned.split("?")[0].split("#")[0];
        while (cleaned.length > 1 && cleaned.endsWith("/")) cleaned = cleaned.slice(0, -1);
        return cleaned;
      }
    }
    function hcuNumber(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    }
    function hcuSnapshotTime(row) {
      const parsed = Date.parse(row?.created_at || row?.snapshot_created_at || "");
      return Number.isFinite(parsed) ? parsed : 0;
    }
    function hcuSelectSnapshotPair(snapshots) {
      const impactTime = Date.parse("2025-06-01T00:00:00Z");
      const dated = (snapshots || []).filter((snapshot) => hcuSnapshotTime(snapshot)).sort((a, b) => hcuSnapshotTime(a) - hcuSnapshotTime(b));
      if (dated.length < 2) return { before: null, after: null, mode: "insufficient", note: "Need at least two ranking snapshots to compare organic traffic movement." };
      const before = dated.filter((snapshot) => hcuSnapshotTime(snapshot) <= impactTime).pop();
      const after = dated.find((snapshot) => hcuSnapshotTime(snapshot) > impactTime);
      if (before && after) return { before, after, mode: "pre_post", note: "Using the nearest ranking snapshots before and after June 1, 2025." };
      return { before: dated[dated.length - 2], after: dated[dated.length - 1], mode: "latest_pair", note: "No true pre/post June 1, 2025 ranking snapshot pair is synced; using the latest available pair." };
    }
    function hcuPageType(row, llmRows) {
      const combined = [row.title, row.category, row.url].concat((llmRows || []).map((item) => [item.page_type, item.llm_category].join(" "))).join(" ").toLowerCase();
      let path = "";
      try {
        const raw = String(row.url || "");
        const lower = raw.toLowerCase();
        path = new URL(lower.startsWith("http://") || lower.startsWith("https://") ? raw : "https://" + raw).pathname.toLowerCase();
      } catch (_error) {}
      if (!path || path === "/") return "homepage";
      if (["contact", "about", "team", "reviews", "testimonials", "portfolio"].some((term) => combined.includes(term))) return "trust";
      if (["service", "services", "repair", "installation", "design", "construction", "contractor", "marketing", "seo", "agency"].some((term) => combined.includes(term))) return "service";
      if (["blog", "article", "guide", "news", "tips", "how to", "resources", "learn"].some((term) => combined.includes(term)) || ["/blog/", "/news/", "/articles/", "/guides/", "/resources/"].some((part) => path.includes(part))) return "informational";
      return "other";
    }
    function hcuRisk(row, llmRows, delta) {
      const reasons = [];
      let score = 0;
      const wordCount = hcuNumber(row.word_count);
      const confidence = hcuNumber(row.confidence);
      const pageType = hcuPageType(row, llmRows);
      if (!row.category) { score += 1; reasons.push("No primary NLP category"); }
      if (wordCount && wordCount < 300) { score += 2; reasons.push("Very thin word count"); }
      else if (wordCount && wordCount < 650) { score += 1; reasons.push("Lower word count"); }
      if (confidence && confidence < 0.55) { score += 1; reasons.push("Low NLP confidence"); }
      if (["informational", "other"].includes(pageType)) { score += 1; reasons.push("Content type needs intent review"); }
      const distinctLlmCategories = [...new Set((llmRows || []).map((item) => String(item.llm_category || "").toLowerCase()).filter(Boolean))];
      if (distinctLlmCategories.length > 1) { score += 1; reasons.push("LLM categories disagree"); }
      if (delta && delta.traffic_delta <= -100) { score += 2; reasons.push("Large organic traffic decline in snapshots"); }
      else if (delta && delta.traffic_delta < 0) { score += 1; reasons.push("Organic traffic declined in snapshots"); }
      if (!reasons.length) reasons.push("No obvious HCU risk signal from synced data");
      const level = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
      return { level, score, pageType, reasons };
    }
    function buildHcuImpact(data) {
      const batches = (data.nlp_category_batches || []).slice().sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
      const batch = batches.find((item) => Number(item.complete_count || 0) > 0) || batches[0];
      if (!batch) return null;
      const urls = (data.nlp_category_urls || []).filter((row) => String(row.batch_id || "") === String(batch.id || "") && String(row.status || "").toLowerCase() === "complete");
      const pair = hcuSelectSnapshotPair(data.snapshots || []);
      const pageRows = data.ranking_snapshot_pages || [];
      const beforePages = new Map(pageRows.filter((row) => pair.before && String(row.snapshot_id || "") === String(pair.before.id || "")).map((row) => [hcuUrlKey(row.url), row]));
      const afterPages = new Map(pageRows.filter((row) => pair.after && String(row.snapshot_id || "") === String(pair.after.id || "")).map((row) => [hcuUrlKey(row.url), row]));
      const comparisonRows = data.nlp_llm_comparison_results || [];
      const byBatchUrl = new Map();
      const byUrl = new Map();
      comparisonRows.forEach((row) => {
        if (row.batch_url_id) {
          const key = String(row.batch_url_id);
          byBatchUrl.set(key, (byBatchUrl.get(key) || []).concat(row));
        }
        const urlKey = hcuUrlKey(row.url);
        if (urlKey) byUrl.set(urlKey, (byUrl.get(urlKey) || []).concat(row));
      });
      let trafficDelta = 0;
      let matched = 0;
      const rows = urls.map((row) => {
        const key = hcuUrlKey(row.url);
        const before = beforePages.get(key);
        const after = afterPages.get(key);
        const delta = before || after ? {
          traffic_delta: hcuNumber(after?.organic_traffic) - hcuNumber(before?.organic_traffic),
          keywords_delta: hcuNumber(after?.organic_keywords) - hcuNumber(before?.organic_keywords),
          before_traffic: hcuNumber(before?.organic_traffic),
          after_traffic: hcuNumber(after?.organic_traffic)
        } : null;
        if (delta) {
          matched += 1;
          trafficDelta += delta.traffic_delta;
        }
        const llmRows = byBatchUrl.get(String(row.id || "")) || byUrl.get(key) || [];
        const risk = hcuRisk(row, llmRows, delta);
        return { row, llmRows, delta, risk };
      }).sort((a, b) => b.risk.score - a.risk.score || hcuNumber(a.delta?.traffic_delta) - hcuNumber(b.delta?.traffic_delta));
      const summary = rows.reduce((acc, item) => {
        acc[item.risk.level] += 1;
        return acc;
      }, { high: 0, medium: 0, low: 0 });
      return { batch, rows, pair, matched, trafficDelta, summary };
    }
    function renderHcuImpact(data) {
      const impact = buildHcuImpact(data);
      if (!impact) return '<section><div class="head"><h3>HCU Impact</h3><span class="muted">June 2025 review</span></div><div class="empty">No completed NLP batch is synced for this client yet.</div></section>';
      const pairText = impact.pair.before && impact.pair.after ? fmtDate(impact.pair.before.created_at) + " to " + fmtDate(impact.pair.after.created_at) : "No snapshot pair";
      const noteRows = '<div class="status-list"><div class="status-row"><span>Impact date</span><strong>June 1, 2025</strong></div><div class="status-row"><span>Snapshot comparison</span><strong>' + esc(pairText) + '</strong></div><div class="status-row"><span>' + esc(impact.pair.note || "") + '</span></div></div>';
      const cardsHtml = smallCards([["Analyzed URLs", impact.rows.length],["High Risk", impact.summary.high],["Medium Risk", impact.summary.medium],["Traffic Matched", impact.matched],["Organic Traffic Delta", fmtNum(Math.round(impact.trafficDelta))],["NLP Batch", impact.batch.id || ""]]);
      const pageCards = impact.rows.slice(0, 30).map((item) => {
        const cls = item.risk.level === "high" ? "warn" : item.risk.level === "low" ? "ok" : "";
        const delta = item.delta ? '<span class="muted">Traffic ' + esc(fmtNum(item.delta.before_traffic)) + ' -> ' + esc(fmtNum(item.delta.after_traffic)) + ' (' + esc(item.delta.traffic_delta >= 0 ? "+" : "") + esc(fmtNum(Math.round(item.delta.traffic_delta))) + ')</span>' : '<span class="muted">No matching ranking page row</span>';
        const taxonomies = [...new Set((item.llmRows || []).map((row) => row.taxonomy || "").filter(Boolean))].join(", ");
        return '<div class="status-row"><span><strong><a href="' + esc(item.row.url || "") + '" target="_blank">' + esc(item.row.title || item.row.url || "") + '</a></strong><br><small class="muted">' + esc(item.row.category || "No NLP category") + ' / ' + esc(item.risk.pageType) + (taxonomies ? ' / taxonomy: ' + esc(taxonomies) : '') + '</small><br>' + delta + '<br><small class="muted">' + esc(item.risk.reasons.join("; ")) + '</small></span><strong class="' + cls + '">' + esc(item.risk.level.toUpperCase()) + '</strong></div>';
      }).join("");
      return '<section><div class="head"><h3>HCU Impact</h3><span class="muted">NLP + LLM + ranking snapshot review</span></div>' + cardsHtml + noteRows + '<div class="head"><h3>URL Risk Review</h3><span class="muted">Showing up to 30 synced URLs from the latest completed NLP batch.</span></div><div class="status-list">' + (pageCards || '<div class="empty">No completed URLs in this NLP batch.</div>') + '</div></section>';
    }
    function clientDetail(data) {
      const client = data.client || {};
      const projectId = String(client.id || "");
      const target = client.site_domain || client.client || "";
      const targetLower = String(target || "").toLowerCase();
      const targetHref = target ? (targetLower.startsWith("http://") || targetLower.startsWith("https://") ? target : "https://" + target) : "";
      const coraTarget = targetHref || target;
      const firstKeyword = (data.keywords || [])[0]?.keyword || (data.runs || [])[0]?.keyword || "";
      const latestEntityBatch = (data.entity_batches || []).slice().sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))[0]?.id || "";
      const bridge = (state.data?.bridges || [])[0] || {};
      const bridgeReady = Boolean(bridge.online && bridge.allow_cora);
      const recentJobs = (data.jobs || []).slice(0, 4);
      const recentJobRows = recentJobs.map((job) => '<div class="status-row"><span><strong>' + esc(job.keyword || "Cora job") + '</strong><br><small class="muted">' + esc(job.target_domain || job.target_url || "") + '</small></span><strong class="' + (job.status === "complete" ? "ok" : job.status === "failed" ? "warn" : "") + '">' + esc(job.status || "") + '</strong></div>').join("");
      const recentCommands = (data.commands || []).filter((command) => command.command_type === "run_cora").slice(0, 4);
      const recentCommandRows = recentCommands.map((command) => '<div class="status-row"><span><strong>' + esc(command.payload?.keyword || "Cora launch") + '</strong><br><small class="muted">' + esc(command.payload?.target_url || "") + '</small></span><strong class="' + commandStatusClass(command.status) + '">' + esc(commandStatusLabel(command.status)) + '</strong></div>').join("");
      const keywordRows = (data.keywords || []).map((k) => '<tr><td><strong>' + esc(k.keyword || "") + '</strong></td><td>' + esc(k.intent || "") + '</td><td>' + esc(k.priority || "") + '</td><td>' + esc(fmtDate(k.created_at)) + '</td></tr>');
      const runRows = (data.runs || []).map((r) => '<tr><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.file_name || "") + '</span></td><td>' + esc(r.target_domain || r.target_url || "") + '</td><td>' + esc(fmtDate(r.imported_at)) + '</td><td><button class="detail-btn" data-detail-type="run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>');
      const reportRows = (data.reports || []).map((r) => '<tr><td><strong>' + esc(r.title || r.keyword || "Report") + '</strong><br><span class="muted">' + esc(r.keyword || "") + '</span></td><td><span class="pill">' + esc(r.level || "") + '</span></td><td>' + esc(fmtDate(r.created_at)) + '</td><td>' + esc(fmtNum(r.artifact_count || 0)) + ' files</td><td><a class="action-link" href="' + reportUrl(r.token) + '" target="_blank">Open</a></td></tr>');
      const snapshotRows = (data.snapshots || []).map((s) => '<tr><td><strong>' + esc(s.target || "") + '</strong></td><td>' + esc(s.location_code || "") + ' / ' + esc(s.language_code || "") + '</td><td>' + esc(fmtDate(s.created_at)) + '</td><td><button class="detail-btn" data-detail-type="snapshot" data-detail-id="' + esc(s.id) + '">Open</button></td></tr>');
      const targetRows = (data.targets || []).map((t) => '<tr><td><a href="' + esc(t.url || "") + '" target="_blank">' + esc(t.url || "") + '</a></td><td>' + esc(t.keyword || "") + '</td><td>' + esc(t.best_position || "") + '</td><td>' + esc(t.opportunity_score || "") + '</td><td><span class="pill">' + esc(t.status || "") + '</span></td></tr>');
      const jobRows = (data.jobs || []).map((j) => '<tr><td><strong>' + esc(j.keyword || "") + '</strong><br><span class="muted">' + esc(j.target_domain || "") + '</span></td><td>' + esc(j.tool || "cora") + '<br><span class="muted">' + esc(j.cora_profile || "") + '</span></td><td><span class="pill">' + esc(j.status || "") + '</span></td><td>' + esc(fmtDate(j.updated_at || j.last_activity_at || j.started_at)) + '</td></tr>');
      const planRows = (data.content_plans || []).map((p) => '<tr><td><strong>' + esc(p.title || "") + '</strong><br><span class="muted">' + esc(p.notes || "") + '</span></td><td>' + esc(p.keyword || "") + '</td><td>' + esc(p.content_type || "") + '</td><td><span class="pill">' + esc(p.status || "") + '</span></td><td>' + esc(p.due_date || "") + '</td></tr>');
      const nlpRows = (data.nlp_category_batches || []).map((b) => {
        const comparisonRuns = (data.nlp_llm_comparison_runs || []).filter((run) => String(run.batch_id || "") === String(b.id || ""));
        const comparisonComplete = comparisonRuns.reduce((sum, run) => sum + Number(run.complete_count || 0), 0);
        return '<tr><td><strong>' + esc(b.source_type || "") + '</strong><br><span class="muted">' + esc(String(b.source_value || "").slice(0, 90)) + '</span></td><td>' + esc(b.provider || "") + '</td><td>' + esc(fmtNum(b.complete_count || 0)) + ' / ' + esc(fmtNum(b.target_count || 0)) + '</td><td>' + esc(fmtNum(comparisonRuns.length)) + ' LLM runs<br><span class="muted">' + esc(fmtNum(comparisonComplete)) + ' provider rows</span></td><td><span class="pill">' + esc(b.status || "") + '</span></td><td>' + esc(fmtDate(b.updated_at || b.created_at)) + '</td></tr>';
      });
      const hcuImpactPanel = renderHcuImpact(data);
      const entityRows = (data.entity_batches || []).map((b) => '<tr><td><strong>' + esc(b.seed_keyword || "") + '</strong></td><td>' + esc(b.depth || "") + '</td><td>' + esc(fmtNum(b.completed_count)) + ' / ' + esc(fmtNum(b.target_count)) + '</td><td><span class="pill">' + esc(b.status || "") + '</span></td><td>' + esc(fmtDate(b.updated_at || b.created_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-batch" data-detail-id="' + esc(b.id) + '">Open</button></td></tr>');
      const entityRunRows = (data.entity_runs || []).map((r) => '<tr><td><strong>' + esc(r.seed_keyword || "") + '</strong></td><td>' + esc(r.provider || "") + '</td><td>' + esc(r.model || "") + '</td><td><span class="pill">' + esc(r.status || "") + '</span></td><td><button class="detail-btn" data-detail-type="entity-run" data-detail-id="' + esc(r.id) + '">Open</button></td></tr>');
      const setRows = (data.entity_sets || []).map((s) => '<tr><td><strong>' + esc(s.name || "") + '</strong><br><span class="muted">' + esc(s.notes || "") + '</span></td><td>' + esc(fmtNum(s.term_count)) + '</td><td>' + esc(fmtDate(s.updated_at)) + '</td><td><button class="detail-btn" data-detail-type="entity-set" data-detail-id="' + esc(s.id) + '">Open</button></td></tr>');
      const nextActions = [];
      if (!target) nextActions.push("Add the client main URL locally, then push clients/sites to cloud.");
      if (!(data.keywords || []).length) nextActions.push("Add at least one keyword before running Cora, Ranking Snapshot, or Entity Explorer.");
      if (!client.profile_name) nextActions.push("Attach a Cora profile before queueing Cora work.");
      if (!bridge.online) nextActions.push("Local bridge is offline, so cloud can prepare work but cannot launch local Cora yet.");
      if (bridge.online && !bridge.allow_cora) nextActions.push("Local bridge is online, but Cora execution is disabled.");
      if ((data.targets || []).length) nextActions.push("Review Optimization Targets for pages that need on-page work.");
      if ((data.content_plans || []).length) nextActions.push("Open Content Plans to move planned work through drafting, review, and publish.");
      if (!nextActions.length) nextActions.push("Client workspace is ready. Pick a tool below to continue.");
      const workspace = '<div class="workspace-grid">'
        + '<section><div class="head"><h3>Client Variables</h3><span class="muted">Shared by Cora, Ranking Snapshot, Entity Explorer, reports, and plans.</span></div><div class="client-vars">'
        + '<div class="client-var"><span class="muted">Client</span><strong>' + esc(client.name || "") + '</strong></div>'
        + '<div class="client-var"><span class="muted">Main URL</span><strong>' + (target ? '<a href="' + esc(targetHref) + '" target="_blank">' + esc(target) + '</a>' : 'Not set') + '</strong></div>'
        + '<div class="client-var"><span class="muted">Active Keyword</span><strong>' + esc(firstKeyword || "No keyword synced") + '</strong></div>'
        + '<div class="client-var"><span class="muted">Cora Profile</span><strong>' + esc(client.profile_name || "No profile attached") + '</strong></div>'
        + '</div></section>'
        + '<section><div class="head"><h3>Readiness</h3><span class="pill ' + (bridgeReady ? 'ok' : 'warn') + '">' + esc(bridgeReady ? 'Cora ready' : 'Needs attention') + '</span></div><div class="status-list"><div class="status-row"><span>Local bridge<br><small class="muted">' + esc(bridge.bridge_id || 'No bridge heartbeat') + '</small></span><strong class="' + (bridge.online ? 'ok' : 'warn') + '">' + esc(bridge.online ? 'Online' : 'Offline') + '</strong></div><div class="status-row"><span>Cora execution</span><strong class="' + (bridge.allow_cora ? 'ok' : 'warn') + '">' + esc(bridge.allow_cora ? 'Enabled' : 'Off') + '</strong></div>' + nextActions.map((action) => '<div class="status-row"><span>' + esc(action) + '</span></div>').join("") + '</div></section>'
        + '</div>';
      const coraButtonLabel = bridgeReady ? "Run Cora" : "Queue Cora";
      const toolCards = [
        ["Cora", "Run Cora for this client's URL and keywords. Execution happens on the remote bridge machine.", "cora", coraButtonLabel, "page"],
        ["Ranking Snapshot", "Run or review DataForSEO ranking snapshots for this client.", "ranking", "Open Ranking Snapshot", "page"],
        ["Entity Explorer", "Run entity and LSI research from this client's keywords.", "entities", "Open Entity Explorer", "page"],
        ["Content Classification", "Run NLP Categorizer in Cloudflare and review synced cloud/local category batches.", "commands", "Run Cloud NLP", "page"],
        ["Cora Reports", "Open stored customer reports and source XLSX artifacts.", "reports", "Open Reports", "page"],
        ["Content Plans", "Track briefs, refreshes, and optimization tasks.", "plans", "Open Plans", "page"]
      ].map((tool) => '<div class="tool-card"><strong>' + esc(tool[0]) + '</strong><span class="muted">' + esc(tool[1]) + '</span><button class="' + (tool[4] === "page" ? "client-open-page" : "client-command") + '" data-client-command="' + esc(tool[4]) + '" data-page-target="' + esc(tool[2]) + '" data-project-id="' + esc(projectId) + '" data-keyword="' + esc(firstKeyword) + '" data-target="' + esc(coraTarget) + '" data-profile="' + esc(client.profile_name || "") + '" data-latest-batch="' + esc(latestEntityBatch) + '">' + esc(tool[3]) + '</button></div>').join("");
      const secondaryLinks = '<div class="toolbar" style="padding:0 12px 12px;"><button class="client-open-page secondary" data-page-target="runs" data-project-id="' + esc(projectId) + '">Cora Runs</button><button class="client-open-page secondary" data-page-target="jobs" data-project-id="' + esc(projectId) + '">Cora Jobs</button><button class="client-open-page secondary" data-page-target="cora-profiles" data-project-id="' + esc(projectId) + '">Cora Profiles</button><button class="client-open-page secondary" data-page-target="targets" data-project-id="' + esc(projectId) + '">Saved Targets</button><button class="client-open-page secondary" data-page-target="entity-sets" data-project-id="' + esc(projectId) + '">Entity Sets</button><button class="client-open-page secondary" data-page-target="sync" data-project-id="' + esc(projectId) + '">Sync Status</button></div>';
      const toolLauncher = '<section><div class="head"><h3>Client Tools</h3><span class="muted">Primary workflows for this client. Technical controls are under System.</span></div><div class="tool-grid">' + toolCards + '</div>' + secondaryLinks + '</section>';
      const coraLaunchPanel = '<section><div class="head"><h3>Cora Launch Status</h3><span class="pill ' + (bridgeReady ? 'ok' : 'warn') + '">' + esc(bridgeReady ? 'Remote bridge ready' : 'Queue for bridge') + '</span></div><div class="status-list"><div class="status-row"><span>Next run</span><strong>' + esc(firstKeyword || "No keyword") + '</strong></div><div class="status-row"><span>Target URL</span><strong>' + esc(target || "No URL") + '</strong></div><div class="status-row"><span>Profile</span><strong>' + esc(client.profile_name || "No profile") + '</strong></div><div class="muted">Open Cora to run selected keywords. The report runs on the connected Windows machine through the remote bridge.</div></div><div class="head"><h3>Recent Launches</h3><button class="client-open-page secondary" data-page-target="cora" data-project-id="' + esc(projectId) + '">Open Cora</button></div><div class="status-list">' + (recentCommandRows || '<div class="muted">No cloud Cora launch commands for this client yet.</div>') + '</div><div class="head"><h3>Recent Cora Jobs</h3><button class="client-open-page secondary" data-page-target="jobs" data-project-id="' + esc(projectId) + '">Open Jobs</button></div><div class="status-list">' + (recentJobRows || '<div class="muted">No Cora jobs synced for this client yet.</div>') + '</div></section>';
      return workspace
        + smallCards([["Keywords", (data.keywords || []).length],["Cora Runs", (data.runs || []).length],["Reports", (data.reports || []).length],["Snapshots", (data.snapshots || []).length],["Targets", (data.targets || []).length],["Jobs", (data.jobs || []).length],["Plans", (data.content_plans || []).length],["NLP Batches", (data.nlp_category_batches || []).length],["Entity Batches", (data.entity_batches || []).length],["Entity Sets", (data.entity_sets || []).length]])
        + toolLauncher
        + coraLaunchPanel
        + '<section><div class="head"><h3>Keywords</h3></div>' + detailTable(["Keyword","Intent","Priority","Created"], keywordRows, "No keywords synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Cora Runs</h3></div>' + detailTable(["Keyword","Target","Imported",""], runRows, "No Cora runs synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Reports</h3></div>' + detailTable(["Report","Level","Created","Files",""], reportRows, "No reports synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Ranking Snapshots</h3></div>' + detailTable(["Target","Locale","Created",""], snapshotRows, "No ranking snapshots synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Optimization Targets</h3></div>' + detailTable(["URL","Keyword","Best Pos","Score","Status"], targetRows, "No optimization targets synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Jobs</h3></div>' + detailTable(["Keyword","Tool/Profile","Status","Updated"], jobRows, "No jobs synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Content Plans</h3></div>' + detailTable(["Title","Keyword","Type","Status","Due"], planRows, "No content plans synced for this client.") + '</section>'
        + '<section><div class="head"><h3>NLP Category Activity</h3><span class="muted">Synced from the local dashboard NLP Categorizer.</span></div>' + detailTable(["Source","Provider","Progress","LLM Comparison","Status","Updated"], nlpRows, "No NLP categorizer batches synced for this client.") + '</section>'
        + hcuImpactPanel
        + '<section><div class="head"><h3>Entity Activity</h3></div>' + detailTable(["Seed","Depth","Progress","Status","Updated",""], entityRows, "No entity batches synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Entity Model Runs</h3></div>' + detailTable(["Seed","Provider","Model","Status",""], entityRunRows, "No entity model runs synced for this client.") + '</section>'
        + '<section><div class="head"><h3>Entity Sets</h3></div>' + detailTable(["Set","Terms","Updated",""], setRows, "No entity sets synced for this client.") + '</section>';
    }
    function detailPanel() {
      const detail = state.detail;
      if (!detail) return "";
      if (detail.loading) return '<section class="detail-panel"><div class="head"><h3>Loading Details</h3><button class="close-detail">Close</button></div><div class="empty">Loading detail data...</div></section>';
      const renderers = { client: clientDetail, run: runDetail, sheet: sheetDetail, snapshot: snapshotDetail, "entity-batch": entityBatchDetail, "entity-run": entityRunDetail, "entity-set": entitySetDetail };
      const title = detail.type === "client" ? "Client Workspace" : detail.type === "run" ? "Cora Run Detail" : detail.type === "sheet" ? "Worksheet Rows" : detail.type === "snapshot" ? "Ranking Snapshot Detail" : detail.type === "entity-batch" ? "Entity Batch Detail" : detail.type === "entity-run" ? "Entity Explorer Run Detail" : "Entity Set Detail";
      return '<section class="detail-panel"><div class="head"><h3>' + esc(title) + '</h3><button class="close-detail">Close</button></div>' + (renderers[detail.type] ? renderers[detail.type](detail.data || {}) : '<div class="empty">Unsupported detail type.</div>') + '</section>';
    }
    function commandSummary(command_type, payload) {
      if (command_type === "create_project") return 'Create or reuse client "' + (payload.name || "") + '" for ' + (payload.site_domain || "no domain");
      if (command_type === "create_profile") return 'Create or reuse Cora profile "' + (payload.name || "") + '".';
      if (command_type === "update_profile") return 'Update Cora profile "' + (payload.name || payload.profile_id || "") + '".';
      if (command_type === "attach_profile") return 'Attach Cora profile "' + (payload.profile_name || payload.profile_id || "") + '" to client ID ' + (payload.project_id || "");
      if (command_type === "detach_profile") return 'Detach Cora profile from client ID ' + (payload.project_id || "");
      if (command_type === "archive_profile") return 'Archive Cora profile ID ' + (payload.profile_id || "") + ' and detach it from clients.';
      if (command_type === "apply_cora_profile") return 'Ask the local bridge to apply Cora profile "' + (payload.profile_name || payload.profile_id || "") + '" in Cora.';
      if (command_type === "push_cora_profile") return 'Ask the local bridge to save current Cora settings into profile "' + (payload.profile_name || payload.profile_id || "") + '".';
      if (command_type === "create_cora_domain_entry") return 'Add ' + (payload.list_type || "domain") + ' entry "' + (payload.value || "") + '".';
      if (command_type === "update_cora_domain_entry") return 'Update Cora domain list entry ID ' + (payload.entry_id || "") + ' to "' + (payload.value || "") + '".';
      if (command_type === "archive_cora_domain_entry") return 'Archive Cora domain list entry ID ' + (payload.entry_id || "") + '.';
      if (command_type === "apply_cora_domain_lists") return 'Ask the local bridge to apply cloud Cora Domain Lists into native Cora.';
      if (command_type === "pull_cora_domain_lists") return 'Ask the local bridge to pull native Cora Domain Lists into synced dashboard data.';
      if (command_type === "add_keyword") return 'Add or reuse keyword "' + (payload.keyword || "") + '" on client ID ' + (payload.project_id || "");
      if (command_type === "create_content_plan") return 'Create or reuse content plan "' + (payload.title || "") + '" on client ID ' + (payload.project_id || "");
      if (command_type === "create_share_report") return 'Create or reuse ' + (payload.level || "medium") + ' report for run ID ' + (payload.run_id || "");
      if (command_type === "revoke_share_report") return 'Archive customer report ID ' + (payload.report_id || "") + '.';
      if (command_type === "run_cora") return 'Queue Cora locally for "' + (payload.keyword || "") + '" against ' + (payload.target_url || "") + '. Local bridge must allow Cora execution.';
      if (command_type === "create_ranking_snapshot") return (payload.dry_run ? "Dry-run " : "") + 'Run Ranking Snapshot for ' + (payload.target || "") + '. Real runs require paid/API tools enabled on the local bridge.';
      if (command_type === "run_entity_lsi") return (payload.dry_run ? "Dry-run " : "") + 'Run Entity Explorer for "' + (payload.seed_keyword || "") + '" across ' + ((payload.targets || []).length || 0) + ' model(s)' + (payload.execution_mode === "cloud" ? ' in Cloudflare.' : '. Real local runs require paid/API tools enabled on the local bridge.');
      if (command_type === "run_nlp_categorizer") return (payload.dry_run ? "Dry-run " : "") + 'Run NLP Categorizer for client ID ' + (payload.project_id || "") + ' from ' + (payload.source_type || "urls") + ' source' + (payload.execution_mode === "cloud" ? ' in Cloudflare.' : '.');
      if (command_type === "run_nlp_llm_comparison") return (payload.dry_run ? "Dry-run " : "") + 'Run NLP LLM Comparison for batch #' + (payload.batch_id || "") + ' across ' + ((payload.targets || []).length || 0) + ' model(s) in Cloudflare.';
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
      if (command_type === "create_profile" && !(payload.name || "").trim()) return "Profile name is required.";
      if (command_type === "update_profile" && (!payload.profile_id || !(payload.name || "").trim())) return "Select a profile and enter a profile name.";
      if (command_type === "attach_profile" && (!payload.project_id || (!payload.profile_id && !(payload.profile_name || "").trim()))) return "Select a client and choose or create a profile.";
      if (command_type === "detach_profile" && !payload.project_id) return "Select an attached client to detach.";
      if (command_type === "archive_profile" && !payload.profile_id) return "Select a profile to archive.";
      if (["apply_cora_profile", "push_cora_profile"].includes(command_type) && (!payload.profile_id || !(payload.profile_name || "").trim())) return "Select a Cora profile first.";
      if (command_type === "create_cora_domain_entry" && (!(payload.list_type || "").trim() || !(payload.value || "").trim())) return "Select a list type and enter a domain/list value.";
      if (command_type === "update_cora_domain_entry" && (!payload.entry_id || !(payload.list_type || "").trim() || !(payload.value || "").trim())) return "Select a domain entry, list type, and value.";
      if (command_type === "archive_cora_domain_entry" && !payload.entry_id) return "Select a domain entry to archive.";
      if (command_type === "add_keyword" && (!(payload.project_id) || !(payload.keyword || "").trim())) return "Select a client and enter a keyword.";
      if (command_type === "create_content_plan" && (!(payload.project_id) || !(payload.title || "").trim())) return "Select a client and enter a plan title.";
      if (command_type === "create_share_report" && !payload.run_id) return "Select a Cora run for the report.";
      if (command_type === "revoke_share_report" && !payload.report_id) return "Select a customer report to archive.";
      if (command_type === "run_cora") {
        const missing = [];
        if (!payload.project_id) missing.push("client");
        if (!(payload.keyword || "").trim()) missing.push("keyword");
        if (!(payload.target_url || "").trim()) missing.push("target URL");
        if (missing.length) return "Cora needs: " + missing.join(", ") + ". Add the missing client data, then try Run Cora again.";
      }
      if (command_type === "create_ranking_snapshot" && (!(payload.project_id) || !(payload.target || "").trim())) return "Select a client and enter a target domain.";
      if (command_type === "run_entity_lsi") {
        if (!payload.project_id || !(payload.seed_keyword || "").trim()) return "Select a client and enter a seed keyword.";
        if (!Array.isArray(payload.targets) || !payload.targets.length) return "Add at least one Entity Explorer model target.";
        if (payload.execution_mode === "cloud" && payload.targets.some((target) => !target.provider || !target.model)) return "Cloud Entity Explorer targets must use provider:model, for example openai:gpt-5.5.";
        if (payload.execution_mode !== "cloud" && payload.targets.some((target) => !target.api_key_id || !target.model)) return "Local Entity Explorer targets must use apiKeyId:model.";
      }
      if (command_type === "run_nlp_categorizer") {
        if (!payload.project_id) return "Select a client for NLP Categorizer.";
        if (!["urls", "sitemap", "domain"].includes(payload.source_type || "")) return "Choose URL list, sitemap, or domain source.";
        if (!(payload.source_value || "").trim()) return "Enter URLs, a sitemap URL, or a domain.";
        if (Number(payload.max_urls || 0) < 1) return "Max URLs must be at least 1.";
      }
      if (command_type === "run_nlp_llm_comparison") {
        if (!payload.batch_id) return "Enter an NLP batch ID for comparison.";
        if (!Array.isArray(payload.targets) || !payload.targets.length) return "Add at least one LLM provider:model target.";
        if (payload.targets.some((target) => !target.provider || !target.model)) return "Cloud LLM comparison targets must use provider:model, for example openai:gpt-5.5.";
      }
      return "";
    }
    async function postCommand(command_type, payload) {
      if (!canWrite()) {
        throw new Error("Write access required. Enter the admin token under Unlock Writes, or log in with a write/admin email account, then queue again.");
      }
      const error = validateCommand(command_type, payload);
      if (error) throw new Error(error);
      const operator = localStorage.getItem("opos_operator_name") || "cloud-dashboard";
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ command_type, payload: { ...payload, reviewed_at: new Date().toISOString() }, created_by: operator })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) throw new Error("Unauthorized: write access is required. Enter the admin token under Unlock Writes, or log in with a write/admin email account.");
        throw new Error(data.error || "Command failed");
      }
      return data;
    }
    async function sendPendingCommand() {
      const pending = state.pendingWrite;
      if (!pending) return;
      const button = document.getElementById("confirm-command");
      const originalLabel = button?.textContent || "Queue Reviewed Command";
      if (button?.disabled) return;
      if (isPaidLiveCommand(pending.command_type, pending.payload) && !document.getElementById("confirm-paid-command")?.checked) {
        throw new Error("Confirm the paid/API run before queueing.");
      }
      if (button) {
        button.disabled = true;
        button.textContent = "Queueing...";
      }
      try {
        const data = await postCommand(pending.command_type, pending.payload);
        state.pendingWrite = null;
        await load();
        if (data.duplicate) alert("Matching command already exists; not queued again.");
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
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
      if (!data.is_admin) return '<section id="admin-locked"><div class="head"><h3>Users & Settings</h3><span class="pill warn">Admin required</span></div><div class="empty">Use an admin session or admin/sync token to manage users, client access, provider secrets, and cloud tool policies.</div></section>';
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
      const adminCards = cards([["Cloud Users", users.length],["Active Users", users.filter((user) => user.status === "active").length],["Scoped Users", users.filter((user) => (user.client_ids || []).length).length],["Cloud Tools Enabled", policies.filter((policy) => policy.cloud_enabled).length]]);
      const userForm = '<section id="admin-user-form"><div class="head"><h3>Create / Update User</h3><span class="muted">Email code login, role, and optional client scope.</span></div><div class="note-box">Users sign in from the Access panel by requesting a six-digit email code. If email delivery is not configured, admin-token callers can still generate a setup code for testing.</div><div class="status-list"><div class="field-row"><input id="admin-user-email" type="email" placeholder="user@example.com"><input id="admin-user-name" placeholder="Name"><select id="admin-user-role"><option value="read">Read - view only</option><option value="write">Write - queue client tools</option><option value="admin">Admin - full access</option></select><select id="admin-user-status"><option value="active">Active</option><option value="disabled">Disabled</option></select></div><div><div class="muted">Client access. Leave all unchecked for all clients.</div><div class="toolbar" style="margin:8px 0"><button id="admin-select-all-clients" type="button" class="secondary">Select All</button><button id="admin-clear-clients" type="button" class="secondary">Clear Clients</button></div><div class="check-list">' + (clientChecks || '<div class="muted">No clients synced yet.</div>') + '</div></div><div class="toolbar"><button id="admin-save-user">Save User</button><button id="admin-clear-user" type="button" class="secondary">Clear Form</button></div></div></section>';
      const policyForm = '<section id="admin-tool-guardrails"><div class="head"><h3>Tool Guardrails</h3><span class="muted">Controls paid cloud tool execution and usage limits.</span></div><div class="status-list"><div class="field-row"><select id="policy-tool"><option value="create_ranking_snapshot">Ranking Snapshot</option><option value="run_entity_lsi">Entity Explorer</option><option value="run_nlp_categorizer">NLP Categorizer</option><option value="run_nlp_llm_comparison">NLP LLM Comparison</option></select><select id="policy-cloud"><option value="true">Cloud enabled</option><option value="false">Cloud disabled</option></select><input id="policy-daily" placeholder="Daily limit"><input id="policy-monthly" placeholder="Monthly limit"><input id="policy-client-daily" placeholder="Per-client daily"></div><div class="toolbar"><button id="admin-save-policy">Save Policy</button></div></div>' + table(["Tool","Cloud","Daily","Monthly","Client Daily","Usage"], policyRows, "No tool policies yet.") + '</section>';
      return adminCards + '<div class="grid2"><section id="admin-current-access"><div class="head"><h3>Current Access</h3><span class="pill ok">' + esc(data.user?.role || "") + '</span></div><div class="status-list"><div class="status-row"><span>User</span><strong>' + esc(data.user?.email || "") + '</strong></div><div class="head"><h3>Provider Secrets</h3><span class="muted">Configured secrets are shown without exposing values.</span></div>' + (secretRows || '<div class="muted">No secret status available.</div>') + '</div></section>' + userForm + '</div>' + policyForm + '<section id="admin-users-table"><div class="head"><h3>Users</h3><span class="muted">Click Edit to load a user into the form.</span></div>' + table(["Email","Role","Status","Client Scope","Last Login",""], userRows, "No cloud users yet.") + '</section>';
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
      const prefill = state.commandPrefill || {};
      const prefillProject = prefill.project_id || prefill.projectId || "";
      const prefillKeyword = prefill.keyword || prefill.seed_keyword || "";
      const prefillTarget = prefill.target || prefill.target_url || "";
      const prefillProfile = prefill.cora_profile || "";
      const prefillBanner = state.commandPrefill ? '<section><div class="head"><h3>Prefilled From Client</h3><button id="clear-command-prefill" class="secondary">Clear Prefill</button></div><div class="empty">Project, target, and keyword fields were prefilled from the client workspace. Review before queueing.</div></section>' : '';
      const paidLive = pending && isPaidLiveCommand(pending.command_type, pending.payload);
      const writeReady = canWrite();
      const writeNotice = pending && !writeReady ? '<div class="empty warn">Write access required before queueing. Enter the admin token in Unlock Writes, or log in with a write/admin email account.</div>' : '';
      const review = pending ? '<section><div class="head"><h3>Review Command</h3><span class="pill ' + (paidLive || !writeReady ? 'warn' : '') + '">' + esc(!writeReady ? 'Write locked' : paidLive ? 'Paid/API review' : 'Not queued yet') + '</span></div><div class="review ' + (paidLive || !writeReady ? 'danger' : '') + '"><strong>' + esc(pending.summary) + '</strong><div class="muted">' + esc(commandRisk(pending.command_type, pending.payload)) + '</div>' + writeNotice + (paidLive ? '<label class="muted"><input id="confirm-paid-command" type="checkbox" style="min-width:auto"> I understand this can use paid API credits.</label>' : '') + '<pre>' + esc(JSON.stringify(pending.payload, null, 2)) + '</pre><div class="toolbar"><button id="confirm-command">' + esc(writeReady ? 'Queue Reviewed Command' : 'Queue Needs Write Access') + '</button><button id="cancel-command" class="secondary">Cancel</button></div></div></section>' : '';
      const bridge = (data.bridges || [])[0] || {};
      const bridgePanel = '<section><div class="head"><h3>Bridge Control</h3><span class="pill ' + (bridge.online ? 'ok' : 'warn') + '">' + esc(bridge.online ? 'Online' : 'Offline') + '</span></div><div class="bridge-flags"><div class="bridge-flag"><strong>' + esc(bridge.allow_cora ? 'Enabled' : 'Off') + '</strong><span class="muted">Cora execution</span></div><div class="bridge-flag"><strong>' + esc(bridge.allow_paid_tools ? 'Enabled' : 'Off') + '</strong><span class="muted">Paid/API tools</span></div><div class="bridge-flag"><strong>' + esc(bridge.poll_interval || 0) + 's</strong><span class="muted">Poll interval</span></div></div><div class="status-list"><div class="muted">Last seen ' + esc(fmtDate(bridge.last_seen_at)) + '. Real Cora and paid/API runs require the matching local bridge permission. Dry runs are safe for validation.</div><div class="toolbar"><button id="cmd-bridge-dry-sync">Review Sync Dry Run</button><button id="cmd-bridge-dry-ranking" class="secondary">Review Ranking Dry Run</button></div></div></section>';
      const access = '<section><div class="head"><h3>Unlock Writes</h3><span class="pill warn">Protected</span></div><div class="status-list"><div class="muted">Writes can use a write/admin email session or the admin/sync token. Scoped users can only queue commands for assigned clients.</div><input id="admin-token" type="password" placeholder="Admin token" value="' + esc(adminToken()) + '"><input id="operator-name" placeholder="Operator name" value="' + esc(localStorage.getItem("opos_operator_name") || "") + '"><div class="toolbar"><button id="save-token">Save Write Access</button><button id="clear-token" class="secondary">Clear</button></div></div></section>';
      const syncGroup = '<section class="command-group"><div class="head"><h3>Sync</h3><span class="muted">Cloud mirror maintenance</span></div><div class="command-grid"><div class="command-card"><h4>Sync Local to Cloud</h4><div class="muted">Push local dashboard tables back to Cloudflare.</div><input id="cmd-sync-tables" placeholder="Optional tables: profiles,cora_domain_lists,projects,keywords,runs,nlp_category_batches"><label class="muted"><input id="cmd-sync-dry" type="checkbox" style="min-width:auto"> Dry run</label><button id="cmd-sync-cloud">Review Data Push</button></div><div class="command-card"><h4>Pull Cloud to Local</h4><div class="muted">Import cloud-created profiles, Cora domain lists, clients, keywords, plans, ranking snapshots, saved targets, entity/NLP sets, and report metadata into the local dashboard.</div><input id="cmd-pull-tables" placeholder="Optional tables: profiles,cora_domain_lists,projects,sites,keywords,content_plans,nlp_category_batches,nlp_category_urls,share_reports"><label class="muted"><input id="cmd-pull-dry" type="checkbox" checked style="min-width:auto"> Dry run</label><button id="cmd-pull-cloud">Review Pull Sync</button></div><div class="command-card"><h4>Sync Report Files</h4><div class="muted">Upload report HTML and source XLSX artifacts to R2.</div><input id="cmd-artifact-report-ids" placeholder="Optional report IDs: 1,2,3"><label class="muted"><input id="cmd-artifact-force" type="checkbox" style="min-width:auto"> Force re-upload</label><label class="muted"><input id="cmd-artifact-dry" type="checkbox" style="min-width:auto"> Dry run</label><button id="cmd-sync-artifacts">Review Artifact Sync</button></div></div></section>';
      const clientGroup = '<section class="command-group"><div class="head"><h3>Clients & Reports</h3><span class="muted">Lightweight cloud writes</span></div><div class="command-grid"><div class="command-card"><h4>Create Client</h4><input id="cmd-client-name" placeholder="Client name"><input id="cmd-client-site" placeholder="Main URL or domain"><input id="cmd-client-notes" placeholder="Notes"><button id="cmd-create-client">Review Create Client</button></div><div class="command-card"><h4>Add Keyword</h4><select id="cmd-keyword-project">' + projectOptions(prefillProject) + '</select><input id="cmd-keyword" placeholder="Keyword" value="' + esc(prefillKeyword) + '"><button id="cmd-add-keyword">Review Keyword</button></div><div class="command-card"><h4>Content Plan</h4><select id="cmd-plan-project">' + projectOptions(prefillProject) + '</select><input id="cmd-plan-title" placeholder="Plan title"><input id="cmd-plan-keyword" placeholder="Optional keyword id"><input id="cmd-plan-notes" placeholder="Notes"><button id="cmd-content-plan">Review Content Plan</button></div><div class="command-card"><h4>Customer Report</h4><select id="cmd-report-run">' + runOptions() + '</select><select id="cmd-report-level"><option value="medium">Medium</option><option value="basic">Basic</option><option value="comprehensive">Comprehensive</option></select><input id="cmd-report-title" placeholder="Optional title"><button id="cmd-share-report">Review Report</button></div></div></section>';
      const toolGroup = '<section class="command-group"><div class="head"><h3>Run Tools</h3><span class="pill warn">Local bridge for Cora</span></div><div class="command-grid"><div class="command-card"><h4>Run Cora</h4><div class="muted">Queues local Cora. Requires Cora execution enabled on the bridge.</div><select id="cmd-cora-project">' + projectOptions(prefillProject) + '</select><input id="cmd-cora-keyword" placeholder="Keyword" value="' + esc(prefillKeyword) + '"><input id="cmd-cora-url" placeholder="Target URL" value="' + esc(prefillTarget) + '"><input id="cmd-cora-profile" placeholder="Optional Cora profile" value="' + esc(prefillProfile) + '"><button id="cmd-run-cora">Review Cora Run</button></div><div class="command-card"><h4>Ranking Snapshot</h4><div class="muted">Runs DataForSEO Labs. Cloud mode runs directly in Cloudflare.</div><select id="cmd-ranking-project">' + projectOptions(prefillProject) + '</select><input id="cmd-ranking-target" placeholder="Domain, example.com" value="' + esc(prefillTarget) + '"><div class="field-row"><input id="cmd-ranking-location" placeholder="Location code" value="2840"><input id="cmd-ranking-language" placeholder="Language" value="en"><input id="cmd-ranking-limit" placeholder="Limit" value="1000"></div><label class="muted"><input id="cmd-ranking-cloud" type="checkbox" checked style="min-width:auto"> Run in Cloudflare</label><label class="muted"><input id="cmd-ranking-subdomains" type="checkbox" style="min-width:auto"> Include subdomains</label><label class="muted"><input id="cmd-ranking-force" type="checkbox" style="min-width:auto"> Force refresh</label><label class="muted"><input id="cmd-ranking-dry" type="checkbox" checked style="min-width:auto"> Dry run</label><button id="cmd-ranking-snapshot">Review Ranking Snapshot</button></div><div class="command-card"><h4>Entity Explorer</h4><div class="muted">Cloud targets use provider:model. Local targets use apiKeyId:model.</div><select id="cmd-entity-project">' + projectOptions(prefillProject) + '</select><input id="cmd-entity-seed" placeholder="Seed keyword" value="' + esc(prefillKeyword) + '"><input id="cmd-entity-depth" placeholder="Depth 1-5" value="3"><textarea id="cmd-entity-targets" placeholder="openai:gpt-5.5&#10;anthropic:claude-opus-4-8"></textarea><label class="muted"><input id="cmd-entity-cloud" type="checkbox" checked style="min-width:auto"> Run in Cloudflare</label><label class="muted"><input id="cmd-entity-async" type="checkbox" checked style="min-width:auto"> Run async</label><label class="muted"><input id="cmd-entity-dry" type="checkbox" checked style="min-width:auto"> Dry run</label><button id="cmd-entity-lsi">Review Entity Explorer</button></div></div></section>';
      const nlpToolGroup = '<section class="command-group"><div class="head"><h3>Content Classification</h3><span class="pill ok">Cloud NLP</span></div><div class="command-grid"><div class="command-card"><h4>NLP Categorizer</h4><div class="muted">Runs Google Natural Language in Cloudflare and saves URL category rows to D1.</div><select id="cmd-nlp-project">' + projectOptions(prefillProject) + '</select><select id="cmd-nlp-source-type"><option value="domain">Domain sitemap discovery</option><option value="sitemap">Sitemap URL</option><option value="urls">URL list</option></select><textarea id="cmd-nlp-source" placeholder="Domain, sitemap URL, or one URL per line">' + esc(prefillTarget) + '</textarea><div class="field-row"><input id="cmd-nlp-max" placeholder="Max URLs" value="10"><label class="muted"><input id="cmd-nlp-same-host" type="checkbox" checked style="min-width:auto"> Same host only</label><label class="muted"><input id="cmd-nlp-dry" type="checkbox" style="min-width:auto"> Dry run</label></div><button id="cmd-nlp-categorizer">Review Cloud NLP Run</button></div><div class="command-card"><h4>LLM Comparison</h4><div class="muted">Compares a completed NLP batch with cloud LLM providers and saves provider result rows.</div><input id="cmd-nlp-llm-batch" placeholder="NLP batch ID"><select id="cmd-nlp-llm-taxonomy"><option value="seo_page_type">SEO page type</option><option value="google_like">Google-like topic</option><option value="custom">Reusable content category</option></select><textarea id="cmd-nlp-llm-targets" placeholder="openai:gpt-5.5&#10;anthropic:claude-opus-4-8&#10;google:gemini-3.5-flash"></textarea><div class="field-row"><input id="cmd-nlp-llm-max" placeholder="Max URLs" value="10"><label class="muted"><input id="cmd-nlp-llm-dry" type="checkbox" style="min-width:auto"> Dry run</label></div><button id="cmd-nlp-llm-comparison">Review LLM Comparison</button></div></div></section>';
      const commandTypes = [...new Set((data.commands || []).map((c) => c.command_type).filter(Boolean))];
      const commandClients = [...new Map((data.commands || []).map((c) => [String(c.project_id || c.payload?.project_id || ""), (data.clients || []).find((client) => String(client.id) === String(c.project_id || c.payload?.project_id || ""))?.name || "Client #" + (c.project_id || c.payload?.project_id || "")]).filter(([id]) => id)).entries()];
      const filteredCommands = (data.commands || []).filter((c) => (state.commandClient === "all" || String(c.project_id || c.payload?.project_id || "") === state.commandClient) && (state.commandStatus === "all" || c.status === state.commandStatus) && (state.commandType === "all" || c.command_type === state.commandType));
      const commandFilters = '<div class="filters"><select id="command-client-filter"><option value="all">All clients</option>' + commandClients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.commandClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("") + '</select><select id="command-status-filter"><option value="all">All statuses</option>' + ["pending", "claimed", "complete", "failed"].map((status) => '<option value="' + status + '"' + (state.commandStatus === status ? ' selected' : '') + '>' + esc(commandStatusLabel(status)) + '</option>').join("") + '</select><select id="command-type-filter"><option value="all">All command types</option>' + commandTypes.map((type) => '<option value="' + esc(type) + '"' + (state.commandType === type ? ' selected' : '') + '>' + esc(commandLabel(type)) + '</option>').join("") + '</select><span class="muted">' + esc(filteredCommands.length) + ' of ' + esc((data.commands || []).length) + ' commands</span></div>';
      const forms = '<div class="grid2">' + access + bridgePanel + '</div>' + prefillBanner + review + syncGroup + clientGroup + toolGroup + nlpToolGroup + '<section><div class="head"><h3>Command History</h3><span class="muted">Queued, claimed locally, completed, failed, and local result are tracked here.</span></div>' + commandFilters + commandsTable(filteredCommands) + '</section>';
      setTimeout(bindCommandForms, 0);
      return forms;
    }
    function bindCommandForms() {
      const byId = (id) => document.getElementById(id);
      byId("clear-command-prefill")?.addEventListener("click", () => { state.commandPrefill = null; render(); });
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
      byId("cmd-nlp-categorizer")?.addEventListener("click", () => setPendingCommand("run_nlp_categorizer", { execution_mode: "cloud", project_id: Number(byId("cmd-nlp-project").value), source_type: byId("cmd-nlp-source-type").value || "domain", source_value: byId("cmd-nlp-source").value, max_urls: Number(byId("cmd-nlp-max").value || 10), same_host_only: Boolean(byId("cmd-nlp-same-host").checked), dry_run: Boolean(byId("cmd-nlp-dry").checked) }));
      byId("cmd-nlp-llm-comparison")?.addEventListener("click", () => setPendingCommand("run_nlp_llm_comparison", { execution_mode: "cloud", batch_id: Number(byId("cmd-nlp-llm-batch").value || 0), taxonomy: byId("cmd-nlp-llm-taxonomy").value || "seo_page_type", targets: parseEntityTargets(byId("cmd-nlp-llm-targets").value).filter((target) => target.provider && target.model), max_urls: Number(byId("cmd-nlp-llm-max").value || 10), dry_run: Boolean(byId("cmd-nlp-llm-dry").checked) }));
      byId("cmd-sync-cloud")?.addEventListener("click", () => setPendingCommand("sync_cloud_data", { tables: (byId("cmd-sync-tables").value || "").split(",").map((v) => v.trim()).filter(Boolean), dry_run: Boolean(byId("cmd-sync-dry").checked) }));
      byId("cmd-pull-cloud")?.addEventListener("click", () => setPendingCommand("sync_cloud_to_local", { tables: (byId("cmd-pull-tables").value || "").split(",").map((v) => v.trim()).filter(Boolean), dry_run: Boolean(byId("cmd-pull-dry").checked) }));
      byId("cmd-sync-artifacts")?.addEventListener("click", () => setPendingCommand("sync_report_artifacts", { report_ids: (byId("cmd-artifact-report-ids").value || "").split(",").map((v) => Number(v.trim())).filter(Boolean), dry_run: Boolean(byId("cmd-artifact-dry").checked), force: Boolean(byId("cmd-artifact-force").checked) }));
      byId("confirm-command")?.addEventListener("click", () => sendPendingCommand().catch((e) => alert(e.message)));
      byId("cancel-command")?.addEventListener("click", () => { state.pendingWrite = null; render(); });
      byId("command-client-filter")?.addEventListener("change", (event) => applyActiveClient(event.target.value || "all"));
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
      if (client) client.onchange = (event) => applyActiveClient(event.target.value || "all");
      if (level) level.onchange = (event) => { state.reportLevel = event.target.value || "all"; render(); };
      const createClient = document.getElementById("report-create-client");
      if (createClient) createClient.onchange = (event) => {
        state.reportCreateRun = "";
        state.reportCreateSnapshot = "";
        state.reportTargetSelection = {};
        applyActiveClient(event.target.value || "all");
      };
      const createRun = document.getElementById("report-create-run");
      if (createRun) createRun.onchange = (event) => {
        state.reportCreateRun = event.target.value || "";
        state.reportCreateSnapshot = "";
        state.reportTargetSelection = {};
        render();
      };
      const createSnapshot = document.getElementById("report-create-snapshot");
      if (createSnapshot) createSnapshot.onchange = (event) => {
        state.reportCreateSnapshot = event.target.value || "";
        state.reportTargetSelection = {};
        render();
      };
      document.querySelectorAll(".report-target-check").forEach((box) => {
        box.onchange = () => {
          state.reportTargetSelection[String(box.value || "")] = Boolean(box.checked);
        };
      });
      document.getElementById("report-select-targets")?.addEventListener("click", () => {
        document.querySelectorAll(".report-target-check").forEach((box) => {
          if (box.value) state.reportTargetSelection[String(box.value)] = true;
        });
        render();
      });
      document.getElementById("report-create-submit")?.addEventListener("click", (event) => createCloudReport(event.currentTarget).catch((error) => {
        setToolFeedback("reports", { status: "failed", title: "Report Creation Failed", message: error.message || String(error) });
      }));
      document.querySelectorAll(".report-sync-files").forEach((button) => {
        button.addEventListener("click", () => {
          const id = Number(button.dataset.reportId || 0);
          setPage("commands");
          setPendingCommand("sync_report_artifacts", { report_ids: id ? [id] : [], dry_run: false, force: true });
        });
      });
      document.querySelectorAll(".report-archive").forEach((button) => {
        button.addEventListener("click", () => archiveCloudReport(button).catch((error) => {
          setToolFeedback("reports", { status: "failed", title: "Report Archive Failed", message: error.message || String(error) });
        }));
      });
      document.querySelectorAll(".copy-btn").forEach((button) => {
        if (button.classList.contains("report-sync-files") || button.classList.contains("report-archive")) return;
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
    async function archiveCloudReport(button) {
      const reportId = Number(button?.dataset.reportId || 0);
      if (!reportId) throw new Error("Report ID is required.");
      if (!confirm("Archive this customer report link? The report will be removed from normal cloud report lists.")) return;
      const originalLabel = button?.textContent || "Archive";
      if (button) {
        button.disabled = true;
        button.textContent = "Archiving...";
      }
      setToolFeedback("reports", { status: "running", title: "Archiving Customer Report", message: "Revoking report metadata in Cloudflare." });
      try {
        await postCommand("revoke_share_report", { execution_mode: "cloud", report_id: reportId, project_id: Number(button?.dataset.projectId || 0) || null });
        await load({ preserveScroll: true });
        setToolFeedback("reports", {
          status: "complete",
          title: "Customer Report Archived",
          message: "Report metadata was revoked in Cloudflare. Pull cloud changes locally to mirror the archive state."
        }, true);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function createCloudReport(button) {
      const originalLabel = button?.textContent || "Create Report";
      const payload = {
        execution_mode: "cloud",
        run_id: Number(document.getElementById("report-create-run")?.value || 0),
        level: document.getElementById("report-create-level")?.value || "medium",
        title: document.getElementById("report-create-title")?.value || "",
        notes: document.getElementById("report-create-notes")?.value || "",
        ranking_snapshot_id: Number(document.getElementById("report-create-snapshot")?.value || 0) || null,
        entity_set_id: Number(document.getElementById("report-create-entity-set")?.value || 0) || null,
        optimization_target_ids: Object.entries(state.reportTargetSelection || {})
          .filter(([, selected]) => selected)
          .map(([id]) => Number(id))
          .filter(Boolean)
      };
      if (!payload.run_id) throw new Error("Select a synced Cora run for the report.");
      if (button) {
        button.disabled = true;
        button.textContent = "Creating...";
      }
      setToolFeedback("reports", {
        status: "running",
        title: "Creating Customer Report",
        message: "Creating " + payload.level + " report metadata in Cloudflare."
      });
      try {
        const result = await postCommand("create_share_report", payload);
        await load({ preserveScroll: true });
        const report = result.command?.result?.report || {};
        const message = result.duplicate
          ? "A matching report command already exists."
          : "Report metadata created" + (report.id ? " as report #" + report.id : "") + ". Use Sync Report Files to upload HTML/XLSX artifacts.";
        setToolFeedback("reports", {
          status: "complete",
          title: "Customer Report Created",
          message
        }, true);
        startToolAutoRefresh("reports", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    function bindCoraProfileControls() {
      document.getElementById("profile-edit-select")?.addEventListener("change", (event) => {
        state.profileEditId = event.target.value || "";
        render();
      });
      document.querySelectorAll(".profile-edit-row").forEach((button) => {
        button.addEventListener("click", () => {
          state.profileEditId = button.dataset.profileId || "";
          render();
          setTimeout(() => document.getElementById("profile-edit-name")?.focus(), 0);
        });
      });
      document.getElementById("profile-attach-client")?.addEventListener("change", (event) => applyActiveClient(event.target.value || "all"));
      document.getElementById("profile-create-submit")?.addEventListener("click", (event) => createCloudProfile(event.currentTarget).catch((error) => {
        setToolFeedback("profiles", { status: "failed", title: "Profile Creation Failed", message: error.message || String(error) });
      }));
      document.getElementById("profile-attach-submit")?.addEventListener("click", (event) => attachCloudProfile(event.currentTarget).catch((error) => {
        setToolFeedback("profiles", { status: "failed", title: "Profile Attachment Failed", message: error.message || String(error) });
      }));
      document.getElementById("profile-update-submit")?.addEventListener("click", (event) => updateCloudProfile(event.currentTarget).catch((error) => {
        setToolFeedback("profiles", { status: "failed", title: "Profile Update Failed", message: error.message || String(error) });
      }));
      document.getElementById("profile-detach-submit")?.addEventListener("click", (event) => detachCloudProfile(event.currentTarget).catch((error) => {
        setToolFeedback("profiles", { status: "failed", title: "Profile Detach Failed", message: error.message || String(error) });
      }));
      document.getElementById("profile-archive-submit")?.addEventListener("click", (event) => archiveCloudProfile(event.currentTarget).catch((error) => {
        setToolFeedback("profiles", { status: "failed", title: "Profile Archive Failed", message: error.message || String(error) });
      }));
      document.getElementById("profile-apply-cora")?.addEventListener("click", (event) => queueCoraProfileBridgeAction(event.currentTarget, "apply_cora_profile").catch((error) => {
        setToolFeedback("profiles", { status: "failed", title: "Apply Profile Failed", message: error.message || String(error) });
      }));
      document.getElementById("profile-push-cora")?.addEventListener("click", (event) => queueCoraProfileBridgeAction(event.currentTarget, "push_cora_profile").catch((error) => {
        setToolFeedback("profiles", { status: "failed", title: "Push Profile Failed", message: error.message || String(error) });
      }));
    }
    function selectedProfilePayload() {
      return {
        profile_id: Number(document.getElementById("profile-edit-select")?.value || 0),
        name: document.getElementById("profile-edit-name")?.value || "",
        client: document.getElementById("profile-edit-client")?.value || "",
        notes: document.getElementById("profile-edit-notes")?.value || ""
      };
    }
    async function createCloudProfile(button) {
      const originalLabel = button?.textContent || "Create Profile";
      const payload = {
        execution_mode: "cloud",
        name: document.getElementById("profile-create-name")?.value || "",
        client: document.getElementById("profile-create-client")?.value || "",
        notes: document.getElementById("profile-create-notes")?.value || ""
      };
      if (!(payload.name || "").trim()) throw new Error("Profile name is required.");
      if (button) {
        button.disabled = true;
        button.textContent = "Creating...";
      }
      setToolFeedback("profiles", { status: "running", title: "Creating Cora Profile", message: "Creating profile metadata in Cloudflare." });
      try {
        const result = await postCommand("create_profile", payload);
        await load({ preserveScroll: true });
        const profile = result.command?.result?.profile || {};
        const duplicate = Boolean(result.command?.result?.duplicate);
        setToolFeedback("profiles", {
          status: "complete",
          title: duplicate ? "Profile Already Exists" : "Cora Profile Created",
          message: (duplicate ? "Reused existing profile" : "Created profile") + (profile.name ? ": " + profile.name : "") + ". Pull cloud changes locally to mirror it."
        }, true);
        startToolAutoRefresh("profiles", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function attachCloudProfile(button) {
      const originalLabel = button?.textContent || "Attach Profile";
      const payload = {
        execution_mode: "cloud",
        project_id: Number(document.getElementById("profile-attach-client")?.value || 0),
        profile_id: Number(document.getElementById("profile-attach-existing")?.value || 0) || null,
        profile_name: document.getElementById("profile-attach-new")?.value || ""
      };
      if (!payload.project_id || (!payload.profile_id && !(payload.profile_name || "").trim())) throw new Error("Select a client and choose or create a profile.");
      if (button) {
        button.disabled = true;
        button.textContent = "Attaching...";
      }
      setToolFeedback("profiles", { status: "running", title: "Attaching Cora Profile", message: "Updating the client profile link in Cloudflare." });
      try {
        const result = await postCommand("attach_profile", payload);
        await load({ preserveScroll: true });
        const project = result.command?.result?.project || {};
        setToolFeedback("profiles", {
          status: "complete",
          title: "Cora Profile Attached",
          message: (project.profile_name || payload.profile_name || "Profile") + " is attached to " + (project.name || "the client") + ". Pull cloud changes locally to mirror it."
        }, true);
        startToolAutoRefresh("profiles", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function updateCloudProfile(button) {
      const originalLabel = button?.textContent || "Save Profile";
      const payload = { execution_mode: "cloud", ...selectedProfilePayload() };
      if (!payload.profile_id || !(payload.name || "").trim()) throw new Error("Select a profile and enter a profile name.");
      if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
      }
      setToolFeedback("profiles", { status: "running", title: "Saving Cora Profile", message: "Updating profile metadata in Cloudflare." });
      try {
        const result = await postCommand("update_profile", payload);
        await load({ preserveScroll: true });
        const profile = result.command?.result?.profile || {};
        state.profileEditId = String(profile.id || payload.profile_id || "");
        setToolFeedback("profiles", {
          status: "complete",
          title: "Cora Profile Saved",
          message: (profile.name || payload.name || "Profile") + " metadata updated. Pull cloud changes locally to mirror it."
        }, true);
        startToolAutoRefresh("profiles", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function detachCloudProfile(button) {
      const originalLabel = button?.textContent || "Detach Client";
      const payload = {
        execution_mode: "cloud",
        project_id: Number(document.getElementById("profile-detach-client")?.value || 0)
      };
      if (!payload.project_id) throw new Error("Select an attached client to detach.");
      if (button) {
        button.disabled = true;
        button.textContent = "Detaching...";
      }
      setToolFeedback("profiles", { status: "running", title: "Detaching Cora Profile", message: "Removing the profile link from the selected client." });
      try {
        const result = await postCommand("detach_profile", payload);
        await load({ preserveScroll: true });
        const project = result.command?.result?.project || {};
        setToolFeedback("profiles", {
          status: "complete",
          title: "Cora Profile Detached",
          message: "Profile detached from " + (project.name || "the client") + ". Pull cloud changes locally to mirror it."
        }, true);
        startToolAutoRefresh("profiles", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function archiveCloudProfile(button) {
      const originalLabel = button?.textContent || "Archive Profile";
      const payload = selectedProfilePayload();
      if (!payload.profile_id) throw new Error("Select a profile to archive.");
      if (!confirm("Archive this profile and detach it from clients?")) return;
      if (button) {
        button.disabled = true;
        button.textContent = "Archiving...";
      }
      setToolFeedback("profiles", { status: "running", title: "Archiving Cora Profile", message: "Archiving profile metadata and detaching clients." });
      try {
        await postCommand("archive_profile", { execution_mode: "cloud", profile_id: payload.profile_id });
        state.profileEditId = "";
        await load({ preserveScroll: true });
        setToolFeedback("profiles", {
          status: "complete",
          title: "Cora Profile Archived",
          message: "Profile archived and detached from clients. Native Cora profiles are not deleted from the Windows Cora app."
        }, true);
        startToolAutoRefresh("profiles", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function queueCoraProfileBridgeAction(button, commandType) {
      const originalLabel = button?.textContent || "Queue";
      const payload = selectedProfilePayload();
      if (!payload.profile_id || !(payload.name || "").trim()) throw new Error("Select a Cora profile first.");
      if (button) {
        button.disabled = true;
        button.textContent = "Queueing...";
      }
      const title = commandType === "apply_cora_profile" ? "Queueing Apply Profile" : "Queueing Push Profile";
      setToolFeedback("profiles", { status: "running", title, message: "Sending native Cora profile action to the local bridge queue." });
      try {
        await postCommand(commandType, {
          execution_mode: "local",
          profile_id: payload.profile_id,
          profile_name: payload.name
        });
        await load({ preserveScroll: true });
        setToolFeedback("profiles", {
          status: "complete",
          title: "Cora Bridge Command Queued",
          message: (commandType === "apply_cora_profile" ? "Apply" : "Push") + " command queued for " + payload.name + ". The local bridge will run it against Windows Cora."
        }, true);
        startToolAutoRefresh("profiles", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    function bindCoraDomainControls() {
      document.getElementById("domain-type-filter")?.addEventListener("change", (event) => {
        state.domainListType = event.target.value || "all";
        render();
      });
      document.getElementById("domain-list-clear")?.addEventListener("click", () => {
        state.domainEditId = "";
        render();
      });
      document.querySelectorAll(".domain-edit-row").forEach((button) => {
        button.addEventListener("click", () => {
          state.domainEditId = button.dataset.entryId || "";
          render();
          setTimeout(() => document.getElementById("domain-list-value")?.focus(), 0);
        });
      });
      document.querySelectorAll(".domain-archive-row").forEach((button) => {
        button.addEventListener("click", () => archiveCloudDomainEntry(Number(button.dataset.entryId || 0), button).catch((error) => {
          setToolFeedback("domains", { status: "failed", title: "Archive Failed", message: error.message || String(error) });
        }));
      });
      document.getElementById("domain-list-save")?.addEventListener("click", (event) => saveCloudDomainEntry(event.currentTarget).catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Domain List Save Failed", message: error.message || String(error) });
      }));
      document.getElementById("domain-add-tracked")?.addEventListener("click", (event) => saveQuickDomainEntry("tracked", "domain-quick-tracked", event.currentTarget).catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Tracked Domain Save Failed", message: error.message || String(error) });
      }));
      document.getElementById("domain-add-competitors")?.addEventListener("click", (event) => saveQuickDomainEntry("competitors", "domain-quick-competitors", event.currentTarget).catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Competitor Save Failed", message: error.message || String(error) });
      }));
      ["domain-quick-tracked", "domain-quick-competitors"].forEach((id) => {
        document.getElementById(id)?.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const type = id === "domain-quick-tracked" ? "tracked" : "competitors";
          saveQuickDomainEntry(type, id, document.getElementById(type === "tracked" ? "domain-add-tracked" : "domain-add-competitors")).catch((error) => {
            setToolFeedback("domains", { status: "failed", title: "Domain List Save Failed", message: error.message || String(error) });
          });
        });
      });
      document.getElementById("domain-save-lists")?.addEventListener("click", (event) => saveCloudDomainLists(event.currentTarget).catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Domain Lists Save Failed", message: error.message || String(error) });
      }));
      document.getElementById("domain-apply-cora")?.addEventListener("click", (event) => queueCoraDomainBridgeAction(event.currentTarget, "apply_cora_domain_lists").catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Apply Lists Failed", message: error.message || String(error) });
      }));
      document.getElementById("domain-pull-cora")?.addEventListener("click", (event) => queueCoraDomainBridgeAction(event.currentTarget, "pull_cora_domain_lists").catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Pull Lists Failed", message: error.message || String(error) });
      }));
      document.getElementById("domain-apply-cora-inline")?.addEventListener("click", (event) => queueCoraDomainBridgeAction(event.currentTarget, "apply_cora_domain_lists").catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Apply Lists Failed", message: error.message || String(error) });
      }));
      document.getElementById("domain-pull-cora-inline")?.addEventListener("click", (event) => queueCoraDomainBridgeAction(event.currentTarget, "pull_cora_domain_lists").catch((error) => {
        setToolFeedback("domains", { status: "failed", title: "Pull Lists Failed", message: error.message || String(error) });
      }));
    }
    function domainEntryPayload() {
      const projectId = Number(document.getElementById("domain-list-client")?.value || 0) || null;
      const profileId = projectId ? null : (Number(document.getElementById("domain-list-profile")?.value || 0) || null);
      return {
        entry_id: Number(state.domainEditId || 0) || null,
        execution_mode: "cloud",
        list_type: document.getElementById("domain-list-type")?.value || "tracked",
        value: document.getElementById("domain-list-value")?.value || "",
        notes: document.getElementById("domain-list-notes")?.value || "",
        scope: projectId ? "client" : profileId ? "profile" : "global",
        project_id: projectId,
        profile_id: profileId
      };
    }
    async function saveCloudDomainEntry(button) {
      const originalLabel = button?.textContent || "Save Entry";
      const payload = domainEntryPayload();
      if (!(payload.value || "").trim()) throw new Error("Enter a domain or list value.");
      const commandType = payload.entry_id ? "update_cora_domain_entry" : "create_cora_domain_entry";
      if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
      }
      setToolFeedback("domains", { status: "running", title: "Saving Domain List Entry", message: "Updating synced Cora domain lists in Cloudflare." });
      try {
        const result = await postCommand(commandType, payload);
        await load({ preserveScroll: true });
        const entry = result.command?.result?.entry || {};
        state.domainEditId = String(entry.id || "");
        setToolFeedback("domains", {
          status: "complete",
          title: "Domain List Entry Saved",
          message: (entry.value || payload.value) + " saved. Use Apply Lists in Cora when ready to push native Cora settings."
        }, true);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function saveQuickDomainEntry(listType, inputId, button) {
      const input = document.getElementById(inputId);
      const value = input?.value || "";
      if (!value.trim()) throw new Error("Enter a domain or list value.");
      const originalLabel = button?.textContent || "Add";
      if (button) {
        button.disabled = true;
        button.textContent = "Adding...";
      }
      setToolFeedback("domains", { status: "running", title: "Saving Domain List Entry", message: "Adding " + value + " to " + listType + "." });
      try {
        await postCommand("create_cora_domain_entry", { execution_mode: "cloud", list_type: listType, value, notes: "", scope: "global", project_id: null, profile_id: null });
        if (input) input.value = "";
        await load({ preserveScroll: true });
        setToolFeedback("domains", { status: "complete", title: "Domain List Entry Saved", message: value + " saved. Use Apply Lists in Cora to push native Cora settings." }, true);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function saveCloudDomainLists(button) {
      const originalLabel = button?.textContent || "Save Cora Settings";
      const existing = state.data?.domain_lists || [];
      const textEntries = [
        ["tracked", activeDomainEntries(existing, "tracked").map((entry) => entry.value || "").filter(Boolean).join("\\n")],
        ["competitors", activeDomainEntries(existing, "competitors").map((entry) => entry.value || "").filter(Boolean).join("\\n")],
        ["banned", document.getElementById("domain-banned-list")?.value || ""],
        ["slowRender", document.getElementById("domain-slow-render-list")?.value || ""],
        ["stopWords", document.getElementById("domain-stop-words-list")?.value || ""]
      ];
      const existingGlobalRowsByType = (type) => existing.filter((entry) => !entry.archived_at && !entry.project_id && !entry.profile_id && entry.list_type === type);
      const creates = [];
      const archives = [];
      textEntries.forEach(([type, value]) => {
        const currentRows = existingGlobalRowsByType(type);
        const currentByKey = new Map(currentRows.map((entry) => [String(entry.value || "").trim().toLowerCase(), entry]).filter(([key]) => key));
        const desired = new Map();
        String(value || "").split(/\\r?\\n|,/).map((item) => item.trim()).filter(Boolean).forEach((item) => {
          const key = item.toLowerCase();
          if (!desired.has(key)) desired.set(key, item);
        });
        for (const [key, item] of desired.entries()) {
          if (!currentByKey.has(key)) creates.push({ type, value: item });
        }
        for (const [key, row] of currentByKey.entries()) {
          if (!desired.has(key) && row.id) archives.push(row.id);
        }
      });
      if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
      }
      const totalChanges = creates.length + archives.length;
      setToolFeedback("domains", { status: "running", title: "Saving Cora Settings", message: totalChanges ? "Saving " + totalChanges + " list change" + (totalChanges === 1 ? "." : "s.") : "No multiline list changes to save." });
      try {
        for (const entry of creates) {
          await postCommand("create_cora_domain_entry", { execution_mode: "cloud", list_type: entry.type, value: entry.value, notes: "", scope: "global", project_id: null, profile_id: null });
        }
        for (const entryId of archives) {
          await postCommand("archive_cora_domain_entry", { execution_mode: "cloud", entry_id: entryId });
        }
        await load({ preserveScroll: true });
        setToolFeedback("domains", { status: "complete", title: "Cora Settings Saved", message: totalChanges ? "Saved " + totalChanges + " list change" + (totalChanges === 1 ? "" : "s") + ". Apply Lists in Cora when ready." : "No changes were needed." }, true);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function archiveCloudDomainEntry(entryId, button) {
      if (!entryId) throw new Error("Domain list entry is required.");
      if (!confirm("Archive this domain list entry?")) return;
      const originalLabel = button?.textContent || "Archive";
      if (button) {
        button.disabled = true;
        button.textContent = "Archiving...";
      }
      setToolFeedback("domains", { status: "running", title: "Archiving Domain Entry", message: "Archiving synced Cora domain list entry." });
      try {
        await postCommand("archive_cora_domain_entry", { execution_mode: "cloud", entry_id: entryId });
        if (String(state.domainEditId) === String(entryId)) state.domainEditId = "";
        await load({ preserveScroll: true });
        setToolFeedback("domains", { status: "complete", title: "Domain Entry Archived", message: "Entry archived. Apply Lists in Cora to update native Cora settings." }, true);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    async function queueCoraDomainBridgeAction(button, commandType) {
      const originalLabel = button?.textContent || "Queue";
      if (button) {
        button.disabled = true;
        button.textContent = "Queueing...";
      }
      const title = commandType === "apply_cora_domain_lists" ? "Queueing Apply Lists" : "Queueing Pull Lists";
      setToolFeedback("domains", { status: "running", title, message: "Sending Cora domain list action to the local bridge." });
      try {
        await postCommand(commandType, { execution_mode: "local", scope: "all", sync_before_apply: commandType === "apply_cora_domain_lists" });
        await load({ preserveScroll: true });
        setToolFeedback("domains", {
          status: "complete",
          title: "Cora Domain Bridge Command Queued",
          message: (commandType === "apply_cora_domain_lists" ? "Apply" : "Pull") + " command queued for the local Windows Cora bridge."
        }, true);
        startToolAutoRefresh("domains", 90000);
      } catch (error) {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        throw error;
      }
    }
    function bindCoraListControls() {
      const runClient = document.getElementById("run-client-filter");
      if (runClient) runClient.onchange = (event) => applyActiveClient(event.target.value || "all");
      const jobClient = document.getElementById("job-client-filter");
      const jobStatus = document.getElementById("job-status-filter");
      if (jobClient) jobClient.onchange = (event) => applyActiveClient(event.target.value || "all");
      if (jobStatus) jobStatus.onchange = (event) => { state.jobStatus = event.target.value || "all"; render(); };
    }
    function bindCoraControls() {
      const clientSelect = document.getElementById("cora-client-select");
      if (clientSelect) clientSelect.onchange = (event) => {
        state.commandPrefill = null;
        applyActiveClient(event.target.value || "all");
      };
      document.getElementById("cora-refresh")?.addEventListener("click", () => load().catch((error) => alert(error.message || error)));
      document.getElementById("cora-run-selected")?.addEventListener("click", (event) => {
        (async () => {
          const button = event.currentTarget;
          if (button.disabled) return;
          const projectId = Number(document.getElementById("cora-client-select")?.value || 0);
          const targetUrl = document.getElementById("cora-target-url")?.value || "";
          const profile = document.getElementById("cora-profile")?.value || "";
          const checked = [...document.querySelectorAll(".cora-keyword-check:checked")].map((box) => box.value.trim()).filter(Boolean);
          const extra = (document.getElementById("cora-extra-keyword")?.value || "").trim();
          const keywords = [...new Set(extra ? checked.concat(extra) : checked)];
          if (!keywords.length) throw new Error("Select at least one keyword or enter an extra keyword.");
          const originalLabel = button.textContent;
          button.disabled = true;
          let queued = 0;
          let duplicates = 0;
          const rows = keywords.map((keyword) => ({ label: keyword, status: "waiting" }));
          setToolFeedback("cora", {
            status: "running",
            title: "Queueing Cora Runs",
            message: "Preparing " + keywords.length + " keyword(s) for the remote Cora bridge.",
            done: 0,
            total: keywords.length,
            rows
          });
          try {
            for (let index = 0; index < keywords.length; index += 1) {
              button.textContent = "Queueing " + (index + 1) + " of " + keywords.length + "...";
              rows[index].status = "queueing";
              setToolFeedback("cora", {
                status: "running",
                title: "Queueing Cora Runs",
                message: "Queueing " + (index + 1) + " of " + keywords.length + ": " + keywords[index],
                done: index,
                total: keywords.length,
                rows
              });
              const result = await postCommand("run_cora", {
                project_id: projectId,
                keyword: keywords[index],
                target_url: targetUrl,
                cora_profile: profile,
                execution_mode: "local"
              });
              if (result.duplicate) {
                duplicates += 1;
                rows[index].status = "duplicate";
              } else {
                queued += 1;
                rows[index].status = "queued";
              }
              setToolFeedback("cora", {
                status: "running",
                title: "Queueing Cora Runs",
                message: "Queued " + (index + 1) + " of " + keywords.length + " keyword(s).",
                done: index + 1,
                total: keywords.length,
                rows
              });
            }
            state.commandPrefill = null;
            await load();
            setToolFeedback("cora", {
              status: "complete",
              title: "Cora Queue Updated",
              message: (queued ? queued + " Cora run(s) queued." : "No new Cora runs queued.") + (duplicates ? " " + duplicates + " matching run(s) already existed." : "") + " The remote bridge will claim queued work.",
              done: keywords.length,
              total: keywords.length,
              rows
            }, true);
            startToolAutoRefresh("cora", 180000);
          } catch (error) {
            button.disabled = false;
            button.textContent = originalLabel;
            setToolFeedback("cora", {
              status: "failed",
              title: "Cora Queue Failed",
              message: error.message || String(error),
              done: queued + duplicates,
              total: keywords.length,
              rows
            });
          }
        })();
      });
    }
    function bindNewClientControls() {
      document.getElementById("quick-create-client")?.addEventListener("click", () => {
        const payload = {
          execution_mode: "cloud",
          name: document.getElementById("quick-client-name")?.value || "",
          site_domain: document.getElementById("quick-client-site")?.value || "",
          notes: document.getElementById("quick-client-notes")?.value || ""
        };
        setPage("commands");
        setPendingCommand("create_project", payload);
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
      document.querySelectorAll(".ranking-tab").forEach((button) => {
        button.onclick = () => {
          const tab = button.dataset.detailTab || "overview";
          document.querySelectorAll(".ranking-tab").forEach((item) => item.classList.toggle("active", item === button));
          document.querySelectorAll(".detail-tab-panel").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.detailTabPanel !== tab));
        };
      });
      document.querySelectorAll(".client-command").forEach((button) => {
        button.onclick = () => {
          const projectId = String(button.dataset.projectId || "all");
          const keyword = button.dataset.keyword || "";
          const target = button.dataset.target || "";
          const profile = button.dataset.profile || "";
          if (button.dataset.clientCommand === "ranking") {
            state.commandPrefill = { project_id: Number(projectId === "all" ? 0 : projectId), keyword, target, command: "ranking" };
            openClientTool("ranking", projectId, { keyword, target });
          } else if (button.dataset.clientCommand === "cora") {
            openClientTool("cora", projectId, { keyword, target, profile });
          } else if (button.dataset.clientCommand === "entity") {
            openClientTool("entities", projectId, { keyword, target });
          } else if (button.dataset.clientCommand === "pull") {
            setPage("commands");
            setPendingCommand("sync_cloud_to_local", { tables: ["profiles", "cora_domain_lists", "projects", "sites", "keywords", "content_plans", "ranking_snapshots", "ranking_snapshot_keywords", "ranking_snapshot_pages", "ranking_optimization_targets", "entity_lsi_batches", "entity_lsi_runs", "nlp_category_batches", "nlp_category_urls", "nlp_llm_comparison_runs", "nlp_llm_comparison_results", "entity_sets", "entity_set_terms", "share_reports"], dry_run: true });
          }
        };
      });
      document.getElementById("clear-active-client")?.addEventListener("click", () => applyActiveClient("all"));
      document.querySelectorAll(".client-open-page").forEach((button) => {
        button.onclick = () => {
          const page = button.dataset.pageTarget || "clients";
          const projectId = String(button.dataset.projectId || "all");
          if (page === "new-client") {
            setPage(page);
            return;
          }
          openClientTool(page, projectId, {
            keyword: button.dataset.keyword || "",
            target: button.dataset.target || "",
            profile: button.dataset.profile || "",
            latestBatch: button.dataset.latestBatch || "all"
          });
        };
      });
      document.getElementById("entity-select-visible")?.addEventListener("click", () => {
        document.querySelectorAll(".entity-crossover-check").forEach((box) => { box.checked = true; });
      });
      document.getElementById("entity-clear-selected")?.addEventListener("click", () => {
        document.querySelectorAll(".entity-crossover-check").forEach((box) => { box.checked = false; });
      });
      document.getElementById("entity-save-set")?.addEventListener("click", (event) => {
        saveSelectedEntitySet(event.currentTarget).catch((error) => alert(error.message || error));
      });
      document.getElementById("snapshot-target-select-visible")?.addEventListener("click", () => {
        document.querySelectorAll(".snapshot-target-check").forEach((box) => { box.checked = true; });
      });
      document.getElementById("snapshot-target-clear")?.addEventListener("click", () => {
        document.querySelectorAll(".snapshot-target-check").forEach((box) => { box.checked = false; });
      });
      document.getElementById("snapshot-target-save")?.addEventListener("click", (event) => {
        saveSnapshotOptimizationTargets(event.currentTarget).catch((error) => alert(error.message || error));
      });
    }
    function render() {
      const data = state.data;
      if (!data) return;
      const names = Object.fromEntries(pages);
      document.getElementById("page-title").textContent = names[state.page] || "Overview";
      document.getElementById("page-note").textContent = state.page === "admin"
        ? "Manage cloud users, client scope, provider secret status, and paid-tool guardrails."
        : "Synced from local dashboard at " + fmtDate(data.generated_at);
      const bridge = (data.bridges || [])[0] || {};
      const coraStatus = document.getElementById("cora-status");
      if (coraStatus) coraStatus.textContent = bridge.online
        ? "Remote Cora bridge online. Cora execution " + (bridge.allow_cora ? "enabled." : "disabled.")
        : "Remote Cora bridge offline. Cloud tools and synced data remain available.";
      renderClientContext();
      const content = {
        overview: () => overview(data),
        clients: () => clientsView(data),
        "new-client": () => newClientView(data),
        cora: () => coraView(data),
        reports: () => reportPortal(data),
        runs: () => coraRunsView(data),
        jobs: () => coraJobsView(data),
        "cora-profiles": () => coraProfilesView(data),
        ranking: () => rankingView(data),
        targets: () => targetsView(data),
        entities: () => entityExplorerView(data),
        "entity-crossover": () => entityCrossoverView(data),
        "entity-sets": () => entitySetsView(data),
        plans: () => plansView(data),
        sync: () => syncView(data),
        audit: () => auditView(data),
        commands: () => commandsView(data),
        admin: () => adminView(data)
      }[state.page] || (() => overview(data));
      document.getElementById("app").innerHTML = content() + detailPanel();
      setTimeout(bindReportControls, 0);
      if (state.page === "new-client") setTimeout(bindNewClientControls, 0);
      if (state.page === "cora") setTimeout(bindCoraControls, 0);
      if (state.page === "cora-profiles") setTimeout(bindCoraProfileControls, 0);
      if (state.page === "cora-profiles") setTimeout(bindCoraDomainControls, 0);
      if (["runs", "jobs"].includes(state.page)) setTimeout(bindCoraListControls, 0);
      setTimeout(bindDetailControls, 0);
      if (["entities", "entity-crossover", "entity-sets"].includes(state.page)) setTimeout(bindEntityPageControls, 0);
      if (state.page === "targets") setTimeout(bindTargetControls, 0);
      if (state.page === "plans") setTimeout(bindPlanControls, 0);
      if (state.page === "sync") setTimeout(bindSyncControls, 0);
      if (state.page === "audit") setTimeout(bindAuditFilters, 0);
      if (state.page === "admin") setTimeout(bindAdminForms, 0);
    }
    function lockedView(message) {
      document.getElementById("page-title").textContent = "Locked";
      document.getElementById("page-note").textContent = "Enter an email login code or read/admin token to view cloud dashboard data.";
      document.getElementById("app").innerHTML = '<section><div class="head"><h3>Dashboard Locked</h3><span class="pill warn">Auth required</span></div><div class="empty">' + esc(message || "Cloud dashboard data is protected. Public customer report links still work without login.") + '</div></section>';
    }
    async function load(options = {}) {
      const previousScrollY = window.scrollY;
      const token = readToken();
      const response = await fetch("/api/dashboard/mirror", { headers: authHeaders(token) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mirror load failed");
      state.data = data;
      render();
      if (options.preserveScroll) {
        requestAnimationFrame(() => window.scrollTo(0, previousScrollY));
      }
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
    applyTheme(localStorage.getItem("opos_cloud_theme") || "dark");
    document.getElementById("active-client").onchange = (event) => applyActiveClient(event.target.value || "all");
    document.getElementById("theme-mode").onchange = (event) => applyTheme(event.target.value || "dark");
    document.getElementById("refresh").onclick = () => load().catch((error) => document.getElementById("app").innerHTML = '<div class="empty warn">' + esc(error.message || error) + '</div>');
    document.getElementById("top-open-cora").onclick = () => openClientTool("cora", state.activeClient || "all");
    document.getElementById("top-import-latest").onclick = () => setPage("reports");
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
      if (url.pathname === "/cloud" && request.method === "GET") return html(cloudMirrorHtml());
      if (request.method === "GET" && env.ASSETS && (url.pathname === "/" || url.pathname.startsWith("/static/"))) {
        return await env.ASSETS.fetch(request);
      }
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
      if (url.pathname === "/api/cora/status" && request.method === "GET") return await handleLocalCoraStatus(request, env);
      if (url.pathname === "/api/overview" && request.method === "GET") return await handleLocalOverview(request, env);
      if (url.pathname === "/api/cloudflare/status" && request.method === "GET") return await handleLocalCloudflareStatus(request, env);
      if (url.pathname === "/api/cloudflare/sync" && request.method === "POST") return await handleLocalCloudflareNoop(request, env, "sync");
      if (url.pathname === "/api/cloudflare/artifacts/sync" && request.method === "POST") return await handleLocalCloudflareNoop(request, env, "artifact_sync");
      if (url.pathname === "/api/cloudflare/commands/pull" && request.method === "POST") return await handleLocalCloudflareNoop(request, env, "commands_pull");
      if (url.pathname === "/api/cloudflare/config" && request.method === "POST") return await handleLocalCloudflareNoop(request, env, "config");
      if (url.pathname === "/api/cloudflare/bridge" && request.method === "POST") return await handleLocalCloudflareNoop(request, env, "bridge");
      if (url.pathname === "/api/profiles" && request.method === "GET") return await handleLocalProfiles(request, env);
      if (url.pathname === "/api/projects" && ["GET", "POST"].includes(request.method)) return await handleLocalProjects(request, env);
      const localProjectRoute = url.pathname.match(/^\/api\/projects\/(\d+)$/);
      if (localProjectRoute && request.method === "GET") return await handleLocalProjectDetail(request, env, Number(localProjectRoute[1]));
      if (url.pathname === "/api/sites" && request.method === "POST") return await handleLocalSites(request, env);
      if (url.pathname === "/api/pages" && request.method === "POST") return await handleLocalPages(request, env);
      if (url.pathname === "/api/keywords" && request.method === "POST") return await handleLocalKeywords(request, env);
      if (url.pathname === "/api/tools/run" && request.method === "POST") return await handleLocalToolRun(request, env);
      if (url.pathname === "/api/runs" && request.method === "GET") return await handleLocalRuns(request, env);
      const localRunWorkbookRoute = url.pathname.match(/^\/api\/runs\/(\d+)\/workbook$/);
      if (localRunWorkbookRoute && request.method === "GET") return await handleLocalRunWorkbook(request, env, Number(localRunWorkbookRoute[1]));
      const localRunAssignRoute = url.pathname.match(/^\/api\/runs\/(\d+)\/assign$/);
      if (localRunAssignRoute && request.method === "POST") return await handleLocalRunAssign(request, env, Number(localRunAssignRoute[1]));
      const localRunDownloadRoute = url.pathname.match(/^\/api\/runs\/(\d+)\/download$/);
      if (localRunDownloadRoute && request.method === "GET") return json({ ok: false, error: "Cora workbook downloads require synced report artifacts from the local dashboard." }, 404);
      const localRunRoute = url.pathname.match(/^\/api\/runs\/(\d+)$/);
      if (localRunRoute && request.method === "GET") return await handleLocalRunDetail(request, env, Number(localRunRoute[1]));
      if (url.pathname === "/api/jobs" && request.method === "GET") return await handleLocalJobs(request, env);
      if (url.pathname === "/api/jobs/queue" && request.method === "POST") return json({ ok: false, error: "Cora queue controls are local-only. Use the local bridge dashboard for Cora queue changes." }, 400);
      if (url.pathname === "/api/share-reports" && request.method === "GET") return await handleLocalShareReports(request, env);
      if (url.pathname === "/api/share-reports" && request.method === "POST") return await handleLocalShareReportCreate(request, env);
      const localShareReportRoute = url.pathname.match(/^\/api\/share-reports\/(\d+)$/);
      if (localShareReportRoute && request.method === "DELETE") return await handleLocalShareReportDelete(request, env, Number(localShareReportRoute[1]));
      if (url.pathname === "/api/content-plans" && request.method === "GET") return await handleLocalContentPlans(request, env);
      if (url.pathname === "/api/content-plans" && request.method === "POST") return await handleLocalContentPlanCreate(request, env);
      if (url.pathname === "/api/api-keys" && ["GET", "POST"].includes(request.method)) return await handleLocalApiKeys(request, env);
      if (url.pathname === "/api/api-keys/test" && request.method === "POST") return await handleLocalApiKeyTest(request, env);
      const localApiKeyRoute = url.pathname.match(/^\/api\/api-keys\/(\d+)$/);
      if (localApiKeyRoute && request.method === "DELETE") return await handleLocalApiKeyDelete(request, env, Number(localApiKeyRoute[1]));
      if (url.pathname === "/api/ai-providers" && request.method === "GET") return json({ ok: true, providers: CLOUD_AI_PROVIDERS });
      if (url.pathname === "/api/seo/ranking-snapshots" && request.method === "GET") return await handleLocalRankingSnapshots(request, env);
      if (url.pathname === "/api/seo/ranking-snapshot" && request.method === "POST") return await handleLocalRankingSnapshotCreate(request, env);
      if (url.pathname === "/api/seo/ranking-snapshot/queue-cora" && request.method === "POST") return json({ ok: false, error: "Queueing Cora from Ranking Snapshot is local-only. Use the local bridge dashboard for Cora jobs." }, 400);
      if (url.pathname === "/api/seo/ranking-snapshots/compare" && request.method === "GET") return await handleRankingSnapshotCompare(request, env);
      const localSeoSnapshotRoute = url.pathname.match(/^\/api\/seo\/ranking-snapshots\/(\d+)$/);
      if (localSeoSnapshotRoute && request.method === "GET") return await handleLocalRankingSnapshotDetail(request, env, Number(localSeoSnapshotRoute[1]));
      if (url.pathname === "/api/seo/optimization-targets" && request.method === "GET") return await handleLocalOptimizationTargets(request, env);
      if (url.pathname === "/api/seo/optimization-targets" && request.method === "POST") return await handleOptimizationTargetSave(request, env);
      if (url.pathname === "/api/seo/optimization-targets/status" && request.method === "POST") return await handleOptimizationTargetStatus(request, env);
      if (url.pathname === "/api/entity-lsi/runs" && request.method === "GET") return await handleLocalEntityRuns(request, env);
      if (url.pathname === "/api/entity-lsi/runs" && request.method === "POST") return await handleLocalEntityRunCreate(request, env);
      const localEntityRunRoute = url.pathname.match(/^\/api\/entity-lsi\/runs\/(\d+)$/);
      if (localEntityRunRoute && request.method === "DELETE") return await handleLocalEntityRunDelete(request, env, Number(localEntityRunRoute[1]));
      if (url.pathname === "/api/entity-lsi/batches" && request.method === "GET") return await handleLocalEntityBatches(request, env);
      const localEntityBatchRoute = url.pathname.match(/^\/api\/entity-lsi\/batches\/(\d+)$/);
      if (localEntityBatchRoute && request.method === "GET") return await handleLocalEntityBatchDetail(request, env, Number(localEntityBatchRoute[1]));
      const localEntityRetryRoute = url.pathname.match(/^\/api\/entity-lsi\/batches\/(\d+)\/retry-failed$/);
      if (localEntityRetryRoute && request.method === "POST") return await handleLocalEntityBatchRetry(request, env, Number(localEntityRetryRoute[1]));
      const localEntityCancelRoute = url.pathname.match(/^\/api\/entity-lsi\/batches\/(\d+)\/cancel-remaining$/);
      if (localEntityCancelRoute && request.method === "POST") return await handleLocalEntityBatchCancel(request, env, Number(localEntityCancelRoute[1]));
      const localEntityCoraImportRoute = url.pathname.match(/^\/api\/entity-lsi\/batches\/(\d+)\/import-cora-report$/);
      if (localEntityCoraImportRoute && request.method === "POST") return json({ ok: false, error: "Attaching Cora report rows to Entity Explorer is local-only until the Cora workbook artifact is synced." }, 400);
      if (url.pathname === "/api/entity-sets" && request.method === "GET") return await handleLocalEntitySets(request, env);
      const localEntitySetGetRoute = url.pathname.match(/^\/api\/entity-sets\/(\d+)$/);
      if (localEntitySetGetRoute && request.method === "GET") return await handleEntitySetDetail(request, env, Number(localEntitySetGetRoute[1]));
      if (url.pathname === "/api/nlp-categorizer/batches" && request.method === "GET") return await listCloudNlpBatches(request, env);
      if (url.pathname === "/api/nlp-categorizer/batches" && request.method === "POST") return await createCloudNlpBatchRoute(request, env);
      const nlpBatchRoute = url.pathname.match(/^\/api\/nlp-categorizer\/batches\/(\d+)$/);
      if (nlpBatchRoute && request.method === "GET") return await getCloudNlpBatch(request, env, Number(nlpBatchRoute[1]));
      if (nlpBatchRoute && request.method === "DELETE") return await deleteCloudNlpBatch(request, env, Number(nlpBatchRoute[1]));
      const nlpExportRoute = url.pathname.match(/^\/api\/nlp-categorizer\/batches\/(\d+)\/export$/);
      if (nlpExportRoute && request.method === "GET") return await exportCloudNlpBatch(request, env, Number(nlpExportRoute[1]));
      const nlpCancelRoute = url.pathname.match(/^\/api\/nlp-categorizer\/batches\/(\d+)\/cancel$/);
      if (nlpCancelRoute && request.method === "POST") return await cancelCloudNlpBatch(request, env, Number(nlpCancelRoute[1]));
      const nlpRetryRoute = url.pathname.match(/^\/api\/nlp-categorizer\/batches\/(\d+)\/retry-failed$/);
      if (nlpRetryRoute && request.method === "POST") return await retryCloudNlpBatch(request, env, Number(nlpRetryRoute[1]));
      const nlpComparisonRoute = url.pathname.match(/^\/api\/nlp-categorizer\/batches\/(\d+)\/llm-comparison$/);
      if (nlpComparisonRoute && request.method === "POST") return await createCloudNlpLlmComparisonRoute(request, env, Number(nlpComparisonRoute[1]));
      const clientDetailRoute = url.pathname.match(/^\/api\/clients\/(\d+)\/detail$/);
      if (clientDetailRoute && request.method === "GET") return await handleClientDetail(request, env, Number(clientDetailRoute[1]));
      const runDetailRoute = url.pathname.match(/^\/api\/runs\/(\d+)\/detail$/);
      if (runDetailRoute && request.method === "GET") return await handleRunDetail(request, env, Number(runDetailRoute[1]));
      const runSheetRowsRoute = url.pathname.match(/^\/api\/runs\/(\d+)\/sheet-rows$/);
      if (runSheetRowsRoute && request.method === "GET") return await handleRunSheetRows(request, env, Number(runSheetRowsRoute[1]));
      if (url.pathname === "/api/ranking-snapshots/compare" && request.method === "GET") return await handleRankingSnapshotCompare(request, env);
      if (url.pathname === "/api/optimization-targets" && request.method === "POST") return await handleOptimizationTargetSave(request, env);
      if (url.pathname === "/api/optimization-targets/status" && request.method === "POST") return await handleOptimizationTargetStatus(request, env);
      if (url.pathname === "/api/content-plans/status" && request.method === "POST") return await handleContentPlanStatus(request, env);
      const rankingSnapshotDetailRoute = url.pathname.match(/^\/api\/ranking-snapshots\/(\d+)\/detail$/);
      if (rankingSnapshotDetailRoute && request.method === "GET") return await handleRankingSnapshotDetail(request, env, Number(rankingSnapshotDetailRoute[1]));
      const entityBatchDetailRoute = url.pathname.match(/^\/api\/entity-batches\/(\d+)\/detail$/);
      if (entityBatchDetailRoute && request.method === "GET") return await handleEntityBatchDetail(request, env, Number(entityBatchDetailRoute[1]));
      const entityRunDetailRoute = url.pathname.match(/^\/api\/entity-runs\/(\d+)\/detail$/);
      if (entityRunDetailRoute && request.method === "GET") return await handleEntityRunDetail(request, env, Number(entityRunDetailRoute[1]));
      if (url.pathname === "/api/entity-sets" && request.method === "POST") return await handleEntitySetSave(request, env);
      const entitySetDetailRoute = url.pathname.match(/^\/api\/entity-sets\/(\d+)\/detail$/);
      if (entitySetDetailRoute && request.method === "GET") return await handleEntitySetDetail(request, env, Number(entitySetDetailRoute[1]));
      const entitySetRoute = url.pathname.match(/^\/api\/entity-sets\/(\d+)$/);
      if (entitySetRoute && request.method === "DELETE") return await handleEntitySetDelete(request, env, Number(entitySetRoute[1]));
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
