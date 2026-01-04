param (
    [string]$ApiUrl = "http://localhost:8000/api/v1",
    [string]$ClientId,
    [string]$ApiKey
)

if (-not $ClientId -or -not $ApiKey) {
    Write-Error "❌ Error: -ClientId and -ApiKey are required."
    exit
}

Write-Host "🚀 Installing SynqX Agent (2025 Standard) for Windows..." -ForegroundColor Cyan

$InstallDir = Join-Path $HOME ".synqx-agent"
if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir }
Set-Location $InstallDir

# Try to use UV if available
if (Get-Command uv -ErrorAction SilentlyContinue) {
    Write-Host "✨ Detected 'uv'. Fast tracking setup..." -ForegroundColor Green
    & uv venv .venv
    $VenvPython = Join-Path $InstallDir ".venv\Scripts\python.exe"
    & uv pip install -e .
} else {
    Write-Host "📦 'uv' not found. Using standard pip..." -ForegroundColor Green
    python -m venv venv
    $VenvPython = Join-Path $InstallDir "venv\Scripts\python.exe"
    & $VenvPython -m pip install -e .
}

# Configuration
$EnvContent = @"
SYNQX_API_URL=$ApiUrl
SYNQX_CLIENT_ID=$ClientId
SYNQX_API_KEY=$ApiKey
SYNQX_TAGS=default,windows
"@
$EnvContent | Out-File -FilePath .env -Encoding utf8

Write-Host "✅ Installation complete!" -ForegroundColor Green

Write-Host "------------------------------------------------"

Write-Host "To start the agent, run:"

Write-Host "cd $InstallDir; .\.venv\Scripts\Activate.ps1; synqx-agent start"

Write-Host "------------------------------------------------"
