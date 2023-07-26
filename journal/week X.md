# Week X - Cleanup

With our AWS Cloud Project Bootcamp coming to a close, Week X was created to cleanup our application and get most of the features into a working state.

[Sync Tool for Static Website Hosting](#Sync-Tool-for-Static-Website-Hosting)





### Sync Tool for Static Website Hosting

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
Add this to the frontend generate-env script.

template = File.read 'erb/sync.env.erb'
content = ERB.new(template).result(binding)
filename = "sync.env"
File.write(filename, content)
Run the script to generate the sync.env file in the root directory.
```
Execute the static-build script, followed by the sync script. Confirm the upload of the contents to S3 and the invalidation of the CloudFront cache.

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


  

 









