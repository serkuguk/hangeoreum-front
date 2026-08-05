pipeline {
    agent { label 'windows' }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        DEPLOY_DIR = 'C:\\apps\\coreano-frontend'
        DIST_DIR = 'dist\\hangeoreum'
        HEALTH_URL = 'http://localhost:8081/'
        FRONTEND_MODE = 'nginx'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    corepack prepare pnpm@10.12.3 --activate
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Tests') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    pnpm test -- --runInBand
                '''
            }
        }

        stage('Build') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    pnpm exec ng build --configuration production

                    if (!(Test-Path "$env:DIST_DIR")) {
                        throw "Build output not found: $env:DIST_DIR"
                    }
                '''
            }
        }

        stage('Deploy') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"

                    $deployRoot = $env:DEPLOY_DIR
                    $releaseName = Get-Date -Format "yyyyMMdd-HHmmss"
                    $releaseDir = Join-Path $deployRoot "releases\\$releaseName"
                    $currentDir = Join-Path $deployRoot "current"
                    $distDir = Join-Path $env:WORKSPACE $env:DIST_DIR

                    New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
                    New-Item -ItemType Directory -Force -Path (Join-Path $deployRoot "releases") | Out-Null

                    robocopy $distDir $releaseDir /MIR /NFL /NDL /NJH /NJS /NP
                    if ($LASTEXITCODE -gt 7) {
                        throw "robocopy failed with exit code $LASTEXITCODE"
                    }

                    $global:LASTEXITCODE = 0

                    if (Test-Path $currentDir) {
                        Remove-Item $currentDir -Recurse -Force
                    }

                    New-Item -ItemType Junction -Path $currentDir -Target $releaseDir | Out-Null

                    Write-Host "Deployed: $releaseDir"
                '''
            }
        }

        stage('Reload frontend') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"

                    switch ($env:FRONTEND_MODE) {
                        "nginx" {
                            nginx -s reload
                        }
                        "iis" {
                            Import-Module WebAdministration
                            Restart-WebItem "IIS:\\Sites\\coreano-frontend"
                        }
                        "static" {
                            Write-Host "No reload needed"
                        }
                        default {
                            throw "Unknown FRONTEND_MODE: $env:FRONTEND_MODE"
                        }
                    }
                '''
            }
        }

        stage('Health check') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"

                    for ($i = 1; $i -le 12; $i++) {
                        try {
                            $r = Invoke-WebRequest -Uri $env:HEALTH_URL -UseBasicParsing -TimeoutSec 10
                            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) {
                                Write-Host "Health check passed: $($r.StatusCode)"
                                exit 0
                            }
                        } catch {
                            Write-Host "Attempt $i failed: $($_.Exception.Message)"
                        }

                        Start-Sleep -Seconds 5
                    }

                    throw "Health check failed: $env:HEALTH_URL"
                '''
            }
        }
    }
}
