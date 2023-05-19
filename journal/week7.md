# Week 7 — Solving CORS with a Load Balancer and Custom Domain

### Configure Task Defintions to contain X-ray and turn on Container Insights
- To have Container insights an x-ray is necessary hence, updated my `aws/task-definitions/backend-flask.json` with an x-ray code.
```sh
{
      "name": "xray",
      "image": "public.ecr.aws/xray/aws-xray-daemon" ,
      "essential": true,
      "user": "1337",
      "portMappings": [
        {
          "name": "xray",
          "containerPort": 2000,
          "protocol": "udp"
        }
      ]
    },
```
- Created new script files `register` to register task definitons in the `bin/backend` and `bin/frontend`folders respectively.
- For Backend 
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
FRONTEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $FRONTEND_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
TASK_DEF_PATH="$PROJECT_PATH/aws/task-definitions/backend-flask.json"

echo $TASK_DEF_PATH

aws ecs register-task-definition \
--cli-input-json "file://$TASK_DEF_PATH"
```
- Made it executable
```sh
chmod u+x bin/backend/register
```
- For Frontend
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
BACKEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $BACKEND_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
TASK_DEF_PATH="$PROJECT_PATH/aws/task-definitions/frontend-react-js.json"

echo $TASK_DEF_PATH

aws ecs register-task-definition \
--cli-input-json "file://$TASK_DEF_PATH"
```
- Made it executable
```sh
chmod u+x bin/frontend/register
```
- Executed the `bin/backend/register` script and it worked.
- Login using 
```sh
bin/ecr/login
```
- Deployed Image 
```sh
bin/backend/deploy
```
- Created new scripts files for docker `run` command for both the `bin/backend` and `bin/frontend` folders respectively.
- For backend
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
BACKEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $BACKEND_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
ENVFILE_PATH="$PROJECT_PATH/backend-flask.env"

docker run --rm \
  --env-file $ENVFILE_PATH \
  --network cruddur-net \
  --publish 4567:4567 \
  -it backend-flask-prod
