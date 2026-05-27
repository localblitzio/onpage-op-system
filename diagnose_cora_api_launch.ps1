param(
    [string]$AppDir = "D:\CC-Cora 7.2\SEO Correlation Tool 2026"
)

$ErrorActionPreference = "Stop"

$jarPath = Join-Path $AppDir "cora-recompiled.jar"
$batPath = Join-Path $AppDir "SEO Correlation Tool 2026.bat"
$logPath = Join-Path $AppDir "debug-cora-launch.log"

if (-not (Test-Path $jarPath)) {
    throw "JAR not found: $jarPath"
}
if (-not (Test-Path $batPath)) {
    throw "BAT not found: $batPath"
}

Write-Host "Stopping existing Java processes..."
Stop-Process -Name java,javaw -Force -ErrorAction SilentlyContinue

Write-Host "Checking JAR contents..."
python -c "import zipfile,sys; p=sys.argv[1]; z=zipfile.ZipFile(p); n=z.namelist(); print('MAIN', 'cora/Main.class' in n); print('API', 'cora/api/CoraAPIServer.class' in n); refs=[]; [refs.append(x) for x in n if x.endswith('.class') and b'CoraAPIServer' in z.read(x)]; print('REFS'); print('\n'.join(refs))" $jarPath

Write-Host "Writing debug launcher..."
$bat = Get-Content -LiteralPath $batPath -Raw
$bat = $bat -replace 'start "" "%~dp0jre\\bin\\javaw"', '"%~dp0jre\bin\java"'
$bat = $bat -replace 'start "" "%~dp0jre/bin/javaw"', '"%~dp0jre/bin/java"'
$bat = $bat + "`r`n"
$debugPath = Join-Path $AppDir "debug-cora-api-launch.bat"
Set-Content -LiteralPath $debugPath -Value $bat -Encoding ASCII -NoNewline

Write-Host "Launching Cora with console output. Log: $logPath"
Push-Location $AppDir
try {
    $ErrorActionPreference = "Continue"
    & cmd /c ".\debug-cora-api-launch.bat" > $logPath 2>&1
    $ErrorActionPreference = "Stop"
    Get-Content -LiteralPath $logPath -First 160
}
finally {
    Pop-Location
}

Write-Host "Checking API port..."
Test-NetConnection 127.0.0.1 -Port 9090

Write-Host "Checking Java process..."
Get-Process java,javaw -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path,StartTime

Write-Host "Done. If Cora exited, paste the first error block from $logPath."
