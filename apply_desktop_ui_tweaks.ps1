param(
    [string]$Workspace = "D:\CC-Cora 7.2"
)

$ErrorActionPreference = "Stop"

$devDir = Join-Path $Workspace "Cora SEO Software"
$deployDirs = @(
    (Join-Path $Workspace "SEO Correlation Tool 2026"),
    (Join-Path $Workspace "SEO Correlation Tool 2026 Fresh GUI")
)

if (-not (Test-Path $devDir)) {
    throw "Development directory not found: $devDir"
}

Write-Host "Applying Local Blitz text/url replacements..."
$textFiles = @()
$textFiles += Get-ChildItem (Join-Path $devDir "src") -Recurse -Include *.java,*.css -File
$textFiles += Get-ChildItem (Join-Path $devDir "build") -Recurse -Include *.fxml,*.css -File

foreach ($file in $textFiles) {
    $text = Get-Content -LiteralPath $file.FullName -Raw
    $updated = $text
    $updated = $updated -replace "404Con", "Local Blitz"
    $updated = $updated -replace "404 Con", "Local Blitz"
    $updated = $updated -replace "404CON", "Local Blitz"
    $updated = $updated -replace "https?://(?:www\.)?404con\.[^`"' <>\)]*", "https://localblitz.io"
    if ($updated -ne $text) {
        Set-Content -LiteralPath $file.FullName -Value $updated -NoNewline -Encoding UTF8
        Write-Host "Updated $($file.FullName)"
    }
}

$srcCss = Join-Path $devDir "src\cora\app-style.css"
$buildCss = Join-Path $devDir "build\cora\app-style.css"
if ((Test-Path $srcCss) -and (Test-Path $buildCss)) {
    Copy-Item -LiteralPath $srcCss -Destination $buildCss -Force
    Write-Host "Synced app-style.css into build assets."
}

Push-Location $devDir
try {
    $jarPath = Join-Path $devDir "cora-recompiled.jar"
    $manifestPath = Join-Path $devDir "build\manifest.txt"

    $javac = (Get-Command javac -ErrorAction SilentlyContinue)
    $jar = (Get-Command jar -ErrorAction SilentlyContinue)

    if ($javac -and $jar -and (Test-Path ".\sources.txt")) {
        Write-Host "Recompiling Java sources..."
        $batText = ""
        foreach ($batName in @("cora-recompiled.bat", "cora.bat")) {
            if (Test-Path $batName) {
                $batText = Get-Content $batName -Raw
                if ($batText) { break }
            }
        }

        $classpath = "."
        $cpMatch = [regex]::Match($batText, '(?i)(?:-cp|-classpath)\s+"([^"]+)"')
        if ($cpMatch.Success) {
            $classpath = $cpMatch.Groups[1].Value
        } else {
            $cpMatch = [regex]::Match($batText, '(?i)(?:-cp|-classpath)\s+([^\s]+)')
            if ($cpMatch.Success) {
                $classpath = $cpMatch.Groups[1].Value
            }
        }

        & $javac.Source -encoding UTF-8 -cp $classpath -d build "@sources.txt"
        if ($LASTEXITCODE -ne 0) {
            throw "javac failed with exit code $LASTEXITCODE"
        }

        & $jar.Source cfm $jarPath $manifestPath -C build .
        if ($LASTEXITCODE -ne 0) {
            throw "jar failed with exit code $LASTEXITCODE"
        }
    } elseif ($jar) {
        Write-Host "javac not found; updating CSS/FXML assets inside existing JAR only."
        & $jar.Source uf $jarPath -C build cora/app-style.css -C build cora/cora.fxml
        if ($LASTEXITCODE -ne 0) {
            throw "jar update failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Host "Java jar tool not found; using safe .NET JAR builder from build folder."
        & powershell -ExecutionPolicy Bypass -File (Join-Path $Workspace "rebuild_recompiled_jar_from_build.ps1") -Workspace $Workspace
        if ($LASTEXITCODE -ne 0) {
            throw "Safe rebuild script failed with exit code $LASTEXITCODE"
        }
        return
        Write-Host "Java jar tool not found; using PowerShell ZIP fallback for CSS/FXML assets."
        $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("cora_jar_update_" + [System.Guid]::NewGuid().ToString("N"))
        $tempZip = Join-Path ([System.IO.Path]::GetTempPath()) ("cora_jar_update_" + [System.Guid]::NewGuid().ToString("N") + ".zip")
        try {
            New-Item -ItemType Directory -Path $tempDir | Out-Null
            Copy-Item -LiteralPath $jarPath -Destination $tempZip -Force
            Expand-Archive -LiteralPath $tempZip -DestinationPath $tempDir -Force

            $assetDir = Join-Path $tempDir "cora"
            if (-not (Test-Path $assetDir)) {
                New-Item -ItemType Directory -Path $assetDir | Out-Null
            }
            Copy-Item -LiteralPath (Join-Path $devDir "build\cora\app-style.css") -Destination (Join-Path $assetDir "app-style.css") -Force
            Copy-Item -LiteralPath (Join-Path $devDir "build\cora\cora.fxml") -Destination (Join-Path $assetDir "cora.fxml") -Force

            Remove-Item -LiteralPath $tempZip -Force
            Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $tempZip -Force
            Copy-Item -LiteralPath $tempZip -Destination $jarPath -Force
        }
        finally {
            if (Test-Path $tempDir) {
                Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
            }
            if (Test-Path $tempZip) {
                Remove-Item -LiteralPath $tempZip -Force -ErrorAction SilentlyContinue
            }
        }
    }

    foreach ($deployDir in $deployDirs) {
        if (Test-Path $deployDir) {
            Copy-Item -LiteralPath $jarPath -Destination (Join-Path $deployDir "cora-recompiled.jar") -Force
            Write-Host "Copied rebuilt JAR to $deployDir"
        }
    }
}
finally {
    Pop-Location
}

Write-Host "Desktop UI tweak pass complete."
