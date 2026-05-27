# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Workspace Layout

This directory is a **workspace containing three related Windows-only Java/JavaFX apps** — not a single project and not a git repo. All three share the same `cora.Main` entry point and JavaFX/JxBrowser runtime; they differ in which JAR they execute.

| Subdirectory | Role | Launch | Primary JAR |
|---|---|---|---|
| `Cora SEO Software/` | Development home. Holds the CFR-decompiled source tree under `src/cora/`, the original `cora.jar`, and the rebuilt `cora-recompiled.jar`. | `cora.bat` (original) / `cora-recompiled.bat` (rebuilt) | `cora.jar` / `cora-recompiled.jar` |
| `SEO Correlation Tool 2026/` | Deployment bundle (no `src/`, no `build/`). | `SEO Correlation Tool 2026.bat` | `cora-recompiled.jar` |
| `SEO Correlation Tool 2026 Fresh GUI/` | Same deployment bundle + `batch-example.csv` (shows `url,keyword` batch input format). | `SEO Correlation Tool 2026.bat` | `cora-recompiled.jar` |

The two "SEO Correlation Tool 2026" directories are byte-identical apart from `batch-example.csv`. They carry no source — any code work happens in `Cora SEO Software/src/` and must be propagated into their `cora-recompiled.jar` to take effect.

## Key Cross-Cutting Facts

- **Windows-only.** Bundled JRE is OpenJDK Temurin 17 under each app's `jre/`. The `modules/` directories hold JavaFX 17 jars plus Windows x64 native DLLs (JxBrowser, JavaFX media/graphics).
- **Heap:** all three launchers set `-Xms6G -Xmx12G`. Do not shrink this without a reason — the plugin engine holds large HTML corpora in memory.
- **Entry point:** `cora.Main` (JavaFX `Application`). Manifest in `Cora SEO Software/build/manifest.txt` confirms this.
- **Embedded HTTP API:** `cora.api.CoraAPIServer` listens on port **9090** by default (see `src/cora/api/CoraAPIServer.java`).
- **The source tree is decompiled, not original.** It was produced by CFR 0.152. `Cora SEO Software/src/summary.txt` records that CFR failed on `cora.econobot.LowLevelGet.run()` — assume that one method body may be wrong or partially missing and verify against `cora.jar` bytecode if touching it. Decompiled files carry `/* Decompiled with CFR 0.152 */` headers; empty catch blocks and odd control flow are decompilation artifacts, not bugs to "fix."

## Build & Run (within `Cora SEO Software/`)

There is **no Maven/Gradle/Ant build script**. `sources.txt` (1,469 lines) is the javac input list used when rebuilding `cora-recompiled.jar`. A typical rebuild invokes `javac` with `sources.txt` as `@argfile`, using the JAR classpath from `cora.bat`, then `jar cfm` with `build/manifest.txt` and the `build/` tree (FXML, PNGs, CSS, `pluginDocs/`). Compiled `.class` files land in `build/cora/...` mirroring the `src/cora/...` package layout.

To run after recompilation: use `cora-recompiled.bat` (classpath points at `cora-recompiled.jar`). To copy the rebuild into the deployment dirs, overwrite their `cora-recompiled.jar`.

Note: `cora.bat` and `cora-recompiled.bat` use a bare `jre\bin\javaw` path — they must be run from inside `Cora SEO Software/` (CWD-sensitive). The deployment `.bat` files use `%~dp0` and work from anywhere.

## Architecture Highlights

The bulk of functionality lives in `Cora SEO Software/src/cora/`:

- **Core engine:** `Main`, `MainController`, `CoraContext` (global app state — holds references to every open dialog), `CoraData`, `CoraWorkBook`, `AggregateWorkBook`, `QueueWorkBook` (Apache POI Excel output), `CoraTask`.
- **Plugin system:** `CoraPlugin` / `CoraBasePlugin` + `CoraPluginCache`. Plugin implementations are sharded across four packages — `plugins/` (~627 files), `plugins2/` (~269), `plugins3/` (~116), `plugins4/` (~28) — roughly 1,040 ranking-factor plugins total. When adding/modifying a factor, find the existing file by factor name; the numbered split is historical, not semantic.
- **Data acquisition:** `econobot/` — SERP scraping, Chrome automation via JxBrowser (`IsolatedChrome`, `IsolatedChrome2`), Ahrefs/SEMrush/DomDetailer integrations, proxy rotation, DFS runnables.
- **UI:** FXML files live under `build/cora/` (not `src/`): `cora.fxml`, `NewSettings.fxml`, `forceHTML.fxml`, `updateReport.fxml`, `diff/coradiff.fxml`, `trends/coratrends.fxml`, `seovolatility/RankStats.fxml`. Controllers are in `src/cora/` (`MainController`, `NewSettingsController`, `ForceHTMLController`, `UpdateReportController`) and module subpackages (`diff/`, `trends/`, `seovolatility/`). Dialog classes are in `dialog/`; event handlers are in `handlers/`.
- **Feature modules:** `diff/` (factor/rank diff tool — has its own `Main`, so it can be launched standalone), `trends/`, `seovolatility/`, `reports/`, `bots/` (bot/PluginTask automation).
- **Utilities:** `util/` (~127 files) — HTML parsing, stats, NLP, prefs, logging (`LogUtil`, `AutoLog`), `BatchRunner`, schema helpers.

### Plugin-packaging-path vs. asset-packaging-path

Source is `src/cora/...`. Compiled classes go to `build/cora/...`. **Non-code assets (FXML, `app-style.css`, PNGs, `pluginDocs/` images, `complete.wav`) live in `build/` already** and are packaged straight into the JAR — do not duplicate them into `src/`. The `src/cora/app-style.css` file you see is the only stylesheet; FXML loading uses classpath-relative lookups, so the packaged FXML resolves controllers by `fx:controller="cora.MainController"`.

## Key Dependencies (versions pinned in classpath)

JavaFX 17 (in each app's `modules/`), JxBrowser 7.27 (embedded Chromium, win64 native), Apache POI 4.1.1 (xlsx), JSoup 1.11.3, Apache HttpClient 4.5.10, Google Cloud Language 1.98.0, TextRazor 1.0.12, commons-math3 3.6.1 (statistics/correlation), Guava 23.0, log4j 1.2.17. All ship as JARs next to the launcher; there is no Maven coordinate resolution at runtime.

## Gotchas

- **Do not run the app from a CI/sandbox** — it opens native windows, needs a desktop session, and will spawn JxBrowser Chromium processes.
- **`cora.jar` and `cora-recompiled.jar` are not interchangeable line-for-line.** If you edit `src/` and rebuild, only `cora-recompiled.jar` reflects your changes; `cora.bat` still runs the original.
- **CoraContext holds `static` dialog references** — reload/lifecycle bugs often trace back to a stale `CoraContext.*Dialog` reference (see `Main.stop()`).
- **Windows paths in `.bat` files** — `cora.bat` uses relative paths (`.\jre\bin\javaw`), so it breaks if invoked from a different CWD; the deployment batch files use `%~dp0` and are portable.
