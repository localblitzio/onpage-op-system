from __future__ import annotations

import gc
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
        project = app.create_project("Example Project", client="Client", site_domain="example.com")
        site = app.create_site(project["id"], "example.com", "Example")
        page = app.create_page(site["id"], "https://example.com/page", "Page")
        keyword = app.create_keyword(project["id"], "test keyword", site_id=site["id"], page_id=page["id"])

        run = app.assign_run(run_id, project["id"], site["id"], page["id"], keyword["id"])

        self.assertEqual(run["project_id"], project["id"])
        self.assertEqual(run["site_id"], site["id"])
        self.assertEqual(run["page_id"], page["id"])
        self.assertEqual(run["keyword_id"], keyword["id"])

    def test_api_key_is_masked_in_public_response(self) -> None:
        key = app.create_api_key("OpenAI", "Test", "sk-test-1234567890", notes="temporary")

        self.assertNotIn("key_value", key)
        self.assertEqual(key["key_preview"], "sk-t...7890")
        self.assertEqual(key["key_length"], len("sk-test-1234567890"))

    def test_content_plan_model(self) -> None:
        project = app.create_project("Planner Project", client="Client", site_domain="example.com")
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
