# Week X - Cleanup

With our AWS Cloud Project Bootcamp coming to a close, Week X was created to cleanup our application and get most of the features into a working state.

[Sync Tool for Static Website Hosting](#Sync-Tool-for-Static-Website-Hosting)

[Reconnect Database and Postgres Confirmation Lambda](#Reconnect-Database-and-Postgres-Confirmation-Lambda)

[Fix CORS to Use Domain Name for Web-app](#Fix-CORS-to-Use-Domain-Name-for-Web-App)

[Ensuring CI/CD Pipeline and Create Activity Works](#[Ensuring-CI/CD-Pipeline-and-Create-Activity-Works)

[Refactor JWT To Use a Decorator in Flask App](#Refactor-JWT-To-Use-a-Decorator-in-Flask-App)

[Refactor App.py](#Refactor-App.py)

[Refactor Flask Routes](#Refactor-Flask-Routes)




## Sync Tool for Static Website Hosting

### Setting up frontend build

Created a new bash script  file `static-build` in the `bin/frontend` directory and made it executable.
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
FRONTEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $FRONTEND_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
FRONTEND_REACT_JS_PATH="$PROJECT_PATH/frontend-react-js"

cd $FRONTEND_REACT_JS_PATH

REACT_APP_BACKEND_URL="https://api.bennieo.me" \
REACT_APP_AWS_PROJECT_REGION="$AWS_DEFAULT_REGION" \
REACT_APP_AWS_COGNITO_REGION="$AWS_DEFAULT_REGION" \
REACT_APP_AWS_USER_POOL_ID="us-east-1_nCzleL11X" \
REACT_APP_CLIENT_ID="6rvluth75jaeg605hblpdhqmbq" \
npm run build
```
Updated the following files in the `frontend-react-js/src/components` directory:
- `ActivityContent.css`
- `MessageGroupItem.css`
- `MessageItem.css`
- `ProfileHeading.css`
  
From
```sh
align-items: start;
```
With
```sh
align-items: flex-start;
```
- `DesktopNavigationLink.js`
  
Added
```sh
default:
break;
```
- `DesktoSidebar.js`
  
From
```sh
<a href="#">About</a>
<a href="#">Terms of Service</a>
<a href="#">Privacy Policy</a>
```
With
```sh
<a href="/about">About!</a>
<a href="/terms-of-service">Terms of Service</a>
<a href="/privacy-policy">Privacy Policy</a>
```
- `MessageForm.js`

From 
```sh
import { json, useParams } from 'react-router-dom';
```
With
```sh
import { useParams } from 'react-router-dom';
```
- `MessageGroupItem.js`

From
```sh
if (params.message_group_uuid == props.message_group.uuid){
```
With
```sh
if (params.message_group_uuid === props.message_group.uuid){
```
- `ProfileForm.js`

From
```sh
  const preview_image_url = URL.createObjectURL(file)

  let data = await res.json();   
```
With
```sh
//const preview_image_url = URL.createObjectURL(file)

 //let data = await res.json();
```
- `ProfileInfo.js`

From
```sh
if (popped == true){
```
With
```sh
if (popped === true){
```
- `ReplyForm.js`

Removed
```sh
import {ReactComponent as BombIcon} from './svg/bomb.svg';
```

Then in the `frontend-react-js/src/pages` directory also updated the following files:
- `ConfirmationPage.js`

From
```sh
 console.log(err)
      if (err.message == 'Username cannot be empty'){
        setErrors("You need to provide an email in order to send Resend Activiation Code")   
      } else if (err.message == "Username/client id combination not found."){
        setErrors("Email is invalid or cannot be found.")   
      }
    }

```
With
```sh
console.log(err)
      if (err.message === 'Username cannot be empty'){
        setErrors("You need to provide an email in order to send Resend Activiation Code")   
      } else if (err.message === "Username/client id combination not found."){
        setErrors("Email is invalid or cannot be found.")   
      }
    }
)   
```
- `RecoverPage.js`

From
```sh
 setErrors('')
 if (password == passwordAgain){
    
 let form;
  if (formState == 'send_code') {
    form = send_code()
  }
  else if (formState == 'confirm_code') {
    form = confirm_code()
  }
  else if (formState == 'success') {
    form = success()
  }
```
With
```sh
 setErrors('')
 {if (password === passwordAgain){

 let form;
  if (formState === 'send_code') {
    form = send_code()
  }
  else if (formState === 'confirm_code') {
    form = confirm_code()
  }
  else if (formState === 'success') {
    form = success()
  }
````
- `SignPage.js`

From
```sh
    .catch(error => { 
      if (error.code == 'UserNotConfirmedException') {
        window.location.href = "/confirm"
      }
      setErrors(error.message)
```
With
```sh
    .catch(error => { 
      if (error.code === 'UserNotConfirmedException') {
        window.location.href = "/confirm"
      }
      setErrors(error.message)
```
Execute the build script to generate a production build of the React app with the embedded environment variables.
```sh
bin/frontend/build
```
Zipped the content of the output files of the build with:
```sh
zip -r build.zip build/
```
### In AWS Console

 **Upload Build Files to CloudFront S3 Bucket**

- Uploaded the zipped  build files to the bucket associated with the root domain.
- Visited the domain to access and view the static frontend website.

### S3 Sync Tool
Created a new file named `sync` in the `bin/frontend` directory.
```sh
#!/usr/bin/env ruby

require 'aws_s3_website_sync'
require 'dotenv'

env_path = File.expand_path('../../../sync.env', __FILE__)
Dotenv.load(env_path)

puts ">>> configuration <<<"
puts "aws_default_region:      #{ENV["AWS_DEFAULT_REGION"]}"
puts "s3_bucket:               #{ENV["SYNC_S3_BUCKET"]}"
puts "distribution_id:         #{ENV["SYNC_CLOUDFRONT_DISTRUBTION_ID"]}"
puts "build_dir:               #{ENV["SYNC_BUILD_DIR"]}"

changeset_path = ENV["SYNC_OUTPUT_CHANGESET_PATH"]
changeset_path = changeset_path.sub(".json","-#{Time.now.to_i}.json")

puts "output_changset_path: #{changeset_path}"
puts "auto_approve:         #{ENV["SYNC_AUTO_APPROVE"]}"

puts "sync =="
AwsS3WebsiteSync::Runner.run(
  aws_access_key_id:     ENV["AWS_ACCESS_KEY_ID"],
  aws_secret_access_key: ENV["AWS_SECRET_ACCESS_KEY"],
  aws_default_region:    ENV["AWS_DEFAULT_REGION"],
  s3_bucket:             ENV["SYNC_S3_BUCKET"],
  distribution_id:       ENV["SYNC_CLOUDFRONT_DISTRUBTION_ID"],
  build_dir:             ENV["SYNC_BUILD_DIR"],
  output_changset_path:  changeset_path,
  auto_approve:          ENV["SYNC_AUTO_APPROVE"],
  silent: "ignore,no_change",
  ignore_files: [
    'stylesheets/index',
    'android-chrome-192x192.png',
    'android-chrome-256x256.png',
    'apple-touch-icon-precomposed.png',
    'apple-touch-icon.png',
    'site.webmanifest',
    'error.html',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon.ico',
    'robots.txt',
    'safari-pinned-tab.svg'
  ]
)
```
Install the required dependencies by executing the command:
```sh
gem install aws_s3_website_sync
gem install dotenv
```
Create a new `erb` file named `sync.env.erb` to generate the environment variables in the `erb` directory.
```sh
SYNC_S3_BUCKET=
SYNC_CLOUDFRONT_DISTRUBTION_ID=
SYNC_BUILD_DIR=<%= ENV['THEIA_WORKSPACE_ROOT'] %>/frontend-react-js/build
SYNC_OUTPUT_CHANGESET_PATH=<%=  ENV['THEIA_WORKSPACE_ROOT'] %>/tmp/sync-changeset.json
SYNC_AUTO_APPROVE=false
```
Updated the `bin/frontend/generate-env` script to add code to generate the `sync.env` file using the `erb/sync.env.erb` template.

This change ensures that the sync.env file uses the correct values for synchronization.
```sh
#!/usr/bin/env ruby
require 'erb'
template = File.read 'erb/frontend-react-js.env.erb'
content = ERB.new(template).result(binding)
filename = 'frontend-react-js.env'
File.write(filename, content)

template = File.read 'erb/sync.env.erb'
content = ERB.new(template).result(binding)
filename = 'sync.env'
File.write(filename, content)
```
Execute the build script, followed by the sync script. Confirm the upload of the contents to S3 and the invalidation of the CloudFront cache.

### GitHub Action CICD - Frontend
Create two new files, Gemfile and Rakefile, in the root of the project.
`Gemfile`
```sh
source 'https://rubygems.org'

git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?("/")
  "https://github.com/#{repo_name}.git"
end

gem 'rake'
gem 'aws_s3_website_sync', tag: '1.0.1'
gem 'dotenv', groups: [:development, :test]
```
Rakefile
```sh
require 'aws_s3_website_sync'
require 'dotenv'

task :sync do
  puts "sync =="
  AwsS3WebsiteSync::Runner.run(
    aws_access_key_id:     ENV["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key: ENV["AWS_SECRET_ACCESS_KEY"],
    aws_default_region:    ENV["AWS_DEFAULT_REGION"],
    s3_bucket:             ENV["S3_BUCKET"],
    distribution_id:       ENV["CLOUDFRONT_DISTRUBTION_ID"],
    build_dir:             ENV["BUILD_DIR"],
    output_changset_path:  ENV["OUTPUT_CHANGESET_PATH"],
    auto_approve:          ENV["AUTO_APPROVE"],
    silent: "ignore,no_change",
    ignore_files: [
      'stylesheets/index',
      'android-chrome-192x192.png',
      'android-chrome-256x256.png',
      'apple-touch-icon-precomposed.png',
      'apple-touch-icon.png',
      'site.webmanifest',
      'error.html',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'favicon.ico',
      'robots.txt',
      'safari-pinned-tab.svg'
    ]
  )
end
```
Create a new file `sync.yaml` in the new folders named `.github/workflows`. 
```sh
name: Sync-Prod-Frontend

on:
  push:
    branches: [prod]
  pull_request:
    branches: [prod]

jobs:
  build:
    name: Statically Build Files
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x]
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: cd frontend-react-js
      - run: npm ci
      - run: npm run build
  deploy:
    name: Sync Static Build to S3 Bucket
    runs-on: ubuntu-latest
    # These permissions are needed to interact with GitHub's OIDC Token endpoint.
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Configure AWS credentials from Test account
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::<AWS_ACCOUNT_ID>:role/CrdSyncRole-Role-CEQM4DAD2DN6
          aws-region: us-east-1
      - uses: actions/checkout@v3
      - name: Set up Ruby
        uses: ruby/setup-ruby@ec02537da5712d66d4d50a0f33b7eb52773b5ed1
        with:
          ruby-version: "3.1"
      - name: Install dependencies
        run: bundle install
      - name: Run tests
        run: bundle exec rake sync
```
Create a CloudFormation (CFN) template to deploy the necessary permissions and other resources required to establish the connection between GitHub actions and AWS.

In lieu of this, created two files, `template.yaml` and `config.toml` in the `aws/cfn/sync` directory.
`template.yaml`
```sh
AWSTemplateFormatVersion: 2010-09-09
Parameters:
  GitHubOrg:
    Description: Name of GitHub organization/user (case sensitive)
    Type: String
  RepositoryName:
    Description: Name of GitHub repository (case sensitive)
    Type: String
    Default: 'aws-bootcamp-cruddur-2023'
  OIDCProviderArn:
    Description: Arn for the GitHub OIDC Provider.
    Default: ""
    Type: String
  OIDCAudience:
    Description: Audience supplied to configure-aws-credentials.
    Default: "sts.amazonaws.com"
    Type: String

Conditions:
  CreateOIDCProvider: !Equals 
    - !Ref OIDCProviderArn
    - ""

Resources:
  Role:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Action: sts:AssumeRoleWithWebIdentity
            Principal:
              Federated: !If 
                - CreateOIDCProvider
                - !Ref GithubOidc
                - !Ref OIDCProviderArn
            Condition:
              StringEquals:
                token.actions.githubusercontent.com:aud: !Ref OIDCAudience
              StringLike:
                token.actions.githubusercontent.com:sub: !Sub repo:${GitHubOrg}/${RepositoryName}:*

  GithubOidc:
    Type: AWS::IAM::OIDCProvider
    Condition: CreateOIDCProvider
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList: 
        - sts.amazonaws.com
      ThumbprintList:
        - 6938fd4d98bab03faadb97b34396831e3780aea1

Outputs:
  Role:
    Value: !GetAtt Role.Arn
```
`config.toml`
```sh
[deploy]
bucket = ''
region = ''
stack_name = 'CrdSyncRole'

[parameters]
GitHubOrg = ''
RepositoryName = 'aws-bootcamp-cruddur-2023'
OIDCProviderArn = ''
```
Create a new script file `sync` to deploy this template in the `bin/cfn` directory.
```sh
#! /usr/bin/bash

set -e # stop execution if anything fails

abs_template_filepath="$ABS_PATH/aws/cfn/sync/template.yaml"
TemplateFilePath=$(realpath --relative-base="$PWD" "$abs_template_filepath")

abs_config_filepath="$ABS_PATH/aws/cfn/sync/config.toml"
ConfigFilePath=$(realpath --relative-base="$PWD" "$abs_config_filepath")

BUCKET=$(cfn-toml key deploy.bucket -t $ConfigFilePath)
REGION=$(cfn-toml key deploy.region -t $ConfigFilePath)
STACK_NAME=$(cfn-toml key deploy.stack_name -t $ConfigFilePath)
PARAMETERS=$(cfn-toml params v2 -t $ConfigFilePath)

cfn-lint $TemplateFilePath

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --s3-bucket "$BUCKET" \
  --s3-prefix sync \
  --region $REGION \
  --template-file $TemplateFilePath \
  --no-execute-changeset \
  --tags group=cruddur-sync \
  --parameter-overrides $PARAMETERS \
  --capabilities CAPABILITY_NAMED_IAM
```
Perform `bundle install` or `bundle update --bundler` before proceeding with the stack deployment using `bin/cfn/sync`.

Updated `gitpod.yml` file with the bundle update.
```sh
  - name: cfn
    before: |
      bundle update --bundler
      pip install cfn-lint
      cargo install cfn-guard
      gem install cfn-toml
```
**Note**
- Create a policy role for the s3 bucket after the deployment with the following:
```sh
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::bennieo.me/*",
                "arn:aws:s3:::bennieo.me"
            ]
        }
    ]
}
```
Update the `role-to-assume` in the `sync.yaml` file in the `.gitHub/workflows` directory with the ARN (Amazon Resource Name) of this role.

## Reconnect Database and Postgres Confirmation Lambda

Updated `template.yaml` in the `aws/cfn/cicd` directory.

Modified the ServiceName parameter to explicitly specify the value as "backend-flask" instead of using a cross-stack reference, so that the service stack when necessary can be torn down independently without it affecting the `CICD` being torn down as well.

The cross-stack reference to ${ServiceStack}ServiceName has been commented out.
 ```sh
                ClusterName: 
                  Fn::ImportValue:
                    !Sub ${ClusterStack}ClusterName
                # We decided not to use a cross-stack reference so we can
                # tear down a service independently    
                ServiceName: backend-flask
                  # Fn::ImportValue:
                   # !Sub ${ServiceStack}ServiceName
  CodePipelineRole:
    Type: AWS::IAM::Role
    Properties:
 ```

Updated `aws/cfn/service/template.yaml` by increasing the Timeout value from 5 to 6 for the health check in the service definition.
```sh
HealthCheck:
            Command:
              - 'CMD-SHELL'
              - 'python /backend-flask/bin/health-check'
            Interval: 30
            Timeout: 6
            Retries: 3
            StartPeriod: 60
```

Updated `backend-flask/app.py` file

From
```sh
 rollbar_access_token = os.getenv('ROLLBAR_ACCESS_TOKEN')
 @app.before_first_request
   def init_rollbar():
```
With
```sh
rollbar_access_token = os.getenv('ROLLBAR_ACCESS_TOKEN')
with app.app_context():
  def init_rollbar():
```

Updated `docker-compose.yml` file

From
```sh
 backend-flask:
    env_file:
      - backend-flask.env
    build: ./backend-flask
```
With
```sh
 backend-flask:
    env_file:
      - backend-flask.env
    build: 
       context:  ./backend-flask
       dockerfile: Dockerfile.prod
```

### Reconnect DB
- Configure the DB URL and update the security group (SG) for the new RDS DB.
- Perform a schema load on the RDS.
- Execute the following command to perform migrations on the production DB:
```sh
CONNECTION_URL=$PROD_CONNECTION_URL ./bin/db/migrate
```

### Fix CloudFront distribution for SPA

Update the Distribution resource in the frontend template.yaml file to include an error page:
```sh
CustomErrorResponses:
	- ErrorCode: 403
	  ResponseCode: 200
	  ResponsePagePath: /index.html
```

### Update Post Confirmation Lambda

Updated `cruddur-post-confirrmation.py`file in the ` aws/lambdas` directory with:
```sh
   import json
   import psycopg2
   import os


def lambda_handler(event, context):
    user = event['request']['userAttributes']
    user_display_name = user['name']
    user_email = user['email']
    user_handle = user['preferred_username']
    user_cognito_id = user['sub']
    
    try:
        sql = """
            INSERT INTO public.users (
                display_name, 
                email,
                handle, 
                cognito_user_id
            ) 
            VALUES (%s, %s, %s, %s)
        """
        
        params = [
            user_display_name,
            user_email,
            user_handle,
            user_cognito_id
        ]
        
        with psycopg2.connect(os.getenv('CONNECTION_URL')) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
            conn.commit()

    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    else:
        print("Data inserted successfully")
    finally:
        print('Database connection closed.')
    
    return event
```
### In AWS Console
- Also updated the `cruddur-post-confirrmation.py` lambda function as shown above.
- Updated Connection Url Env Var of Post confirmation lambda to use the new DB Connection URL.
- Updated VPC for lambda to use the VPC created for cruddur.
- Chose Public Subnets attached to the VPC.
- Created a new security group `CognitoLambdaSG` with outbound all rule for the Post confirmation lambda.
- In `CrdDbRDSSG`, added a new inbound rule for Postgresql, set source to Post Confirmation lambda SG.
- Updated the lambda VPC SG with this new CognitoPostConf SG.
- Waited for the update to finish.
- Login and try posting a crud.

## Fix CORS to Use Domain Name for Web-app
Updated `config.toml` file in the `aws/cfn/service` directory for the `EnvFrontendUrl` and `EnvBackendUrl` to use the exact values with https:// instead of *. Then used parameters to specify these values.
```sh
[deploy]
bucket = ''
region = 'AWS_DEFAULT_REGION
stack_name = 'CrdSrvBackendFlask'

[parameters]
EnvFrontendUrl = 'https://DOMAIN_NAME'
EnvBackendUrl = 'https://api.DOMAIN_NAME'
```
Updated the deploy script to include the necessary parameters by uncommenting the parameter variable assignment in the `bin/cfn/service`.

## Ensuring CI/CD Pipeline and Create Activity Works
### Fix Activities user_handle

Updated `app.py` file in the `backend-flask` directory in order for the user_handle not to be hardcoded.Added token verification using cognito_jwt_token.verify() to authenticate the request.
Replaced the user_handle variable with cognito_user_id in the CreateActivity.run() function call.
```sh
@app.route("/api/activities", methods=['POST','OPTIONS'])
@cross_origin()
def data_activities():
  access_token = extract_access_token(request.headers)
  try:
    claims = cognito_jwt_token.verify(access_token)
    cognito_user_id = claims['sub']
    message = request.json['message']
    ttl = request.json['ttl']
    model = CreateActivity.run(message, cognito_user_id, ttl)
    if model['errors'] is not None:
      return model['errors'], 422
    else:
      return model['data'], 200
  except TokenVerifyError as e:
    # unauthenicatied request
    app.logger.debug(e)
    return {}, 401
```

Updated `create_activity.py` file in the `backend-flask/services` directory to to use `cognito_user_id` instead of `user_handle`.
```sh
from datetime import datetime, timedelta, timezone

from lib.db import db

class CreateActivity:
    def run(message, cognito_user_id, ttl):
        model = {"errors": None, "data": None}

        now = datetime.now(timezone.utc).astimezone()

        if ttl == "30-days":
            ttl_offset = timedelta(days=30)
        elif ttl == "7-days":
            ttl_offset = timedelta(days=7)
        elif ttl == "3-days":
            ttl_offset = timedelta(days=3)
        elif ttl == "1-day":
            ttl_offset = timedelta(days=1)
        elif ttl == "12-hours":
            ttl_offset = timedelta(hours=12)
        elif ttl == "3-hours":
            ttl_offset = timedelta(hours=3)
        elif ttl == "1-hour":
            ttl_offset = timedelta(hours=1)
        else:
            model["errors"] = ["ttl_blank"]

        if cognito_user_id == None or len(cognito_user_id) < 1:
            model["errors"] = ["cognito_user_id_blank"]

        if message == None or len(message) < 1:
            model["errors"] = ["message_blank"]
        elif len(message) > 280:
            model["errors"] = ["message_exceed_max_chars"]

        if model["errors"]:
            model["data"] = {"cognito_user_id": cognito_user_id, "message": message}
        else:
            expires_at = now + ttl_offset
            uuid = CreateActivity.create_activity(cognito_user_id, message, expires_at)

            object_json = CreateActivity.query_object_activity(uuid)
            model["data"] = object_json
        return model

    def create_activity(cognito_user_id, message, expires_at):
        sql = db.template("activities", "create")
        uuid = db.query_commit(
            sql,
            {
                "cognito_user_id": cognito_user_id,
                "message": message,
                "expires_at": expires_at,
            },
        )
        return uuid

    def query_object_activity(uuid):
        sql = db.template("activities", "object")
        return db.query_object_json(sql, {"uuid": uuid})
```

Also updated `create.sql` file in the `backend-flask/db/sql/activities` directory to also use cognito_user_id instead of user_handle 
```sh
VALUES (
  (SELECT uuid 
    FROM public.users 
    WHERE users.cognito_user_id = %(cognito_user_id)s
    LIMIT 1
  ),
  %(message)s,
```
Updated `ActivityForm.js` file in the `frontend-react-js/src/components` directory:
```sh
import React from "react";
import process from 'process';
import {ReactComponent as BombIcon} from './svg/bomb.svg';
import {getAccessToken} from '../lib/CheckAuth';

    try {
      const backend_url = `${process.env.REACT_APP_BACKEND_URL}/api/activities`
      console.log('onsubmit payload', message)
      await getAccessToken()
      const access_token = localStorage.getItem("access_token")
      const res = await fetch(backend_url, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
```
In `seed.sql` file in the `backend-flask/db` directory, added a new user.

**Note**
- To update changes in DB, execute this command `./bin/db/setup`.
- In real world or system, there should be different cognito user pool for production and development.

### Fix CFN CICD Template
 Renamed the CodeBuildBakeImageStack stack to CodeBuild and updated this in both the `template.yaml` and `codebuild.yaml` files in the `aws/cfn/cicd` directory.
 
Updated `config.toml` file in the `aws/cfn/cicd` directory to include:
```sh
BuildSpec = 'backend-flask/buildspec.yml'
```
Updated `codebuild.yaml` in the `aws/cfn/cicd/nested` directory with:
```sh
  BuildSpec:
    Type: String
    Default: 'buildspec.yaml'
  ArtifactBucketName:
    Type: String

Outputs:
  CodeBuildProjectName:
    Description: "CodeBuildProjectName"
    Value: !Ref CodeBuild
```
Also did same for `template.yaml` file in the `aws/cfn/cicd` directory.
```sh
 Parameters:
        ArtifactBucketName: !Ref ArtifactBucketName
        BuildSpec: !Ref BuildSpec
```

Add `codebuild:BatchGetBuilds` to codebuild permissions in template.yaml

Add this permission to both pipeline `template.yaml` and `codebuild.yaml` template.
```sh
      Policies:
        - PolicyName: !Sub ${AWS::StackName}S3ArtifactAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Action:
                - s3:*
                Effect: Allow
                Resource:
                  - !Sub arn:aws:s3:::${ArtifactBucketName}
                  - !Sub arn:aws:s3:::${ArtifactBucketName}/*  
```

## Refactor JWT To Use a Decorator in Flask App

Using a Decorator helps to reduce the verbosity of codes but caution should be used while applying this for future reference to the code and for easy understanding by others who maybe working with the code.

### Reply Closing On Click

To enable closing reply-popup form in the crud messages, this function is added to the `ReplyForm.js` file in the `frontend-react-js/src/components` directory:
```sh
const close = (event) => {
    if (event.target.classList.contains("reply_popup")) {
      props.setPopped(false);
    }
  };
```
Added the reply_popup class to the wrapping div to apply styling for the reply popup.
```sh
  if (props.popped === true) {
    return (
      <div className="popup_form_wrap reply_popup" onClick={close}>
        <div className="popup_form">
          <div className="popup_heading">
          </div>
```

### JWT Auth Decorator
The following code is added to the `cognito_jwt_token.py` file in the `backend-flask/lib` directory:
```sh
from functools import wraps, partial
from flask import request, g
import os

def jwt_required(f=None, on_error=None):
    if f is None:
        return partial(jwt_required, on_error=on_error)

    @wraps(f)
    def decorated_function(*args, **kwargs):
        cognito_jwt_token = CognitoJwtToken(
            user_pool_id=os.getenv("AWS_COGNITO_USER_POOL_ID"), 
            user_pool_client_id=os.getenv("AWS_COGNITO_USER_POOL_CLIENT_ID"),
            region=os.getenv("AWS_DEFAULT_REGION")
        )
        access_token = extract_access_token(request.headers)
        try:
            claims = cognito_jwt_token.verify(access_token)
            # is this a bad idea using a global?
            g.cognito_user_id = claims['sub']  # storing the user_id in the global g object
        except TokenVerifyError as e:
            # unauthenticated request
            app.logger.debug(e)
            if on_error:
                on_error(e)
            return {}, 401
        return f(*args, **kwargs)
    return decorated_function
```

 While the `app.py` file is updated in the `backend-flask` directory, in which the `jwt_required decorator` is imported and the following routes are updated with it as well:
```sh
from flask import request, g
from lib.cognito_jwt_token import jwt_required


@app.route("/api/message_groups", methods=['GET'])
@jwt_required()
def data_message_groups():
  model = MessageGroups.run(cognito_user_id=g.cognito_user_id)
  if model['errors'] is not None:
    return model['errors'], 422
  else:
    return model['data'], 200


@app.route("/api/messages/<string:message_group_uuid>", methods=['GET'])
@jwt_required()
def data_messages(message_group_uuid):
  model = Messages.run(
      cognito_user_id=g.cognito_user_id,
      message_group_uuid=message_group_uuid
    )
  if model['errors'] is not None:
    return model['errors'], 422
  else:
    return model['data'], 200


@app.route("/api/messages", methods=['POST','OPTIONS'])
@cross_origin()
@jwt_required()
def data_create_message():
  message_group_uuid   = request.json.get('message_group_uuid',None)
  user_receiver_handle = request.json.get('handle',None)
  message = request.json['message']
  if message_group_uuid == None:
    # Create for the first time
    model = CreateMessage.run(
      mode="create",
      message=message,
      cognito_user_id=g.cognito_user_id,
      user_receiver_handle=user_receiver_handle
    )
  else:
    # Push onto existing Message Group
    model = CreateMessage.run(
      mode="update",
      message=message,
      message_group_uuid=message_group_uuid,
      cognito_user_id=g.cognito_user_id
    )
  if model['errors'] is not None:
    return model['errors'], 422
  else:
    return model['data'], 200

@app.route("/api/activities/home", methods=['GET'])
#@xray_recorder.capture('activities_home')
@jwt_required(on_error=default_home_feed)
def data_home():
  data = HomeActivities.run(cognito_user_id=g.cognito_user_id)
  return data, 200


@app.route("/api/activities", methods=['POST','OPTIONS'])
@cross_origin()
@jwt_required()
def data_activities():
  message = request.json['message']
  ttl = request.json['ttl']
  model = CreateActivity.run(message, g.cognito_user_id, ttl)
  if model['errors'] is not None:
    return model['errors'], 422
  else:
    return model['data'], 200

@app.route("/api/profile/update", methods=['POST','OPTIONS'])
@cross_origin()
@jwt_required()
def data_update_profile():
  bio          = request.json.get('bio',None)
  display_name = request.json.get('display_name',None)
  model = UpdateProfile.run(
    cognito_user_id=g.cognito_user_id,
    bio=bio,
    display_name=display_name
  )
  if model['errors'] is not None:
    return model['errors'], 422
  else:
    return model['data'], 200
```

## Refactor App.py
This function is used to refactor model error checking;
```sh
def model_json(model):
    if model["errors"] is not None:
        return model["errors"], 422
    else:
        return model["data"], 200
```
Created new files for different libraries and modules in the `backend-flask/lib` directory for the refactoring. They include:
- cloudwatch.py
```sh
import watchtower
import logging
from flask import request

# Configuring Logger to Use CloudWatch
# LOGGER = logging.getLogger(__name__)
# LOGGER.setLevel(logging.DEBUG)
# console_handler = logging.StreamHandler()
# cw_handler = watchtower.CloudWatchLogHandler(log_group='cruddur')
# LOGGER.addHandler(console_handler)
# LOGGER.addHandler(cw_handler)
# LOGGER.info("test log")

def init_cloudwatch(response):
  timestamp = strftime('[%Y-%b-%d %H:%M]')
  LOGGER.error('%s %s %s %s %s %s', timestamp, request.remote_addr, request.method, request.scheme, request.full_path, response.status)
  return response
```
- cors.py
```sh
from flask_cors import CORS
import os

def init_cors(app):
  frontend = os.getenv('FRONTEND_URL')
  backend = os.getenv('BACKEND_URL')
  origins = [frontend, backend]
  cors = CORS(
    app, 
    resources={r"/api/*": {"origins": origins}},
    headers=['Content-Type', 'Authorization'], 
    expose_headers='Authorization',
    methods="OPTIONS,GET,HEAD,POST"
  )
```
- honeycomb.py
```sh
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)

# OTEL ----------
# Show this in the logs within the backend-flask app (STDOUT)
#simple_processor = SimpleSpanProcessor(ConsoleSpanExporter())
#provider.add_span_processor(simple_processor)

trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

def init_honeycomb(app):
  FlaskInstrumentor().instrument_app(app)
  RequestsInstrumentor().instrument()
```
- rollbar.py
```sh
rom flask import current_app as app
from flask import got_request_exception
from time import strftime
import os
import rollbar
import rollbar.contrib.flask

def init_rollbar():
  rollbar_access_token = os.getenv('ROLLBAR_ACCESS_TOKEN')
  rollbar.init(
      # access token
      rollbar_access_token,
      # environment name
      'production',
      # server root directory, makes tracebacks prettier
      root=os.path.dirname(os.path.realpath(__file__)),
      # flask already sets up logging
      allow_logging_basic_config=False)
  # send exceptions from `app` to rollbar, using flask's signal system.
  got_request_exception.connect(rollbar.contrib.flask.report_exception, app)
  return rollbar
```
- xray.py
```sh
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware

def int_xray():
  xray_url = osgetenv("AWS_XRAY_URL")
  xray_recorder.configure(service='backend-flask', dynamic_naming=xray_url)
  XRayMiddleware(app, xray_recorder)
```
Updated `NotificationsFeedPage.js` in the `frontend-react-js/src/pages` directory with:
```sh
import {checkAuth, getAccessToken} from 'lib/CheckAuth';

const loadData = async () => {
    try {
      const backend_url = `${process.env.REACT_APP_BACKEND_URL}/api/activities/notifications`
      await getAccessToken()
      const access_token = localStorage.getItem("access_token")
      const res = await fetch(backend_url, {
        headers: {
          Authorization: `Bearer ${access_token}`
        },
        method: "GET"
      });
      let resJson = await res.json();

      React.useEffect(()=>{
      //prevents double call
      if (dataFetchedRef.current) return;
      dataFetchedRef.current = true;

      loadData();
      checkAuth(setUser);
     }, [])
```

## Refactor Flask Routes
Created a new file `helper.py` in the `backend-flask/lib` directory.
```sh
def model_json(model):
  if model['errors'] is not None:
    return model['errors'], 422
  else:
    return model['data'], 200
```
Updated `rollbar.py` file with:
```sh
def init_rollbar(app):
```
Created the following new files in a new directory `backend-flask/routes`.
- activities.py
```sh
## flask
from flask import request, g

## decorators
from aws_xray_sdk.core import xray_recorder
from lib.cognito_jwt_token import jwt_required
from flask_cors import cross_origin

## services
from services.home_activities import *
from services.notifications_activities import *
from services.create_activity import *
from services.search_activities import *
from services.show_activity import *
from services.create_reply import *

## helpers
from lib.helpers import model_json

def load(app):
  def default_home_feed(e):
    app.logger.debug(e)
    app.logger.debug("unauthenicated")
    data = HomeActivities.run()
    return data, 200

  @app.route("/api/activities/home", methods=['GET'])
  #@xray_recorder.capture('activities_home')
  @jwt_required(on_error=default_home_feed)
  def data_home():
    data = HomeActivities.run(cognito_user_id=g.cognito_user_id)
    return data, 200

  @app.route("/api/activities/notifications", methods=['GET'])
  def data_notifications():
    data = NotificationsActivities.run()
    return data, 200

  @app.route("/api/activities/search", methods=['GET'])
  def data_search():
    term = request.args.get('term')
    model = SearchActivities.run(term)
    return model_json(model)

  @app.route("/api/activities", methods=['POST','OPTIONS'])
  @cross_origin()
  @jwt_required()
  def data_activities():
    message = request.json['message']
    ttl = request.json['ttl']
    model = CreateActivity.run(message, g.cognito_user_id, ttl)
    return model_json(model)

  @app.route("/api/activities/<string:activity_uuid>", methods=['GET'])
  @xray_recorder.capture('activities_show')
  def data_show_activity(activity_uuid):
    data = ShowActivity.run(activity_uuid=activity_uuid)
    return data, 200

  @app.route("/api/activities/<string:activity_uuid>/reply", methods=['POST','OPTIONS'])
  @cross_origin()
  def data_activities_reply(activity_uuid):
    user_handle  = 'andrewbrown'
    message = request.json['message']
    model = CreateReply.run(message, user_handle, activity_uuid)
    return model_json(model) 
```
- general.py
```sh
from flask import request, g

def load(app):
  @app.route('/api/health-check')
  def health_check():
    return {'success': True, 'ver': 1}, 200

  #@app.route('/rollbar/test')
  #def rollbar_test():
  #  g.rollbar.report_message('Hello World!', 'warning')
  #  return "Hello World!" 
```
- messages.py
```sh
## flask
from flask import request, g

## decorators
from aws_xray_sdk.core import xray_recorder
from lib.cognito_jwt_token import jwt_required
from flask_cors import cross_origin

## services
from services.message_groups import MessageGroups
from services.messages import Messages
from services.create_message import CreateMessage

## helpers
from lib.helpers import model_json

def load(app):
  @app.route("/api/message_groups", methods=['GET'])
  @jwt_required()
  def data_message_groups():
    model = MessageGroups.run(cognito_user_id=g.cognito_user_id)
    return model_json(model)

  @app.route("/api/messages/<string:message_group_uuid>", methods=['GET'])
  @jwt_required()
  def data_messages(message_group_uuid):
    model = Messages.run(
        cognito_user_id=g.cognito_user_id,
        message_group_uuid=message_group_uuid
      )
    return model_json(model)

  @app.route("/api/messages", methods=['POST','OPTIONS'])
  @cross_origin()
  @jwt_required()
  def data_create_message():
    message_group_uuid   = request.json.get('message_group_uuid',None)
    user_receiver_handle = request.json.get('handle',None)
    message = request.json['message']
    if message_group_uuid == None:
      # Create for the first time
      model = CreateMessage.run(
        mode="create",
        message=message,
        cognito_user_id=g.cognito_user_id,
        user_receiver_handle=user_receiver_handle
      )
    else:
      # Push onto existing Message Group
      model = CreateMessage.run(
        mode="update",
        message=message,
        message_group_uuid=message_group_uuid,
        cognito_user_id=g.cognito_user_id
      )
    return model_json(model)
```
- users.py
```sh
## flask
from flask import request, g

## decorators
from aws_xray_sdk.core import xray_recorder
from lib.cognito_jwt_token import jwt_required
from flask_cors import cross_origin

## services
from services.users_short import UsersShort
from services.update_profile import UpdateProfile
from services.user_activities import UserActivities

## helpers
from lib.helpers import model_json

def load(app):
  @app.route("/api/activities/@<string:handle>", methods=['GET'])
  #@xray_recorder.capture('activities_users')
  def data_handle(handle):
    model = UserActivities.run(handle)
    return return_model(model)

  @app.route("/api/users/@<string:handle>/short", methods=['GET'])
  def data_users_short(handle):
    data = UsersShort.run(handle)
    return data, 200

  @app.route("/api/profile/update", methods=['POST','OPTIONS'])
  @cross_origin()
  @jwt_required()
  def data_update_profile():
    bio          = request.json.get('bio',None)
    display_name = request.json.get('display_name',None)
    model = UpdateProfile.run(
      cognito_user_id=g.cognito_user_id,
      bio=bio,
      display_name=display_name
    )
    return model_json(model)
```





