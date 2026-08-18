# ============================================================
#  One-click APK build script for the Love Journal app.
#  Usage (run from project root, in PowerShell):
#      .\build-apk.ps1
#  If execution policy blocks it, run once:
#      powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$root    = $PSScriptRoot
$cap     = Join-Path $root "cap"
$www     = Join-Path $cap  "www"
$android = Join-Path $cap  "android"

# --- Locate a JDK 11+ (AGP 8.7 requires JDK 17). Prefer Android Studio's JBR. ---
$jbrCandidates = @(
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files\Java\latest"
)
$javaHome = $null
foreach ($c in $jbrCandidates) {
    if (Test-Path (Join-Path $c "bin\java.exe")) {
        $javaHome = $c
        break
    }
}
if ($javaHome) {
    $env:JAVA_HOME = $javaHome
    Write-Host "  JAVA_HOME -> $javaHome"
} else {
    Write-Host "  WARNING: no JDK 11+ found, using system java (build may fail)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== [1/3] Sync web assets to cap/www ===" -ForegroundColor Cyan

# Single-file assets (exclude data.local-backup-*.js on purpose)
$files = @(
    "index.html",
    "style.css",
    "script.js",
    "data.js",
    "manifest.json",
    "sw.js",
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png"
)
foreach ($f in $files) {
    $src = Join-Path $root $f
    $dst = Join-Path $www  $f
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  copy  $f"
    } else {
        Write-Host "  SKIP  $f (missing)" -ForegroundColor Yellow
    }
}

# images/ directory (full sync)
$imgSrc = Join-Path $root "images"
$imgDst = Join-Path $www  "images"
if (Test-Path $imgDst) { Remove-Item $imgDst -Recurse -Force }
Copy-Item $imgSrc $imgDst -Recurse -Force
$imgCount = (Get-ChildItem $imgSrc -File -Recurse | Measure-Object).Count
Write-Host "  copy  images/ ($imgCount files)"

Write-Host ""
Write-Host "=== [2/3] Capacitor sync (android) ===" -ForegroundColor Cyan
Push-Location $cap
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "cap sync failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

# --- Capacitor 7 generates Java 21 in capacitor.build.gradle, but this box
# --- only has JDK 17 (Android Studio JBR). Downgrade to 17 so the build works.
$capGradle = Join-Path $android "app\capacitor.build.gradle"
if (Test-Path $capGradle) {
    $g = [System.IO.File]::ReadAllText($capGradle)
    if ($g -match "VERSION_21") {
        $g = $g -replace "VERSION_21", "VERSION_17"
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($capGradle, $g, $utf8NoBom)
        Write-Host "  patched capacitor.build.gradle: Java 21 -> 17"
    }
}

Write-Host ""
Write-Host "=== [3/3] Gradle assembleDebug ===" -ForegroundColor Cyan
Push-Location $android
try {
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) { throw "gradlew failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

Write-Host ""
$apk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
    $sizeMB = [math]::Round((Get-Item $apk).Length / 1MB, 2)
    Write-Host "DONE -> $apk ($sizeMB MB)" -ForegroundColor Green
} else {
    Write-Host "APK not found, build may have failed." -ForegroundColor Red
    exit 1
}
