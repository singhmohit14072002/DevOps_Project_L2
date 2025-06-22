pipeline {
    agent any
    environment {
        AWS_REGION         = 'us-east-1'
        AWS_CREDENTIALS_ID = 'aws-credentials'
        SONAR_TOKEN_ID     = 'sonarqube-token'
        IMAGE_TAG          = "latest"
        AWS_ACCOUNT_ID     = '919984817290'
        ECR_REPO_NAME      = 'devops-project-l2'
        TERRAFORM_REPO     = 'https://github.com/singhmohit14072002/DevOps_Project_L2_Terraform.git'
        EKS_CLUSTER_NAME   = 'devops-project-cluster'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                dir('terraform-config') {
                    git url: env.TERRAFORM_REPO, branch: 'main'
                }
            }
        }
        stage('Prepare Environment') {
            steps {
                dir('terraform-config') {
                    withAWS(region: env.AWS_REGION, credentials: 'aws-credentials') {
                        script {
                            sh '''
                            docker run --rm \
                              -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
                              -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
                              -e AWS_DEFAULT_REGION=$AWS_REGION \
                              -v $PWD:/app -w /app hashicorp/terraform:1.10.5 \
                              init -reconfigure -backend-config="bucket=mohit-terraform-state-bucket-l2" -backend-config="key=terraform.tfstate" -backend-config="region=us-east-1"
                            '''
                            env.SONARQUBE_URL = sh(script: '''
                            docker run --rm \
                              -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
                              -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
                              -e AWS_DEFAULT_REGION=$AWS_REGION \
                              -v $PWD:/app -w /app hashicorp/terraform:1.10.5 \
                              output -raw sonarqube_dns
                            ''', returnStdout: true).trim()
                        }
                    }
                }
            }
        }
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                        sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=devops-project-l2 \
                          -Dsonar.sources=. \
                          -Dsonar.host.url=http://18.212.67.147:9000 \
                          -Dsonar.login=$SONAR_TOKEN
                        '''
                    }
                }
            }
        }
        stage('Build Docker Image') {
            steps {
                script {
                    env.ECR_IMAGE_URI = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_REPO_NAME}:${env.IMAGE_TAG}"
                    sh "docker build -t ${env.ECR_IMAGE_URI} ."
                }
            }
        }
        stage('Trivy Image Scan') {
            environment {
                TMPDIR = '/var/lib/jenkins/tmp'
            }
            steps {
                sh '''
                    trivy image --exit-code 1 --severity HIGH,CRITICAL 919984817290.dkr.ecr.us-east-1.amazonaws.com/devops-project-l2:latest
                '''
            }
        }
        stage('Push Docker Image to ECR') {
            steps {
                withAWS(region: env.AWS_REGION, credentials: 'aws-credentials') {
                    sh "aws ecr get-login-password --region ${env.AWS_REGION} | docker login --username AWS --password-stdin ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                    sh "docker push ${env.ECR_IMAGE_URI}"
                }
            }
        }
        stage('Deploy to EKS') {
            steps {
                withAWS(region: env.AWS_REGION, credentials: 'aws-credentials') {
                    script {
                        dir('k8s-manifests') {
                            git url: 'https://github.com/singhmohit14072002/DevOps_Project_L2_k8s.git', branch: 'main'
                        }
                        echo "EKS_CLUSTER_NAME: '${env.EKS_CLUSTER_NAME}'"
                        sh "aws eks update-kubeconfig --name ${env.EKS_CLUSTER_NAME} --region ${env.AWS_REGION}"
                        sh "kubectl apply -f k8s-manifests/k8s/deployment.yaml"
                        sh "kubectl apply -f k8s-manifests/k8s/service.yaml"
                    }
                }
            }
        }
    }
} 
