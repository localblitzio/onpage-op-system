param(
    [string]$Workspace = "D:\CC-Cora 7.2"
)

$ErrorActionPreference = "Stop"

$devDir = Join-Path $Workspace "Cora SEO Software"
$buildDir = Join-Path $devDir "build"
$manifestPath = Join-Path $buildDir "manifest.txt"
$outJar = Join-Path $devDir "cora-recompiled.jar"
$deployDirs = @(
    (Join-Path $Workspace "SEO Correlation Tool 2026"),
    (Join-Path $Workspace "SEO Correlation Tool 2026 Fresh GUI")
)

if (-not (Test-Path $buildDir)) {
    throw "Build directory not found: $buildDir"
}
if (-not (Test-Path $manifestPath)) {
    throw "Manifest not found: $manifestPath"
}

function Backup-File {
    param([string]$Path)
    if (Test-Path $Path) {
        $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backup = "$Path.bak_$stamp"
        Copy-Item -LiteralPath $Path -Destination $backup -Force
        Write-Host "Backed up $Path to $backup"
    }
}

function Get-RelativeZipPath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )
    $base = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd("\", "/") + "\"
    $full = (Resolve-Path -LiteralPath $FullPath).Path
    if (-not $full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path $full is not under $base"
    }
    return $full.Substring($base.Length).Replace("\", "/")
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$tempJar = Join-Path ([System.IO.Path]::GetTempPath()) ("cora-recompiled_" + [System.Guid]::NewGuid().ToString("N") + ".jar")

try {
    $fileStream = [System.IO.File]::Open($tempJar, [System.IO.FileMode]::CreateNew)
    try {
        $zip = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create)
        try {
            $manifestText = Get-Content -LiteralPath $manifestPath -Raw
            $manifestText = $manifestText -replace "`r?`n", "`r`n"
            if (-not $manifestText.EndsWith("`r`n")) {
                $manifestText += "`r`n"
            }

            $manifestEntry = $zip.CreateEntry("META-INF/MANIFEST.MF", [System.IO.Compression.CompressionLevel]::Optimal)
            $manifestWriter = New-Object System.IO.StreamWriter($manifestEntry.Open(), (New-Object System.Text.UTF8Encoding($false)))
            try {
                $manifestWriter.Write($manifestText)
            }
            finally {
                $manifestWriter.Dispose()
            }

            $files = Get-ChildItem -LiteralPath $buildDir -Recurse -File | Sort-Object FullName
            foreach ($file in $files) {
                $relative = Get-RelativeZipPath -BasePath $buildDir -FullPath $file.FullName
                if ($relative -ieq "META-INF/MANIFEST.MF" -or $relative -ieq "manifest.txt") {
                    continue
                }

                $entry = $zip.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
                $entryStream = $entry.Open()
                $inputStream = [System.IO.File]::OpenRead($file.FullName)
                try {
                    $inputStream.CopyTo($entryStream)
                }
                finally {
                    $inputStream.Dispose()
                    $entryStream.Dispose()
                }
            }
        }
        finally {
            $zip.Dispose()
        }
    }
    finally {
        $fileStream.Dispose()
    }

    Backup-File $outJar
    Copy-Item -LiteralPath $tempJar -Destination $outJar -Force
    Write-Host "Rebuilt $outJar from build folder."

    foreach ($deployDir in $deployDirs) {
        if (Test-Path $deployDir) {
            $dest = Join-Path $deployDir "cora-recompiled.jar"
            Backup-File $dest
            Copy-Item -LiteralPath $outJar -Destination $dest -Force
            Write-Host "Copied rebuilt JAR to $dest"
        }
    }
}
finally {
    if (Test-Path $tempJar) {
        Remove-Item -LiteralPath $tempJar -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Safe rebuild complete."
