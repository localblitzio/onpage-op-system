param(
    [string]$Workspace = "D:\CC-Cora 7.2"
)

$ErrorActionPreference = "Stop"

$devDir = Join-Path $Workspace "Cora SEO Software"
$deployDirs = @(
    (Join-Path $Workspace "SEO Correlation Tool 2026"),
    (Join-Path $Workspace "SEO Correlation Tool 2026 Fresh GUI")
)
$mainJava = Join-Path $devDir "src\cora\Main.java"
$manifestPath = Join-Path $devDir "build\manifest.txt"
$outJar = Join-Path $devDir "cora-recompiled.jar"

function Find-Tool {
    param(
        [string]$Name,
        [string[]]$ExtraRoots = @()
    )
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    foreach ($root in $ExtraRoots) {
        if (Test-Path $root) {
            $hit = Get-ChildItem -LiteralPath $root -Recurse -Filter $Name -File -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($hit) {
                return $hit.FullName
            }
        }
    }
    return $null
}

function Backup-File {
    param([string]$Path)
    if (Test-Path $Path) {
        $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backup = "$Path.bak_source_api_$stamp"
        Copy-Item -LiteralPath $Path -Destination $backup -Force
        Write-Host "Backed up $Path to $backup"
    }
}

function Patch-Launcher {
    param([string]$BatPath)
    if (-not (Test-Path $BatPath)) {
        return
    }
    $text = Get-Content -LiteralPath $BatPath -Raw
    if ($text -notmatch "jdk\.httpserver") {
        $text = $text -replace "--add-modules=([^ ]+)", '--add-modules=$1,jdk.httpserver'
        Set-Content -LiteralPath $BatPath -Value $text -Encoding ASCII -NoNewline
        Write-Host "Patched launcher module list: $BatPath"
    }
}

if (-not (Test-Path $mainJava)) {
    throw "Main.java not found: $mainJava"
}

$latestMainBackup = Get-ChildItem -LiteralPath (Split-Path $mainJava) -Filter "Main.java.bak_source_api_*" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if ($latestMainBackup) {
    Copy-Item -LiteralPath $latestMainBackup.FullName -Destination $mainJava -Force
    Write-Host "Restored Main.java from latest source rebuild backup before patching."
}

$javac = Find-Tool "javac.exe" @("C:\Program Files", "C:\Program Files\Eclipse Adoptium", "C:\Program Files\Java", (Join-Path $devDir "jre"))
$jar = Find-Tool "jar.exe" @("C:\Program Files", "C:\Program Files\Eclipse Adoptium", "C:\Program Files\Java", (Join-Path $devDir "jre"))

if (-not $javac -or -not $jar) {
    throw "A JDK is required to rebuild the API-enabled Cora JAR. Could not find javac.exe and jar.exe. Install Temurin/OpenJDK 17 JDK, then rerun this script."
}

Write-Host "Using javac: $javac"
Write-Host "Using jar: $jar"

Write-Host "Normalizing Java source encoding..."
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
Get-ChildItem -LiteralPath (Join-Path $devDir "src") -Recurse -Filter "*.java" -File | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $text = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
        [System.IO.File]::WriteAllText($_.FullName, $text, $utf8NoBom)
    }
}

Backup-File $mainJava
$mainText = Get-Content -LiteralPath $mainJava -Raw

if ($mainText -notmatch "import\s+cora\.api\.CoraAPIServer;") {
    $mainText = $mainText -replace "package\s+cora;\s*", "package cora;`r`n`r`nimport cora.api.CoraAPIServer;`r`n"
}

if ($mainText -notmatch "CoraContext\.primaryStage\s*=\s*primaryStage") {
    $mainText = $mainText -replace "(public\s+void\s+start\s*\(\s*Stage\s+primaryStage\s*\)[^{]*\{)", "`$1`r`n        CoraContext.primaryStage = primaryStage;"
}

if ($mainText -notmatch "CoraAPIServer\.start\s*\(") {
    if ($mainText -match "primaryStage\.show\s*\(\s*\)\s*;") {
        $mainText = $mainText -replace "(primaryStage\.show\s*\(\s*\)\s*;)", "`$1`r`n        CoraAPIServer.start();"
    } else {
        $mainText = $mainText -replace "(CoraContext\.primaryStage\s*=\s*primaryStage\s*;)", "`$1`r`n        CoraAPIServer.start();"
    }
}

[System.IO.File]::WriteAllText($mainJava, $mainText, $utf8NoBom)

Push-Location $devDir
try {
    $batText = Get-Content ".\cora-recompiled.bat" -Raw -ErrorAction SilentlyContinue
    if (-not $batText) {
        $batText = Get-Content ".\cora.bat" -Raw
    }

    $cpMatch = [regex]::Match($batText, '(?i)(?:-cp|-classpath)\s+"([^"]+)"')
    if (-not $cpMatch.Success) {
        $cpMatch = [regex]::Match($batText, '(?i)(?:-cp|-classpath)\s+([^\s]+)')
    }
    if (-not $cpMatch.Success) {
        throw "Could not parse classpath from Cora batch file."
    }
    $classpath = $cpMatch.Groups[1].Value

    Write-Host "Compiling source..."
    & $javac -encoding UTF-8 -cp $classpath -d build "@sources.txt"
    if ($LASTEXITCODE -ne 0) {
        throw "javac failed with exit code $LASTEXITCODE"
    }

    Write-Host "Creating JAR..."
    Backup-File $outJar
    & $jar cfm $outJar $manifestPath -C build .
    if ($LASTEXITCODE -ne 0) {
        throw "jar failed with exit code $LASTEXITCODE"
    }

    python -c "import zipfile,sys; p=sys.argv[1]; z=zipfile.ZipFile(p); n=z.namelist(); assert 'cora/Main.class' in n; assert 'cora/api/CoraAPIServer.class' in n; refs=[x for x in n if x.endswith('.class') and b'CoraAPIServer' in z.read(x)]; print('API refs:', refs); assert any(x!='cora/api/CoraAPIServer.class' for x in refs)" $outJar
    if ($LASTEXITCODE -ne 0) {
        throw "Rebuilt JAR validation failed"
    }

    foreach ($deployDir in $deployDirs) {
        if (Test-Path $deployDir) {
            $dest = Join-Path $deployDir "cora-recompiled.jar"
            Backup-File $dest
            Copy-Item -LiteralPath $outJar -Destination $dest -Force
            Patch-Launcher (Join-Path $deployDir "SEO Correlation Tool 2026.bat")
            Write-Host "Copied rebuilt API JAR to $dest"
        }
    }
}
finally {
    Pop-Location
}

Write-Host "Source rebuild complete. Restart Cora and test /api/status."
