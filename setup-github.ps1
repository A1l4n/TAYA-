# GitHub Repository Setup Script for TAYA
# Run this after creating the repository on GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TAYA GitHub Repository Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Create the repository on GitHub" -ForegroundColor Yellow
Write-Host "  - Go to: https://github.com/new" -ForegroundColor White
Write-Host "  - Repository name: TAYA" -ForegroundColor White
Write-Host "  - Description: Multi-tenant ERP platform with hierarchical management, resource allocation, and advanced permissions" -ForegroundColor White
Write-Host "  - Visibility: Public" -ForegroundColor White
Write-Host "  - DO NOT initialize with README (we already have one)" -ForegroundColor White
Write-Host "  - Click 'Create repository'" -ForegroundColor White
Write-Host ""

$githubUsername = Read-Host "Enter your GitHub username"
$repoUrl = "https://github.com/$githubUsername/TAYA.git"

Write-Host ""
Write-Host "Step 2: Connecting local repository to GitHub..." -ForegroundColor Yellow

git remote add origin $repoUrl
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Remote added successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to add remote. It may already exist." -ForegroundColor Red
    Write-Host "  If it exists, you can update it with:" -ForegroundColor Yellow
    Write-Host "  git remote set-url origin $repoUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "Step 3: Renaming branch to main..." -ForegroundColor Yellow
git branch -M main
Write-Host "✓ Branch renamed to main" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "  This will push all files to the repository" -ForegroundColor White
$confirm = Read-Host "Ready to push? (y/n)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "  Repository URL: $repoUrl" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "✗ Push failed. Please check:" -ForegroundColor Red
        Write-Host "  1. Repository exists on GitHub" -ForegroundColor White
        Write-Host "  2. You have push access" -ForegroundColor White
        Write-Host "  3. Your credentials are configured" -ForegroundColor White
    }
} else {
    Write-Host "Push cancelled. Run 'git push -u origin main' when ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green

