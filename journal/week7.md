# Week 7 — Solving CORS with a Load Balancer and Custom Domain

### Implementation of Xray on ECS and Container Insights

#### Configure Task Defintions to contain X-ray and turn on Container Insights
- To have Container insights, an x-ray is necessary hence, updated my `aws/task-definitions` files for both backend-flask.json and frontend-react.js with an x-ray code.
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
- N/B: To shell into the backend, `bin/bash` is added after the `-it backend-flask-prod` but removed immediately after because it's not supposed to be used for production.
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
- Also created new script files `generate-env`for gitpod workspace and `generate-env-codespace` for codespace workspace so the env vars can be passed when docker `run` is executed, for both `bin/frontend` and `bin/backend` folders.
- For Gitpod backend `generate env` 
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
For Codespace Backend `generate env-codespace` 
```sh
#! /usr/bin/env ruby

require 'erb'

template = File.read '/workspaces/aws-bootcamp-cruddur-2023/erb/backend-flask-codespace.env.erb'
content = ERB.new(template).result(binding)
filename = "/workspaces/aws-bootcamp-cruddur-2023/backend-flask.env"
File.write(filename, content)
```
- Made it executable
```sh
chmod u+x bin/backend/generate-env-codespace
```
- For Gitpod Frontend `generate-env` 
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
- For Codespace Frontend `generate-env-codespace` 
```sh
#! /usr/bin/env ruby

require 'erb'

template = File.read '/workspaces/aws-bootcamp-cruddur-2023/erb/frontend-react-js-codespace.env.erb'
content = ERB.new(template).result(binding)
filename = "/workspaces/aws-bootcamp-cruddur-2023/frontend-react-js.env"
File.write(filename, content)
```
- Made it executable
```sh
chmod u+x bin/frontend/generate-env-codespace
```
- Detached the env vars from the `docker-compose.yml` file and created new folder `erb` and files `backend-flask.env.erb` and `frontend-react-js.env.erb` for both the backend-flask and frontend-react-js which are now written in ruby language in order to enable docker to read and output the values of the Frontend and Backend URLs of gitpod and codespace workspaces correctly when running `generate-env` for the frontend and backend respesctively.
- For backend-flask.env.erb
```sh
AWS_ENDPOINT_URL=http://dynamodb-local:8000
CONNECTION_URL=postgresql://postgres:password@db:5432/cruddur
FRONTEND_URL=https://3000-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
BACKEND_URL=https://4567-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
OTEL_SERVICE_NAME=backend-flask
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<%= ENV['HONEYCOMB_API_KEY'] %>
AWS_XRAY_URL=*4567-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>*
AWS_XRAY_DAEMON_ADDRESS=xray-daemon:2000
AWS_DEFAULT_REGION=<%= ENV['AWS_DEFAULT_REGION'] %>
AWS_ACCESS_KEY_ID=<%= ENV['AWS_ACCESS_KEY_ID'] %>
AWS_SECRET_ACCESS_KEY=<%= ENV['AWS_SECRET_ACCESS_KEY'] %>
ROLLBAR_ACCESS_TOKEN=<%= ENV['ROLLBAR_ACCESS_TOKEN'] %>
AWS_COGNITO_USER_POOL_ID=<%= ENV['AWS_COGNITO_USER_POOL_ID'] %>
AWS_COGNITO_USER_POOL_CLIENT_ID=<%= ENV['AWS_COGNITO_USER_POOL_CLIENT_ID']
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
- Ran the command `bin/backend/run` to confirm the env vars are being set.
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
- I didnt have any X-ray issues in my ECS after i deployed it showed up but instead I kept having an error of unhealthy instances for my backend services hence they couldn't run any task.
- Fixed this by updating the path in the `aws/task-definitions/backend-flask` file due to the restructuring of files earlier done from:
```sh
"command": [
            "CMD-SHELL",
            "python /backend-flask/bin/flask/health-check"
          ],
```
- With:
```sh
"command": [
            "CMD-SHELL",
            "python /backend-flask/bin/health-check"
          ],
