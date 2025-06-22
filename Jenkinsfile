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
                            sh 'docker run --rm -v $PWD:/app -w /app hashicorp/terraform:1.10.5 init -reconfigure -backend-config="bucket=mohit-terraform-state-bucket-l2" -backend-config="key=terraform.tfstate" -backend-config="region=us-east-1"'
                            env.SONARQUBE_URL = sh(script: 'docker run --rm -v $PWD:/app -w /app hashicorp/terraform:1.10.5 output -raw sonarqube_dns', returnStdout: true).trim()
                            env.EKS_CLUSTER_NAME = sh(script: 'docker run --rm -v $PWD:/app -w /app hashicorp/terraform:1.10.5 output -raw eks_cluster_name', returnStdout: true).trim()
                        }
                    }
                }
            }
        }
        // ... other stages ...
    }
}