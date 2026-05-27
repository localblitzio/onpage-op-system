$ErrorActionPreference = 'Continue'
$log = 'D:\CC-Cora 7.2\launch-cora-seo-tool.log'
"[$(Get-Date -Format s)] launcher started" | Out-File -FilePath $log -Encoding UTF8 -Append

$app = 'D:\CC-Cora 7.2\SEO Correlation Tool 2026'
$classpath = @(
    'cora-recompiled.jar',
    'sinetfactory.jar',
    'commons-logging-1.2.jar',
    'jaxb-api-2.3.1.jar',
    'jaxb-core-2.3.0.1.jar',
    'jaxb-impl-2.3.2.jar',
    'junit-4.12.jar',
    'log4j-1.2.17.jar',
    'activation-1.1.1.jar',
    'commons-compress-1.19.jar',
    'commons-collections4-4.4.jar',
    'commons-codec-1.13.jar',
    'commons-math3-3.6.1.jar',
    'poi-4.1.1.jar',
    'poi-excelant-4.1.1.jar',
    'poi-ooxml-4.1.1.jar',
    'poi-ooxml-schemas-4.1.1.jar',
    'poi-scratchpad-4.1.1.jar',
    'xmlbeans-3.1.0.jar',
    'curvesapi-1.06.jar',
    'jxbrowser-javafx-7.27.jar',
    'jxbrowser-7.27.jar',
    'jxbrowser-win64-7.27.jar',
    'javafx.base.jar',
    'javafx.controls.jar',
    'javafx.fxml.jar',
    'javafx.swing.jar',
    'javafx.graphics.jar',
    'javafx.media.jar',
    'javafx-swt.jar',
    'javafx.web.jar'
) | ForEach-Object { Join-Path $app $_ }

$arguments = @(
    '-Duser.country=US',
    '-Duser.language=en',
    '-Xms6G',
    '-Xmx12G',
    '--module-path',
    (Join-Path $app 'modules'),
    '--add-modules=javafx.base,javafx.controls,javafx.fxml,javafx.graphics,javafx.media,javafx.web,javafx.swing',
    '--add-exports',
    'javafx.controls/com.sun.javafx.scene.control=ALL-UNNAMED',
    '--add-exports',
    'javafx.graphics/com.sun.javafx.stage=ALL-UNNAMED',
    '--add-exports',
    'javafx.graphics/com.sun.javafx.scene=ALL-UNNAMED',
    '--add-exports',
    'javafx.graphics/com.sun.javafx.scene.traversal=ALL-UNNAMED',
    '--add-exports',
    'javafx.graphics/com.sun.javafx.tk=ALL-UNNAMED',
    '--add-exports',
    'javafx.graphics/com.sun.glass.ui=ALL-UNNAMED',
    '--add-exports',
    'java.desktop/sun.awt=ALL-UNNAMED',
    '--add-exports',
    'jdk.httpserver/com.sun.net.httpserver=ALL-UNNAMED',
    '-classpath',
    ($classpath -join ';'),
    'cora.Main'
)

Set-Location $app
try {
    "[$(Get-Date -Format s)] starting java" | Out-File -FilePath $log -Encoding UTF8 -Append
    & (Join-Path $app 'jre\bin\java.exe') @arguments *>> $log
    "[$(Get-Date -Format s)] java exited with code $LASTEXITCODE" | Out-File -FilePath $log -Encoding UTF8 -Append
} catch {
    "[$(Get-Date -Format s)] launcher error: $($_.Exception.Message)" | Out-File -FilePath $log -Encoding UTF8 -Append
}
