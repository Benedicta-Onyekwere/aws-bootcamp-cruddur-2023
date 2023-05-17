# Week 6 — Deploying Containers

### Test RDS Connection

- Added this `test` script file into `backend-flask/bin/db` folder to easily check the connection from the container.
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

Didn't implement but instead updated the following endpoint for my flask app because in week 1 App Containerization I already implemented health check as part of the homework challenge:
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
- Made it executable, ran it:
```sh
chmod u+x ./bin/flask/health-check
```

#### Create CloudWatch Log Group
- Created CloudWatch log group via AWS CLI using:
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
- Did this via CLI in order to be able to push the containers using:
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

### Deploy Backend Flask app as a Service to Fargate
#### Created ECR Repo and push image for `backend-flask`.
- ECR Repo 
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

### Create Task and Execution Roles for Task Defintion
 
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
- Finished creating the service on the console and started debugging the issues.
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
#### Connection via Sessions Manager (Fargate)
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
- Updated `gitpod.yaml` file to include the Sesssions Manager code to log into the container:
```sh
- name: fargate
  before |
    curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
    sudo dpkg -i session-manager-plugin.deb
    cd backend-flask
```
- Also created a new file `connect-to-service` in the `backend-flask/bin/ecs` folder and added the shell in command to log into the container:
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

#### Provision and configure Application Load Balancer along with target groups
- Checked endpoint for HomeActivities didn't work because the Services Security Group had no access to the RDS instance. 
- Connected it by editing the inbound rules for the RDS instance to allow/include the Security Group for the backend-flask Services and it worked.
- Provisioned and configured Application Load Balancer via AWS console with target and security groups respectively for both `backend-flask` and `frontend-react.js`.
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

