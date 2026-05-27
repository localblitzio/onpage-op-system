/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javafx.application.Application
 *  javafx.fxml.FXMLLoader
 *  javafx.scene.Parent
 *  javafx.scene.Scene
 *  javafx.stage.Stage
 */
package cora;

import cora.api.CoraAPIServer;
import cora.CoraContext;
import cora.model.WindowDim;
import cora.util.AutoUtil;
import cora.util.FileUtil;
import cora.util.InitUtil;
import cora.util.LogUtil;
import cora.util.PositionUtil;
import cora.util.PrefsUtil;
import cora.util.ReportCodeUtil;
import java.io.File;
import java.net.URL;
import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class Main
extends Application {
    public void init() throws Exception {
    }

    public void stop() {
        LogUtil.info("Cora Shutdown.");
        try {
            if (CoraContext.updateReportDialog != null) {
                CoraContext.updateReportDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.settingsDialog != null) {
                CoraContext.settingsDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.diffDialog != null) {
                CoraContext.diffDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.trendsDialog != null) {
                CoraContext.trendsDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.newSettingsDialog != null) {
                CoraContext.newSettingsDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.domainsDialog != null) {
                CoraContext.domainsDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.replaceResultsDialog != null) {
                CoraContext.replaceResultsDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.bannedDialog != null) {
                CoraContext.bannedDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.nearDialog != null) {
                CoraContext.nearDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.pageDialog != null) {
                CoraContext.pageDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.factorsDialog != null) {
                CoraContext.factorsDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.proxiesDialog != null) {
                CoraContext.proxiesDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.BulkDialog != null) {
                CoraContext.BulkDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.shareDialog != null) {
                CoraContext.shareDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.slowRenderDialog != null) {
                CoraContext.slowRenderDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.stopWordsDialog != null) {
                CoraContext.stopWordsDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.volatilityDialog != null) {
                CoraContext.volatilityDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        try {
            if (CoraContext.wizardDialog != null) {
                CoraContext.wizardDialog.close();
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
        File f = new File(PrefsUtil.getOutputDirectory() + "/auto.txt");
        if (f.exists()) {
            f.delete();
        }
        LogUtil.logResources("Shutdown");
        LogUtil.logThreads();
        System.exit(0);
    }

    public void start(Stage primaryStage) throws Exception {
        Parent root;
        System.setProperty("file.encoding", "UTF-8");
        System.setProperty("jxbrowser.license.key", "");
        System.setProperty("jdk.internal.httpclient.disableHostnameVerification", Boolean.TRUE.toString());
        long bench1 = System.currentTimeMillis();
        File profiles = new File(PrefsUtil.getCoraHome());
        if (!profiles.exists()) {
            profiles.mkdirs();
        }
        long benchAA = System.currentTimeMillis();
        long benchBB = System.currentTimeMillis();
        long benchA = System.currentTimeMillis();
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
        CoraContext.setLEDYellow();
        InitUtil.setupCoraHome();
        CoraContext.setLEDYellow();
        CoraContext.root = root = (Parent)FXMLLoader.load((URL)((this)).getClass().getResource("cora.fxml"));
        primaryStage.setTitle(" " + CoraContext.VERSION);
        Scene scene = new Scene(root, PrefsUtil.getMainWindowW().doubleValue(), PrefsUtil.getMainWindowH().doubleValue());
        primaryStage.setScene(scene);
        CoraContext.primaryStage = primaryStage;
        CoraContext.primaryStage.setX(PrefsUtil.getMainWindowX().doubleValue());
        CoraContext.primaryStage.setY(PrefsUtil.getMainWindowY().doubleValue());
        long benchB = System.currentTimeMillis();
        LogUtil.debug("BENCHMARK: Main Browser crap...: " + (double)(benchBB - benchAA) / 1000.0);
        LogUtil.debug("BENCHMARK: setScene crap...: " + (double)(benchB - benchA) / 1000.0);
        benchA = System.currentTimeMillis();
        try {
            primaryStage.show();
        }
        catch (Exception e) {
            LogUtil.discreetError("MAIN primaryStage.show(): ", e);
        }
        benchB = System.currentTimeMillis();
        LogUtil.debug("BENCHMARK: Main primaryStage.show(): " + (double)(benchB - benchA) / 1000.0);
        LogUtil.info("CORA VERSION: " + CoraContext.VERSION);
        LogUtil.info("SETTING EnableLSI: " + PrefsUtil.getEnableLSI());
        LogUtil.info("SETTING RegexWildcardLimit: " + PrefsUtil.getRegexWildcardLimit());
        CoraContext.primaryStage.widthProperty().addListener((obs, oldVal, newVal) -> {
            WindowDim dim = PositionUtil.getMainWindowDims();
        });
        CoraContext.primaryStage.heightProperty().addListener((obs, oldVal, newVal) -> {
            WindowDim dim = PositionUtil.getMainWindowDims();
        });
        CoraContext.primaryStage.xProperty().addListener((obs, oldVal, newVal) -> {
            WindowDim dim = PositionUtil.getMainWindowDims();
        });
        CoraContext.primaryStage.yProperty().addListener((obs, oldVal, newVal) -> {
            WindowDim dim = PositionUtil.getMainWindowDims();
        });
        long bench2 = System.currentTimeMillis();
        LogUtil.debug("BENCHMARK: Main start(): " + (double)(bench2 - bench1) / 1000.0);
        ReportCodeUtil.initReportCodes();
        cora.api.CoraAPIServer.start();
    }

    public static void main(String[] args) {
        File temp = new File(PrefsUtil.getOutputDirectory() + "/auto.txt");
        if (temp.exists()) {
            AutoUtil.workflow = FileUtil.readTextFile(temp).trim();
        }
        Main.launch((String[])args);
    }
}


