param(
    [string]$Workspace = "D:\CC-Cora 7.2"
)

$ErrorActionPreference = "Stop"

$devDir = Join-Path $Workspace "Cora SEO Software"
$baseJar = Join-Path $devDir "cora.jar"
$apiJar = Join-Path $devDir "cora-recompiled.jar.bak_20260527_150930"
if (-not (Test-Path $apiJar)) {
    $apiJar = Join-Path $devDir "cora-recompiled.jar"
}
$outJar = Join-Path $devDir "cora-recompiled.jar"
$deployDirs = @(
    (Join-Path $Workspace "SEO Correlation Tool 2026"),
    (Join-Path $Workspace "SEO Correlation Tool 2026 Fresh GUI")
)

if (-not (Test-Path $baseJar)) {
    throw "Base JAR not found: $baseJar"
}
if (-not (Test-Path $apiJar)) {
    throw "API source JAR not found: $apiJar"
}

function Backup-File {
    param([string]$Path)
    if (Test-Path $Path) {
        $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backup = "$Path.bak_api_repair_$stamp"
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

$tempPy = Join-Path ([System.IO.Path]::GetTempPath()) ("repair_cora_api_" + [System.Guid]::NewGuid().ToString("N") + ".py")
$tempJar = Join-Path ([System.IO.Path]::GetTempPath()) ("cora_api_repaired_" + [System.Guid]::NewGuid().ToString("N") + ".jar")

@'
import sys
import zipfile
from pathlib import Path

base_path = Path(sys.argv[1])
api_path = Path(sys.argv[2])
out_path = Path(sys.argv[3])

required_base = "cora/Main.class"
required_api = "cora/api/CoraAPIServer.class"

with zipfile.ZipFile(base_path, "r") as base, zipfile.ZipFile(api_path, "r") as api:
    base_names = set(base.namelist())
    api_names = set(api.namelist())
    if required_base not in base_names:
        raise SystemExit(f"Base JAR is invalid; missing {required_base}")
    if required_base not in api_names:
        raise SystemExit(f"API source JAR is invalid; missing {required_base}")
    if required_api not in api_names:
        raise SystemExit(f"API source JAR is invalid; missing {required_api}")

    overlay = set()
    overlay.update(n for n in api_names if n.startswith("cora/api/"))
    overlay.update(n for n in api_names if n.startswith("cora/util/BatchRunner"))
    overlay.update(n for n in api_names if n.startswith("cora/util/AutoLog"))

    # Include whichever compiled class starts the API server.
    for name in api_names:
        if name.endswith(".class"):
            try:
                if b"CoraAPIServer" in api.read(name):
                    overlay.add(name)
            except Exception:
                pass

    # Main is expected to be the startup hook in this build.
    overlay.add("cora/Main.class")

    # Include new cora classes that are not in the original JAR.
    overlay.update(n for n in api_names if n.startswith("cora/") and n.endswith(".class") and n not in base_names)

    skip_dirs = set()
    written = set()
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as out:
        for info in base.infolist():
            if info.filename in overlay:
                continue
            if info.filename in written:
                continue
            written.add(info.filename)
            out.writestr(info, base.read(info.filename))

        for name in sorted(overlay):
            if name.endswith("/"):
                skip_dirs.add(name)
                continue
            if name not in api_names:
                continue
            if name in written:
                continue
            written.add(name)
            info = api.getinfo(name)
            out.writestr(info, api.read(name))

    with zipfile.ZipFile(out_path, "r") as repaired:
        names = set(repaired.namelist())
        checks = {
            "MAIN": "cora/Main.class" in names,
            "API": "cora/api/CoraAPIServer.class" in names,
        }
        refs = []
        for name in names:
            if name.endswith(".class"):
                try:
                    if b"CoraAPIServer" in repaired.read(name):
                        refs.append(name)
                except Exception:
                    pass
        print("checks", checks)
        print("api_refs", sorted(refs))
        if not checks["MAIN"] or not checks["API"]:
            raise SystemExit("Repaired JAR failed validation")
        if not any(name != "cora/api/CoraAPIServer.class" for name in refs):
            raise SystemExit("Repaired JAR contains API class but no startup reference to it")
'@ | Set-Content -LiteralPath $tempPy -Encoding UTF8

try {
    Write-Host "Repairing API-enabled JAR from valid original base..."
    python $tempPy $baseJar $apiJar $tempJar
    if ($LASTEXITCODE -ne 0) {
        throw "Python JAR repair failed with exit code $LASTEXITCODE"
    }

    Backup-File $outJar
    Copy-Item -LiteralPath $tempJar -Destination $outJar -Force
    Write-Host "Wrote repaired dev JAR: $outJar"

    foreach ($deployDir in $deployDirs) {
        if (Test-Path $deployDir) {
            $dest = Join-Path $deployDir "cora-recompiled.jar"
            Backup-File $dest
            Copy-Item -LiteralPath $outJar -Destination $dest -Force
            Patch-Launcher (Join-Path $deployDir "SEO Correlation Tool 2026.bat")
            Write-Host "Copied repaired JAR to $dest"
        }
    }
}
finally {
    if (Test-Path $tempPy) {
        Remove-Item -LiteralPath $tempPy -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $tempJar) {
        Remove-Item -LiteralPath $tempJar -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "API repair complete. Restart Cora and test http://127.0.0.1:9090/api/status."

