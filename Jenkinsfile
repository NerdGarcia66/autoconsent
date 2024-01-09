def runPlaywrightTests(resultDir, browser, grep) {
    try {
        timeout(20) {
            sh 'mkdir -p ./test-results'
            sh """
                PLAYWRIGHT_JUNIT_OUTPUT_NAME=results.xml npx playwright test tests/_sample-test.spec.ts --project $browser --reporter=junit --grep "$grep"|| true
            """
        }
    } finally {
        junit 'results.xml'
        sh """
            mkdir -p ${resultDir}/results/${BRANCH_NAME}/${BUILD_NUMBER}/$REGION/
            mkdir -p ./test-results
            mv ./test-results/ ${resultDir}/results/${BRANCH_NAME}/${BUILD_NUMBER}/$REGION/
        """
    }
}

def withEnvFile(envfile, Closure cb) {
    def props = readProperties(file: envfile)
    withEnv(props.collect{ entry -> "${entry.key}=${entry.value}" }) {
        cb()
    }
}

pipeline {
    agent { label 'autoconsent-crawler' }
    parameters {
        string(name: 'TEST_RESULT_ROOT', defaultValue: '/mnt/efs/users/smacbeth/autoconsent/ci', description: 'Where test results and configuration are stored')
        choice(name: 'BROWSER', choices: ['chrome', 'webkit', 'iphoneSE', 'firefox'], description: 'Browser')
        string(name: 'GREP', defaultValue: '', description: 'filter for tests matching a specific string')
        string(name: 'NSITES', defaultValue: '1', description: 'number of sites to test per CMP')
        string(name: 'BRANCH', defaultValue: 'main', description: 'Branch or PR to checkout (e.g. pr/123)')
    }
    environment {
        NODENV_VERSION = "16.16.0"
        NODENV_ROOT = "/opt/nodeenv"
        PATH = "/opt/nodenv/shims:/opt/nodenv/bin:$PATH"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: "${params.BRANCH}"]],
                    extensions: [[$class: 'LocalBranch']],
                    userRemoteConfigs: [[refspec: "+refs/pull/*/head:refs/remotes/origin/pr/*", credentialsId: 'GitHubAccess', url: 'https://github.com/duckduckgo/autoconsent.git']]])
            }
        }
        
        stage('Build') {
            steps {
                sh '''
                npm ci
                npx playwright install
                '''
                script {
                    currentBuild.description = "${params.BRANCH}"
                }
            }
        }
        
        stage('Test') {
            steps {
                withEnvFile("${params.TEST_RESULT_ROOT}/de.env") {
                    withEnv(["NSITES=${params.NSITES}}"]) {
                        runPlaywrightTests(params.TEST_RESULT_ROOT, params.BROWSER, params.GREP)
                    }
                }
                withEnvFile("${params.TEST_RESULT_ROOT}/us.env") {
                    withEnv(["NSITES=${params.NSITES}}"]) {
                        runPlaywrightTests(params.TEST_RESULT_ROOT, params.BROWSER, params.GREP)
                    }
                }
                withEnvFile("${params.TEST_RESULT_ROOT}/gb.env") {
                    withEnv(["NSITES=${params.NSITES}}"]) {
                        runPlaywrightTests(params.TEST_RESULT_ROOT, params.BROWSER, params.GREP)
                    }
                }
            }
        }
    }
}
