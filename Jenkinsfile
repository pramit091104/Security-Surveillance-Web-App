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
                bat 'npm install'
            }
        }

        stage('Start Server & Run BDD Tests') {
            steps {
                // Start the Node app in the background, wait a few seconds, then run Maven tests
                bat '''
                start /b npm run dev
                timeout /t 10 /nobreak
                cd automation-tests
                mvn clean test
                '''
            }
        }
    }

    post {
        always {
            // Kill the Node.js server after tests finish so it doesn't hang the Jenkins port
            bat 'taskkill /F /IM node.exe /T || exit 0'

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
