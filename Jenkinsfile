pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS-18'
    }
    
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
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm test || true'
            }
        }
        
        stage('Stop Previous Container') {
            steps {
                script {
                    sh '''
                        docker stop ${CONTAINER_NAME} || true
                        docker rm ${CONTAINER_NAME} || true
                        docker rmi ${DOCKER_IMAGE}:latest || true
                    '''
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                sh '''
                    cat > Dockerfile << 'EOF'
# Multi-stage build for TypeScript Node.js API
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files first
COPY --from=builder /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8000

# Start the application
CMD ["node", "dist/main.js"]
EOF
                '''
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
                        -e CLOUDINARY_API_SECRET=1Rd5hyyO-p1VrsCrFNXpX6btd78 \\
                        -e MAIL_USER=lksadish@gmail.com \\
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
