# Week 6 — Deploying Containers

### Test RDS Connecetion

- Added this `test` script file into `backend-flask/bin/db` folder to easily check the connection from our container.
```sh
#!/usr/bin/env python3

import psycopg
import os
import sys

connection_url = os.getenv("CONNECTION_URL")

conn = None
try:
  print('attempting connection')
  conn = psycopg.connect(connection_url)
  print("Connection successful!")
except psycopg.Error as e:
  print("Unable to connect to the database:", e)
finally:
  conn.close()
```
- Made it executable using:
```sh
chmod u+x ./bin/db/test
```
- Tested it temporarily using `PROD_CONNECTION_URL` didnt work until i updated the postgres script in the `gitpod.yaml` after which it worked.
```sh
source  "$THEIA_WORKSPACE_ROOT/backend-flask/bin/rds/update-sg-rule"
```
### Implement Health Check on Flask App
#### Task Flask Script

Didn't add but instead updated the following endpoint for my flask app because in week 1 App Containerization I already implemented health check as part of the homework challenge:
```sh
@app.route("/api/activities/healthcheck", methods=['GET'])
def data_healthcheck():
  data = HealthcheckActivities.run()
  return {'success': True}, 200
```
- Created a new bin script at `backend-flask/bin/flask/health-check`:
```sh
#!/usr/bin/env python3

import urllib.request

response = urllib.request.urlopen('http://localhost:4567/api/health-check')
if response.getcode() == 200:
  print("Flask server is running")
else:
  print("Flask server is not running")
```
- Made it executable, ran it and it worked:
```sh
chmod u+x ./bin/flask/health-check
```
![image](https://user-images.githubusercontent.com/105982108/235412801-2b9a132d-f404-495d-8181-468598642989.png)

#### Create CloudWatch Log Group
- Created CoudWatch log group via AWS CLI using:
```sh
aws logs create-log-group --log-group-name "cruddur"
aws logs put-retention-policy --log-group-name "cruddur" --retention-in-days 1
```
#### Create ECS Cluster
- Created AWS Elastic Container Service(ECS) Cluster via the CLI using:
```sh
aws ecs create-cluster \
--cluster-name cruddur \
--service-connect-defaults namespace=cruddur
```

### Gaining Access to ECS Fargate Container
### Create ECR repo and push image
- Created an Elastic Container Registry(ECR) repo and push image to it, to mitigate against dockerhub being a point of failure.

### For Base-Image python
- Created a base image for python via CLI using:
```sh
aws ecr create-repository \
  --repository-name cruddur-python \
  --image-tag-mutability MUTABLE
```  
#### Login to ECR
- Did this via CLR in order to be able to push the containers using:
```sh
aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
```
- Set URL
```sh
export ECR_PYTHON_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/cruddur-python"
echo $ECR_PYTHON_URL
```
- Pulled Image
```sh
docker pull python:3.10-slim-buster
```
- Taggged Image
```sh
docker tag python:3.10-slim-buster $ECR_PYTHON_URL:3.10-slim-buster
```
- Pushed Image
```sh
docker push $ECR_PYTHON_URL:3.10-slim-buster
```
- Updated `Dockerfile` in order to be able to use the image with:
```sh
<AWS ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/cruddur-python:3.10-slim-buster

ENV FLASK_DEBUG=1
```
- This process is repeated for all the containers.

### For backend-flask
- Created Repo
```sh
aws ecr create-repository \
  --repository-name backend-flask \
  --image-tag-mutability MUTABLE
```
- Set URL
```sh
export ECR_BACKEND_FLASK_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/backend-flask"
echo $ECR_BACKEND_FLASK_URL
```
- Build Image
```sh
docker build -t backend-flask .
```
- Tagged Image
```sh
docker tag backend-flask:latest $ECR_BACKEND_FLASK_URL:latest
```
- Pushed Image
```sh
docker push $ECR_BACKEND_FLASK_URL:latest
```
- Got the service deployed first before doing that of the frontend-react.js container.

### Register Task Definitions
- In order to do this, had to first create some Roles for it, but for the role to be created, first had to pass the necessary parameters needed via the CLI.

#### Create Parameters by Passing Senstive Data to Task Defintion
- These parameters/env variables were created and hid in AWS Systems Manager Parameter Store.
```sh
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/AWS_ACCESS_KEY_ID" --value $AWS_ACCESS_KEY_ID
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/AWS_SECRET_ACCESS_KEY" --value $AWS_SECRET_ACCESS_KEY
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/CONNECTION_URL" --value $PROD_CONNECTION_URL
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/ROLLBAR_ACCESS_TOKEN" --value $ROLLBAR_ACCESS_TOKEN
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/OTEL_EXPORTER_OTLP_HEADERS" --value "x-honeycomb-team=$HONEYCOMB_API_KEY"
```

### Create Task and Exection Roles for Task Defintion
 
#### Create ExecutionRole
```sh
{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "ssm:GetParameter"
      ],
      "Resource": "arn:aws:ssm:<AWS_REGION>:<AWS_ACOOUNT_ID>:parameter/cruddur/backend-flask/*"
    }]
  }
  ```
  - Passed the policy via AWS CLI using:
 ```sh
 aws iam create-role \    
 --role-name CruddurServiceExecutionPolicy  \   
 --assume-role-policy-document file://aws/policies/service-assume-role-execution-policy.json
 ```
 ```sh
aws iam put-role-policy \
  --policy-name CruddurServiceExecutionPolicy \
  --role-name CruddurServiceExecutionRole \
  --policy-document file://aws/policies/service-execution-policy.json
```
```sh
aws iam attach-role-policy --policy-arn POLICY_ARN --role-name CruddurServiceExecutionRole
```
```sh   
    {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "ssm:GetParameter",
            "Resource": "<AWS_REGION>:<AWS_ACOOUNT_ID>::parameter/cruddur/backend-flask/*"
        }
```        
```sh
aws iam attach-role-policy \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --role-name CruddurServiceExecutionRole
```
```sh
{
  "Sid": "VisualEditor0",
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameters",
    "ssm:GetParameter"
  ],
  "Resource": "<AWS_REGION>:<AWS_ACOOUNT_ID>:parameter/cruddur/backend-flask/*"
} 
```
- The above policies didn't work while trying to create them via CLI so did it manually on my AWS Account.

#### CreateTaskRole
- Using the CLI created the following tasks sequentially and they all worked:
```sh
aws iam create-role \
    --role-name CruddurTaskRole \
    --assume-role-policy-document "{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{
    \"Action\":[\"sts:AssumeRole\"],
    \"Effect\":\"Allow\",
    \"Principal\":{
      \"Service\":[\"ecs-tasks.amazonaws.com\"]
    }
  }]
}"

aws iam put-role-policy \
  --policy-name SSMAccessPolicy \
  --role-name CruddurTaskRole \
  --policy-document "{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{
    \"Action\":[
      \"ssmmessages:CreateControlChannel\",
      \"ssmmessages:CreateDataChannel\",
      \"ssmmessages:OpenControlChannel\",
      \"ssmmessages:OpenDataChannel\"
    ],
    \"Effect\":\"Allow\",
    \"Resource\":\"*\"
  }]
}
"

aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/CloudWatchFullAccess --role-name CruddurTaskRole
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess --role-name CruddurTaskRole
```
- Confirmed it on my AWS IAM Role and they were all there.

#### Create Json file

- Created a new folder called `aws/task-definitions` and place the following file in there:

- backend-flask.json
```sh
{
  "family": "backend-flask",
  "executionRoleArn": "arn:aws:iam::AWS_ACCOUNT_ID:role/CruddurServiceExecutionRole",
  "taskRoleArn": "arn:aws:iam::AWS_ACCOUNT_ID:role/CruddurTaskRole",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "backend-flask",
      "image": "BACKEND_FLASK_IMAGE_URL",
      "cpu": 256,
      "memory": 512,
      "essential": true,
      "portMappings": [
        {
          "name": "backend-flask",
          "containerPort": 4567,
          "protocol": "tcp", 
          "appProtocol": "http"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
            "awslogs-group": "cruddur",
            "awslogs-region": "ca-central-1",
            "awslogs-stream-prefix": "backend-flask"
        }
      },
      "environment": [
        {"name": "OTEL_SERVICE_NAME", "value": "backend-flask"},
        {"name": "OTEL_EXPORTER_OTLP_ENDPOINT", "value": "https://api.honeycomb.io"},
        {"name": "AWS_COGNITO_USER_POOL_ID", "value": ""},
        {"name": "AWS_COGNITO_USER_POOL_CLIENT_ID", "value": ""},
        {"name": "FRONTEND_URL", "value": ""},
        {"name": "BACKEND_URL", "value": ""},
        {"name": "AWS_DEFAULT_REGION", "value": ""}
      ],
      "secrets": [
        {"name": "AWS_ACCESS_KEY_ID"    , "valueFrom": "arn:aws:ssm:AWS_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/AWS_ACCESS_KEY_ID"},
        {"name": "AWS_SECRET_ACCESS_KEY", "valueFrom": "arn:aws:ssm:AWS_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/AWS_SECRET_ACCESS_KEY"},
        {"name": "CONNECTION_URL"       , "valueFrom": "arn:aws:ssm:AWS_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/CONNECTION_URL" },
        {"name": "ROLLBAR_ACCESS_TOKEN" , "valueFrom": "arn:aws:ssm:AWS_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/ROLLBAR_ACCESS_TOKEN" },
        {"name": "OTEL_EXPORTER_OTLP_HEADERS" , "valueFrom": "arn:aws:ssm:AWS_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/OTEL_EXPORTER_OTLP_HEADERS" }
        
      ]
    }
  ]
}
```
#### Register Task Defintion
- Used the following commands to execute the task-definitions for `backend-flask.json` and `frontend-react.json` files respectively"
```sh
aws ecs register-task-definition --cli-input-json file://aws/task-definitions/backend-flask.json
```
```sh
aws ecs register-task-definition --cli-input-json file://aws/task-definitions/frontend-react-js.json
```
#### Create Security Group
- Launched the `backend-flask` manually  and then through the console and continued with it on the AWS Console.
- For the Networking aspect on the console had to create a new Security Group via the CLI but first had to get the default VPC using:
```sh
export DEFAULT_VPC_ID=$(aws ec2 describe-vpcs \
--filters "Name=isDefault, Values=true" \
--query "Vpcs[0].VpcId" \
--output text)
echo $DEFAULT_VPC_ID
```
- Authorized port 80 by opening the port via CLI using:
```sh
aws ec2 authorize-security-group-ingress \
  --group-id $CRUD_SERVICE_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```
- Then created the Security Group for the default VPC using:
```sh
export CRUD_SERVICE_SG=$(aws ec2 create-security-group \
  --group-name "crud-srv-sg" \
  --description "Security group for Cruddur services on ECS" \
  --vpc-id $DEFAULT_VPC_ID \
  --query "GroupId" --output text)
echo $CRUD_SERVICE_SG
```
- Finished creating tthe service on the console and started debugging the issues.
- Attached CloudWatchFullAccessPolicy and modified the CruddurServiceExecutionPolicy to include AllowECRAccess.
```sh
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowSSMParameterStoreAccess",
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameters",
                "ssm:GetParameter"
            ],
            "Resource": "arn:aws:ssm:us-east-1:914347776203:parameter/cruddur/backend-flask/*"
        },
        {
            "Sid": "AllowECRAccess",
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
```

#### Create Services
- The service now worked but the container was unhealthy, so created a file and used commands that will enable me shell into the container by doing the following:
- Created a new json file in `aws/json/service-backend-flask.json` and added the following content to it:
```sh
{
    "cluster": "cruddur",
    "launchType": "FARGATE",
    "desiredCount": 1,
    "enableECSManagedTags": true,
    "enableExecuteCommand": true,
    
    "networkConfiguration": {
      "awsvpcConfiguration": {
        "assignPublicIp": "ENABLED",
        "securityGroups": [
          "sg-026fe9775bafd0dab"
        ],
        "subnets": [
          "subnet-0f8b62ad6974a8242",
          "subnet-0501847b87c744b3f",
          "subnet-068fdb0d831af19b6",
          "subnet-00f319ebba3f7822a",
          "subnet-04c6bb6d2a56eef14",
          "subnet-07fad2b0e92473b65"
        ]
      }
    },
    "serviceConnectConfiguration": {
      "enabled": true,
      "namespace": "cruddur",
      "services": [
        {
          "portName": "backend-flask",
          "discoveryName": "backend-flask",
          "clientAliases": [{"port": 4567}]
        }
      ]
    },
    "propagateTags": "SERVICE",
    "serviceName": "backend-flask",
    "taskDefinition": "backend-flask"
  }
```
- To get the Subnets attached to the default VPC used the following commands via CLI:
```sh
export DEFAULT_VPC_ID=$(aws ec2 describe-vpcs \
--filters "Name=isDefault, Values=true" \
--query "Vpcs[0].VpcId" \
--output text)
echo $DEFAULT_VPC_ID
```
```sh
export DEFAULT_SUBNET_IDS=$(aws ec2 describe-subnets  \
 --filters Name=vpc-id,Values=$DEFAULT_VPC_ID \
 --query 'Subnets[*].SubnetId' \
 --output json | jq -r 'join(",")')
echo $DEFAULT_SUBNET_IDS
```
- Created Services for the `backend-flask`using:
```sh
aws ecs create-service --cli-input-json file://aws/json/service-backend-flask.json
```
#### Connection via Sessions Manaager (Fargate)
- In order to connect to the Fargate container, a Sessions Manager has to be installed to enable login used the following:
- To Install for Ubuntu
```sh
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```
- Verified its working using:
```sh
session-manager-plugin
```
- Then connected to the fargate container using:
```sh
aws ecs execute-command  \
--region $AWS_DEFAULT_REGION \
--cluster cruddur \
--task 064c465e551c4400990baf0ad1a1ed0a \
--container backend-flask \
--command "/bin/bash" \
--interactive
```
- Inside the container ran `./bin/flask/health-check` kept getting HTTP Error 404: NOT FOUND after debugging found out it was due to the endpoint on my `health-check`file and I updated it and it worked and became healthy:
```sh
response = urllib.request.urlopen('http://localhost:4567/api/activities/healthcheck')
```
- Updated `gitpod.yaml` file to include the Seessions Manager code to log into the container:
```sh
- name: fargate
  before |
    curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
    sudo dpkg -i session-manager-plugin.deb
    cd backend-flask
```
- Also created a new file `connect-to-service` in the `/bin/ecs` folder and added the shell in command to log into the container:
```sh
#! /usr/bin/bash

if [ -z "$1" ]; then
  echo "No TASK_ID argument supplied eg ./bin/ecs/connect-to-service 8037a126ad294d65896d0c3ba47a3de5 backend-flask "
  exit 1
fi
TASK_ID=$1

if [ -z "$2" ]; then
  echo "No CONTAINER_NAME argument supplied eg ./bin/ecs/connect-to-service 8037a126ad294d65896d0c3ba47a3de5 backend-flask "
  exit 1
fi
CONTAINER_NAME=$2

echo "Task ID:$TASK_ID"
echo "Container name:$CONTAINER_NAME"

aws ecs execute-command  \
--region $AWS_DEFAULT_REGION \
--cluster cruddur \
--task $TASK_ID \
--container $CONTAINER_NAME \
--command "/bin/bash" \
--interactive
```
- Checked and updated the port for the Task to `port 4567` in the Seurity Group inbound rules in AWS console.
- Put the dedicated ECS Publc IP address on the browser to confirm container is working with both the health-check api endpoint and port they both worked:

![image](https://user-images.githubusercontent.com/105982108/236395553-dcd6c526-52f2-4f78-bd1e-2710c675e131.png)

![image](https://user-images.githubusercontent.com/105982108/236410929-3c8a84eb-4fdf-4b9d-ab79-66ba0d0157bf.png)

- Checked endpoint for HomeActivities didn't work because the Services Security Group had no access to the RDS instance. 
- Connected it by editing the inbound rules for the RDS instance to allow/include the Security Group for the backend-flask Services and it worked.

- Created Application Load Balancer via AWS console with target and security groups respectively for both `backend-flask` and `frontend-react.js.
- Updated json file in `aws/json/service-backend-flask.json` with:
```sh
 "loadBalancers": [
      {
          "targetGroupArn": "arn:aws:elasticloadbalancing:<AWS_REGION>:<AWS_KEY_ID>:targetgroup/cruddur-backend-flask-tg/87ed2a3daf2d2b1d",
          "containerName": "backend-flask",
           "containerPort": 4567
       }
     ],
``` 
- Provisioned it using:
```sh
aws ecs create-service --cli-input-json file://aws/json/service-backend-flask.json
```
- Load balancer worked
![image](https://user-images.githubusercontent.com/105982108/236631364-2f33b313-3d2d-4dae-86e4-6f08247d0d79.png)

### For frontend-react.js
- Created Repo
```sh
aws ecr create-repository \
  --repository-name frontend-react-js \
  --image-tag-mutability MUTABLE
```
- Set URL
```sh
export ECR_FRONTEND_REACT_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/frontend-react-js"
echo $ECR_FRONTEND_REACT_URL
```
- Build Image
```sh
docker build \
--build-arg REACT_APP_BACKEND_URL="http://cruddur-alb-1049558114.us-east-1.elb.amazonaws.com:4567" \
--build-arg REACT_APP_AWS_PROJECT_REGION="$AWS_DEFAULT_REGION" \
--build-arg REACT_APP_AWS_COGNITO_REGION="$AWS_DEFAULT_REGION" \
--build-arg REACT_APP_AWS_USER_POOLS_ID="us-east-1_nCzleL11X" \
--build-arg REACT_APP_CLIENT_ID="6rvluth75jaeg605hblpdhqmbq" \
-t frontend-react-js \
-f Dockerfile.prod \
.
```
- Tagged Image
```sh
docker tag frontend-react-js:latest $ECR_FRONTEND_REACT_URL:latest
```
- Ran and tested image to confirm it's working without any issues with:
```sh
docker run --rm -p 3000:3000 -it frontend-react-js 
```
- Pushed Image
```sh
docker push $ECR_FRONTEND_REACT_URL:latest
```
