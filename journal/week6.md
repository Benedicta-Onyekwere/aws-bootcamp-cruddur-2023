# Week 6 — Deploying Containers

### Test RDS Connecetion

- Added this `test` script file into `backend-flask/bin/db` folder to easily check the connection from our container.
```
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
```
chmod u+x ./bin/db/test
```
- Tested it temporarily using `PROD_CONNECTION_URL` didnt work until i updated the postgres script in the `gitpod.yaml` after which it worked.
`source  "$THEIA_WORKSPACE_ROOT/backend-flask/bin/rds/update-sg-rule"`

### Implement Health Check on Flask App
#### Task Flask Script

Didn't add but instead updated the following endpoint for my flask app because in week 1 App Containerization I already implemented health check as part of the homework challenge:
```
@app.route('/api/health-check')
def health_check():
  return {'success': True}, 200
```
- Created a new bin script at `backend-flask/bin/flask/health-check`:
```
#!/usr/bin/env python3

import urllib.request

response = urllib.request.urlopen('http://localhost:4567/api/health-check')
if response.getcode() == 200:
  print("Flask server is running")
else:
  print("Flask server is not running")
```
- Made it executable, ran it and it worked:

`chmod u+x ./bin/flask/health-check`

![image](https://user-images.githubusercontent.com/105982108/235412801-2b9a132d-f404-495d-8181-468598642989.png)

#### Create CloudWatch Log Group
- Created CoudWatch log group via AWS CLI using:
```
aws logs create-log-group --log-group-name "cruddur"
aws logs put-retention-policy --log-group-name "cruddur" --retention-in-days 1
```
#### Create ECS Cluster
- Created AWS Elastic Container Service(ECS) Cluster via the CLI using:
```
aws ecs create-cluster \
--cluster-name cruddur \
--service-connect-defaults namespace=cruddur
```

### Gaining Access to ECS Fargate Container
### Create ECR repo and push image
- Created an Elastic Container Regigistry(ECR) repo and push image to it, to mitigate against dockerhub being a point of failure.

#### For Base-Image python
- Created a base image for python via CLI using:
```
aws ecr create-repository \
  --repository-name cruddur-python \
  --image-tag-mutability MUTABLE
```  
#### Login to ECR
- Did this via CLR in order to be able to push the containers using:
```
aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
```
- Set URL
```
export ECR_PYTHON_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/cruddur-python"
echo $ECR_PYTHON_URL
```
- Pulled Image
```
docker pull python:3.10-slim-buster
```
- Taggged Image
```
docker tag python:3.10-slim-buster $ECR_PYTHON_URL:3.10-slim-buster
```
- Pushed Image
```
docker push $ECR_PYTHON_URL:3.10-slim-buster
```
- Updated `Dockerfile` in order to be able to use the image with,:
```
<AWS ID>.dkr.ecr.<AWS REGION>.amazonaws.com/cruddur-python

ENV FLASK_DEBUG=1
```
- This process is repeated for all the containers.
#### For backend-flask
- Created Repo
```
aws ecr create-repository \
  --repository-name backend-flask \
  --image-tag-mutability MUTABLE