![image](https://user-images.githubusercontent.com/105982108/236653196-d1ee6411-6705-4749-9aee-3f5e9eb726b1.png)


### Deploy Frontend React.js app as a Service to Fargate
#### Create json
- Ceated a new file `frontend-react-json.js` in the `aws/task-definitions` folder for the task definitions.
- frontend-react.js
```sh
{
    "family": "frontend-react-js",
    "executionRoleArn": "arn:aws:iam::914347776203:role/CruddurServiceExecutionRole",
    "taskRoleArn": "arn:aws:iam::914347776203:role/CruddurTaskRole",
    "networkMode": "awsvpc",
    "cpu": "256",
    "memory": "512",
    "requiresCompatibilities": [ 
      "FARGATE" 
    ],
    "containerDefinitions": [
      {
        "name": "frontend-react-js",
        "image": "914347776203.dkr.ecr.us-east-1.amazonaws.com/frontend-react-js",
        "essential": true,
        "portMappings": [
          {
            "name": "frontend-react-js",
            "containerPort": 3000,
            "protocol": "tcp", 
            "appProtocol": "http"
          }
        ],
  
        "logConfiguration": {
          "logDriver": "awslogs",
          "options": {
              "awslogs-group": "cruddur",
              "awslogs-region": "us-east-1",
              "awslogs-stream-prefix": "frontend-react-js"
          }
        }
      }
    ]
  }

```
- Created `Dockerfile.prod` for production in the `frontend-react.js` folder.
- Dockerfile.prod
```sh
# Base Image ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
FROM node:16.18 AS build

ARG REACT_APP_BACKEND_URL
ARG REACT_APP_AWS_PROJECT_REGION
ARG REACT_APP_AWS_COGNITO_REGION
ARG REACT_APP_AWS_USER_POOLS_ID
ARG REACT_APP_CLIENT_ID

ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_AWS_PROJECT_REGION=$REACT_APP_AWS_PROJECT_REGION
ENV REACT_APP_AWS_COGNITO_REGION=$REACT_APP_AWS_COGNITO_REGION
ENV REACT_APP_AWS_USER_POOLS_ID=$REACT_APP_AWS_USER_POOLS_ID
ENV REACT_APP_CLIENT_ID=$REACT_APP_CLIENT_ID

COPY . ./frontend-react-js
WORKDIR /frontend-react-js
RUN npm install
RUN npm run build

# New Base Image ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
FROM nginx:1.23.3-alpine

# --from build is coming from the Base Image
COPY --from=build /frontend-react-js/build /usr/share/nginx/html
COPY --from=build /frontend-react-js/nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000
```
- Added to `.gitignore` file:
```sh
frontend-react-js/build/*
```
- Created a new file `nginx.conf` in the `frontend-react.js` folder and added following content.
- nginx.conf
```sh
# Set the worker processes
worker_processes 1;

# Set the events module
events {
  worker_connections 1024;
}

# Set the http module
http {
  # Set the MIME types
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  # Set the log format
  log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

  # Set the access log
  access_log  /var/log/nginx/access.log main;

  # Set the error log
  error_log /var/log/nginx/error.log;

  # Set the server section
  server {
    # Set the listen port
    listen 3000;

    # Set the root directory for the app
    root /usr/share/nginx/html;

    # Set the default file to serve
    index index.html;

    location / {
        # First attempt to serve request as file, then
        # as directory, then fall back to redirecting to index.html
        try_files $uri $uri/ $uri.html /index.html;
    }

    # Set the error page
    error_page  404 /404.html;
    location = /404.html {
      internal;
    }

    # Set the error page for 500 errors
    error_page  500 502 503 504  /50x.html;
    location = /50x.html {
      internal;
    }
  }
}

```
- Also created a new file `service-frontend-react-js.json` in `aws/json` for the frontend react.
- service-frontend-react-js.json
```sh
{
  "cluster": "cruddur",
  "launchType": "FARGATE",
  "desiredCount": 1,
  "enableECSManagedTags": true,
  "enableExecuteCommand": true,
  "loadBalancers": [
    {
        "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:914347776203:targetgroup/cruddur-frontend-react-js-tg/458523abe650a629",
        "containerName": "frontend-react-js",
        "containerPort": 3000
    }
  ],
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
  "propagateTags": "SERVICE",
  "serviceName": "frontend-react-js",
  "taskDefinition": "frontend-react-js",
  "serviceConnectConfiguration": {
    "enabled": true,
    "namespace": "cruddur",
    "services": [
      {
        "portName": "frontend-react-js",
        "discoveryName": "frontend-react-js",
        "clientAliases": [{"port": 3000}]
      }
    ]
  }
}
```
- Tested it by doing a dry run using:
```sh
npm run build
```
- Got errors and resolved it by updating `SignUpPage.js` file in the `src/pages` folder and everything then worked.
#### Created ECR Repo and push Image for frontend-React-js
- ECR Repo
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
- Login to ECR
```sh
aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
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
- Registered Task Definition
```sh
aws ecs register-task-definition --cli-input-json file://aws/task-definitions/frontend-react-js.json
```
- Created Services
```sh
aws ecs create-service --cli-input-json file://aws/json/service-frontend-react-js.json
```
- Everything worked but the instances were unhealthy, fixed the issue in the following ways:
- Detached the load balancer code from the `service-frontend-js.json` and re-launched after having deleted the previous service in the AWS console so that i can shell into the container to debug it.
- Got error of bin/bash no such file when trying to shell in from the `backend-flask` using:
```sh
./bin/ecs/connect-to-service 53c795a6dcdf4ad084802cf6a5257a2f frontend-react.js
```
- Re-build the image locally in order to inspect output of CMD.
- Ran the image again.
```sh
docker run --rm -p 3000:3000 -it frontend-react-js 
```
- Executed the inspect command after getting the container ID using:
```sh
docker inspect 7f5a17420ce2 
```
- Created a new file `connect-to-frontend-react-js` in the `backend/bin/ecs` in order for the frontend-flask to have the `bin/sh` command it needed.
- connect-to-frontend-react-js
```sh
#! /usr/bin/bash

if [ -z "$1" ]; then
  echo "No TASK_ID argument supplied eg ./bin/ecs/connect-to-frontend-react-js 8037a126ad294d65896d0c3ba47a3de5 backend-flask "
  exit 1
fi
TASK_ID=$1

CONTAINER_NAME=frontend-react-js

echo "Task ID:$TASK_ID"
echo "Container name:$CONTAINER_NAME"

aws ecs execute-command  \
--region $AWS_DEFAULT_REGION \
--cluster cruddur \
--task $TASK_ID \
--container $CONTAINER_NAME \
--command "/bin/sh" \
--interactive
```
- Renamed the `connect-to-service` to `connect-to-backend-flask` in the `backend-flask/bin/ecs` folder and updated the file.
- connect-to-backend-flask
```sh
#! /usr/bin/bash

if [ -z "$1" ]; then
  echo "No TASK_ID argument supplied eg ./bin/ecs/connect-to-backend-flask 8037a126ad294d65896d0c3ba47a3de5 backend-flask "
  exit 1
fi
TASK_ID=$1

CONTAINER_NAME=backend-flask

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
- Made them executable using:
```sh
chmod u+x ./bin/ecs/connect-to-backend-flask
chmod u+x ./bin/ecs/connect-to-frontend-react-js
```
- Logged into the container using:
```sh
./bin/ecs/connect-to-frontend-react-js d4fefab995a64c5791b0f81bb30565df
```
- Curled `localhost:3000`.
- Since curl can be used inside the Alpine container, created and added a healthcheck command for the frontend-react-js `task-definitions` file.
```sh
"containerDefinitions": [
      {
        "name": "frontend-react-js",
        "image": "914347776203.dkr.ecr.us-east-1.amazonaws.com/frontend-react-js",
        "essential": true,
        "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000 || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
```
- Edited Security Groups inbound rules to include port 3000 for the frontend-react-js.
- Appended the load balancer code back to the  `service-frontend-js.json` file.
- Deleted existing service in AWS console.
- Recreated service via CLI.
- The instances became healthy.
- Load balancer worked.

 ![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/4ebf805e-1c52-482d-bd59-05cd1aff4824)
 
- Created Route 53 on AWS console.
- Created SSL Certificate using AWS Certificate Manager ACM.
- Setup a record set for naked domain to point to frontend-react-js.
- Setup a record set for api subdomain to point to the backend-flask.
- I did the above by editing the listener and managed rules in load balancer both backend-flask and frontend-react-js listeners in which port 80 was redirected to port 443 which is for https and port 443 was then redirected to `cruddur-frontend-react.js` app respectively.
- After the rules were created then deleted both the frontend wih port 3000 and backend:4567 rules.
- Created another record on Route 53 to piont to the load balancer.
- Confirmed it was routing traffic by first pinging and curling my DNS:
```sh
ping api.bennieo.me

https://curl api.bennieo.me/api/activities/healthcheck
```
- They both worked, then confirmed it on my browser and it worked.

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/b0c02c11-2df6-4562-bd46-f7e1498e82cb)


