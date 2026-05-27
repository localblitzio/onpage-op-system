package cora.util;

import cora.CoraContext;
import javafx.application.Platform;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;

public class BatchRunner {

    public static class BatchEntry {
        public final String url;
        public final String keyword;

        public BatchEntry(String url, String keyword) {
            this.url = url.trim();
            this.keyword = keyword.trim();
        }

        public String toString() {
            return keyword + " -> " + url;
        }
    }

    public static List<BatchEntry> loadCSV(File file) {
        List<BatchEntry> entries = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line;
            int lineNum = 0;
            while ((line = br.readLine()) != null) {
                lineNum++;
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                // Skip header row
                if (lineNum == 1 && (line.toLowerCase().startsWith("url,") || line.toLowerCase().startsWith("url\t"))) continue;
                String[] parts;
                if (line.contains("\t")) {
                    parts = line.split("\t", 2);
                } else {
                    parts = line.split(",", 2);
                }
                if (parts.length == 2 && !parts[0].trim().isEmpty() && !parts[1].trim().isEmpty()) {
                    entries.add(new BatchEntry(parts[0].trim(), parts[1].trim()));
                } else {
                    LogUtil.warn("Batch: skipping invalid line " + lineNum + ": " + line);
                }
            }
        } catch (Exception e) {
            LogUtil.error("Batch: error reading CSV", e);
        }
        return entries;
    }

    public static void runBatch(File csvFile) {
        List<BatchEntry> entries = loadCSV(csvFile);
        if (entries.isEmpty()) {
            LogUtil.error("Batch: no valid entries found in " + csvFile.getAbsolutePath());
            return;
        }
        AutoLog.initLog();
        AutoLog.log("[ Batch ] Loaded " + entries.size() + " entries from " + csvFile.getName());
        StringBuilder script = new StringBuilder();
        for (int i = 0; i < entries.size(); i++) {
            BatchEntry entry = entries.get(i);
            AutoLog.log("[ Batch ] Entry " + (i + 1) + ": " + entry);
            if (i > 0) {
                script.append("; ");
            }
            script.append("search ").append(entry.keyword);
            script.append("; track ").append(entry.url);
            script.append("; click get data");
        }
        String coraScript = script.toString();
        AutoLog.log("[ Batch ] Generated CoraScript: " + coraScript);
        Platform.runLater(new Runnable() {
            public void run() {
                AutoUtil.workflow = coraScript;
                AutoUtil.parseCoraScript(coraScript);
                AutoUtil.processNextTask();
            }
        });
    }

    public static void runBatch(List<BatchEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            LogUtil.error("Batch: no entries provided");
            return;
        }
        AutoLog.initLog();
        AutoLog.log("[ Batch ] Running " + entries.size() + " entries");
        StringBuilder script = new StringBuilder();
        for (int i = 0; i < entries.size(); i++) {
            BatchEntry entry = entries.get(i);
            AutoLog.log("[ Batch ] Entry " + (i + 1) + ": " + entry);
            if (i > 0) {
                script.append("; ");
            }
            script.append("search ").append(entry.keyword);
            script.append("; track ").append(entry.url);
            script.append("; click get data");
        }
        String coraScript = script.toString();
        AutoLog.log("[ Batch ] Generated CoraScript: " + coraScript);
        Platform.runLater(new Runnable() {
            public void run() {
                AutoUtil.workflow = coraScript;
                AutoUtil.parseCoraScript(coraScript);
                AutoUtil.processNextTask();
            }
        });
    }
}
