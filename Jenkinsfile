pipeline {
    agent any

    environment {
        APP_NAME = 'ishvara'
        PORT = '3123'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                    docker build -t $APP_NAME .
                '''
            }
        }

        stage('Stop Old Container') {
            steps {
                sh '''
                    docker stop $APP_NAME || true
                    docker rm $APP_NAME || true
                '''
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                    docker run -d \
                        --name $APP_NAME \
                        --restart unless-stopped \
                        -p 3000:3000 \
                        $APP_NAME
                '''
            }
        }
    }
}