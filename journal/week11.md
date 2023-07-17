# Week 11 — CloudFormation Part 2

This week we are deploying our resources using AWS SAM.

[Implement DynamoDB DynamoDB Streams Lambda using SAM CFN ](#Implement-DynamoDB-DynamoDB-Streams-Lambda-using-SAM-CFN)

## Implement DynamoDB DynamoDB Streams Lambda using SAM CFN

**What is AWS SAM?** AWS SAM (Serverless Application Model) is an open-source framework provided by Amazon Web Services (AWS) that simplifies the deployment and management of serverless applications on AWS Cloud. It is an extension of AWS CloudFormation, specifically designed for building serverless applications using AWS Lambda, Amazon API Gateway, and other serverless services.

In brief, AWS SAM allows developers to define their serverless application's infrastructure and resources as code using a simplified YAML or JSON syntax. It provides a set of high-level abstractions and shorthand notations to streamline the deployment process. With AWS SAM, developers can define functions, APIs, event sources, and more in a declarative manner, enabling easier development, testing, and deployment of serverless applications on AWS.


Started by first installing AWS SAM and adding the installation code to the `gitpod.yml` file.
```sh
tasks:
  - name: aws-sam
    init: |
      cd /workspace
       wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
       unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
       sudo ./sam-installation/install
       sudo rm -rf ./aws-sam-cli-linux-x86_64.zip
       sudo rm -rf ./aws-sam-cli-linux-x86_64
       cd $THEIA_WORKSPACE_ROOT
```

Create a new file and folder `ddb/template.yaml`.
```sh
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Description: | 
  - DynamoDB Table
  - DynamoDB Stream
  
Parameters:
  PythonRuntime:
    Type: String
    Default: python3.10
  MemorySize:
    Type: String
    Default:  128
  Timeout:
    Type: Number
    Default: 3
Resources:
  DynamoDBTable:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html
    Type: AWS::DynamoDB::Table
    Properties: 
      AttributeDefinitions: 
        - AttributeName: message_group_uuid
          AttributeType: S
        - AttributeName: pk
          AttributeType: S
        - AttributeName: sk
          AttributeType: S
      TableClass: STANDARD 
      KeySchema: 
        - AttributeName: pk
          KeyType: HASH
        - AttributeName: sk
          KeyType: RANGE
      ProvisionedThroughput: 
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
      BillingMode: PROVISIONED
      DeletionProtectionEnabled: true
      GlobalSecondaryIndexes:
        - IndexName: message-group-sk-index
          KeySchema:
            - AttributeName: message_group_uuid
              KeyType: HASH
            - AttributeName: sk
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
          ProvisionedThroughput: 
            ReadCapacityUnits: 5
            WriteCapacityUnits: 5
      StreamSpecification:
        StreamViewType: NEW_IMAGE
  ProcessDynamoDBStream:
    # https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      PackageType: Zip
      Handler: lambda_handler
      Runtime: !Ref PythonRuntime
      Role: !GetAtt ExecutionRole.Arn
      MemorySize: !Ref MemorySize
      Timeout: !Ref Timeout
      Events:
        Stream:
          Type: DynamoDB
          Properties:
            Stream: !GetAtt DynamoDBTable.StreamArn
            # TODO - Does our Lambda handle more than record?
            BatchSize: 1
            # https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-dynamodb.html#sam-function-dynamodb-startingposition
            # TODO - This this the right value?
            StartingPosition: LATEST
  LambdaLogGroup:
    Type: "AWS::Logs::LogGroup"
    Properties:
      LogGroupName: "/aws/lambda/cruddur-messaging-stream"
      RetentionInDays: 14
  LambdaLogStream:
    Type: "AWS::Logs::LogStream"
    Properties:
      LogGroupName: !Ref LambdaLogGroup
      LogStreamName: "LambdaExecution"
  ExecutionRole:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html
    Type: AWS::IAM::Role
    Properties:
      RoleName: CruddurDdbStreamExecRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: 'Allow'
            Principal:
              Service: 'lambda.amazonaws.com'
            Action: 'sts:AssumeRole'
      Policies:
        - PolicyName: "LambdaExecutionPolicy"
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: "Allow"
                Action: "logs:CreateLogGroup"
                Resource: !Sub "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*"
              - Effect: "Allow"
                Action:
                  - "logs:CreateLogStream"
                  - "logs:PutLogEvents"
                Resource: !Sub "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:${LambdaLogGroup}:*"
              - Effect: "Allow"
                Action:
                  - "ec2:CreateNetworkInterface"
                  - "ec2:DeleteNetworkInterface"
                  - "ec2:DescribeNetworkInterfaces"
                Resource: "*"
              - Effect: "Allow"
                Action:
                  - "lambda:InvokeFunction"
                Resource: "*"
              - Effect: "Allow"
                Action:
                  - "dynamodb:DescribeStream"
                  - "dynamodb:GetRecords"
                  - "dynamodb:GetShardIterator"
                  - "dynamodb:ListStreams"
                Resource: "*"
```
**Note**
- Transform helps to add new functionality or write shorthand for existing code in SAM.
- Include -s3-prefix <prefix_name> in all CFN deploy scripts to organize artifacts in a dedicated folder.

Create a `config.toml` file in the `ddb` directory. This is different from config.toml used in cfn-toml because it's actually SAM that was converted this way for consistency and easier usage.
```sh
version=0.1

[default.build.parameters]
region = "AWS_DEFAULT_REGION"

[default.package.parameters]
region = "AWS_DEFAULT_REGION"

[default.deploy.parameters]
region = "AWS_DEFAULT_REGION"
```

Move and convert the `cruddur-messaging-stream.py` file to a folder `cruddur-message-stream` and rename the file as `lambda_function.py` in the `ddb` directory.

Create SAM Build, Package, and Deploy scripts files within the `ddb` directory.
Build
```sh
#! /usr/bin/env bash
set -e # stop the execution of the script if it fails

FUNC_DIR="/workspace/aws-bootcamp-cruddur-2023/ddb/cruddur-messaging-stream/"
TEMPLATE_PATH="/workspace/aws-bootcamp-cruddur-2023/ddb/template.yaml"
CONFIG_PATH="/workspace/aws-bootcamp-cruddur-2023/ddb/config.toml"

sam validate -t $TEMPLATE_PATH

echo "== build"
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html
# --use-container
# use container is for building the lambda in a container
# it's still using the runtimes and its not a custom runtime
sam build \
--use-container \
--config-file $CONFIG_PATH \
--template $TEMPLATE_PATH \
--base-dir $FUNC_DIR
#--parameter-overrides
```

Package
```sh
#! /usr/bin/env bash
set -e # stop the execution of the script if it fails

ARTIFACT_BUCKET="cfn-artifacts-0pagu5"
TEMPLATE_PATH="/workspace/aws-bootcamp-cruddur-2023/.aws-sam/build/template.yaml"
OUTPUT_TEMPLATE_PATH="/workspace/aws-bootcamp-cruddur-2023/.aws-sam/build/packaged.yaml"
CONFIG_PATH="/workspace/aws-bootcamp-cruddur-2023/ddb/config.toml"

echo "== package"
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-package.html
sam package \
  --s3-bucket $ARTIFACT_BUCKET \
  --config-file $CONFIG_PATH \
  --output-template-file $OUTPUT_TEMPLATE_PATH \
  --template-file $TEMPLATE_PATH \
  --s3-prefix "ddb"
```

Deploy
```sh
#! /usr/bin/env bash
set -e # stop the execution of the script if it fails

PACKAGED_TEMPLATE_PATH="/workspace/aws-bootcamp-cruddur-2023/.aws-sam/build/packaged.yaml"
CONFIG_PATH="/workspace/aws-bootcamp-cruddur-2023/ddb/config.toml"

echo "== deploy"
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html
sam deploy \
  --template-file $PACKAGED_TEMPLATE_PATH  \
  --config-file $CONFIG_PATH \
  --stack-name "CrdDdb" \
  --tags group=cruddur-ddb \
  --no-execute-changeset \
  --capabilities "CAPABILITY_NAMED_IAM"
```