![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/7748d80b-5d2d-4c9c-94ec-7d8023c5083d)

#### Configure CORS to only permit traffic from my domain
- To get the endpoints working correctly because cross origin CORS is open to everything and frontend isn't working because it's pointing in the wrong direction.
- Have to redeploy backend-flask with the right environment variables while for frontend had to rebuild the image. 
- Updated the env vars in the `backend-flask.json` file in the `aws/task-defintions` folder with:
```sh
{"name": "FRONTEND_URL", "value": "bennieo.me"},
{"name": "BACKEND_URL", "value": "api.bennieo.me"},
```
- Registered task definitions.
```sh
aws ecs register-task-definition --cli-input-json file://aws/task-definitions/backend-flask.json
```
- Login into ECR
```sh
aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
```
- Set URL
```sh
export ECR_FRONTEND_REACT_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/frontend-react-js"
echo $ECR_FRONTEND_REACT_URL
```
- Updated and executed Build Image
```sh
docker build \
--build-arg REACT_APP_BACKEND_URL="https://api.bennieo.me" \
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
- In the ECS, I updated both the `frontend-react-js`and the `backend-flask` services and force new deployment since I updated the `task-definitions` so it can use the latest update.
- Checked the health status of the containers by checking the target groups and both were healthy.
- Put on the browser and api.bennieo.me worked while bennieo.me worked but had a cors issue because it wasnt out putting any message.
- Resolved it by adding the protocols in the environment variables in the `task-definitions` file for both the frontend and backend Url.
```
{"name": "FRONTEND_URL", "value": "https://bennieo.me"},
{"name": "BACKEND_URL", "value": "https://api.bennieo.me"},
```
- Registered task definitions.
```sh
aws ecs register-task-definition --cli-input-json file://aws/task-definitions/backend-flask.json
```
- Then it worked.
- 
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/1546c818-9077-463f-83eb-a4b9953dd4ab)

#### Secure Flask by not running in debug mode
- Updated my load balancer security group inbound rules to only allow access my IP address.
- Updated backend-flask Dockerfile by deleting the `ENV FLASK_DEBUG=1` and updated it with:
```sh
CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=4567", "--debug"]
```
- Created a new `Dockerfile.prod` in the `backend-flask` folder.
- Created a new script file `login` in the `backend-flask/bin/ecr` folder and logged into the ecr.
```sh
#! /usr/bin/bash

aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
```
- Made it executable using:
```sh
chmod u+x ./bin/ecr/login
```
- Built the new `Dockerfile.prod` image using:
```sh
docker build -f Dockerfile.prod -t backend-flask-prod .
```
- Inputted environment variables using:
```sh
! /usr/bin/bash

docker run --rm \
-p 4567:4567 \
--env AWS_ENDPOINT_URL="http://dynamodb-local:8000" \
--env CONNECTION_URL="postgresql://postgres:password@db:5432/cruddur" \
--env FRONTEND_URL="https://3000-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}" \
--env BACKEND_URL="https://4567-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}" \
--env OTEL_SERVICE_NAME='backend-flask' \
--env OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io" \
--env OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=${HONEYCOMB_API_KEY}" \
--env AWS_XRAY_URL="*4567-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}*" \
--env AWS_XRAY_DAEMON_ADDRESS="xray-daemon:2000" \
--env AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION}" \
--env AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
--env AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
--env ROLLBAR_ACCESS_TOKEN="${ROLLBAR_ACCESS_TOKEN}" \
--env AWS_COGNITO_USER_POOL_ID="${AWS_COGNITO_USER_POOL_ID}" \
--env AWS_COGNITO_USER_POOL_CLIENT_ID="6rvluth75jaeg605hblpdhqmbq" \
-it backend-flask-prod
```
- Purposely created an error in `app.py` in order to see what or how the error message will be
```sh
@app.route("/api/activities/healthcheck", methods=['GET'])
def data_healthcheck():
  data = HealthcheckActivities.run()
  hello = None
  hello()
  return {'success': True}, 200
```
- Finally gave an output without the debug message.
- Created new script files for building docker images for both frontend-react-js and backend-flask,`backend-flask-prod`and `frontend-react-js-prod` in the `backend-flask/bin/docker/build` folders.
- Also created a script file `backend-flask-prod` for the docker run command in the `backend-flask/bin/docker/run` folder.
- Removed the error from `app.py` file after affirming everything is working the way it should.
- Created more new scripts file ` backend-for-prod`for pushing the image in the `backend-flask/bin/docker/push` folder.
```sh
#! /usr/bin/bash

ECR_BACKEND_FLASK_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/backend-flask"
echo $ECR_BACKEND_FLASK_URL

docker tag backend-flask-prod:latest $ECR_BACKEND_FLASK_URL:latest
docker push $ECR_BACKEND_FLASK_URL:latest
```
- Made it executable
```sh
chmod u+x ./bin/docker/push/backend-flask-prod
```
- Created a new file script `force-deploy-backend-flask` to automate updating services in AWS ECS console in the `backend-flask/bin/ecs` folder.
```sh
#! /usr/bin/bash

CLUSTER_NAME="cruddur"
SERVICE_NAME="backend-flask"
TASK_DEFINTION_FAMILY="backend-flask"


LATEST_TASK_DEFINITION_ARN=$(aws ecs describe-task-definition \
--task-definition $TASK_DEFINTION_FAMILY \
--query 'taskDefinition.taskDefinitionArn' \
--output text)

