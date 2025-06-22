// Define variables at the pipeline
def ecrRegistry
def ecrRepository
def sonarHostUrl
def eksClusterName

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
            agent {
                docker { image 'hashicorp/terraform:1.10.5' }
            }
            steps {
                script {
                    dir('terraform-config') {
                        sh 'terraform init -reconfigure -backend-config="bucket=mohit-terraform-state-bucket-l2" -backend-config="key=terraform.tfstate" -backend-config="region=us-east-1"'
                        env.SONARQUBE_URL = sh(script: 'terraform output -raw sonarqube_dns', returnStdout: true).trim()
                        env.EKS_CLUSTER_NAME = sh(script: 'terraform output -raw eks_cluster_name', returnStdout: true).trim()
                    }
                }
            }
        }
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh """
                    # Run SonarQube analysis
                    # This step needs to be configured based on your project's build tool (e.g., Maven, Gradle, npm)
                    # For a Node.js project, you might use sonar-scanner
                    echo "Running SonarQube analysis..."
                    # sonar-scanner -Dsonar.host.url=${env.SONARQUBE_URL} -Dsonar.login=...
                    """
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
        stage('Scan Docker Image with Trivy') {
            steps {
                sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${env.ECR_IMAGE_URI}"
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
                        sh "aws eks update-kubeconfig --name ${env.EKS_CLUSTER_NAME} --region ${env.AWS_REGION}"
                        sh "kubectl apply -f k8s/deployment.yaml"
                        sh "kubectl apply -f k8s/service.yaml"
                    }
                }
            }
        }
    }
} 
