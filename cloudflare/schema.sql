CREATE TABLE IF NOT EXISTS sync_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_artifacts (
  local_id TEXT PRIMARY KEY,
  share_report_id INTEGER,
  run_id INTEGER,
  token TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  file_name TEXT,
  content_type TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT,
  r2_key TEXT NOT NULL,
  public_url TEXT,
  uploaded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_key TEXT UNIQUE,
  command_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_json TEXT,
  error TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  claimed_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS bridge_heartbeats (
  bridge_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'online',
  version TEXT,
  allow_cora INTEGER NOT NULL DEFAULT 0,
  allow_paid_tools INTEGER NOT NULL DEFAULT 0,
  poll_interval INTEGER,
  last_poll_at TEXT,
  last_result_json TEXT,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT NOT NULL,
  object_type TEXT,
  object_id TEXT,
  metadata_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'read',
  status TEXT NOT NULL DEFAULT 'active',
  client_ids_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS login_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS tool_policies (
  tool_key TEXT PRIMARY KEY,
  cloud_enabled INTEGER NOT NULL DEFAULT 1,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  per_client_daily_limit INTEGER,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tool_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  project_id INTEGER,
  command_type TEXT NOT NULL,
  execution_mode TEXT,
  units INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY, name TEXT, client TEXT, notes TEXT, created_at TEXT, updated_at TEXT, archived_at TEXT);
CREATE TABLE IF NOT EXISTS cora_domain_lists (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  profile_id INTEGER,
  scope TEXT NOT NULL DEFAULT 'global',
  list_type TEXT NOT NULL,
  value TEXT NOT NULL,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  archived_at TEXT
);
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, profile_id INTEGER, name TEXT, client TEXT, site_domain TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS sites (id INTEGER PRIMARY KEY, project_id INTEGER, domain TEXT, name TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY, site_id INTEGER, url TEXT, title TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS keywords (id INTEGER PRIMARY KEY, project_id INTEGER, site_id INTEGER, page_id INTEGER, keyword TEXT, intent TEXT, priority TEXT, created_at TEXT);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  site_id INTEGER,
  page_id INTEGER,
  keyword_id INTEGER,
  keyword TEXT,
  target_url TEXT,
  target_domain TEXT,
  report_date TEXT,
  imported_at TEXT,
  source_path TEXT,
  archive_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  sha256 TEXT,
  notes TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS serp_results (
  id INTEGER PRIMARY KEY,
  run_id INTEGER,
  rank REAL,
  title TEXT,
  url TEXT,
  host TEXT,
  is_target INTEGER
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY,
  run_id INTEGER,
  factor_id TEXT,
  factor TEXT,
  recommendation TEXT,
  status TEXT,
  details TEXT,
  percent REAL,
  pages REAL,
  max_value REAL,
  min_value REAL,
  average REAL
);

CREATE TABLE IF NOT EXISTS lsi_keywords (
  id INTEGER PRIMARY KEY,
  run_id INTEGER,
  keyword TEXT,
  spearman REAL,
  pearson REAL,
  best_of_both REAL,
  pages REAL,
  max_value REAL,
  average REAL,
  tracked_value REAL,
  deficit REAL
);

CREATE TABLE IF NOT EXISTS sheet_rows (id INTEGER PRIMARY KEY, run_id INTEGER, sheet TEXT, row_index INTEGER, row_json TEXT);
CREATE TABLE IF NOT EXISTS workbook_rows (id INTEGER PRIMARY KEY, run_id INTEGER, sheet TEXT, row_index INTEGER, row_json TEXT);

CREATE TABLE IF NOT EXISTS managed_jobs (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  keyword_id INTEGER,
  keyword TEXT,
  target_url TEXT,
  target_domain TEXT,
  cora_profile TEXT,
  tool TEXT,
  status TEXT,
  status_message TEXT,
  cora_running INTEGER,
  cora_action TEXT,
  progress REAL,
  report_path TEXT,
  run_id INTEGER,
  error TEXT,
  started_at TEXT,
  updated_at TEXT,
  completed_at TEXT,
  last_activity_at TEXT,
  retry_count INTEGER,
  max_retries INTEGER,
  next_retry_at TEXT,
  stall_detected_at TEXT
);

CREATE TABLE IF NOT EXISTS content_plans (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  site_id INTEGER,
  page_id INTEGER,
  keyword_id INTEGER,
  title TEXT,
  content_type TEXT,
  intent TEXT,
  priority TEXT,
  status TEXT,
  due_date TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS entity_lsi_batches (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  seed_keyword TEXT,
  depth INTEGER,
  target_count INTEGER,
  completed_count INTEGER,
  failed_count INTEGER,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS entity_lsi_runs (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  batch_id INTEGER,
  seed_keyword TEXT,
  depth INTEGER,
  api_key_id INTEGER,
  provider TEXT,
  model TEXT,
  status TEXT,
  summary TEXT,
  entities_json TEXT,
  lsi_keywords_json TEXT,
  related_keywords_json TEXT,
  questions_json TEXT,
  topics_json TEXT,
  raw_response TEXT,
  error TEXT,
  created_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS entity_sets (id INTEGER PRIMARY KEY, project_id INTEGER, source_batch_id INTEGER, name TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS entity_set_terms (id INTEGER PRIMARY KEY, set_id INTEGER, term TEXT, normalized TEXT, type TEXT, source_count INTEGER, sources_json TEXT, notes TEXT, created_at TEXT);

CREATE TABLE IF NOT EXISTS share_reports (
  id INTEGER PRIMARY KEY,
  token TEXT,
  run_id INTEGER,
  level TEXT,
  title TEXT,
  notes TEXT,
  ranking_snapshot_id INTEGER,
  entity_set_id INTEGER,
  optimization_target_ids_json TEXT,
  created_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  target TEXT,
  location_code INTEGER,
  language_code TEXT,
  limit_value INTEGER,
  include_subdomains INTEGER,
  overview_json TEXT,
  errors_json TEXT,
  source TEXT,
  freshness TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS ranking_snapshot_keywords (
  id INTEGER PRIMARY KEY,
  snapshot_id INTEGER,
  keyword TEXT,
  ranking_url TEXT,
  position REAL,
  previous_position REAL,
  search_volume REAL,
  cpc REAL,
  competition REAL,
  competition_level TEXT,
  keyword_difficulty REAL,
  estimated_traffic REAL,
  traffic_cost REAL,
  serp_features_json TEXT,
  ai_overview_present INTEGER,
  ai_overview_reference INTEGER,
  intent TEXT,
  last_updated TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS ranking_snapshot_pages (
  id INTEGER PRIMARY KEY,
  snapshot_id INTEGER,
  url TEXT,
  organic_keywords REAL,
  organic_traffic REAL,
  organic_traffic_cost REAL,
  top1 REAL,
  top3 REAL,
  top10 REAL,
  top20 REAL,
  top100 REAL,
  paid_keywords REAL,
  paid_traffic REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS ranking_optimization_targets (
  id INTEGER PRIMARY KEY,
  snapshot_id INTEGER,
  project_id INTEGER,
  url TEXT,
  keyword TEXT,
  best_position REAL,
  ranking_keywords REAL,
  opportunity_count REAL,
  total_search_volume REAL,
  estimated_traffic REAL,
  page_organic_traffic REAL,
  page_organic_keywords REAL,
  top10 REAL,
  priority_type TEXT,
  opportunity_score REAL,
  recommended_action TEXT,
  top_keywords_json TEXT,
  status TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_batches_table ON sync_batches(table_name, received_at);
CREATE INDEX IF NOT EXISTS idx_report_artifacts_token ON report_artifacts(token, artifact_type);
CREATE INDEX IF NOT EXISTS idx_cloud_commands_status ON cloud_commands(status, created_at);
CREATE INDEX IF NOT EXISTS idx_cloud_commands_key ON cloud_commands(command_key);
CREATE INDEX IF NOT EXISTS idx_bridge_heartbeats_seen ON bridge_heartbeats(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_object ON audit_events(object_type, object_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cloud_users_email ON cloud_users(email);
CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes(email, expires_at);
CREATE INDEX IF NOT EXISTS idx_cloud_sessions_hash ON cloud_sessions(session_hash);
CREATE INDEX IF NOT EXISTS idx_tool_usage_command ON tool_usage(command_type, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_project ON tool_usage(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_projects_profile ON projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id);
CREATE INDEX IF NOT EXISTS idx_serp_run ON serp_results(run_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_run ON recommendations(run_id);
CREATE INDEX IF NOT EXISTS idx_lsi_run ON lsi_keywords(run_id);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_project ON ranking_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_ranking_targets_project ON ranking_optimization_targets(project_id, status);