```
- Made it executable
```sh
chmod u+x bin/backend/run
```
- For frontend
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
BACKEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $BACKEND_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
ENVFILE_PATH="$PROJECT_PATH/frontend-react-js.env"

docker run --rm \
  --env-file $ENVFILE_PATH \
  --network cruddur-net \
  --publish 4567:4567 \
  -it frontend-react-js-prod 
```
Made it executable
```sh
chmod u+x bin/frontend/run
```
- Also created new script files `generate-env` so the env vars can be passed when docker `run` is executed, for both `bin/frontend` and `bin/backend` folders.
- For backend
```sh
#!/usr/bin/env ruby

require 'erb'

template = File.read 'erb/backend-flask.env.erb'
content = ERB.new(template).result(binding)
filename = "backend-flask.env"
File.write(filename, content)   
```
- Made it executable
```sh
chmod u+x bin/backend/generate-env
```
- For Frontend `generate-env`
```sh
#!/usr/bin/env ruby

require 'erb'

template = File.read 'erb/frontend-react-js.env.erb'
content = ERB.new(template).result(binding)
filename = "frontend-react-js.env"
File.write(filename, content)
```
- Made it executable
```sh
chmod u+x bin/frontend/generate-env
```
- Detached the env vars from the `docker-compose.yml` file and created new folder `erb` and files `backend-flask.env.erb` and `frontend-react-js.env.erb` for both the backend-flask and frontend-react-js.
- For backend-flask.env.erb
```sh
AWS_ENDPOINT_URL=http://dynamodb-local:8000
CONNECTION_URL=postgresql://postgres:password@db:5432/cruddur
FRONTEND_URL=https://3000-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
BACKEND_URL=https://4567-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
#FRONTEND_URL = "https://3000-\#{ENV['GITPOD_WORKSPACE_ID']}.\#{ENV['GITPOD_WORKSPACE_CLUSTER_HOST']}"
#BACKEND_URL = "https://4567-\#{ENV['GITPOD_WORKSPACE_ID']}.\#{ENV['GITPOD_WORKSPACE_CLUSTER_HOST']}"
#FRONTEND_URL=https://3000-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
#BACKEND_URL=https://4567-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
OTEL_SERVICE_NAME=backend-flask
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<%= ENV['HONEYCOMB_API_KEY'] %>
AWS_XRAY_URL=*4567-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>*
#AWS_XRAY_URL=*4567-<%= ENV['CODESPACE_NAME'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>*
#AWS_XRAY_URL = "*4567-\#{ENV['GITPOD_WORKSPACE_ID']}.\#{ENV['GITPOD_WORKSPACE_CLUSTER_HOST']}*"
AWS_XRAY_DAEMON_ADDRESS=xray-daemon:2000
AWS_DEFAULT_REGION=<%= ENV['AWS_DEFAULT_REGION'] %>
AWS_ACCESS_KEY_ID=<%= ENV['AWS_ACCESS_KEY_ID'] %>
AWS_SECRET_ACCESS_KEY=<%= ENV['AWS_SECRET_ACCESS_KEY'] %>
ROLLBAR_ACCESS_TOKEN=<%= ENV['ROLLBAR_ACCESS_TOKEN'] %>
AWS_COGNITO_USER_POOL_ID=<%= ENV['AWS_COGNITO_USER_POOL_ID'] %>
AWS_COGNITO_USER_POOL_CLIENT_ID=6rvluth75jaeg605hblpdhqmbq
```
- For frontend-react-js.env.erb
```sh
REACT_APP_BACKEND_URL=https://4567-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
#REACT_APP_BACKEND_URL = "https://4567-\#{ENV['GITPOD_WORKSPACE_ID']}.\#{ENV['GITPOD_WORKSPACE_CLUSTER_HOST']}"
REACT_APP_AWS_PROJECT_REGION=<%= ENV['AWS_DEFAULT_REGION'] %>
REACT_APP_AWS_COGNITO_REGION=<%= ENV['AWS_DEFAULT_REGION'] %>
REACT_APP_AWS_USER_POOLS_ID=us-east-1_nCzleL11X
REACT_APP_CLIENT_ID=6rvluth75jaeg605hblpdhqmbq
```
- Updated `gitpod.yaml` file to automate generating the env files for both backend and frontend whenever system is started.
```sh
AWS_CLI_AUTO_PROMPT: on-partial
    before: |
      cd /workspace
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip awscliv2.zip
      sudo ./aws/install
      cd $THEIA_WORKSPACE_ROOT
  - name: postgres
    before: |
      curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc|sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
      echo "deb http://apt.postgresql.org/pub/repos/apt/ `lsb_release -cs`-pgdg main" |sudo tee  /etc/apt/sources.list.d/pgdg.list
      sudo apt update

  - name: react-js
    command: |
      source  "$THEIA_WORKSPACE_ROOT/bin/frontend/generate-env"
      cd frontend-react-js
      npm i
      
  - name: flask
    command: |
      source  "$THEIA_WORKSPACE_ROOT/bin/backend/generate-env"
```
- Updated `docker-compose.yml` file.
```sh
version: "3.8"
services:
  backend-flask:
    env_file:
      - backend-flask.env
    build: ./backend-flask
    ports:
      - "4567:4567"
    volumes:
      - ./backend-flask:/backend-flask
    networks:
      - cruddur-net
  frontend-react-js:
    env_file:
      - frontend-react-js.env
    build: ./frontend-react-js
    ports:
      - "3000:3000"
    networks:
      - cruddur-net
    volumes:
      - ./frontend-react-js:/frontend-react-js
  dynamodb-local:
    # https://stackoverflow.com/questions/67533058/persist-local-dynamodb-data-in-volumes-lack-permission-unable-to-open-databa
    # We needed to add user:root to get this working.
    user: root
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath ./data"
    image: "amazon/dynamodb-local:latest"
    container_name: dynamodb-local
    ports:
      - "8000:8000"
    networks:
      - cruddur-net
    volumes:
      - "./docker/dynamodb:/home/dynamodblocal/data"
    working_dir: /home/dynamodblocal
  db:
    image: postgres:13-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - '5432:5432'
    networks:
      - cruddur-net
    volumes: 
      - db:/var/lib/postgresql/data
  xray-daemon:
    hostname: xray-daemon
    image: "amazon/aws-xray-daemon"
    environment:
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      AWS_REGION: "us-east-1"
    command:
      - "xray -o -b xray-daemon:2000"
    ports:
      - 2000:2000/udp
    networks:
      - cruddur-net
# the name flag is a hack to change the default prepend folder
# name when outputting the image names
networks: 
  cruddur-net:
    driver: bridge
    name: cruddur-net

volumes:
  db:
    driver: local
```
- Ran the command `bin/backend/run` to confirm the env vars are being set and also to shell into the backend, `bin/bash` is added at end of the `bin/backend/run` file above but removed immediately after because it's not supposed to be used for production.
- Added a new script file `busybox` to aid in debugging backend in the `bin` folder.
```sh
! /usr/bin/bash

docker run --rm \
  --network cruddur-net \
  --publish 4567:4567 \
  -it busybox
```
- Made it executable
```sh
chmod u+x bin/busybox
```
- Updated backend-flask Dockerfile.prod with a code that can be used for debugging the container in production but should not be left or used .
```sh
# [TODO] For debugging, don't leave these in
RUN apt-get update -y
RUN apt-get install iputils-ping -y
# -----
```
- I didnt have an x-ray issue in my ECS but kept having an error of unhealthy instances for my backend services hence they couldn't run.
-  


      cd backend-flask
      pip install -r requirements.txt
```