aws ecs update-service \
--cluster $CLUSTER_NAME \
--service $SERVICE_NAME \
--task-definition $LATEST_TASK_DEFINITION_ARN \
--force-new-deployment

#aws ecs describe-services \
#--cluster $CLUSTER_NAME \
#--service $SERVICE_NAME \
#--query 'services[0].deployments' \
#--output table
```
#### Refactor bin directory to be top level
- Moved the entire `bin` directory out of the `backend-flask` directory to the top.
#### Building frontend-react-js-prod
- Updated the `frontend-react-js-prod` in the `bin/docker/build`folder so that it can point to the right direction with:
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
BUILD_PATH=$(dirname $ABS_PATH)
DOCKER_PATH=$(dirname $BUILD_PATH)
BIN_PATH=$(dirname $DOCKER_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
FRONTEND_REACT_JS_PATH="$PROJECT_PATH/frontend-react-js"

-f "$FRONTEND_REACT_JS_PATH/Dockerfile.prod" \
"$FRONTEND_REACT_JS_PATH/." 
```
- Made it executable
```sh
chmod u+x bin/docker/build/frontend-react-js-prod
```
- Also did same for `backend-flask-prod` file.
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
BUILD_PATH=$(dirname $ABS_PATH)
DOCKER_PATH=$(dirname $BUILD_PATH)
BIN_PATH=$(dirname $DOCKER_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
BACKEND_FLASK_PATH="$PROJECT_PATH/backend-flask"

docker build \
-f "$BACKEND_FLASK_PATH/Dockerfile.prod" \
-t backend-flask-prod \
"$BACKEND_FLASK_PATH/."
```
- Updated `schema-load` and `seed` files in the `bin/db` folders where the changes in the paths made above is also necessary.
- For Schema-load
```sh 
ABS_PATH=$(readlink -f "$0")
BIN_PATH=$(dirname $ABS_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
BACKEND_FLASK_PATH="$PROJECT_PATH/backend-flask"
schema_path="$BACKEND_FLASK_PATH/db/schema.sql"
echo $schema_path
```
- For Seed
```sh
#! /usr/bin/bash

CYAN='\033[1;36m'
NO_COLOR='\033[0m'
LABEL="db-seed"
printf "${CYAN}== ${LABEL}${NO_COLOR}\n"

ABS_PATH=$(readlink -f "$0")
BIN_PATH=$(dirname $ABS_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
BACKEND_FLASK_PATH="$PROJECT_PATH/backend-flask"
schema_path="$BACKEND_FLASK_PATH/db/schema.sql"
echo $schema_path

if [ "$1" = "prod" ]; then
  echo "Running in production mode"
  URL=$PROD_CONNECTION_URL
else
  URL=$CONNECTION_URL
fi

psql $URL cruddur < $seed_path 
```
- For Setup
```sh
ABS_PATH=$(readlink -f "$0")
bin_path=$(dirname $ABS_PATH)
```
- Updated `gitpod.yml` file.
```sh
 source  "$THEIA_WORKSPACE_ROOT/bin/rds/update-sg-rule"
```
- Created a new file to push image for `frontend-react-js-prod` in the `bin/docker/push` folder.
```sh
#! /usr/bin/bash


ECR_FRONTEND_REACT_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/frontend-react-js"
echo $ECR_FRONTEND_REACT_URL

docker tag frontend-react-js:latest $ECR_FRONTEND_REACT_URL:latest
docker push $ECR_FRONTEND_REACT_URL:latest
```
- Made it executable.
```sh
chmod u+x bin/docker/push/frontend-react-js-prod
```
- Also created a new file script `force-deploy-frontend-react-js` to automate updating services in AWS ECS console in the `/bin/ecs` folder. 
```sh
#! /usr/bin/bash

CLUSTER_NAME="cruddur"
SERVICE_NAME="frontend-react-js"
TASK_DEFINTION_FAMILY="frontend-react-js"

LATEST_TASK_DEFINITION_ARN=$(aws ecs describe-task-definition \
--task-definition $TASK_DEFINTION_FAMILY \
--query 'taskDefinition.taskDefinitionArn' \
--output text)

aws ecs update-service \
--cluster $CLUSTER_NAME \
--service $SERVICE_NAME \
--task-definition $LATEST_TASK_DEFINITION_ARN \
--force-new-deployment
```
- Made it executable.
```sh
chmod u+x bin/ecs/force-deploy-frontend-react-js
```
### Implement Refresh Cognito Token
#### Fixed expiring token by updating the following files in the `frontend-react-js` :
- For CheckAuth in the `frontend-react-js/src/lib` folder
```sh
import { Auth } from 'aws-amplify';
import { resolvePath } from 'react-router-dom';

export async function getAccessToken(){
  Auth.currentSession()
  .then((cognito_user_session) => {
    const access_token = cognito_user_session.accessToken.jwtToken
    localStorage.setItem("access_token", access_token)
  })
  .catch((err) => console.log(err));
}

export async function checkAuth(setUser){
  Auth.currentAuthenticatedUser({
    // Optional, By default is false. 
    // If set to true, this call will send a 
    // request to Cognito to get the latest user data
    bypassCache: false 
  })
  .then((cognito_user) => {
    console.log('cognito_user',cognito_user);
    setUser({
      display_name: cognito_user.attributes.name,
      handle: cognito_user.attributes.preferred_username
    })
    return Auth.currentSession()
  }).then((cognito_user_session) => {
      console.log('cognito_user_session',cognito_user_session);
      localStorage.setItem("access_token", cognito_user_session.accessToken.jwtToken)
  })
  .catch((err) => console.log(err));
};
```
- For MessageForm.js in `frontend-react-js/src/components` folder
```sh
import {getAccessToken} from '../lib/CheckAuth';

      await getAccessToken()
      const access_token = localStorage.getItem("access_token")
      
          'Authorization': `Bearer ${access_token}`,
```
- The same line of code were updated in the `frontend-react-js/src/pages` folder for the following files:
- MessageGroupNewPage.js, MessageGroupPage.js, MessageGroupPage.js and MessageGroupsPage.js 
```sh
import {getAccessToken} from '../lib/CheckAuth';

      await getAccessToken()
      const access_token = localStorage.getItem("access_token")
      
          'Authorization': `Bearer ${access_token}`,
```

### Fix Messaging in Production

#### Restructuring Bash Scripts Again
- Restructured files in the `bin` directory by deleting and creating some as follows:
- Created two new folders `backend` and `frontend`folders.
- Moved all the frontend-react-js scripts from `bin/docker/build/frontend-react-js-prod`, `bin/docker/push/frontend-react-js-prod`, `bin/ecs/connect-to-frontend-react-js`, `bin/ecs/force-deploy-frontend-react-js` to the `frontend` and they were renamed accordinly as Buid, Connect, Deploy and Push.
- Exact same thing was done for all backend-flasks scripts in the same folders as above to `Backend` and were renamed as well to Buid, Connect, Deploy and Push. 
- Updated the backend and frontend build paths since the `bin` directory is no longer in the the `backend-flask` so they can point in the right direction.
```sh
ABS_PATH=$(readlink -f "$0")
BIN_PATH=$(dirname $ABS_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
BACKEND_FLASK_PATH="$PROJECT_PATH/backend-flask"

ABS_PATH=$(readlink -f "$0")
BIN_PATH=$(dirname $ABS_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
FRONTEND_REACT_JS_PATH="$PROJECT_PATH/frontend-react-js"
```
- On refreshing the browser,Cruddur app using was working but didnt seed any data when endpoint `messages/new/bayko` was used
- It had a `UsersShort` error which is supposed to return an empty object.
- Restarted Cruddur on my local machine and tried to debug and fix the issue.
#### Fixing the Pathing
- To fix issue had to seed data back into DynamoDB using:
```sh
bin/db/setup
```
- Didnt work kept giving different errors for all the files that will be used to seed data due to the `bin/db` pathing. Fixed the pathing error for the the following files; 
- Updated the `setup` file script with:
```sh
ABS_PATH=$(readlink -f "$0")
DB_PATH=$(dirname $ABS_PATH)

source "$DB_PATH/drop"
source "$DB_PATH/create"
source "$DB_PATH/schema-load"
source "$DB_PATH/seed"
source "$DB_PATH/update_cognito_user_ids"
```
- Updated `schema-load` file with:
```sh
DB_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $DB_PATH)
```
- Updated `seed` file with:
```sh
ABS_PATH=$(readlink -f "$0")
DB_PATH=$(dirname $ABS_PATH)

source "$DB_PATH/drop"
source "$DB_PATH/create"
source "$DB_PATH/schema-load"
source "$DB_PATH/seed"
source "$DB_PATH/update_cognito_user_ids" 
```
#### Fix Connection Issues
- After fixing pathing issues, ran the `bin/db/setup` again but it kept giving error of "Cruddur database being accessed by other users and having different numbers of sessions using the database" which shouldn't be because when database is down postgres shouldn't be running hence there should be no connection.
- Fixed this by creating a new script to kill all connections in both the `bin/db` directory and `backend-flask/db` directory.
- For `bin/db` new `kill-all` script
```sh
! /usr/bin/bash

CYAN='\033[1;36m'
NO_COLOR='\033[0m'
LABEL="db-kill-all"
printf "${CYAN}== ${LABEL}${NO_COLOR}\n"

ABS_PATH=$(readlink -f "$0")
DB_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $DB_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
BACKEND_FLASK_PATH="$PROJECT_PATH/backend-flask"
kill_path="$BACKEND_FLASK_PATH/db/kill-all-connections.sql"
echo $kill_path

psql $CONNECTION_URL cruddur < $kill_path
```
- Made the file executable using;
```sh
chmod u+x bin/db/kill-all
```
- For `backend-flask/db` new `kill-all-connections.sql` file
```sh
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE 
-- don't kill my own connection!
pid <> pg_backend_pid()
-- don't kill the connections to other databases
AND datname = 'cruddur';
```
- This killed all the connections.
- Updated the `seed` script because it still gave error of "no such file or directory" with;
```sh
seed_path="$BACKEND_FLASK_PATH/db/seed_path.sql"
echo $seed_path
```
- Updated the `setup` script with 
```sh
python "$DB_PATH/update_cognito_user_ids"
```
- Also updated `bin/db/update_cognito_user_ids` because of error "No module named lib " which meant it couldn't find cognito user due to the new pathing with:
```sh
parent_path = os.path.abspath(os.path.join(current_path, '..', '..','backend-flask'))
```
- Then the `bin/db/setup` finally worked.
- Ran the script `bin/ddb/schema-load` but it didnt work.
- Updated my `bin/ddb/schema-load` file to delete the existing table because I kept getting the error 'ResourceInUseException'
```sh
# Check if the table already exists
existing_tables = ddb.list_tables()['TableNames']
if table_name in existing_tables:
    # Delete the table if it exists
    ddb.delete_table(TableName=table_name)
    print(f"Deleted existing table: {table_name}")
```
- Ran `bin/ddb/seed` but didnt work due to similar problem with "lib".
- Fixed it by updating `bin/ddb/seed` file and it worked, data was seeded.
```sh
parent_path = os.path.abspath(os.path.join(current_path, '..', '..','backend-flask'))
```
- Updated `backend-flask/lib/db.py` with;
```sh
 return "{}"
```
- This fixed the UsersShort issue.
- Since code was changed, had to build, push and deploy backend again using:
```sh
bin/backend/build
```
- Didnt work gave error of "Unable to prepare path...not found" due to restructured paths.
- Fixed this by updating both backend and frontend build files with;
```sh
BACKEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $BACKEND_PATH)

FRONTEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $BACKEND_PATH)
```
- It worked then pushed and deployed image respectively using;
```sh
bin/backend/push

bin/backend/deploy
```
- Seed data worked.
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/845e1a48-be2e-4167-b056-6b5ea763bf60)

- New message worked
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/ff7fc06c-2473-4450-b0bd-14ac42ff5eeb)

