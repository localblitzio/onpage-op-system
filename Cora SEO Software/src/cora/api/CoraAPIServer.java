package cora.api;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import cora.CoraContext;
import cora.CoraData;
import cora.model.GoogleResult;
import cora.model.SerpCell;
import cora.util.AutoLog;
import cora.util.AutoUtil;
import cora.util.BatchRunner;
import cora.util.LogUtil;
import cora.util.PrefsUtil;
import javafx.application.Platform;
import javafx.collections.ObservableList;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

public class CoraAPIServer {

    private static HttpServer server;
    private static final int DEFAULT_PORT = 9090;
    private static boolean started = false;

    public static void start() {
        start(DEFAULT_PORT);
    }

    public static void start(int port) {
        if (started) {
            LogUtil.info("API: Server already running on port " + port);
            return;
        }
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
            server.createContext("/api/status", new StatusHandler());
            server.createContext("/api/search", new SearchHandler());
            server.createContext("/api/track", new TrackHandler());
            server.createContext("/api/getdata", new GetDataHandler());
            server.createContext("/api/stop", new StopHandler());
            server.createContext("/api/batch", new BatchHandler());
            server.createContext("/api/script", new ScriptHandler());
            server.createContext("/api/settings", new SettingsHandler());
            server.createContext("/api/results", new ResultsHandler());
            server.createContext("/api/log", new LogHandler());
            server.createContext("/api/help", new HelpHandler());
            server.createContext("/api/export/csv", new ExportCSVHandler());
            server.createContext("/api/export/json", new ExportJSONHandler());
            server.createContext("/", new DashboardHandler());
            server.setExecutor(Executors.newFixedThreadPool(4));
            server.start();
            started = true;
            LogUtil.info("API: Server started on http://127.0.0.1:" + port);
        } catch (Exception e) {
            LogUtil.error("API: Failed to start server", e);
        }
    }

    public static void stop() {
        if (server != null) {
            server.stop(0);
            started = false;
            LogUtil.info("API: Server stopped");
        }
    }

    // --- Utility methods ---

    private static String readBody(HttpExchange ex) throws IOException {
        InputStream is = ex.getRequestBody();
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] b = new byte[4096];
        int n;
        while ((n = is.read(b)) != -1) buf.write(b, 0, n);
        return buf.toString(StandardCharsets.UTF_8.name());
    }

    private static String getParam(String body, String key) {
        // Simple JSON parser for {"key": "value"} — no dependency needed
        String pattern = "\"" + key + "\"";
        int idx = body.indexOf(pattern);
        if (idx < 0) return null;
        int colon = body.indexOf(":", idx + pattern.length());
        if (colon < 0) return null;
        String rest = body.substring(colon + 1).trim();
        if (rest.startsWith("\"")) {
            int end = rest.indexOf("\"", 1);
            if (end < 0) return null;
            return rest.substring(1, end);
        }
        // Number or boolean
        int end = rest.indexOf(",");
        int end2 = rest.indexOf("}");
        if (end < 0) end = end2;
        if (end2 >= 0 && end2 < end) end = end2;
        if (end < 0) return rest.trim();
        return rest.substring(0, end).trim();
    }

    private static void respond(HttpExchange ex, int code, String json) throws IOException {
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.sendResponseHeaders(code, bytes.length);
        OutputStream os = ex.getResponseBody();
        os.write(bytes);
        os.close();
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }

    // --- Handlers ---

    static class HelpHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            String json = "{\n" +
                "  \"endpoints\": {\n" +
                "    \"GET /api/help\": \"This help message\",\n" +
                "    \"GET /api/status\": \"Current app state: running, checkin status, search terms, progress\",\n" +
                "    \"GET /api/results\": \"SERP results from last search as JSON\",\n" +
                "    \"GET /api/log\": \"Recent log entries. ?lines=N for count\",\n" +
                "    \"POST /api/search\": \"Search a keyword. Body: {\\\"keyword\\\": \\\"best seo tools\\\"}\",\n" +
                "    \"POST /api/track\": \"Track a URL or domain. Body: {\\\"url\\\": \\\"https://...\\\"} or {\\\"domain\\\": \\\"example.com\\\"} or {\\\"rank\\\": 1}\",\n" +
                "    \"POST /api/getdata\": \"Click Get Data (run correlation analysis)\",\n" +
                "    \"POST /api/stop\": \"Stop current operation\",\n" +
                "    \"POST /api/batch\": \"Run batch. Body: {\\\"entries\\\": [{\\\"url\\\":\\\"...\\\",\\\"keyword\\\":\\\"...\\\"}]}\",\n" +
                "    \"POST /api/script\": \"Run raw CoraScript. Body: {\\\"script\\\": \\\"search best seo; track https://...; click get data\\\"}\",\n" +
                "    \"POST /api/settings\": \"Update settings. Body: {\\\"country\\\": \\\"US\\\", \\\"language\\\": \\\"en\\\", \\\"searches\\\": 3, \\\"platform\\\": \\\"Desktop\\\", \\\"profile\\\": \\\"...\\\", \\\"near\\\": \\\"...\\\"}\",\n" +
                "    \"GET /api/export/csv\": \"Download results as CSV. Add ?factors=true for factor data\",\n" +
                "    \"GET /api/export/json\": \"Download full results with factors, tracked data as JSON\"\n" +
                "  }\n" +
                "}";
            respond(ex, 200, json);
        }
    }

    static class StatusHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            String searchTerm = "";
            String actionText = "";
            double progress = 0;
            try {
                if (CoraContext.searchInput != null) searchTerm = CoraContext.searchInput.getText();
                if (CoraContext.actionLabel != null) actionText = CoraContext.actionLabel.getText();
                if (CoraContext.progressBar != null) progress = CoraContext.progressBar.getProgress();
            } catch (Exception e) {}

            String json = "{" +
                "\"running\":" + CoraContext.running + "," +
                "\"searchRunning\":" + CoraContext.searchRunning + "," +
                "\"checkinStatus\":\"" + esc(CoraContext.checkinStatus) + "\"," +
                "\"searchTerm\":\"" + esc(searchTerm) + "\"," +
                "\"action\":\"" + esc(actionText) + "\"," +
                "\"progress\":" + progress + "," +
                "\"version\":\"" + esc(CoraContext.VERSION) + "\"" +
                "}";
            respond(ex, 200, json);
        }
    }

    static class SearchHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) {
                respond(ex, 405, "{\"error\":\"POST required\"}");
                return;
            }
            String body = readBody(ex);
            String keyword = getParam(body, "keyword");
            if (keyword == null || keyword.isEmpty()) {
                respond(ex, 400, "{\"error\":\"keyword is required\"}");
                return;
            }
            Platform.runLater(() -> {
                CoraContext.searchInput.setText(keyword);
                CoraContext.searchButton.fire();
            });
            respond(ex, 200, "{\"ok\":true,\"action\":\"search\",\"keyword\":\"" + esc(keyword) + "\"}");
        }
    }

    static class TrackHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) {
                respond(ex, 405, "{\"error\":\"POST required\"}");
                return;
            }
            String body = readBody(ex);
            String url = getParam(body, "url");
            String domain = getParam(body, "domain");
            String rank = getParam(body, "rank");

            if (url != null && !url.isEmpty()) {
                String script = "track " + url;
                Platform.runLater(() -> {
                    AutoUtil.parseCoraScript(script);
                    AutoUtil.processNextTask();
                });
                respond(ex, 200, "{\"ok\":true,\"action\":\"track\",\"url\":\"" + esc(url) + "\"}");
            } else if (domain != null && !domain.isEmpty()) {
                String script = "track domain " + domain;
                Platform.runLater(() -> {
                    AutoUtil.parseCoraScript(script);
                    AutoUtil.processNextTask();
                });
                respond(ex, 200, "{\"ok\":true,\"action\":\"trackDomain\",\"domain\":\"" + esc(domain) + "\"}");
            } else if (rank != null && !rank.isEmpty()) {
                String script = "track #" + rank;
                Platform.runLater(() -> {
                    AutoUtil.parseCoraScript(script);
                    AutoUtil.processNextTask();
                });
                respond(ex, 200, "{\"ok\":true,\"action\":\"trackRank\",\"rank\":" + rank + "}");
            } else {
                respond(ex, 400, "{\"error\":\"url, domain, or rank is required\"}");
            }
        }
    }

    static class GetDataHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) {
                respond(ex, 405, "{\"error\":\"POST required\"}");
                return;
            }
            Platform.runLater(() -> {
                CoraContext.correlateFactorsButton.fire();
            });
            respond(ex, 200, "{\"ok\":true,\"action\":\"getdata\"}");
        }
    }

    static class StopHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) {
                respond(ex, 405, "{\"error\":\"POST required\"}");
                return;
            }
            Platform.runLater(() -> {
                CoraContext.stopButton.fire();
            });
            respond(ex, 200, "{\"ok\":true,\"action\":\"stop\"}");
        }
    }

    static class BatchHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) {
                respond(ex, 405, "{\"error\":\"POST required\"}");
                return;
            }
            String body = readBody(ex);
            // Parse entries array: [{"url":"...","keyword":"..."},...]
            List<BatchRunner.BatchEntry> entries = new ArrayList<>();
            int arrStart = body.indexOf("[");
            int arrEnd = body.lastIndexOf("]");
            if (arrStart < 0 || arrEnd < 0) {
                respond(ex, 400, "{\"error\":\"entries array is required\"}");
                return;
            }
            String arrBody = body.substring(arrStart + 1, arrEnd);
            // Split on },{ pattern
            String[] items = arrBody.split("\\}\\s*,\\s*\\{");
            for (String item : items) {
                item = item.replace("{", "").replace("}", "").trim();
                if (item.isEmpty()) continue;
                String u = getParam("{" + item + "}", "url");
                String k = getParam("{" + item + "}", "keyword");
                if (u != null && k != null && !u.isEmpty() && !k.isEmpty()) {
                    entries.add(new BatchRunner.BatchEntry(u, k));
                }
            }
            if (entries.isEmpty()) {
                respond(ex, 400, "{\"error\":\"no valid entries found\"}");
                return;
            }
            BatchRunner.runBatch(entries);
            respond(ex, 200, "{\"ok\":true,\"action\":\"batch\",\"count\":" + entries.size() + "}");
        }
    }

    static class ScriptHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) {
                respond(ex, 405, "{\"error\":\"POST required\"}");
                return;
            }
            String body = readBody(ex);
            String script = getParam(body, "script");
            if (script == null || script.isEmpty()) {
                respond(ex, 400, "{\"error\":\"script is required\"}");
                return;
            }
            Platform.runLater(() -> {
                AutoUtil.workflow = script;
                AutoUtil.parseCoraScript(script);
                AutoUtil.processNextTask();
            });
            respond(ex, 200, "{\"ok\":true,\"action\":\"script\",\"script\":\"" + esc(script) + "\"}");
        }
    }

    static class SettingsHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if ("GET".equals(ex.getRequestMethod())) {
                String country = "";
                String language = "";
                String platform = "";
                String profile = "";
                String near = "";
                String searches = "";
                String output = "";
                try {
                    country = PrefsUtil.getDefaultCountry();
                    language = PrefsUtil.getDefaultLanguage();
                    platform = PrefsUtil.getPlatform();
                    output = PrefsUtil.getOutputDirectory();
                    if (CoraContext.profileChoiceBox != null && CoraContext.profileChoiceBox.getSelectionModel().getSelectedItem() != null)
                        profile = CoraContext.profileChoiceBox.getSelectionModel().getSelectedItem().toString();
                    if (CoraContext.nearTextField != null)
                        near = CoraContext.nearTextField.getText();
                    if (CoraContext.numberOfSearches != null && CoraContext.numberOfSearches.getSelectionModel().getSelectedItem() != null)
                        searches = CoraContext.numberOfSearches.getSelectionModel().getSelectedItem().toString();
                } catch (Exception e) {}
                String json = "{" +
                    "\"country\":\"" + esc(country) + "\"," +
                    "\"language\":\"" + esc(language) + "\"," +
                    "\"platform\":\"" + esc(platform) + "\"," +
                    "\"profile\":\"" + esc(profile) + "\"," +
                    "\"near\":\"" + esc(near) + "\"," +
                    "\"searches\":\"" + esc(searches) + "\"," +
                    "\"outputDirectory\":\"" + esc(output) + "\"" +
                    "}";
                respond(ex, 200, json);
                return;
            }
            if (!"POST".equals(ex.getRequestMethod())) {
                respond(ex, 405, "{\"error\":\"GET or POST required\"}");
                return;
            }
            String body = readBody(ex);
            StringBuilder applied = new StringBuilder();
            StringBuilder script = new StringBuilder();

            String country = getParam(body, "country");
            String language = getParam(body, "language");
            String platform = getParam(body, "platform");
            String profile = getParam(body, "profile");
            String near = getParam(body, "near");
            String searches = getParam(body, "searches");

            if (country != null) { script.append("country ").append(country).append("; "); applied.append("country,"); }
            if (language != null) { script.append("language ").append(language).append("; "); applied.append("language,"); }
            if (platform != null && "mobile".equalsIgnoreCase(platform)) { script.append("mobile; "); applied.append("platform,"); }
            if (platform != null && "desktop".equalsIgnoreCase(platform)) { script.append("desktop; "); applied.append("platform,"); }
            if (profile != null) { script.append("profile ").append(profile).append("; "); applied.append("profile,"); }
            if (near != null) { script.append("near ").append(near).append("; "); applied.append("near,"); }
            if (searches != null) { script.append("searches ").append(searches).append("; "); applied.append("searches,"); }

            if (script.length() == 0) {
                respond(ex, 400, "{\"error\":\"no settings provided\"}");
                return;
            }

            String s = script.toString();
            Platform.runLater(() -> {
                AutoUtil.parseCoraScript(s);
                AutoUtil.processNextTask();
            });
            respond(ex, 200, "{\"ok\":true,\"applied\":\"" + esc(applied.toString()) + "\"}");
        }
    }

    static class ResultsHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            StringBuilder json = new StringBuilder();
            json.append("{");
            try {
                if (CoraData.serp != null && CoraData.serp.getResults() != null) {
                    List<GoogleResult> results = CoraData.serp.getResults();
                    json.append("\"count\":").append(results.size()).append(",");
                    if (CoraData.serp.getSearch() != null) {
                        json.append("\"keyword\":\"").append(esc(CoraData.serp.getSearch().getSearch())).append("\",");
                    }
                    json.append("\"variants\":[");
                    List<String> vars = CoraData.serp.getVariants();
                    if (vars != null) {
                        for (int i = 0; i < vars.size(); i++) {
                            if (i > 0) json.append(",");
                            json.append("\"").append(esc(vars.get(i))).append("\"");
                        }
                    }
                    json.append("],");
                    json.append("\"results\":[");
                    for (int i = 0; i < results.size(); i++) {
                        GoogleResult gr = results.get(i);
                        if (i > 0) json.append(",");
                        json.append("{");
                        json.append("\"rank\":").append(gr.getWeightedAverageRank()).append(",");
                        json.append("\"url\":\"").append(esc(gr.getUrl())).append("\"");
                        json.append("}");
                    }
                    json.append("]");
                } else {
                    json.append("\"count\":0,\"results\":[]");
                }
            } catch (Exception e) {
                json = new StringBuilder("{\"error\":\"" + esc(e.getMessage()) + "\"}");
            }
            json.append("}");
            respond(ex, 200, json.toString());
        }
    }

    static class LogHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            String query = ex.getRequestURI().getQuery();
            int lines = 50;
            if (query != null && query.contains("lines=")) {
                try {
                    lines = Integer.parseInt(query.split("lines=")[1].split("&")[0]);
                } catch (Exception e) {}
            }
            StringBuilder json = new StringBuilder();
            json.append("{\"lines\":[");
            try {
                String logContent = LogUtil.log.toString();
                String[] allLines = logContent.split("\n");
                int start = Math.max(0, allLines.length - lines);
                boolean first = true;
                for (int i = start; i < allLines.length; i++) {
                    String line = allLines[i].trim();
                    if (line.isEmpty()) continue;
                    // Strip HTML tags for clean output
                    line = line.replaceAll("<[^>]*>", "");
                    if (!first) json.append(",");
                    json.append("\"").append(esc(line)).append("\"");
                    first = false;
                }
            } catch (Exception e) {
                json.append("\"error: ").append(esc(e.getMessage())).append("\"");
            }
            json.append("]}");
            respond(ex, 200, json.toString());
        }
    }

    static class ExportCSVHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            StringBuilder csv = new StringBuilder();
            try {
                String query = ex.getRequestURI().getQuery();
                boolean includeFactors = query != null && query.contains("factors=true");

                // Header
                csv.append("rank,url,title,description");
                // If factors requested and available, add factor columns
                java.util.List<String> factorKeys = new java.util.ArrayList<>();
                if (includeFactors && CoraData.factorNames != null && !CoraData.factorNames.isEmpty()) {
                    for (String key : CoraData.factorNames.keySet()) {
                        factorKeys.add(key);
                        csv.append(",").append(csvEsc(CoraData.factorNames.get(key)));
                    }
                }
                // Tracked data columns
                if (CoraData.trackedData != null && !CoraData.trackedData.isEmpty()) {
                    csv.append(",tracked_value,tracked_goal,tracked_deficit");
                }
                csv.append("\n");

                // Rows
                if (CoraData.serp != null && CoraData.serp.getResults() != null) {
                    String keyword = "";
                    if (CoraData.serp.getSearch() != null) keyword = CoraData.serp.getSearch().getSearch();
                    for (GoogleResult gr : CoraData.serp.getResults()) {
                        csv.append(gr.getWeightedAverageRank()).append(",");
                        csv.append(csvEsc(gr.getUrl())).append(",");
                        csv.append(csvEsc(gr.getText())).append(",");
                        csv.append(csvEsc(gr.getDescription()));
                        // Factor values
                        if (includeFactors && !factorKeys.isEmpty() && CoraData.urlFactorMap != null) {
                            java.util.Map<String, Double> factors = CoraData.urlFactorMap.get(gr.getUrl());
                            for (String key : factorKeys) {
                                csv.append(",");
                                if (factors != null && factors.containsKey(key)) {
                                    csv.append(factors.get(key));
                                }
                            }
                        }
                        // Tracked data
                        if (CoraData.trackedData != null && !CoraData.trackedData.isEmpty()) {
                            // Only output for tracked URL
                            csv.append(",,,");
                        }
                        csv.append("\n");
                    }
                    // Append tracked summary row
                    if (CoraData.trackedData != null && !CoraData.trackedData.isEmpty()) {
                        csv.append("\n# Tracked Factor Summary\n");
                        csv.append("factor,value,goal,deficit\n");
                        for (String key : CoraData.trackedData.keySet()) {
                            String name = CoraData.factorNames != null ? CoraData.factorNames.getOrDefault(key, key) : key;
                            Double val = CoraData.trackedData.get(key);
                            Double goal = CoraData.trackedGoal != null ? CoraData.trackedGoal.getOrDefault(key, 0.0) : 0.0;
                            Double deficit = CoraData.trackedDeficit != null ? CoraData.trackedDeficit.getOrDefault(key, 0.0) : 0.0;
                            csv.append(csvEsc(name)).append(",").append(val).append(",").append(goal).append(",").append(deficit).append("\n");
                        }
                    }
                }
            } catch (Exception e) {
                csv = new StringBuilder("error,\"" + e.getMessage() + "\"\n");
            }
            byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "text/csv; charset=utf-8");
            ex.getResponseHeaders().set("Content-Disposition", "attachment; filename=\"seo-results.csv\"");
            ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            ex.sendResponseHeaders(200, bytes.length);
            OutputStream os = ex.getResponseBody();
            os.write(bytes);
            os.close();
        }
    }

    static class ExportJSONHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            StringBuilder json = new StringBuilder();
            json.append("{\n");
            try {
                String keyword = "";
                if (CoraData.serp != null && CoraData.serp.getSearch() != null) {
                    keyword = CoraData.serp.getSearch().getSearch();
                }
                json.append("  \"keyword\": \"").append(esc(keyword)).append("\",\n");
                json.append("  \"version\": \"").append(esc(CoraContext.VERSION)).append("\",\n");
                json.append("  \"timestamp\": \"").append(new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss").format(new java.util.Date())).append("\",\n");

                // Variants
                json.append("  \"variants\": [");
                if (CoraData.serp != null && CoraData.serp.getVariants() != null) {
                    java.util.List<String> vars = CoraData.serp.getVariants();
                    for (int i = 0; i < vars.size(); i++) {
                        if (i > 0) json.append(",");
                        json.append("\"").append(esc(vars.get(i))).append("\"");
                    }
                }
                json.append("],\n");

                // SERP Results
                json.append("  \"results\": [");
                if (CoraData.serp != null && CoraData.serp.getResults() != null) {
                    java.util.List<GoogleResult> results = CoraData.serp.getResults();
                    for (int i = 0; i < results.size(); i++) {
                        GoogleResult gr = results.get(i);
                        if (i > 0) json.append(",");
                        json.append("\n    {");
                        json.append("\"rank\":").append(gr.getWeightedAverageRank()).append(",");
                        json.append("\"ordinal\":").append(gr.getOrdinal()).append(",");
                        json.append("\"url\":\"").append(esc(gr.getUrl())).append("\",");
                        json.append("\"title\":\"").append(esc(gr.getText())).append("\",");
                        json.append("\"description\":\"").append(esc(gr.getDescription())).append("\"");
                        // Factor data for this URL
                        if (CoraData.urlFactorMap != null && CoraData.urlFactorMap.containsKey(gr.getUrl())) {
                            json.append(",\"factors\":{");
                            java.util.Map<String, Double> factors = CoraData.urlFactorMap.get(gr.getUrl());
                            boolean first = true;
                            for (java.util.Map.Entry<String, Double> entry : factors.entrySet()) {
                                if (!first) json.append(",");
                                String name = CoraData.factorNames != null ? CoraData.factorNames.getOrDefault(entry.getKey(), entry.getKey()) : entry.getKey();
                                json.append("\"").append(esc(name)).append("\":").append(entry.getValue());
                                first = false;
                            }
                            json.append("}");
                        }
                        json.append("}");
                    }
                }
                json.append("\n  ],\n");

                // Tracked analysis
                json.append("  \"tracked\": {");
                if (CoraData.trackedData != null && !CoraData.trackedData.isEmpty()) {
                    json.append("\n    \"factors\": [");
                    boolean first = true;
                    for (String key : CoraData.trackedData.keySet()) {
                        if (!first) json.append(",");
                        String name = CoraData.factorNames != null ? CoraData.factorNames.getOrDefault(key, key) : key;
                        Double val = CoraData.trackedData.get(key);
                        Double goal = CoraData.trackedGoal != null ? CoraData.trackedGoal.getOrDefault(key, 0.0) : 0.0;
                        Double deficit = CoraData.trackedDeficit != null ? CoraData.trackedDeficit.getOrDefault(key, 0.0) : 0.0;
                        json.append("\n      {\"name\":\"").append(esc(name)).append("\",\"value\":").append(val)
                            .append(",\"goal\":").append(goal).append(",\"deficit\":").append(deficit).append("}");
                        first = false;
                    }
                    json.append("\n    ]\n  ");
                }
                json.append("}\n");
            } catch (Exception e) {
                json = new StringBuilder("{\"error\":\"" + esc(e.getMessage()) + "\"}\n");
            }
            json.append("}");
            byte[] bytes = json.toString().getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            ex.getResponseHeaders().set("Content-Disposition", "attachment; filename=\"seo-results.json\"");
            ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            ex.sendResponseHeaders(200, bytes.length);
            OutputStream os = ex.getResponseBody();
            os.write(bytes);
            os.close();
        }
    }

    private static String csvEsc(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    static class DashboardHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            String html = DASHBOARD_HTML;
            byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
            ex.sendResponseHeaders(200, bytes.length);
            OutputStream os = ex.getResponseBody();
            os.write(bytes);
            os.close();
        }
    }

    private static final String DASHBOARD_HTML = "<!DOCTYPE html>\n" +
