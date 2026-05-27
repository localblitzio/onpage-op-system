# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cora SEO Software is a Java/JavaFX desktop application for SEO analysis. `cora.jar` is the shipped build; `src/cora/` holds a **CFR 0.152 decompile** of it (1,469 files listed in `sources.txt`) that compiles back into `cora-recompiled.jar`. `src/summary.txt` notes CFR failed on `cora.econobot.LowLevelGet.run()` — verify that one method against bytecode before trusting it. Decompilation artifacts (empty catch blocks, `CFR` header comments) are not bugs.

## Running the Application

```bash
# Launch via batch file (allocates 6-12GB heap)
cora.bat
```

The entry point is `cora.Main` inside `cora.jar`. The app requires JavaFX modules and uses JxBrowser 7.27 for embedded Chromium.

**Bundled JRE:** OpenJDK Temurin 17.0.1 (in `jre/` directory)

## Architecture (from compiled classes)

The application is organized under the `cora` package:

- **`cora.Main` / `cora.MainController`** — Application entry point and primary UI controller (JavaFX)
- **`cora.CoraContext`** — Central application context/state
- **`cora.CoraData` / `cora.CoraWorkBook`** — Data management and Excel workbook generation (Apache POI)
- **`cora.plugins/` `plugins2/` `plugins3/` `plugins4/`** — ~1,044 plugin classes implementing SEO ranking factors (Ahrefs, SEMRush, Schema, social signals, on-page factors, etc.)
- **`cora.CoraPlugin` / `cora.CoraBasePlugin`** — Plugin base classes; `CoraPluginCache` handles caching
- **`cora.econobot/`** — Web scraping/data fetching engine (Chrome automation, proxy management, API calls)
- **`cora.dialog/`** — UI dialogs (settings, factors, proxies, banned words, etc.)
- **`cora.handlers/`** — JavaFX event handlers for UI actions
- **`cora.model/`** — Domain models (GoogleResult, WebPage, SearchResult, CoraSettings, etc.)
- **`cora.reports/`** — Report generation
- **`cora.diff/`** — Factor/rank diff comparison tool (has its own FXML UI)
- **`cora.trends/`** / **`cora.seovolatility/`** — SEO trends and volatility tracking
- **`cora.util/`** — Extensive utilities (~80 classes) for HTML parsing, statistics, schemas, NLP, etc.
- **`cora.bots/`** — Bot/automation task management

## Key Dependencies

| Library | Purpose |
|---------|---------|
| JavaFX 17 (modules/) | Desktop UI framework |
| JxBrowser 7.27 | Embedded Chromium browser |
| Apache POI 4.1.1 | Excel report generation |
| JSoup 1.11.3 | HTML parsing |
| Apache HttpClient 4.5.x | HTTP requests |
| Google Cloud Language 1.98.0 | NLP analysis |
| TextRazor 1.0.12 | Text/entity analysis |
| Guava 23.0 | General utilities |

## Important Notes

- **Source is decompiled, not authoritative.** Edits go in `src/cora/...`, recompile into `cora-recompiled.jar`, then launch via `cora-recompiled.bat`. `cora.bat` still runs the original `cora.jar` and will not reflect your changes.
- **Memory-intensive** — configured for 6-12GB heap (`-Xms6G -Xmx12G`).
- **Windows-only** — native DLLs are Windows x64; the batch launcher uses `start` command.
- **Plugin-heavy architecture** — the bulk of the codebase (~70% of classes) is SEO factor plugins.
- FXML files for UI: `cora.fxml`, `coradiff.fxml`, `forceHTML.fxml`, `NewSettings.fxml`, `RankStats.fxml`, `coratrends.fxml`, `updateReport.fxml`.