```
- To register the change to ECS ran: 
```sh
bin/backend/register 
```
- Re-built the docker image
```sh
bin/backend/build
```
- Pushed the new image to AWS ECS
```sh
bin/backend/push
```
- Then deployed it using:
```sh
bin/backend/deploy
```
- Also registered the change in the frontend task defintions for the `frontend-react-js`to include the X-ray that was added.
```sh
bin/frontend/register
```
- It worked and the instances became healthy with the X-ray working as well.

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/90c737de-ef4d-4d11-a2f2-2890e44f88c4)

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/fd7bd6be-7c23-4cb6-b62d-62971b366e2b)

### Implementation Of Time Zone

From the `bin/ddb/seed` folder, the following line of code is changed from;
```sh
now = datetime.now(timezone.utc).astimezone()
```
To the following
```sh
now = datetime.now()
```
From the same file, the following code is changed from;
```sh
  created_at = (now + timedelta(hours=-3) + timedelta(minutes=i)).isoformat()
```
To the following
```sh
  created_at = (now - timedelta(days=1) + timedelta(minutes=i)).isoformat()
```  
From the `backend/lib/ddb.py` folder, this code is also changed as well;
```sh
 now = datetime.now(timezone.utc).astimezone().isoformat()
created_at = now
```
With the following
```sh
created_at = datetime.now().isoformat()
```
Then in the `frontend-react-js/src/lib` a new  file called `DateTimeFormats.js` is created with the following code;
```sh
import { DateTime } from 'luxon';

export function format_datetime(value) {
  const datetime = DateTime.fromISO(value, { zone: 'utc' })
  const local_datetime = datetime.setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return local_datetime.toLocaleString(DateTime.DATETIME_FULL)
}

export function message_time_ago(value){
  const datetime = DateTime.fromISO(value, { zone: 'utc' })
  const created = datetime.setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const now     = DateTime.now()
  console.log('message_time_group',created,now)
  const diff_mins = now.diff(created, 'minutes').toObject().minutes;
  const diff_hours = now.diff(created, 'hours').toObject().hours;

  if (diff_hours > 24.0){
    return created.toFormat("LLL L");
  } else if (diff_hours < 24.0 && diff_hours > 1.0) {
    return `${Math.floor(diff_hours)}h`;
  } else if (diff_hours < 1.0) {
    return `${Math.round(diff_mins)}m`;
  } else {
    console.log('dd', diff_mins,diff_hours)
    return 'unknown'
  }
}

export function time_ago(value){
  const datetime = DateTime.fromISO(value, { zone: 'utc' })
  const future = datetime.setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const now     = DateTime.now()
  const diff_mins = now.diff(future, 'minutes').toObject().minutes;
  const diff_hours = now.diff(future, 'hours').toObject().hours;
  const diff_days = now.diff(future, 'days').toObject().days;

  if (diff_hours > 24.0){
    return `${Math.floor(diff_days)}d`;
  } else if (diff_hours < 24.0 && diff_hours > 1.0) {
    return `${Math.floor(diff_hours)}h`;
  } else if (diff_hours < 1.0) {
    return `${Math.round(diff_mins)}m`;
  }
}
```
Some modifications are done for the following files in the `frontend-react-js/src/components` folder:

- MessageItem.js
 The following code is removed
```sh
import { DateTime } from 'luxon';
```
And replaced with
```sh
import { format_datetime, message_time_ago } from '../lib/DateTimeFormats';
```
Same thing was done for the following code
```sh
<div className="created_at" title={props.message.created_at}>
<span className='ago'>{format_time_created_at(props.message.created_at)}</span> 
```
Replaced with the following 
```sh
  <div className="created_at" title={format_datetime(props.message.created_at)}>
  <span className='ago'>{message_time_ago(props.message.created_at)}</span> 
```  
This part of the code was also removed
```sh
<Link className='message_item' to={`/messages/@`+props.message.handle}>
<div className='message_avatar'></div>
```
And replaced with the following
```sh
 <div className='message_item'>
      <Link className='message_avatar' to={`/messages/@`+props.message.handle}></Link>
