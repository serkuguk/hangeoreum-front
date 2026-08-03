pipeline {
    agent { label 'windows' }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        string(name: 'PROJECT_DIR', defaultValue: 'D:\\projects\\coreano-frontend', description: 'Real path to Angular project on Jenkins Windows agent')
        string(name: 'DEPLOY_DIR', defaultValue: 'D:\\apps\\frontend', description: 'Frontend deploy root on Windows server')
        string(name: 'DIST_DIR', defaultValue: 'dist\\coreano-frontend', description: 'Angular dist output path relative to project')
        string(name: 'HEALTH_URL', defaultValue: 'http://localhost:8080/', description: 'Frontend URL for health check')
        choice(name: 'FRONTEND_MODE', choices: ['nginx', 'iis', 'static'], description: 'How frontend is served')
        string(name: 'IIS_SITE_NAME', defaultValue: 'coreano-frontend', description: 'Used only for IIS')
    }

    environment {
        NODE_ENV = 'production'
        API_URL = 'https://api.example.com'
    }

    stages {
        stage('Checkout') {
            steps {
                dir("${params.PROJECT_DIR}") {
                    checkout scm
                }
            }
        }

        stage('Install') {
            steps {
                dir("${params.PROJECT_DIR}") {
                    powershell '''
                        $ErrorActionPreference = "Stop"
                        npm ci
                    '''
                }
            }
        }

        stage('Tests') {
            steps {
                dir("${params.PROJECT_DIR}") {
                    powershell '''
                        $ErrorActionPreference = "Stop"

                        if (Test-Path "package.json") {
                            npm test -- --watch=false --browsers=ChromeHeadless
                        } else {
                            throw "package.json not found"
                        }
                    '''
                }
            }
        }

        stage('Build') {
            steps {
                dir("${params.PROJECT_DIR}") {
                    powershell '''
                        $ErrorActionPreference = "Stop"

                        npm run build -- --configuration production

                        if (!(Test-Path "$env:DIST_DIR")) {
                            throw "Build output not found: $env:DIST_DIR"
                        }
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                dir("${params.PROJECT_DIR}") {
                    powershell '''
                        $ErrorActionPreference = "Stop"

                        $deployRoot = "${env:DEPLOY_DIR}"
                        $releaseName = Get-Date -Format "yyyyMMdd-HHmmss"
                        $releaseDir = Join-Path $deployRoot "releases\\$releaseName"
                        $currentDir = Join-Path $deployRoot "current"
                        $distDir = Join-Path "${env:PROJECT_DIR}" "${env:DIST_DIR}"

                        New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
                        New-Item -ItemType Directory -Force -Path (Join-Path $deployRoot "releases") | Out-Null

                        robocopy $distDir $releaseDir /MIR /NFL /NDL /NJH /NJS /NP
                        $code = $LASTEXITCODE
                        if ($code -gt 7) {
                            throw "robocopy failed with exit code $code"
                        }

                        if (Test-Path $currentDir) {
                            Remove-Item $currentDir -Recurse -Force
                        }

                        New-Item -ItemType Junction -Path $currentDir -Target $releaseDir | Out-Null

                        Write-Host "Deployed release: $releaseDir"
                    '''
                }
            }
        }

        stage('Reload Web Server') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"

                    switch ("${env:FRONTEND_MODE}") {
                        "nginx" {
                            nginx -s reload
                        }
                        "iis" {
                            Import-Module WebAdministration
                            Restart-WebItem "IIS:\\Sites\\${env:IIS_SITE_NAME}"
                        }
                        "static" {
                            Write-Host "Static mode: no reload required"
                        }
                        default {
                            throw "Unknown FRONTEND_MODE: ${env:FRONTEND_MODE}"
                        }
                    }
                '''
            }
        }

        stage('Health Check') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"

                    $url = "${env:HEALTH_URL}"
                    $attempts = 12
                    $delaySeconds = 5

                    for ($i = 1; $i -le $attempts; $i++) {
                        try {
                            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
                            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                                Write-Host "Health check passed: $url -> $($response.StatusCode)"
                                exit 0
                            }

                            Write-Host "Unexpected status: $($response.StatusCode)"
                        } catch {
                            Write-Host "Attempt $i/$attempts failed: $($_.Exception.Message)"
                        }

                        Start-Sleep -Seconds $delaySeconds
                    }

                    throw "Health check failed: $url"
                '''
            }
        }
    }

    post {
        success {
            echo 'Angular deploy completed successfully'
        }

        failure {
            echo 'Angular deploy failed'
        }
    }
}