```
- Set URL
```
export ECR_BACKEND_FLASK_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/backend-flask"
echo $ECR_BACKEND_FLASK_URL
```
- Build Image
```
docker build -t backend-flask .
```
- Tagged Image
```
docker tag backend-flask:latest $ECR_BACKEND_FLASK_URL:latest
```
- Pushed Image
```
docker push $ECR_BACKEND_FLASK_URL:latest
```
- Got the service deployed first before doing that of the frontend-react.js container.

## Register Task Definitions
- In order to do this, had to first create some Roles for it, but for the role to be created, first had to pass the necessary parameters needed via the CLI.

### Create Parameters by Passing Senstive Data to Task Defintion
- These parameters/env variables were created and hid in AWS Systems Manager Parameter Store.
```
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/AWS_ACCESS_KEY_ID" --value $AWS_ACCESS_KEY_ID
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/AWS_SECRET_ACCESS_KEY" --value $AWS_SECRET_ACCESS_KEY
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/CONNECTION_URL" --value $PROD_CONNECTION_URL
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/ROLLBAR_ACCESS_TOKEN" --value $ROLLBAR_ACCESS_TOKEN
aws ssm put-parameter --type "SecureString" --name "/cruddur/backend-flask/OTEL_EXPORTER_OTLP_HEADERS" --value "x-honeycomb-team=$HONEYCOMB_API_KEY"
```

### Create Task and Exection Roles for Task Defintion
 
#### Create ExecutionRole
```
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
 ```
 aws iam create-role \    
 --role-name CruddurServiceExecutionPolicy  \   
 --assume-role-policy-document file://aws/policies/service-assume-role-execution-policy.json
 ```
 ```
aws iam put-role-policy \
  --policy-name CruddurServiceExecutionPolicy \
  --role-name CruddurServiceExecutionRole \
  --policy-document file://aws/policies/service-execution-policy.json
"
```
```
aws iam attach-role-policy --policy-arn POLICY_ARN --role-name CruddurServiceExecutionRole
```
```   
    {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "ssm:GetParameter",
            "Resource": "<AWS_REGION>:<AWS_ACOOUNT_ID>::parameter/cruddur/backend-flask/*"
        }
```sh
aws iam attach-role-policy \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --role-name CruddurServiceExecutionRole
```
```
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
```
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

### Create Json file

- Created a new folder called `aws/task-definitions` and place the following file in there:

- backend-flask.json
```
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
### Register Task Defintion
- Used the following commands to execute the task-definitions for `backend-flask.json` and `frontend-react.json` files respectively"
```
aws ecs register-task-definition --cli-input-json file://aws/task-definitions/backend-flask.json
```
```
aws ecs register-task-definition --cli-input-json file://aws/task-definitions/frontend-react-js.json
```
#### Create Security Group
- Launched the `backend-flask` manually  and then through the console and continued with it on the AWS Console.
- For the Networking aspect on the console had to create a new Security Group via the CLI but first had to get the default VPC using:
```
export DEFAULT_VPC_ID=$(aws ec2 describe-vpcs \
--filters "Name=isDefault, Values=true" \
--query "Vpcs[0].VpcId" \
--output text)
echo $DEFAULT_VPC_ID
```
- Authorized port 80 by opening the port via CLI using:
```
aws ec2 authorize-security-group-ingress \
  --group-id $CRUD_SERVICE_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```
- Then created the Security Group for the default VPC using:
```
export CRUD_SERVICE_SG=$(aws ec2 create-security-group \
  --group-name "crud-srv-sg" \
  --description "Security group for Cruddur services on ECS" \
  --vpc-id $DEFAULT_VPC_ID \
  --query "GroupId" --output text)
echo $CRUD_SERVICE_SG
```
- Finished creating tthe service on the console and started debugging the issues.
- Attached CloudWatchFullAccessPolicy and modified the CruddurServiceExecutionPolicy to include AllowECRAccess.
```
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
- The service now worked but the container was unhealthy, so created a file to and used commands that will get me into the container by doing the following:
- Created a new json file in `aws/json/service-backen-flask.json` and added the following content to it:
```
{
    "cluster": "cruddur",
    "launchType": "FARGATE",
    "desiredCount": 1,
    "enableECSManagedTags": true,
    "enableExecuteCommand": true,
    // "loadBalancers": [
    //   {
    //       "targetGroupArn": "arn:aws:elasticloadbalancing:ca-central-1:387543059434:targetgroup/cruddur-backend-flask-tg/87ed2a3daf2d2b1d",
    //       "containerName": "backend-flask",
    //       "containerPort": 4567
    //   }
    // ],
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
```
export DEFAULT_VPC_ID=$(aws ec2 describe-vpcs \
--filters "Name=isDefault, Values=true" \
--query "Vpcs[0].VpcId" \
--output text)
echo $DEFAULT_VPC_ID
```
```
export DEFAULT_SUBNET_IDS=$(aws ec2 describe-subnets  \
 --filters Name=vpc-id,Values=$DEFAULT_VPC_ID \
 --query 'Subnets[*].SubnetId' \
 --output json | jq -r 'join(",")')
echo $DEFAULT_SUBNET_IDS
```
#### Create Services
- Created Services for the `backend-flask`using:
```
aws ecs create-service --cli-input-json file://aws/json/service-backend-flask.json
```
#### Connection via Sessions Manaager (Fargate)
- In order to connect to the Fargate container, a Sessions Manager has to be installed to enable login used the following:
- Install for Ubuntu
```
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```
- Verified its working using:
```
session-manager-plugin
```
- Then connected to the fargate container using:
```
aws ecs execute-command  \
--region $AWS_DEFAULT_REGION \
--cluster cruddur \
--task 8ed89a0a637a487f8dc321908a912ece\
--container backend-flask \
--command "/bin/bash" \
--interactive
```
