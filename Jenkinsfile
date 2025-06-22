// ... existing code ...
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
// ... existing code ...
