from __future__ import annotations

import gc
import io
import json
import tempfile
import unittest
from pathlib import Path

import app


class DashboardSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        root = Path(self.tmp.name)
        app.DATA_DIR = root / "data"
        app.ARCHIVE_DIR = app.DATA_DIR / "archive"
        app.DB_PATH = app.DATA_DIR / "test.sqlite3"
        app.QUEUE_PAUSE_PATH = app.DATA_DIR / "queue_paused.flag"
        app.BRIDGE_SETTINGS_PATH = app.DATA_DIR / "cloud_bridge.json"
        app.ACTIVITY_LOG_PATH = app.DATA_DIR / "dashboard_activity.jsonl"
        app.STATIC_DIR = root / "static"
        app.init_db()

    def tearDown(self) -> None:
        gc.collect()
        self.tmp.cleanup()

    def insert_run(self, keyword: str, target_domain: str, sha: str, imported_at: str) -> int:
        con = app.connect()
        try:
            cur = con.execute(
                """
                INSERT INTO runs
                (keyword, target_url, target_domain, imported_at, source_path, archive_path,
                 file_name, file_size, sha256, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    keyword,
                    f"https://{target_domain}/",
                    target_domain,
                    imported_at,
                    f"C:/tmp/{sha}.xlsx",
                    f"C:/archive/{sha}.xlsx",
                    f"{sha}.xlsx",
                    123,
                    sha,
                    "imported",
                ),
            )
            con.commit()
            return int(cur.lastrowid)
        finally:
            con.close()

    def test_project_assignment_model(self) -> None:
        run_id = self.insert_run("test keyword", "example.com", "sha-project", "2026-05-27T10:00:00")
        project = app.create_project(
            "Example Project",
            client="Client",
            site_domain="example.com",
            profile_name="Client Profile",
        )
        site = app.create_site(project["id"], "example.com", "Example")
        page = app.create_page(site["id"], "https://example.com/page", "Page")
        keyword = app.create_keyword(project["id"], "test keyword", site_id=site["id"], page_id=page["id"])

        run = app.assign_run(run_id, project["id"], site["id"], page["id"], keyword["id"])

        self.assertEqual(run["project_id"], project["id"])
        self.assertEqual(run["site_id"], site["id"])
        self.assertEqual(run["page_id"], page["id"])
        self.assertEqual(run["keyword_id"], keyword["id"])

    def test_target_url_matches_exact_domain_and_subdomain_results(self) -> None:
        run = {
            "target_url": "https://example.com/service/",
            "target_domain": "example.com",
        }
        matches = app.target_url_matches(
            run,
            [
                {"rank": 1, "host": "example.com", "url": "https://example.com/service"},
                {"rank": 2, "host": "example.com", "url": "https://example.com/other"},
                {"rank": 3, "host": "blog.example.com", "url": "https://blog.example.com/post"},
                {"rank": 4, "host": "competitor.com", "url": "https://competitor.com/example"},
            ],
        )

        self.assertEqual([match["rank"] for match in matches], [1, 2, 3])
        self.assertEqual(matches[0]["match_type"], "exact_url")
        self.assertEqual(matches[1]["match_type"], "same_domain")
        self.assertEqual(matches[2]["match_type"], "subdomain")

    def test_report_payload_includes_all_target_matches(self) -> None:
        run_id = self.insert_run("test keyword", "example.com", "sha-target-matches", "2026-05-27T10:00:00")
        with app.connect() as con:
            con.executemany(
                """
                INSERT INTO serp_results (run_id, rank, host, title, url)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    (run_id, 1, "competitor.com", "Competitor", "https://competitor.com/"),
                    (run_id, 2, "example.com", "Target Home", "https://example.com/"),
                    (run_id, 3, "blog.example.com", "Target Blog", "https://blog.example.com/post"),
                ],
            )

        payload = app.report_payload(run_id, "basic")

        self.assertEqual([match["rank"] for match in payload["target_matches"]], [2, 3])
        self.assertEqual(payload["target_result"]["rank"], 2)

    def test_api_key_is_masked_in_public_response(self) -> None:
        key = app.create_api_key("OpenAI", "Test", "sk-test-1234567890", notes="temporary")

        self.assertNotIn("key_value", key)
        self.assertEqual(key["key_preview"], "sk-t...7890")
        self.assertEqual(key["key_length"], len("sk-test-1234567890"))
        self.assertEqual(key["provider_key"], "openai")

    def test_dataforseo_credentials_are_masked_and_encoded(self) -> None:
        key = app.create_api_key("DataForSEO", "Test", "login@example.com:api-password")
        request = app.provider_request("dataforseo", "login@example.com:api-password")

        self.assertNotIn("key_value", key)
        self.assertEqual(key["provider_key"], "dataforseo")
        self.assertEqual(key["key_preview"], "login:********")
        self.assertIn("/v3/appendix/user_data", request.full_url)
        self.assertTrue(request.get_header("Authorization", "").startswith("Basic "))

    def test_dataforseo_payload_combines_login_and_password(self) -> None:
        payload = {
            "provider": "dataforseo",
            "api_login": "login@example.com",
            "api_password": "api-password",
        }

        self.assertEqual(app.api_key_value_from_payload("dataforseo", payload), "login@example.com:api-password")

    def test_cloudflare_sync_dry_run_counts_local_tables(self) -> None:
        project = app.create_project("Example", site_domain="example.com")
        app.create_keyword(project["id"], "example keyword")

        result = app.push_cloudflare_sync(tables=["projects", "keywords"], dry_run=True)
        table_counts = {row["table"]: row["rows"] for row in result["tables"]}

        self.assertTrue(result["dry_run"])
        self.assertEqual(table_counts["projects"], 1)
        self.assertEqual(table_counts["keywords"], 1)

    def test_cloudflare_sync_requires_configuration_for_push(self) -> None:
        with self.assertRaisesRegex(ValueError, "not configured"):
            app.push_cloudflare_sync(tables=["projects"], dry_run=False)

    def test_ranking_snapshot_domain_normalization(self) -> None:
        self.assertEqual(app.normalize_ranking_snapshot_target("https://www.Example.com/path/"), "example.com")
        with self.assertRaises(ValueError):
            app.normalize_ranking_snapshot_target("not a domain")

    def test_ranking_snapshot_payload_generation(self) -> None:
        payload = app.ranking_snapshot_payload(
            "example.com",
            location_code=2840,
            language_code="en",
            limit=1000,
            include_subdomains=True,
            order_by=["keyword_data.keyword_info.search_volume,desc"],
        )
        self.assertEqual(payload[0]["target"], "example.com")
        self.assertEqual(payload[0]["location_code"], 2840)
        self.assertTrue(payload[0]["include_subdomains"])
        self.assertEqual(payload[0]["order_by"], ["keyword_data.keyword_info.search_volume,desc"])

    def test_ranking_snapshot_keyword_normalization(self) -> None:
        row = app.normalize_ranked_keyword_item(
            {
                "keyword_data": {
                    "keyword": "pool builders",
                    "keyword_info": {"search_volume": 1200, "cpc": 6.5, "competition": 0.4, "competition_level": "MEDIUM"},
                    "keyword_properties": {"keyword_difficulty": 42},
                    "serp_info": {"serp_item_types": ["organic", "ai_overview"]},
                    "search_intent_info": {"main_intent": "commercial"},
                },
                "ranked_serp_element": {
                    "serp_item": {
                        "url": "https://example.com/pools",
                        "rank_absolute": 8,
                        "previous_rank_absolute": 11,
                        "etv": 55.2,
                    }
                },
            }
        )
        self.assertEqual(row["keyword"], "pool builders")
        self.assertEqual(row["rankingUrl"], "https://example.com/pools")
        self.assertEqual(row["position"], 8)
        self.assertTrue(row["aiOverviewPresent"])

    def test_ranking_snapshot_page_normalization(self) -> None:
        row = app.normalize_relevant_page_item(
            {
                "page_address": "https://example.com/service",
                "metrics": {
                    "organic": {"count": 44, "etv": 321.5, "estimated_paid_traffic_cost": 123.4, "pos_distribution": {"pos_1": 2, "pos_2_3": 4, "pos_4_10": 8}},
                    "paid": {"count": 3, "etv": 12},
                },
            }
        )
        self.assertEqual(row["url"], "https://example.com/service")
        self.assertEqual(row["organicKeywords"], 44)
        self.assertEqual(row["top3"], 4)
        self.assertEqual(row["paidKeywords"], 3)

    def test_ranking_snapshot_opportunity_classification(self) -> None:
        opportunities = app.classify_ranking_opportunities(
            [
                {"keyword": "alpha", "position": 7, "searchVolume": 1500, "rankingUrl": "https://example.com/a", "estimatedTraffic": 10, "cpc": 2},
                {"keyword": "beta", "position": 17, "previousPosition": 9, "searchVolume": 100, "rankingUrl": "https://example.com/b"},
                {"keyword": "gamma", "position": 22, "searchVolume": 2000, "aiOverviewPresent": True, "aiOverviewReference": False},
            ],
            high_volume_threshold=1000,
        )
        labels = {(row["keyword"], row["opportunityType"]) for row in opportunities}
        self.assertIn(("alpha", "Page One Wins"), labels)
        self.assertIn(("beta", "Page Two Opportunities"), labels)
        self.assertIn(("gamma", "AI Overview Opportunities"), labels)
        self.assertIn(("gamma", "High Volume Opportunities"), labels)

    def test_ranking_snapshot_partial_failure_is_saved(self) -> None:
        original = app.dataforseo_post

        def fake_post(path: str, payload: list[dict[str, object]], timeout: int = 90) -> dict[str, object]:
            if "relevant_pages" in path:
                raise ValueError("timeout")
            if "ranked_keywords" in path:
                return {"tasks": [{"result": [{"items": [{"keyword": "pool builders", "url": "https://example.com/", "rank_absolute": 12, "search_volume": 300}]}]}]}
            return {"tasks": [{"result": [{"items": [{"metrics": {"organic": {"count": 1, "etv": 10}}}]}]}]}

        app.dataforseo_post = fake_post
        try:
            project = app.create_project("Example", site_domain="example.com")
            data = app.create_or_get_ranking_snapshot({"project_id": project["id"], "target": "example.com"})
        finally:
            app.dataforseo_post = original

        self.assertTrue(data["meta"]["partial"])
        self.assertIn("pages", data["meta"]["errors"])
        self.assertEqual(len(data["keywords"]), 1)

    def test_ranking_snapshot_cache_hit_vs_force_refresh(self) -> None:
        original = app.dataforseo_post
        calls: list[str] = []

        def fake_post(path: str, payload: list[dict[str, object]], timeout: int = 90) -> dict[str, object]:
            calls.append(path)
            if "ranked_keywords" in path:
                return {"tasks": [{"result": [{"items": [{"keyword": "alpha", "url": "https://example.com/a", "rank_absolute": 5}]}]}]}
            if "relevant_pages" in path:
                return {"tasks": [{"result": [{"items": [{"page_address": "https://example.com/a", "metrics": {"organic": {"count": 1, "etv": 2}}}]}]}]}
            return {"tasks": [{"result": [{"items": [{"metrics": {"organic": {"count": 1, "etv": 2}}}]}]}]}

        app.dataforseo_post = fake_post
        try:
            project = app.create_project("Example", site_domain="example.com")
            first = app.create_or_get_ranking_snapshot({"project_id": project["id"], "target": "example.com"})
            second = app.create_or_get_ranking_snapshot({"project_id": project["id"], "target": "https://www.example.com/"})
            forced = app.create_or_get_ranking_snapshot({"project_id": project["id"], "target": "example.com", "force_refresh": True})
        finally:
            app.dataforseo_post = original

        self.assertFalse(first["meta"]["cached"])
        self.assertTrue(second["meta"]["cached"])
        self.assertFalse(forced["meta"]["cached"])
        self.assertEqual(len(calls), 6)

    def test_ranking_snapshot_queue_cora_creates_keyword_and_job(self) -> None:
        project = app.create_project("Example", site_domain="example.com", profile_name="Example Cora")
        app.set_queue_paused(True, reason="test")

        result = app.queue_ranking_snapshot_cora_job(
            project["id"],
            "ranking snapshot keyword",
            "https://example.com/ranking-page",
        )

        self.assertTrue(result["created_keyword"])
        self.assertEqual(result["keyword"]["keyword"], "ranking snapshot keyword")
        self.assertEqual(result["job"]["project_id"], project["id"])
        self.assertEqual(result["job"]["keyword_id"], result["keyword"]["id"])
        self.assertEqual(result["job"]["target_url"], "https://example.com/ranking-page")

    def test_ranking_optimization_targets_save_status_and_report_payload(self) -> None:
        project = app.create_project("Example", site_domain="example.com")
        run_id = self.insert_run("alpha", "example.com", "sha-ranking-targets", "2026-05-27T10:00:00")
        app.assign_run(run_id, project["id"], None, None, None)
        snapshot_id = app.save_ranking_snapshot(
            project["id"],
            "example.com",
            2840,
            "en",
            1000,
            False,
            {},
            [{"keyword": "alpha", "rankingUrl": "https://example.com/a", "position": 7, "searchVolume": 500, "estimatedTraffic": 20}],
            [{"url": "https://example.com/a", "organicKeywords": 3, "organicTraffic": 30}],
            {},
        )

        saved = app.save_ranking_optimization_targets(
            {
                "snapshot_id": snapshot_id,
                "project_id": project["id"],
                "targets": [
                    {
                        "url": "https://example.com/a",
                        "keyword": "alpha",
                        "bestPosition": 7,
                        "rankingKeywords": 1,
                        "opportunityCount": 1,
                        "totalSearchVolume": 500,
                        "estimatedTraffic": 20,
                        "priorityType": "Top 3 Push",
                        "opportunityScore": 72,
                        "recommendedAction": "Improve page.",
                    }
                ],
            }
        )
        target_id = saved["saved_ids"][0]

        updated = app.update_ranking_optimization_target_status([target_id], "in_cora")
        payload = app.report_payload(run_id, "medium", snapshot_id, [target_id], None)

        self.assertEqual(updated["targets"][0]["status"], "in_cora")
        self.assertEqual(payload["optimization_targets"][0]["url"], "https://example.com/a")
        self.assertEqual(payload["ranking_snapshot"]["id"], snapshot_id)

    def test_ranking_optimization_targets_reject_cross_client_save_and_report(self) -> None:
        project_a = app.create_project("Client A", site_domain="a.example")
        project_b = app.create_project("Client B", site_domain="b.example")
        run_id = self.insert_run("alpha", "a.example", "sha-cross-client-targets", "2026-05-27T10:00:00")
        app.assign_run(run_id, project_a["id"], None, None, None)
        snapshot_a = app.save_ranking_snapshot(
            project_a["id"],
            "a.example",
            2840,
            "en",
            1000,
            False,
            {},
            [{"keyword": "alpha", "rankingUrl": "https://a.example/a", "position": 7}],
            [],
            {},
        )
        snapshot_b = app.save_ranking_snapshot(
            project_b["id"],
            "b.example",
            2840,
            "en",
            1000,
            False,
            {},
            [{"keyword": "beta", "rankingUrl": "https://b.example/b", "position": 7}],
            [],
            {},
        )

        with self.assertRaisesRegex(ValueError, "same client"):
            app.save_ranking_optimization_targets(
                {
                    "snapshot_id": snapshot_a,
                    "project_id": project_b["id"],
                    "targets": [{"url": "https://a.example/a", "keyword": "alpha"}],
                }
            )

        saved_b = app.save_ranking_optimization_targets(
            {
                "snapshot_id": snapshot_b,
                "project_id": project_b["id"],
                "targets": [{"url": "https://b.example/b", "keyword": "beta"}],
            }
        )
        with self.assertRaisesRegex(ValueError, "same client"):
            app.report_payload(run_id, "medium", snapshot_b, [saved_b["saved_ids"][0]], None)

    def test_ranking_snapshot_comparison_tracks_keyword_and_page_movement(self) -> None:
        project = app.create_project("Example", site_domain="example.com")
        base_id = app.save_ranking_snapshot(
            project["id"],
            "example.com",
            2840,
            "en",
            1000,
            False,
            {},
            [
                {"keyword": "alpha", "rankingUrl": "https://example.com/a", "position": 10, "searchVolume": 100, "estimatedTraffic": 5},
                {"keyword": "beta", "rankingUrl": "https://example.com/b", "position": 4, "searchVolume": 100, "estimatedTraffic": 10},
                {"keyword": "lost term", "rankingUrl": "https://example.com/lost", "position": 8, "searchVolume": 50, "estimatedTraffic": 3},
            ],
            [
                {"url": "https://example.com/a", "organicKeywords": 2, "organicTraffic": 10},
                {"url": "https://example.com/lost", "organicKeywords": 1, "organicTraffic": 3},
            ],
            {},
        )
        compare_id = app.save_ranking_snapshot(
            project["id"],
            "example.com",
            2840,
            "en",
            1000,
            False,
            {},
            [
                {"keyword": "alpha", "rankingUrl": "https://example.com/a", "position": 3, "searchVolume": 100, "estimatedTraffic": 20},
                {"keyword": "beta", "rankingUrl": "https://example.com/b", "position": 9, "searchVolume": 100, "estimatedTraffic": 4},
                {"keyword": "new term", "rankingUrl": "https://example.com/new", "position": 12, "searchVolume": 75, "estimatedTraffic": 2},
            ],
            [
                {"url": "https://example.com/a", "organicKeywords": 4, "organicTraffic": 25},
                {"url": "https://example.com/new", "organicKeywords": 1, "organicTraffic": 2},
            ],
            {},
        )

        data = app.compare_ranking_snapshots(base_id, compare_id)

        self.assertEqual(data["summary"]["newKeywords"], 1)
        self.assertEqual(data["summary"]["lostKeywords"], 1)
        self.assertEqual(data["summary"]["improvedKeywords"], 1)
        self.assertEqual(data["summary"]["declinedKeywords"], 1)
        self.assertEqual(data["improvedKeywords"][0]["keyword"], "alpha")
        self.assertEqual(data["improvedKeywords"][0]["positionDelta"], -7)
        self.assertEqual(data["declinedKeywords"][0]["keyword"], "beta")
        self.assertTrue(any(row["url"] == "https://example.com/a" and row["organicTrafficDelta"] == 15 for row in data["pages"]))

    def test_entity_lsi_run_is_stored_with_parsed_results(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        app.create_keyword(project["id"], "pool builders")
        key = app.create_api_key("OpenAI", "Production", "sk-test-entity", default_model="gpt-test")
        original = app.call_llm_provider

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            self.assertEqual(provider_key, "openai")
            self.assertEqual(key_value, "sk-test-entity")
            self.assertEqual(model, "gpt-test")
            self.assertIn("pool builders", prompt)
            return '{"summary":"Use topical coverage.","entities":[{"name":"Swimming Pool","type":"service","relevance_score":99}],"lsi_terms":[{"term":"custom pool design"}],"related_keywords":[{"keyword":"pool contractor"}],"questions":[{"question":"How much does a pool cost?"}],"topic_clusters":[{"cluster":"Design","terms":["layout"]}],"warnings":[]}'

        try:
            app.call_llm_provider = fake_call
            run = app.create_entity_lsi_run(project["id"], "pool builders", 4, key["id"])
        finally:
            app.call_llm_provider = original

        self.assertEqual(run["status"], "complete")
        self.assertEqual(run["depth"], 4)
        self.assertEqual(run["result"]["entities"][0]["name"], "Swimming Pool")
        saved = app.list_entity_lsi_runs(project["id"])
        self.assertEqual(len(saved), 1)
        self.assertNotIn("raw_response", saved[0])
        self.assertNotIn("prompt", saved[0])

    def test_entity_lsi_multi_target_creates_one_run_per_model(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        openai = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        anthropic = app.create_api_key("Anthropic", "Production", "sk-ant-test", default_model="claude-a")
        original = app.call_llm_provider
        calls = []

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            calls.append((provider_key, model))
            return '{"summary":"ok","entities":[{"name":"Dispatch"}],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        try:
            app.call_llm_provider = fake_call
            runs = app.create_entity_lsi_runs(
                project["id"],
                "fire station alerting system",
                3,
                [
                    {"api_key_id": openai["id"], "model": "gpt-a"},
                    {"api_key_id": anthropic["id"], "model": "claude-a"},
                ],
            )
        finally:
            app.call_llm_provider = original

        self.assertEqual(len(runs), 2)
        self.assertEqual(calls, [("openai", "gpt-a"), ("anthropic", "claude-a")])
        saved = app.list_entity_lsi_runs(project["id"])
        self.assertEqual(len(saved), 2)
        self.assertEqual({run["model"] for run in saved}, {"gpt-a", "claude-a"})
        self.assertTrue(all(run["batch_id"] for run in saved))
        batches = app.list_entity_lsi_batches(project["id"])
        self.assertEqual(len(batches), 1)
        self.assertEqual(batches[0]["target_count"], 2)
        self.assertEqual(batches[0]["complete_count"], 2)

    def test_entity_lsi_async_batch_queues_runs_then_processes_progress(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        openai = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        anthropic = app.create_api_key("Anthropic", "Production", "sk-ant-test", default_model="claude-a")
        original_call = app.call_llm_provider
        original_worker = app.start_entity_lsi_batch_worker
        calls = []
        started = []

        def fake_worker(batch_id: int) -> None:
            started.append(batch_id)

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            calls.append((provider_key, model))
            return '{"summary":"ok","entities":[{"name":"Dispatch"}],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        try:
            app.start_entity_lsi_batch_worker = fake_worker
            app.call_llm_provider = fake_call
            runs = app.create_entity_lsi_runs(
                project["id"],
                "fire station alerting system",
                3,
                [
                    {"api_key_id": openai["id"], "model": "gpt-a"},
                    {"api_key_id": anthropic["id"], "model": "claude-a"},
                ],
                run_async=True,
            )
            batch_id = int(runs[0]["batch_id"])
            queued = app.get_entity_lsi_batch(batch_id)
            self.assertEqual(started, [batch_id])
            self.assertEqual(calls, [])
            self.assertEqual(queued["batch"]["status"], "running")
            self.assertEqual(queued["progress"]["queued"], 2)
            self.assertEqual(queued["progress"]["finished"], 0)

            processed = app.process_entity_lsi_batch(batch_id)
        finally:
            app.call_llm_provider = original_call
            app.start_entity_lsi_batch_worker = original_worker

        self.assertEqual(calls, [("openai", "gpt-a"), ("anthropic", "claude-a")])
        self.assertEqual(processed["batch"]["status"], "complete")
        self.assertEqual(processed["progress"]["percent"], 100)
        self.assertEqual(processed["progress"]["complete"], 2)

    def test_entity_lsi_batch_crossover_counts_sources(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        openai = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        anthropic = app.create_api_key("Anthropic", "Production", "sk-ant-test", default_model="claude-a")
        original = app.call_llm_provider

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            entity = "Dispatch" if provider_key == "openai" else "dispatch"
            return '{"summary":"ok","entities":[{"name":"' + entity + '"},{"name":"Unique ' + provider_key + '"}],"lsi_terms":[{"term":"station alerts"}],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        try:
            app.call_llm_provider = fake_call
            runs = app.create_entity_lsi_runs(
                project["id"],
                "fire station alerting system",
                3,
                [
                    {"api_key_id": openai["id"], "model": "gpt-a"},
                    {"api_key_id": anthropic["id"], "model": "claude-a"},
                ],
            )
        finally:
            app.call_llm_provider = original

        batch = app.get_entity_lsi_batch(int(runs[0]["batch_id"]))
        dispatch = next(row for row in batch["crossover"] if row["normalized"] == "dispatch")
        station_alerts = next(row for row in batch["crossover"] if row["normalized"] == "station alerts")
        self.assertEqual(dispatch["source_count"], 2)
        self.assertEqual(station_alerts["type"], "lsi")
        self.assertEqual(station_alerts["source_count"], 2)

    def test_entity_set_saves_selected_crossover_terms(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        openai = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        anthropic = app.create_api_key("Anthropic", "Production", "sk-ant-test", default_model="claude-a")
        original = app.call_llm_provider

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            entity = "Dispatch" if provider_key == "openai" else "dispatch"
            return '{"summary":"ok","entities":[{"name":"' + entity + '"}],"lsi_terms":[{"term":"station alerts"}],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        try:
            app.call_llm_provider = fake_call
            runs = app.create_entity_lsi_runs(
                project["id"],
                "fire station alerting system",
                3,
                [
                    {"api_key_id": openai["id"], "model": "gpt-a"},
                    {"api_key_id": anthropic["id"], "model": "claude-a"},
                ],
            )
        finally:
            app.call_llm_provider = original

        batch = app.get_entity_lsi_batch(int(runs[0]["batch_id"]))
        selected = [row for row in batch["crossover"] if row["normalized"] in {"dispatch", "station alerts"}]
        saved = app.create_entity_set(project["id"], "Approved Fire Station Terms", selected, int(batch["batch"]["id"]))

        self.assertEqual(saved["set"]["name"], "Approved Fire Station Terms")
        self.assertEqual(len(saved["terms"]), 2)
        self.assertEqual({term["normalized"] for term in saved["terms"]}, {"dispatch", "station alerts"})
        dispatch = next(term for term in saved["terms"] if term["normalized"] == "dispatch")
        self.assertEqual(dispatch["source_count"], 2)
        self.assertEqual(len(dispatch["sources"]), 2)
        listed = app.list_entity_sets(project["id"])
        self.assertEqual(listed[0]["term_count"], 2)

    def test_entity_set_rejects_source_batch_from_other_client(self) -> None:
        first = app.create_project("First Client", site_domain="https://one.example")
        second = app.create_project("Second Client", site_domain="https://two.example")
        key = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        original = app.call_llm_provider

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            return '{"summary":"ok","entities":[{"name":"Dispatch"}],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        try:
            app.call_llm_provider = fake_call
            runs = app.create_entity_lsi_runs(first["id"], "dispatch", 3, [{"api_key_id": key["id"], "model": "gpt-a"}])
        finally:
            app.call_llm_provider = original

        with self.assertRaises(ValueError):
            app.create_entity_set(
                second["id"],
                "Wrong Client Terms",
                [{"term": "Dispatch", "type": "entity", "normalized": "dispatch"}],
                int(runs[0]["batch_id"]),
            )

    def test_entity_lsi_batch_retries_failed_runs_in_place(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        openai = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        anthropic = app.create_api_key("Anthropic", "Production", "sk-ant-test", default_model="claude-a")
        original = app.call_llm_provider

        def failing_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            if provider_key == "anthropic":
                raise RuntimeError("temporary provider failure")
            return '{"summary":"ok","entities":[{"name":"Dispatch"}],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        def retry_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            return '{"summary":"retry ok","entities":[{"name":"Station Alerting"}],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        try:
            app.call_llm_provider = failing_call
            runs = app.create_entity_lsi_runs(
                project["id"],
                "fire station alerting system",
                3,
                [
                    {"api_key_id": openai["id"], "model": "gpt-a"},
                    {"api_key_id": anthropic["id"], "model": "claude-a"},
                ],
            )
            batch_id = int(runs[0]["batch_id"])
            before = app.get_entity_lsi_batch(batch_id)
            self.assertEqual(before["batch"]["status"], "partial")
            self.assertEqual(before["batch"]["failed_count"], 1)

            app.call_llm_provider = retry_call
            after = app.retry_failed_entity_lsi_batch(batch_id)
        finally:
            app.call_llm_provider = original

        self.assertEqual(after["batch"]["status"], "complete")
        self.assertEqual(after["batch"]["failed_count"], 0)
        self.assertEqual(after["batch"]["complete_count"], 2)
        self.assertEqual(len(after["retried"]), 1)
        self.assertTrue(all(run["status"] == "complete" for run in after["runs"]))

    def test_entity_lsi_batch_cancel_remaining_marks_queued_runs(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        openai = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        anthropic = app.create_api_key("Anthropic", "Production", "sk-ant-test", default_model="claude-a")
        original_worker = app.start_entity_lsi_batch_worker

        try:
            app.start_entity_lsi_batch_worker = lambda batch_id: None
            runs = app.create_entity_lsi_runs(
                project["id"],
                "fire station alerting system",
                3,
                [
                    {"api_key_id": openai["id"], "model": "gpt-a"},
                    {"api_key_id": anthropic["id"], "model": "claude-a"},
                ],
                run_async=True,
            )
            batch_id = int(runs[0]["batch_id"])
            data = app.cancel_remaining_entity_lsi_batch(batch_id)
        finally:
            app.start_entity_lsi_batch_worker = original_worker

        self.assertEqual(data["cancelled_count"], 2)
        self.assertEqual(data["batch"]["status"], "cancelled")
        self.assertEqual(data["progress"]["cancelled"], 2)
        self.assertEqual(data["progress"]["finished"], 2)
        self.assertEqual(data["progress"]["percent"], 100)
        self.assertTrue(all(run["status"] == "cancelled" for run in data["runs"]))

    def test_cora_report_import_adds_cora_source_to_entity_crossover(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        openai = app.create_api_key("OpenAI", "Production", "sk-test-openai", default_model="gpt-a")
        cora_run_id = self.insert_run("fire station alerting system", "example.com", "cora-entity-import", "2026-05-28T09:00:00")
        with app.connect() as con:
            con.execute("UPDATE runs SET project_id = ? WHERE id = ?", (project["id"], cora_run_id))
            con.execute(
                """
                INSERT INTO workbook_rows (run_id, sheet, row_index, column_count, row_json)
                VALUES (?, 'Entities', 2, 2, ?)
                """,
                (cora_run_id, json.dumps(["Dispatch", "recommended entity"])),
            )
            con.execute(
                """
                INSERT INTO lsi_keywords (run_id, keyword, best_of_both)
                VALUES (?, 'station alerts', 0.88)
                """,
                (cora_run_id,),
            )
        original = app.call_llm_provider

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            return '{"summary":"ok","entities":[{"name":"Dispatch"}],"lsi_terms":[{"term":"station alerts"}],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'

        try:
            app.call_llm_provider = fake_call
            runs = app.create_entity_lsi_runs(
                project["id"],
                "fire station alerting system",
                3,
                [{"api_key_id": openai["id"], "model": "gpt-a"}],
            )
        finally:
            app.call_llm_provider = original

        batch = app.import_cora_report_to_entity_batch(int(runs[0]["batch_id"]), cora_run_id)
        self.assertTrue(any(run["provider_key"] == "cora" for run in batch["runs"]))
        dispatch = next(row for row in batch["crossover"] if row["normalized"] == "dispatch")
        station_alerts = next(row for row in batch["crossover"] if row["normalized"] == "station alerts")
        self.assertEqual(dispatch["source_count"], 2)
        self.assertEqual(station_alerts["source_count"], 2)

    def test_entity_lsi_rejects_non_llm_provider(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        key = app.create_api_key("DataForSEO", "Production", "login@example.com:password")

        with self.assertRaises(ValueError):
            app.create_entity_lsi_run(project["id"], "pool builders", 3, key["id"])

    def test_anthropic_entity_lsi_payload_omits_temperature(self) -> None:
        original = app.post_json_request
        captured = {}

        def fake_post(url: str, headers: dict, payload: dict, timeout: int = 90) -> dict:
            captured["payload"] = payload
            return {"content": [{"text": '{"summary":"ok","entities":[],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'}]}

        try:
            app.post_json_request = fake_post
            text = app.call_llm_provider(
                "anthropic",
                "sk-ant-test",
                "https://api.anthropic.com",
                "claude-opus-4-8",
                "Return JSON",
            )
        finally:
            app.post_json_request = original

        self.assertIn('"summary":"ok"', text)
        self.assertNotIn("temperature", captured["payload"])
        self.assertIn("tools", captured["payload"])
        self.assertEqual(captured["payload"]["tool_choice"]["name"], "save_entity_lsi_exploration")

    def test_anthropic_entity_lsi_extracts_tool_input(self) -> None:
        original = app.post_json_request

        def fake_post(url: str, headers: dict, payload: dict, timeout: int = 90) -> dict:
            return {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "save_entity_lsi_exploration",
                        "input": {
                            "summary": "ok",
                            "entities": [{"name": "Local SEO"}],
                            "lsi_terms": [],
                            "related_keywords": [],
                            "questions": [],
                            "topic_clusters": [],
                            "warnings": [],
                        },
                    }
                ]
            }

        try:
            app.post_json_request = fake_post
            text = app.call_llm_provider(
                "anthropic",
                "sk-ant-test",
                "https://api.anthropic.com",
                "claude-opus-4-8",
                "Return JSON",
            )
        finally:
            app.post_json_request = original

        parsed = app.parse_llm_json_text(text)
        self.assertEqual(parsed["entities"][0]["name"], "Local SEO")

    def test_openai_entity_lsi_payload_omits_temperature(self) -> None:
        original = app.post_json_request
        captured = {}

        def fake_post(url: str, headers: dict, payload: dict, timeout: int = 90) -> dict:
            captured["url"] = url
            captured["payload"] = payload
            captured["timeout"] = timeout
            return {"choices": [{"message": {"content": '{"summary":"ok","entities":[],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'}}]}

        try:
            app.post_json_request = fake_post
            text = app.call_llm_provider(
                "openai",
                "sk-test",
                "https://api.openai.com",
                "gpt-5.5",
                "Return JSON",
            )
        finally:
            app.post_json_request = original

        self.assertIn('"summary":"ok"', text)
        self.assertEqual(captured["url"], "https://api.openai.com/v1/chat/completions")
        self.assertEqual(captured["timeout"], 240)
        self.assertNotIn("temperature", captured["payload"])

    def test_google_entity_lsi_uses_extended_timeout(self) -> None:
        original = app.post_json_request
        captured = {}

        def fake_post(url: str, headers: dict, payload: dict, timeout: int = 90) -> dict:
            captured["url"] = url
            captured["timeout"] = timeout
            return {"candidates": [{"content": {"parts": [{"text": '{"summary":"ok","entities":[],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'}]}}]}

        try:
            app.post_json_request = fake_post
            text = app.call_llm_provider(
                "google",
                "AIza-test",
                "https://generativelanguage.googleapis.com",
                "gemini-3.5-flash",
                "Return JSON",
            )
        finally:
            app.post_json_request = original

        self.assertIn('"summary":"ok"', text)
        self.assertIn("/v1beta/models/gemini-3.5-flash:generateContent", captured["url"])
        self.assertEqual(captured["timeout"], 180)

    def test_post_json_request_retries_transient_http_errors(self) -> None:
        original_urlopen = app.urllib.request.urlopen
        original_sleep = app.time.sleep
        calls = []

        class FakeResponse:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self) -> bytes:
                return b'{"ok": true}'

        def fake_urlopen(request, timeout: int = 90):
            calls.append(timeout)
            if len(calls) == 1:
                raise app.urllib.error.HTTPError(
                    request.full_url,
                    503,
                    "Unavailable",
                    {},
                    io.BytesIO(b'{"error":{"message":"high demand","status":"UNAVAILABLE"}}'),
                )
            return FakeResponse()

        try:
            app.urllib.request.urlopen = fake_urlopen
            app.time.sleep = lambda _seconds: None
            data = app.post_json_request("https://example.test/v1", {}, {"hello": "world"}, timeout=17)
        finally:
            app.urllib.request.urlopen = original_urlopen
            app.time.sleep = original_sleep

        self.assertEqual(data["ok"], True)
        self.assertEqual(calls, [17, 17])

    def test_perplexity_sonar_entity_lsi_uses_sonar_endpoint(self) -> None:
        original = app.post_json_request
        captured = {}

        def fake_post(url: str, headers: dict, payload: dict, timeout: int = 90) -> dict:
            captured["url"] = url
            captured["payload"] = payload
            captured["timeout"] = timeout
            return {"choices": [{"message": {"content": '{"summary":"ok","entities":[{"name":"Search"}],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'}}]}

        try:
            app.post_json_request = fake_post
            text = app.call_llm_provider(
                "perplexity",
                "pplx-test",
                "https://api.perplexity.ai",
                "perplexity/sonar",
                "Return JSON",
            )
        finally:
            app.post_json_request = original

        parsed = app.parse_llm_json_text(text)
        self.assertEqual(parsed["entities"][0]["name"], "Search")
        self.assertEqual(captured["url"], "https://api.perplexity.ai/v1/sonar")
        self.assertEqual(captured["payload"]["model"], "sonar")
        self.assertEqual(captured["timeout"], 240)
        self.assertNotIn("temperature", captured["payload"])

    def test_perplexity_routed_model_entity_lsi_uses_agent_endpoint(self) -> None:
        original = app.post_json_request
        captured = {}

        def fake_post(url: str, headers: dict, payload: dict, timeout: int = 90) -> dict:
            captured["url"] = url
            captured["payload"] = payload
            captured["timeout"] = timeout
            return {
                "output": [
                    {
                        "content": [
                            {"text": '{"summary":"ok","entities":[{"name":"Search"}],"lsi_terms":[],"related_keywords":[],"questions":[],"topic_clusters":[],"warnings":[]}'}
                        ]
                    }
                ]
            }

        try:
            app.post_json_request = fake_post
            text = app.call_llm_provider(
                "perplexity",
                "pplx-test",
                "https://api.perplexity.ai",
                "openai/gpt-5.4",
                "Return JSON",
            )
        finally:
            app.post_json_request = original

        parsed = app.parse_llm_json_text(text)
        self.assertEqual(parsed["entities"][0]["name"], "Search")
        self.assertEqual(captured["url"], "https://api.perplexity.ai/v1/agent")
        self.assertEqual(captured["payload"]["model"], "openai/gpt-5.4")
        self.assertEqual(captured["timeout"], 240)
        self.assertNotIn("temperature", captured["payload"])

    def test_entity_lsi_parse_failure_preserves_raw_response(self) -> None:
        project = app.create_project("Entity Client", site_domain="https://example.com")
        key = app.create_api_key("OpenAI", "Production", "sk-test-entity", default_model="gpt-test")
        original = app.call_llm_provider

        def fake_call(provider_key: str, key_value: str, base_url: str, model: str, prompt: str, timeout: int = 90) -> str:
            return '{"summary":"broken","entities":[{"name":"SEO" "type":"topic"}]}'

        try:
            app.call_llm_provider = fake_call
            run = app.create_entity_lsi_run(project["id"], "seo", 3, key["id"])
        finally:
            app.call_llm_provider = original

        self.assertEqual(run["status"], "failed")
        with app.connect() as con:
            row = con.execute("SELECT raw_response FROM entity_lsi_runs WHERE id = ?", (run["id"],)).fetchone()
        self.assertIn('"summary":"broken"', row["raw_response"])

    def test_ai_provider_key_test_result_is_stored_without_secret(self) -> None:
        key = app.create_api_key("xai", "Production", "xai-test-secret-123456", base_url="https://api.x.ai")
        original = app.test_ai_provider_key

        def fake_test(provider: str, key_value: str, base_url: str | None = None, timeout: int = 12) -> dict:
            self.assertEqual(provider, "xAI / Grok")
            self.assertEqual(key_value, "xai-test-secret-123456")
            return {
                "ok": False,
                "provider_key": "xai",
                "provider_name": "xAI / Grok",
                "status_code": 401,
                "status": "failed",
                "message": "Invalid key xai-test-secret-123456",
                "tested_at": "2026-05-28T08:00:00",
            }

        try:
            app.test_ai_provider_key = fake_test
            result = app.test_api_key_payload({"key_id": key["id"]})
        finally:
            app.test_ai_provider_key = original

        self.assertFalse(result["ok"])
        with app.connect() as con:
            row = con.execute("SELECT status, last_tested_at, last_error, key_value FROM api_keys WHERE id = ?", (key["id"],)).fetchone()
        self.assertEqual(row["status"], "failed")
        self.assertEqual(row["last_tested_at"], "2026-05-28T08:00:00")
        self.assertIn("Invalid key", row["last_error"])
        self.assertNotIn("xai-test-secret-123456", row["last_error"])
        self.assertEqual(row["key_value"], "xai-test-secret-123456")

    def test_content_plan_model(self) -> None:
        project = app.create_project(
            "Planner Project",
            client="Client",
            site_domain="example.com",
            profile_name="Planner Profile",
        )
        site = app.create_site(project["id"], "example.com", "Example")
        page = app.create_page(site["id"], "https://example.com/service", "Service")
        keyword = app.create_keyword(project["id"], "service keyword", site_id=site["id"], page_id=page["id"])

        plan = app.create_content_plan(
            project["id"],
            "Update service page",
            site_id=site["id"],
            page_id=page["id"],
            keyword_id=keyword["id"],
            content_type="Page Update",
            intent="Commercial",
            priority="High",
            due_date="2026-06-01",
            notes="Use Cora recommendations for the brief.",
        )

        self.assertEqual(plan["project_id"], project["id"])
        self.assertEqual(plan["page_id"], page["id"])
        self.assertEqual(plan["keyword_id"], keyword["id"])
        self.assertEqual(plan["status"], "planned")
        self.assertEqual(plan["priority"], "High")

    def test_project_can_create_or_reuse_profile(self) -> None:
        first = app.create_project("First Project", client="Client", profile_name="Shared Profile")
        second = app.create_project("Second Project", client="Client", profile_name="shared profile")

        self.assertEqual(first["profile_id"], second["profile_id"])
        self.assertEqual(first["profile_name"], "Shared Profile")

        third = app.create_project("Third Project", profile_id=first["profile_id"])

        self.assertEqual(third["profile_id"], first["profile_id"])

        no_profile = app.create_project("No Profile Project")

        self.assertIsNone(no_profile["profile_id"])

    def test_project_profile_can_be_attached_created_and_detached(self) -> None:
        project = app.create_project("Attach Profile Project", client="Client")
        existing = app.create_profile("Existing Cora Profile")

        attached = app.attach_project_profile(project["id"], profile_id=existing["id"])

        self.assertEqual(attached["profile_id"], existing["id"])
        self.assertEqual(attached["profile_name"], "Existing Cora Profile")

        created = app.attach_project_profile(project["id"], profile_name="New Client Cora Profile")

        self.assertNotEqual(created["profile_id"], existing["id"])
        self.assertEqual(created["profile_name"], "New Client Cora Profile")

        detached = app.attach_project_profile(project["id"], detach=True)

        self.assertIsNone(detached["profile_id"])
        self.assertIsNone(detached["profile_name"])

    def test_profile_metadata_can_be_edited_without_duplicate_names(self) -> None:
        profile = app.create_profile("Original Profile", client="Old Client", notes="Old notes")
        other = app.create_profile("Other Profile")

        updated = app.update_profile(profile["id"], "Edited Profile", client="New Client", notes="New notes")

        self.assertEqual(updated["name"], "Edited Profile")
        self.assertEqual(updated["client"], "New Client")
        self.assertEqual(updated["notes"], "New notes")

        with self.assertRaises(ValueError):
            app.update_profile(profile["id"], other["name"])

    def test_placeholder_tool_accepts_selected_client_keywords(self) -> None:
        project = app.create_project("Client", site_domain="https://example.com")
        keyword = app.create_keyword(project["id"], "example keyword")

        result = app.run_client_tool(project["id"], [keyword["id"]], "entity-lsi")

        self.assertTrue(result["placeholder"])
        self.assertEqual(result["keyword_ids"], [keyword["id"]])

    def test_compare_runs_reports_rank_and_content_changes(self) -> None:
        base_id = self.insert_run("test keyword", "example.com", "sha-base", "2026-05-27T10:00:00")
        compare_id = self.insert_run("test keyword", "example.com", "sha-compare", "2026-05-27T11:00:00")

        con = app.connect()
        try:
            con.execute(
                "INSERT INTO serp_results (run_id, rank, avg_rank, host, title, url) VALUES (?, ?, ?, ?, ?, ?)",
                (base_id, 10, 10, "example.com", "Base", "https://example.com/"),
            )
            con.execute(
                "INSERT INTO serp_results (run_id, rank, avg_rank, host, title, url) VALUES (?, ?, ?, ?, ?, ?)",
                (compare_id, 8, 8, "example.com", "Compare", "https://example.com/"),
            )
            con.execute(
                """
                INSERT INTO recommendations
                (run_id, sheet, factor_id, factor, current_value, goal, percent, recommendation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (base_id, "Overview", "F1", "Word Count", "100", "200", 50, "Add words"),
            )
            con.execute(
                """
                INSERT INTO recommendations
                (run_id, sheet, factor_id, factor, current_value, goal, percent, recommendation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (compare_id, "Overview", "F1", "Word Count", "150", "200", 75, "Add fewer words"),
            )
            con.execute(
                "INSERT INTO lsi_keywords (run_id, keyword, tracked_value, deficit) VALUES (?, ?, ?, ?)",
                (base_id, "pool", 1, -4),
            )
            con.execute(
                "INSERT INTO lsi_keywords (run_id, keyword, tracked_value, deficit) VALUES (?, ?, ?, ?)",
                (compare_id, "pool", 3, -2),
            )
            con.execute(
                "INSERT INTO workbook_rows (run_id, sheet, row_index, column_count, row_json) VALUES (?, ?, ?, ?, ?)",
                (base_id, "Overview", 1, 1, '["base"]'),
            )
            con.execute(
                "INSERT INTO workbook_rows (run_id, sheet, row_index, column_count, row_json) VALUES (?, ?, ?, ?, ?)",
                (compare_id, "Overview", 1, 1, '["compare"]'),
            )
            con.commit()
        finally:
            con.close()

        result = app.compare_runs(base_id, compare_id)

        self.assertEqual(result["summary"]["target_rank"]["base"], 10)
        self.assertEqual(result["summary"]["target_rank"]["compare"], 8)
        self.assertEqual(result["summary"]["target_rank"]["delta"], -2)
        self.assertEqual(result["summary"]["recommendation_change_count"], 1)
        self.assertEqual(result["summary"]["lsi_change_count"], 1)

    def test_compare_missing_run_error_is_actionable(self) -> None:
        run_id = self.insert_run("test keyword", "example.com", "sha-missing", "2026-05-27T10:00:00")

        with self.assertRaisesRegex(ValueError, "Missing run id"):
            app.compare_runs(run_id, 9999)

    def test_cora_status_signature_is_stable_and_sensitive_to_progress(self) -> None:
        status = {"running": True, "searchRunning": True, "searchTerm": "kw", "action": "", "progress": 0.0}
        same = {"running": True, "searchRunning": True, "searchTerm": "kw", "action": "", "progress": 0.0}
        changed = {"running": True, "searchRunning": True, "searchTerm": "kw", "action": "", "progress": 0.5}

        self.assertEqual(app.cora_status_signature(status), app.cora_status_signature(same))
        self.assertNotEqual(app.cora_status_signature(status), app.cora_status_signature(changed))

    def test_queue_state_supports_stop_after_current(self) -> None:
        app.set_queue_paused(True, auto_resume=False, stop_after_current=True, reason="test stop")

        state = app.queue_state()

        self.assertTrue(state["paused"])
        self.assertTrue(state["stop_after_current"])
        self.assertEqual(state["reason"], "test stop")

        app.set_queue_paused(False)

        self.assertFalse(app.queue_state()["paused"])

    def test_created_job_has_retry_metadata_when_queue_paused(self) -> None:
        app.set_queue_paused(True)

        job = app.create_managed_job("example keyword", "https://example.com/page")

        con = app.connect()
        try:
            row = con.execute("SELECT * FROM managed_jobs WHERE id = ?", (job["id"],)).fetchone()
        finally:
            con.close()

        decorated = app.decorate_job(row)
        self.assertEqual(decorated["status"], "queued")
        self.assertEqual(decorated["retry_count"], 0)
        self.assertGreaterEqual(decorated["max_retries"], 1)
        self.assertIn("queue paused", decorated["status_message"])
        self.assertIn("retry_remaining", decorated)

    def test_activity_log_captures_queue_and_job_events(self) -> None:
        app.set_queue_paused(True, reason="testing activity")
        job = app.create_managed_job("activity keyword", "https://example.com/page")

        entries = app.activity_log_tail(20)["entries"]
        messages = [entry["message"] for entry in entries]

        self.assertTrue(any("Queue paused" in message for message in messages))
        self.assertTrue(any(f"Queued Cora job {job['id']}" in message for message in messages))

    def test_cloudflare_report_artifacts_include_html_and_source_xlsx(self) -> None:
        run_id = self.insert_run("artifact keyword", "example.com", "sha-artifact", "2026-05-27T10:00:00")
        archive = app.ARCHIVE_DIR / "artifact.xlsx"
        archive.parent.mkdir(parents=True, exist_ok=True)
        archive.write_bytes(b"fake xlsx bytes")
        with app.connect() as con:
            con.execute(
                "UPDATE runs SET archive_path = ?, file_name = ? WHERE id = ?",
                (str(archive), "artifact.xlsx", run_id),
            )

        report = app.create_share_report(run_id, "basic")
        artifacts = app.collect_share_report_artifacts(report["id"], "https://example.workers.dev")

        self.assertEqual([item["artifact_type"] for item in artifacts], ["report_html", "source_xlsx"])
        self.assertIn(b"https://example.workers.dev/share/report/", artifacts[0]["body"])
        self.assertEqual(artifacts[1]["body"], b"fake xlsx bytes")

    def test_cloudflare_report_artifact_dry_run_does_not_write_records(self) -> None:
        run_id = self.insert_run("artifact keyword", "example.com", "sha-artifact", "2026-05-27T10:00:00")
        report = app.create_share_report(run_id, "basic")

        result = app.sync_cloudflare_report_artifacts([report["id"]], dry_run=True)

        self.assertTrue(result["dry_run"])
        with app.connect() as con:
            count = con.execute("SELECT COUNT(*) FROM cloud_report_artifacts").fetchone()[0]
        self.assertEqual(count, 0)

    def test_apply_cloudflare_create_project_command(self) -> None:
        result = app.apply_cloudflare_command(
            {
                "command_type": "create_project",
                "payload": {"name": "Cloud Client", "site_domain": "https://example.com", "notes": "from cloud"},
            }
        )

        self.assertEqual(result["project"]["name"], "Cloud Client")
        with app.connect() as con:
            site = con.execute("SELECT * FROM sites WHERE project_id = ?", (result["project"]["id"],)).fetchone()
        self.assertEqual(site["domain"], "example.com")

    def test_apply_cloudflare_add_keyword_command(self) -> None:
        project = app.create_project("Keyword Client", site_domain="https://example.com")

        result = app.apply_cloudflare_command(
            {"command_type": "add_keyword", "payload": {"project_id": project["id"], "keyword": "cloud keyword"}}
        )

        self.assertEqual(result["keyword"]["keyword"], "cloud keyword")

    def test_apply_cloudflare_duplicate_keyword_reuses_existing(self) -> None:
        project = app.create_project("Keyword Client", site_domain="https://example.com")
        first = app.apply_cloudflare_command(
            {"command_type": "add_keyword", "payload": {"project_id": project["id"], "keyword": "cloud keyword"}}
        )
        second = app.apply_cloudflare_command(
            {"command_type": "add_keyword", "payload": {"project_id": project["id"], "keyword": "cloud keyword"}}
        )

        self.assertEqual(first["keyword"]["id"], second["keyword"]["id"])
        self.assertTrue(second["duplicate"])

    def test_apply_cloudflare_duplicate_client_reuses_existing(self) -> None:
        first = app.apply_cloudflare_command(
            {"command_type": "create_project", "payload": {"name": "Cloud Client", "site_domain": "https://example.com"}}
        )
        second = app.apply_cloudflare_command(
            {"command_type": "create_project", "payload": {"name": "Cloud Client", "site_domain": "https://example.com"}}
        )

        self.assertEqual(first["project"]["id"], second["project"]["id"])
        self.assertTrue(second["duplicate"])

    def test_apply_cloudflare_sync_cloud_data_command_supports_dry_run(self) -> None:
        result = app.apply_cloudflare_command(
            {"command_type": "sync_cloud_data", "payload": {"tables": ["projects", "keywords"], "dry_run": True}}
        )

        self.assertTrue(result["sync"]["dry_run"])
        self.assertEqual([item["table"] for item in result["sync"]["tables"]], ["projects", "keywords"])

    def test_apply_cloudflare_sync_artifacts_command_supports_dry_run(self) -> None:
        run_id = self.insert_run("artifact keyword", "example.com", "sha-cloud-artifact", "2026-05-27T10:00:00")
        report = app.create_share_report(run_id, "basic")

        result = app.apply_cloudflare_command(
            {"command_type": "sync_report_artifacts", "payload": {"report_ids": [report["id"]], "dry_run": True}}
        )

        self.assertTrue(result["artifacts"]["dry_run"])
        self.assertEqual(result["artifacts"]["reports"], 1)

    def test_bridge_settings_default_blocks_cora_commands(self) -> None:
        settings = app.bridge_settings()

        self.assertFalse(settings["enabled"])
        self.assertFalse(settings["allow_cora"])
        self.assertFalse(settings["allow_paid_tools"])

        with self.assertRaisesRegex(ValueError, "not allowed to queue Cora"):
            app.apply_cloudflare_command(
                {
                    "command_type": "run_cora",
                    "payload": {"project_id": 1, "keyword": "cloud cora", "target_url": "https://example.com"},
                }
            )

    def test_bridge_settings_can_enable_cora_commands(self) -> None:
        project = app.create_project("Cora Client", site_domain="https://example.com")
        app.set_queue_paused(True)
        app.set_bridge_settings(enabled=True, allow_cora=True, poll_interval=15)

        result = app.apply_cloudflare_command(
            {
                "command_type": "run_cora",
                "payload": {"project_id": project["id"], "keyword": "cloud cora", "target_url": "https://example.com"},
            }
        )

        self.assertEqual(result["job"]["keyword"], "cloud cora")
        self.assertEqual(app.bridge_settings()["poll_interval"], 15)

    def test_bridge_settings_default_blocks_paid_tool_commands(self) -> None:
        with self.assertRaisesRegex(ValueError, "paid/API tools"):
            app.apply_cloudflare_command(
                {
                    "command_type": "create_ranking_snapshot",
                    "payload": {"project_id": 1, "target": "example.com"},
                }
            )

    def test_bridge_settings_allow_paid_tool_dry_runs(self) -> None:
        result = app.apply_cloudflare_command(
            {
                "command_type": "create_ranking_snapshot",
                "payload": {"project_id": 1, "target": "https://www.example.com/", "dry_run": True},
            }
        )

        self.assertTrue(result["dry_run"])
        self.assertEqual(result["snapshot_request"]["target"], "example.com")

    def test_bridge_settings_can_enable_paid_tool_commands(self) -> None:
        settings = app.set_bridge_settings(enabled=True, allow_paid_tools=True)

        self.assertTrue(settings["allow_paid_tools"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
