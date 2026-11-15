pipeline {
    agent { label 'built-in' }

    options {
        timestamps()
        skipDefaultCheckout()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        DEPLOY_HOST = 'deploy@207.180.212.3'
        DEPLOY_DIR = '/home/deploy/projects/coreano-frontend'
        DIST_DIR = 'dist/hangeoreum/browser'
        HEALTH_URL = 'http://207.180.212.3/'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'corepack pnpm install --frozen-lockfile'
            }
        }

        stage('Tests') {
            steps {
                sh 'corepack pnpm test --runInBand'
            }
        }

        stage('Build') {
            steps {
                sh '''
                    corepack pnpm exec ng build --configuration production
                    test -s "$DIST_DIR/index.html"
                '''
            }
        }

        stage('Deploy') {
            steps {
                sshagent(credentials: ['vps-deploy']) {
                    sh '''
                        archive=$(mktemp)
                        trap 'rm -f -- "$archive"' EXIT
                        tar -C "$DIST_DIR" -cf "$archive" .
                        checksum=$(sha256sum < "$archive")

                        remote_script='
                            set -eu
                            umask 022
                            mkdir -p "$1/releases"
                            cd "$1"
                            incoming=$(mktemp .incoming-XXXXXXXX)
                            trap "rm -f -- $incoming" EXIT
                            cat > "$incoming"
                            actual=$(sha256sum < "$incoming")
                            test "${actual%% *}" = "$2"
                            # shortcut: releases accumulate, add retention when disk usage warrants it.
                            release=$(mktemp -d releases/build-XXXXXXXX)
                            tar --no-same-owner --no-same-permissions -xf "$incoming" -C "$release"
                            test -s "$release/index.html"
                            chmod 755 "$release"

                            exec 9> .deploy.lock
                            flock -x 9
                            previous=
                            if test -L current; then
                                previous=$(readlink current)
                            else
                                test ! -e current
                            fi

                            finish() {
                                status=$?
                                trap "" HUP INT TERM
                                if test "$status" -ne 0 && test "$(readlink current || true)" = "$release"; then
                                    if test -n "$previous"; then
                                        ln -s "$previous" "$release/.restore-current"
                                        mv -Tf "$release/.restore-current" current
                                    else
                                        rm -- current
                                    fi
                                fi
                                rm -f -- "$incoming"
                            }
                            trap finish EXIT
                            trap "exit 129" HUP
                            trap "exit 130" INT
                            trap "exit 143" TERM
                            ln -s "$release" "$release/.next-current"
                            mv -Tf "$release/.next-current" current

                            if curl --fail --silent --show-error --retry 3 --max-time 10 --output "$incoming" "$3" &&
                                cmp "$release/index.html" "$incoming"; then
                                exit 0
                            fi

                            echo "Frontend health check failed for $release" >&2
                            exit 1
                        '
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 "$DEPLOY_HOST" \
                            "sh -c '$remote_script' sh '$DEPLOY_DIR' '${checksum%% *}' '$HEALTH_URL'" < "$archive"
                    '''
                }
            }
        }
    }
}
