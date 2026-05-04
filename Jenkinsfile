pipeline {
    agent any

    tools {
        // Make sure these match the names you set in Jenkins Global Tool Configuration
        nodejs 'NodeJs' 
        maven 'Maven'
        jdk 'Java11'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Node Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Start Server & Run BDD Tests') {
            steps {
                // Start the Node app in the background, wait a few seconds, then run Maven tests
                sh '''
                nohup npm run dev > server.log 2>&1 &
                sleep 10
                cd automation-tests
                mvn clean test
                '''
            }
        }
    }

    post {
        always {
            // Kill the Node.js server after tests finish so it doesn't hang the Jenkins port
            sh 'pkill -f "node" || true'

            // Publish the TestNG HTML Automation Report
            publishHTML(target: [
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'automation-tests/target/surefire-reports/SentinelBDDSuite',
                reportFiles: 'SentinelTests.html',
                reportName: 'BDD Test Results'
            ])
        }
    }
}
