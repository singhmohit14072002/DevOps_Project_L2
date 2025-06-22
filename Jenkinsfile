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
                            env.EKS_CLUSTER_NAME = sh(script: '''
                            docker run --rm \
                              -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
                              -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
                              -e AWS_DEFAULT_REGION=$AWS_REGION \
                              -v $PWD:/app -w /app hashicorp/terraform:1.10.5 \
                              output -raw eks_cluster_name
                            ''', returnStdout: true).trim()
                        }
                    }
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
                        sh "aws eks update-kubeconfig --name ${env.EKS_CLUSTER_NAME} --region ${env.AWS_REGION}"
                        sh "kubectl apply -f k8s-manifests/k8s/deployment.yaml"
                        sh "kubectl apply -f k8s-manifests/k8s/service.yaml"
                    }
                }
            }
        }
        stage('SonarQube Analysis') {
            steps {
                echo 'SonarQube analysis step placeholder.'
            }
        }
    }
} 
