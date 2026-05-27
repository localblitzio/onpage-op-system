param(
    [string]$Workspace = "D:\CC-Cora 7.2",
    [string]$CommitMessage = "Restore Cora API integration and add dashboard modules",
    [string]$TagName = "api-working-2026-05-27"
)

$ErrorActionPreference = "Stop"

Set-Location $Workspace

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not on PATH."
}

if (-not (Test-Path ".git")) {
    git init
}

git add -f .gitignore

$paths = @(
    "cora_dashboard\app.py",
    "cora_dashboard\README.md",
    "cora_dashboard\TEST_CASES.md",
    "cora_dashboard\test_dashboard.py",
    "cora_dashboard\start-dashboard.bat",
    "cora_dashboard\static\index.html",
    "cora_dashboard\static\app.js",
    "cora_dashboard\static\styles.css",
    "package_api_overlay.py",
    "repair_api_enabled_jar.ps1",
    "diagnose_cora_api_launch.ps1",
    "rebuild_api_from_source.ps1",
    "rebuild_recompiled_jar_from_build.ps1",
    "apply_desktop_ui_tweaks.ps1",
    "Cora SEO Software\src\cora\api",
    "Cora SEO Software\src\cora\Main.java",
    "Cora SEO Software\src\cora\util\BatchRunner.java",
    "Cora SEO Software\src\cora\app-style.css",
    "Cora SEO Software\build\cora\cora.fxml",
    "Cora SEO Software\build\cora\app-style.css"
)

foreach ($path in $paths) {
    if (Test-Path $path) {
        git add -f -- $path
    } else {
        Write-Host "Skipping missing path: $path"
    }
}

Write-Host ""
Write-Host "Staged files:"
git diff --cached --name-status

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "No staged changes to commit."
} else {
    git commit -m $CommitMessage
}

$tagExists = git tag --list $TagName
if (-not $tagExists) {
    git tag $TagName
    Write-Host "Created tag $TagName"
} else {
    Write-Host "Tag already exists: $TagName"
}

Write-Host ""
Write-Host "Current status:"
git status --short
