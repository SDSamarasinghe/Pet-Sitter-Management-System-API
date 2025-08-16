pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'pet-sitter-api'
        DOCKER_TAG = "${BUILD_NUMBER}"
        CONTAINER_NAME = 'pet-sitter-api-container'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'master', url: 'https://github.com/SDSamarasinghe/Pet-Sitter-Management-System-API.git'
            }
        }

        stage('Stop Previous Container') {
            steps {
                script {
                    sh '''
                        # Stop any container using port 8000
                        EXISTING_CONTAINER=$(docker ps --filter "publish=8000" --format "{{.Names}}" | head -1)
                        if [ ! -z "$EXISTING_CONTAINER" ]; then
                            echo "Stopping existing container using port 8000: $EXISTING_CONTAINER"
                            docker stop $EXISTING_CONTAINER || true
                            docker rm $EXISTING_CONTAINER || true
                        fi
                        
                        # Also stop our specific container name if it exists
                        docker stop ${CONTAINER_NAME} || true
                        docker rm ${CONTAINER_NAME} || true
                        docker rmi ${DOCKER_IMAGE}:latest || true
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest .'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker run -d \\
                        --name ${CONTAINER_NAME} \\
                        -p 8000:8000 \\
                        -e NODE_ENV=production \\
                        -e PORT=8000 \\
                        -e MONGODB_URI="mongodb+srv://askobarpabblo:UP7yTX2uJJdlv0e7@petcare.8kqi8ez.mongodb.net/flyingduchess?retryWrites=true&w=majority" \\
                        -e JWT_SECRET="FlyingDuchess_PetSitting_JWT_Secret_Key_2025_SecureToken" \\
                        -e JWT_EXPIRES_IN=24h \\
                        -e CLOUDINARY_CLOUD_NAME=dnutx6czj \\
                        -e CLOUDINARY_API_KEY=362787522778931 \\
                        -e CLOUDINARY_API_SECRET=1Rd5hyyO-p1VrsCrFNXpX6btd78 \
                        -e AZURE_STORAGE_CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING}" \
                        -e AZURE_STORAGE_CONTAINER_NAME=pet-images \
                        -e MAIL_USER=lksadish@gmail.com \
                        -e MAIL_PASS=bflnrivyukjjibyk \\
                        -e MAIL_FROM=lksadish@gmail.com \\
                        -e MAIL_HOST=smtp.gmail.com \\
                        -e MAIL_PORT=587 \\
                        --restart unless-stopped \\
                        ${DOCKER_IMAGE}:latest
                '''
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sh 'sleep 30'
                    sh '''
                        for i in {1..5}; do
                            if curl -f http://localhost:8000; then
                                echo "API is healthy!"
                                break
                            else
                                echo "Attempt $i failed, retrying..."
                                sleep 10
                            fi
                        done
                    '''
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }

    post {
        always {
            sh 'docker ps'
            sh 'docker logs ${CONTAINER_NAME} --tail=20 || true'
        }

        success {
            echo 'Deployment successful! 🎉'
            echo 'API is running at: http://20.151.57.93:8000'
        }

        failure {
            echo 'Deployment failed! 😞'
            sh 'docker logs ${CONTAINER_NAME} || true'
        }
    }
}
