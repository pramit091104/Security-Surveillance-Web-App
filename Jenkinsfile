pipeline {
    agent any

    tools {
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
                // Address the vulnerabilities mentioned in the logs
                sh 'npm install'
            }
        }

        stage('Start Server & Run BDD Tests') {
            steps {
                sh '''
                # 1. Start the server and capture logs
                nohup npm run dev > server.log 2>&1 &
                
                # 2. Wait for the server to be actually ready. 
                # We wait AFTER starting the server, not before.
                echo "Waiting for server to initialize..."
                
                # This loop checks if the server is responding on its port (default 5173 or 3000)
                # Adjust the port number below to match your app's dev port.
                timeout 60s bash -c 'until curl -s localhost:3005 > /dev/null; do sleep 2; echo "Still waiting..."; done' || true
                
                # 3. Run tests
                cd automation-tests
                mvn clean test
                '''
            }
        }
    }

    post {
        always {
            // Kill the Node.js server to clean up the environment
            sh 'pkill -f "node" || true'

            // Archive the server log for debugging if tests fail
            archiveArtifacts artifacts: 'server.log', allowEmptyArchive: true

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