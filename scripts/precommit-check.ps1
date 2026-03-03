# Pre-commit checklist - informational only (exit 0)
# Run before committing to verify repo context.

$identityFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".repo-identity"
$repoIdentity = "unknown"
if (Test-Path $identityFile) {
    $repoIdentity = (Get-Content $identityFile -Raw).Trim()
}

Write-Host "=== Pre-commit checklist ===" -ForegroundColor Cyan
Write-Host "Repo identity: $repoIdentity"
Write-Host "CWD: $(Get-Location)"
Write-Host ""
Write-Host "git rev-parse --show-toplevel:"
git rev-parse --show-toplevel 2>$null
Write-Host ""
Write-Host "git remote -v:"
git remote -v 2>$null
Write-Host ""
Write-Host "git branch --show-current:"
git branch --show-current 2>$null
Write-Host ""
Write-Host "git status --porcelain:"
git status --porcelain 2>$null
Write-Host ""
Write-Host "git diff --cached --name-only:"
git diff --cached --name-only 2>$null
Write-Host "============================" -ForegroundColor Cyan
exit 0