"<html lang=\"en\"><head><meta charset=\"UTF-8\">\n" +
"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
"<title>SEO Correlation Tool 2026 \u2014 Dashboard</title>\n" +
"<style>\n" +
"*{margin:0;padding:0;box-sizing:border-box}\n" +
"body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}\n" +
".topbar{background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid #1e3a5f;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}\n" +
".topbar h1{font-size:20px;font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:10px}\n" +
".topbar h1 span{color:#3b82f6}\n" +
".status-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-left:8px}\n" +
".status-dot.green{background:#22c55e;box-shadow:0 0 8px #22c55e80}\n" +
".status-dot.red{background:#ef4444;box-shadow:0 0 8px #ef444480}\n" +
".status-dot.yellow{background:#eab308;box-shadow:0 0 8px #eab30880}\n" +
".container{max-width:1400px;margin:0 auto;padding:20px 24px}\n" +
".grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}\n" +
".grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:20px}\n" +
".card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;transition:border-color .2s}\n" +
".card:hover{border-color:#3b82f6}\n" +
".card h2{font-size:14px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;display:flex;align-items:center;gap:8px}\n" +
".card h2 .icon{font-size:16px}\n" +
".form-row{display:flex;gap:10px;margin-bottom:10px;align-items:center}\n" +
".form-row label{min-width:80px;font-size:13px;color:#94a3b8}\n" +
"input,select,textarea{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 12px;color:#e2e8f0;font-size:13px;font-family:inherit;width:100%;outline:none;transition:border-color .2s}\n" +
"input:focus,select:focus,textarea:focus{border-color:#3b82f6}\n" +
"textarea{resize:vertical;min-height:60px;font-family:'Cascadia Code','Fira Code',monospace}\n" +
"button{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}\n" +
"button:hover{background:#2563eb;transform:translateY(-1px);box-shadow:0 4px 12px #3b82f640}\n" +
"button:active{transform:translateY(0)}\n" +
"button.secondary{background:#334155;color:#e2e8f0}\n" +
"button.secondary:hover{background:#475569}\n" +
"button.danger{background:#dc2626}\n" +
"button.danger:hover{background:#b91c1c}\n" +
"button.success{background:#16a34a}\n" +
"button.success:hover{background:#15803d}\n" +
".btn-group{display:flex;gap:8px;flex-wrap:wrap}\n" +
".stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}\n" +
".stat{background:#0f172a;border-radius:8px;padding:14px;text-align:center}\n" +
".stat .val{font-size:22px;font-weight:700;color:#f8fafc}\n" +
".stat .lbl{font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}\n" +
".progress-wrap{background:#0f172a;border-radius:10px;height:8px;margin:12px 0;overflow:hidden}\n" +
".progress-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);border-radius:10px;transition:width .5s ease}\n" +
".log-box{background:#0a0f1a;border:1px solid #1e293b;border-radius:8px;padding:12px;height:280px;overflow-y:auto;font-family:'Cascadia Code','Fira Code',monospace;font-size:12px;line-height:1.6}\n" +
".log-box::-webkit-scrollbar{width:6px}\n" +
".log-box::-webkit-scrollbar-track{background:transparent}\n" +
".log-box::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}\n" +
".log-line{color:#94a3b8;white-space:pre-wrap;word-break:break-all}\n" +
".log-line.error{color:#f87171}\n" +
".log-line.warn{color:#fbbf24}\n" +
".log-line.info{color:#94a3b8}\n" +
".log-line.highlight{color:#60a5fa}\n" +
".results-table{width:100%;border-collapse:collapse;font-size:13px}\n" +
".results-table th{text-align:left;padding:8px 12px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #334155}\n" +
".results-table td{padding:8px 12px;border-bottom:1px solid #1e293b}\n" +
".results-table tr:hover td{background:#1e293b}\n" +
".results-table .rank{color:#3b82f6;font-weight:700;font-size:15px}\n" +
".results-table .url{color:#e2e8f0;word-break:break-all}\n" +
".toast{position:fixed;bottom:20px;right:20px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 20px;font-size:13px;color:#e2e8f0;opacity:0;transform:translateY(10px);transition:all .3s;pointer-events:none;z-index:999}\n" +
".toast.show{opacity:1;transform:translateY(0)}\n" +
".toast.ok{border-color:#22c55e}\n" +
".toast.err{border-color:#ef4444}\n" +
".batch-area{font-family:'Cascadia Code','Fira Code',monospace;font-size:12px}\n" +
"@media(max-width:900px){.grid,.grid-3{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,1fr)}}\n" +
"</style></head><body>\n" +
"<div class=\"topbar\">\n" +
"  <h1><span>\u25C6</span> SEO Correlation Tool 2026 <span style=\"font-size:12px;color:#64748b\">Dashboard</span></h1>\n" +
"  <div><span id=\"statusText\" style=\"font-size:13px;color:#94a3b8\">Connecting...</span><span id=\"statusDot\" class=\"status-dot yellow\"></span></div>\n" +
"</div>\n" +
"<div class=\"container\">\n" +
"  <div class=\"stat-grid\" style=\"margin-bottom:20px\">\n" +
"    <div class=\"stat\"><div class=\"val\" id=\"sCheckin\">--</div><div class=\"lbl\">Status</div></div>\n" +
"    <div class=\"stat\"><div class=\"val\" id=\"sSearch\">--</div><div class=\"lbl\">Search Term</div></div>\n" +
"    <div class=\"stat\"><div class=\"val\" id=\"sResults\">--</div><div class=\"lbl\">Results</div></div>\n" +
"    <div class=\"stat\"><div class=\"val\" id=\"sAction\">--</div><div class=\"lbl\">Current Action</div></div>\n" +
"  </div>\n" +
"  <div class=\"progress-wrap\"><div class=\"progress-fill\" id=\"progressBar\" style=\"width:0%\"></div></div>\n" +
"\n" +
"  <div class=\"grid\">\n" +
"    <div class=\"card\">\n" +
"      <h2><span class=\"icon\">\uD83D\uDD0D</span> Search &amp; Analyze</h2>\n" +
"      <div class=\"form-row\"><label>Keyword</label><input id=\"keyword\" placeholder=\"e.g. best seo tools\"></div>\n" +
"      <div class=\"form-row\"><label>Track URL</label><input id=\"trackUrl\" placeholder=\"https://example.com/page\"></div>\n" +
"      <div class=\"btn-group\" style=\"margin-top:12px\">\n" +
"        <button onclick=\"doSearch()\">Search</button>\n" +
"        <button class=\"secondary\" onclick=\"doTrack()\">Track URL</button>\n" +
"        <button class=\"success\" onclick=\"doGetData()\">Get Data</button>\n" +
"        <button class=\"danger\" onclick=\"doStop()\">Stop</button>\n" +
"      </div>\n" +
"    </div>\n" +
"    <div class=\"card\">\n" +
"      <h2><span class=\"icon\">\u2699\uFE0F</span> Settings</h2>\n" +
"      <div class=\"form-row\"><label>Country</label><input id=\"setCountry\" placeholder=\"US\"></div>\n" +
"      <div class=\"form-row\"><label>Language</label><input id=\"setLang\" placeholder=\"en\"></div>\n" +
"      <div class=\"form-row\"><label>Platform</label><select id=\"setPlatform\"><option value=\"\">--</option><option>Desktop</option><option>Mobile</option></select></div>\n" +
"      <div class=\"form-row\"><label>Searches</label><input id=\"setSearches\" type=\"number\" min=\"1\" max=\"20\" placeholder=\"3\"></div>\n" +
"      <div class=\"form-row\"><label>Near</label><input id=\"setNear\" placeholder=\"City, State\"></div>\n" +
"      <div class=\"btn-group\" style=\"margin-top:12px\">\n" +
"        <button class=\"secondary\" onclick=\"doSettings()\">Apply Settings</button>\n" +
"        <button class=\"secondary\" onclick=\"loadSettings()\">Refresh</button>\n" +
"      </div>\n" +
"    </div>\n" +
"  </div>\n" +
"\n" +
"  <div class=\"grid\">\n" +
"    <div class=\"card\">\n" +
"      <h2><span class=\"icon\">\uD83D\uDCCB</span> Batch Run</h2>\n" +
"      <textarea id=\"batchInput\" class=\"batch-area\" rows=\"5\" placeholder=\"url,keyword (one per line)&#10;https://example.com,best seo tools&#10;https://example.com/page2,keyword research\"></textarea>\n" +
"      <div class=\"btn-group\" style=\"margin-top:10px\">\n" +
"        <button onclick=\"doBatch()\">Run Batch</button>\n" +
"      </div>\n" +
"    </div>\n" +
"    <div class=\"card\">\n" +
"      <h2><span class=\"icon\">\uD83D\uDCDC</span> CoraScript</h2>\n" +
"      <textarea id=\"scriptInput\" class=\"batch-area\" rows=\"5\" placeholder=\"search best seo tools; track https://example.com; click get data\"></textarea>\n" +
"      <div class=\"btn-group\" style=\"margin-top:10px\">\n" +
"        <button class=\"secondary\" onclick=\"doScript()\">Run Script</button>\n" +
"      </div>\n" +
"    </div>\n" +
"  </div>\n" +
"\n" +
"  <div class=\"grid\">\n" +
"    <div class=\"card\">\n" +
"      <h2><span class=\"icon\">\uD83D\uDCC8</span> SERP Results</h2>\n" +
"      <div id=\"resultsArea\" style=\"max-height:320px;overflow-y:auto\">\n" +
"        <table class=\"results-table\"><thead><tr><th>#</th><th>URL</th></tr></thead><tbody id=\"resultsBody\"><tr><td colspan=\"2\" style=\"color:#64748b\">No results yet</td></tr></tbody></table>\n" +
"      </div>\n" +
"      <div class=\"btn-group\" style=\"margin-top:10px\">\n" +
"        <button class=\"secondary\" onclick=\"loadResults()\">Refresh Results</button>\n" +
"        <button class=\"secondary\" onclick=\"window.open('/api/export/csv?factors=true')\">Download CSV</button>\n" +
"        <button class=\"secondary\" onclick=\"window.open('/api/export/json')\">Download JSON</button>\n" +
"      </div>\n" +
"    </div>\n" +
"    <div class=\"card\">\n" +
"      <h2><span class=\"icon\">\uD83D\uDDA5\uFE0F</span> Live Log</h2>\n" +
"      <div class=\"log-box\" id=\"logBox\"></div>\n" +
"      <div class=\"btn-group\" style=\"margin-top:10px\">\n" +
"        <button class=\"secondary\" onclick=\"loadLog()\">Refresh</button>\n" +
"        <button class=\"secondary\" onclick=\"document.getElementById('logBox').innerHTML=''\">Clear</button>\n" +
"      </div>\n" +
"    </div>\n" +
"  </div>\n" +
"</div>\n" +
"<div class=\"toast\" id=\"toast\"></div>\n" +
"\n" +
"<script>\n" +
"const API = '';\n" +
"function toast(msg, ok) {\n" +
"  const t = document.getElementById('toast');\n" +
"  t.textContent = msg;\n" +
"  t.className = 'toast show ' + (ok ? 'ok' : 'err');\n" +
"  setTimeout(() => t.className = 'toast', 2500);\n" +
"}\n" +
"async function api(path, method, body) {\n" +
"  try {\n" +
"    const opts = { method: method || 'GET' };\n" +
"    if (body) { opts.body = JSON.stringify(body); opts.headers = {'Content-Type':'application/json'}; }\n" +
"    const r = await fetch(API + path, opts);\n" +
"    return await r.json();\n" +
"  } catch(e) { toast('Connection error: ' + e.message, false); return null; }\n" +
"}\n" +
"\n" +
"async function doSearch() {\n" +
"  const kw = document.getElementById('keyword').value.trim();\n" +
"  if (!kw) { toast('Enter a keyword', false); return; }\n" +
"  const r = await api('/api/search', 'POST', { keyword: kw });\n" +
"  if (r && r.ok) toast('Search started: ' + kw, true);\n" +
"}\n" +
"async function doTrack() {\n" +
"  const url = document.getElementById('trackUrl').value.trim();\n" +
"  if (!url) { toast('Enter a URL to track', false); return; }\n" +
"  const r = await api('/api/track', 'POST', { url: url });\n" +
"  if (r && r.ok) toast('Tracking: ' + url, true);\n" +
"}\n" +
"async function doGetData() {\n" +
"  const r = await api('/api/getdata', 'POST', {});\n" +
"  if (r && r.ok) toast('Get Data started', true);\n" +
"}\n" +
"async function doStop() {\n" +
"  const r = await api('/api/stop', 'POST', {});\n" +
"  if (r && r.ok) toast('Stopped', true);\n" +
"}\n" +
"async function doSettings() {\n" +
"  const s = {};\n" +
"  const c = document.getElementById('setCountry').value.trim(); if (c) s.country = c;\n" +
"  const l = document.getElementById('setLang').value.trim(); if (l) s.language = l;\n" +
"  const p = document.getElementById('setPlatform').value; if (p) s.platform = p;\n" +
"  const n = document.getElementById('setSearches').value; if (n) s.searches = n;\n" +
"  const nr = document.getElementById('setNear').value.trim(); if (nr) s.near = nr;\n" +
"  if (Object.keys(s).length === 0) { toast('No settings to apply', false); return; }\n" +
"  const r = await api('/api/settings', 'POST', s);\n" +
"  if (r && r.ok) toast('Settings applied', true);\n" +
"}\n" +
"async function loadSettings() {\n" +
"  const r = await api('/api/settings');\n" +
"  if (!r) return;\n" +
"  document.getElementById('setCountry').value = r.country || '';\n" +
"  document.getElementById('setLang').value = r.language || '';\n" +
"  document.getElementById('setPlatform').value = r.platform || '';\n" +
"  document.getElementById('setSearches').value = r.searches || '';\n" +
"  document.getElementById('setNear').value = r.near || '';\n" +
"  toast('Settings loaded', true);\n" +
"}\n" +
"async function doBatch() {\n" +
"  const raw = document.getElementById('batchInput').value.trim();\n" +
"  if (!raw) { toast('Enter batch data', false); return; }\n" +
"  const entries = raw.split('\\n').filter(l => l.trim()).map(l => {\n" +
"    const sep = l.includes('\\t') ? '\\t' : ',';\n" +
"    const p = l.split(sep, 2);\n" +
"    return { url: p[0].trim(), keyword: p[1] ? p[1].trim() : '' };\n" +
"  }).filter(e => e.url && e.keyword);\n" +
"  if (entries.length === 0) { toast('No valid entries (format: url,keyword)', false); return; }\n" +
"  const r = await api('/api/batch', 'POST', { entries });\n" +
"  if (r && r.ok) toast('Batch started: ' + r.count + ' entries', true);\n" +
"}\n" +
"async function doScript() {\n" +
"  const s = document.getElementById('scriptInput').value.trim();\n" +
"  if (!s) { toast('Enter a CoraScript', false); return; }\n" +
"  const r = await api('/api/script', 'POST', { script: s });\n" +
"  if (r && r.ok) toast('Script started', true);\n" +
"}\n" +
"async function loadResults() {\n" +
"  const r = await api('/api/results');\n" +
"  if (!r || !r.results) return;\n" +
"  const body = document.getElementById('resultsBody');\n" +
"  if (r.results.length === 0) { body.innerHTML = '<tr><td colspan=\"2\" style=\"color:#64748b\">No results yet</td></tr>'; return; }\n" +
"  body.innerHTML = r.results.map((res,i) => \n" +
"    '<tr><td class=\"rank\">' + (typeof res.rank === 'number' ? res.rank.toFixed(1) : res.rank) + '</td><td class=\"url\">' + res.url + '</td></tr>'\n" +
"  ).join('');\n" +
"  document.getElementById('sResults').textContent = r.count;\n" +
"}\n" +
"async function loadLog() {\n" +
"  const r = await api('/api/log?lines=100');\n" +
"  if (!r || !r.lines) return;\n" +
"  const box = document.getElementById('logBox');\n" +
"  box.innerHTML = r.lines.map(l => {\n" +
"    let cls = 'info';\n" +
"    if (l.includes('ERROR') || l.includes('Error')) cls = 'error';\n" +
"    else if (l.includes('WARN') || l.includes('NOTICE')) cls = 'warn';\n" +
"    else if (l.includes('highlight') || l.includes('Activated') || l.includes('Batch')) cls = 'highlight';\n" +
"    return '<div class=\"log-line ' + cls + '\">' + l + '</div>';\n" +
"  }).join('');\n" +
"  box.scrollTop = box.scrollHeight;\n" +
"}\n" +
"async function pollStatus() {\n" +
"  try {\n" +
"    const r = await api('/api/status');\n" +
"    if (!r) { document.getElementById('statusDot').className = 'status-dot red'; document.getElementById('statusText').textContent = 'Disconnected'; return; }\n" +
"    const dot = document.getElementById('statusDot');\n" +
"    const stxt = document.getElementById('statusText');\n" +
"    if (r.running) { dot.className = 'status-dot yellow'; stxt.textContent = 'Running'; }\n" +
"    else if (r.checkinStatus === 'Active') { dot.className = 'status-dot green'; stxt.textContent = 'Ready'; }\n" +
"    else { dot.className = 'status-dot red'; stxt.textContent = r.checkinStatus || 'Unknown'; }\n" +
"    document.getElementById('sCheckin').textContent = r.checkinStatus || '--';\n" +
"    document.getElementById('sSearch').textContent = r.searchTerm || '--';\n" +
"    document.getElementById('sAction').textContent = r.action || 'Idle';\n" +
"    document.getElementById('progressBar').style.width = (r.progress * 100) + '%';\n" +
"  } catch(e) {}\n" +
"}\n" +
"\n" +
"// Auto-poll\n" +
"setInterval(pollStatus, 2000);\n" +
"setInterval(loadLog, 5000);\n" +
"pollStatus();\n" +
"loadLog();\n" +
"loadSettings();\n" +
"</script>\n" +
"</body></html>";
}