```      
Also removed 
```sh
 </Link>
``` 
Replaced with
```sh
 </div>
``` 
- MessageItem.css 

This part of the code is removed
```sh
 cursor: pointer;
text-decoration: none;
```
And replaced with
```sh
.message_item .avatar {
  cursor: pointer;
  text-decoration: none;
}
```

- MessageGroupItem.js

The following code is removed
```sh
import { DateTime } from 'luxon';
```
And replaced with
```sh
import { format_datetime, message_time_ago } from '../lib/DateTimeFormats';
```
The same is done for the following code
```sh
<div className="created_at" title={props.message_group.created_at}>
<span className='ago'>{format_time_created_at(props.message_group.created_at)}</span> 
```
And replaced with the following
```sh
<div className="created_at" title={format_datetime(props.message_group.created_at)}>
<span className='ago'>{message_time_ago(props.message_group.created_at)}</span> 
```
Also this part of the code is removed
```sh
const format_time_created_at = (value) => {
    // format: 2050-11-20 18:32:47 +0000
    const created = DateTime.fromISO(value)
    const now     = DateTime.now()
    const diff_mins = now.diff(created, 'minutes').toObject().minutes;
    const diff_hours = now.diff(created, 'hours').toObject().hours;

    if (diff_hours > 24.0){
      return created.toFormat("LLL L");
    } else if (diff_hours < 24.0 && diff_hours > 1.0) {
      return `${Math.floor(diff_hours)}h`;
    } else if (diff_hours < 1.0) {
      return `${Math.round(diff_mins)}m`;
    }
  };
  ```
- ActivityContent.js file 
- 
The following code is removed
```sh
import { DateTime } from 'luxon';
```
And replaced with
```sh
import { format_datetime, time_ago } from '../lib/DateTimeFormats';
```
This code was also replaced
```sh
  <div className="created_at" title={props.activity.created_at}>
  <span className='ago'>{format_time_created_at(props.activity.created_at)}</span>
```  
With the following
```sh
<div className="created_at" title={format_datetime(props.activity.created_at)}>
<span className='ago'>{time_ago(props.activity.created_at)}</span>
```
This part of the code was also removed
```sh
  const format_time_created_at = (value) => {
    // format: 2050-11-20 18:32:47 +0000
    const past = DateTime.fromISO(value)
    const now     = DateTime.now()
    const diff_mins = now.diff(past, 'minutes').toObject().minutes;
    const diff_hours = now.diff(past, 'hours').toObject().hours;

    if (diff_hours > 24.0){
      return past.toFormat("LLL L");
    } else if (diff_hours < 24.0 && diff_hours > 1.0) {
      return `${Math.floor(diff_hours)}h ago`;
    } else if (diff_hours < 1.0) {
      return `${Math.round(diff_mins)}m ago`;
    }
  };

  const format_time_expires_at = (value) => {
    // format: 2050-11-20 18:32:47 +0000
    const future = DateTime.fromISO(value)
    const now     = DateTime.now()
    const diff_mins = future.diff(now, 'minutes').toObject().minutes;
    const diff_hours = future.diff(now, 'hours').toObject().hours;
    const diff_days = future.diff(now, 'days').toObject().days;

    if (diff_hours > 24.0){
      return `${Math.floor(diff_days)}d`;
    } else if (diff_hours < 24.0 && diff_hours > 1.0) {
      return `${Math.floor(diff_hours)}h`;
    } else if (diff_hours < 1.0) {
      return `${Math.round(diff_mins)}m`;
    }
  };
```  
The same changes to remove the following line of code was done
```sh
<span className='ago'>{format_time_expires_at(props.activity.expires_at)}</span>
```
And replaced with the following
```sh
<span className='ago'>{time_ago(props.activity.expires_at)}</span>
```
Same is for the following code
```sh
expires_at =  <div className="expires_at" title={props.activity.expires_at}>
```
Replaced with the following
```sh
expires_at =  <div className="expires_at" title={format_datetime(props.activity.expires_at)}>
```
