# Week 8 — Serverless Image Processing

This week we will be working with CDK.

### CDK
**What Is CDK?:**  CDK stands for Cloud Development Kit.It is an open-source software development framework provided by Amazon Web Services (AWS) that allows developers to define cloud infrastructure resources using familiar programming languages such as TypeScript, Python, Java, and C#.

With CDK, developers can write code to define their infrastructure as code (IaC) using high-level constructs and patterns. It abstracts the low-level details of provisioning and configuring AWS resources and provides a more intuitive and efficient way to manage infrastructure.

Simply put, CDK allows developers to write code to define their cloud infrastructure using programming languages they are already familiar with. It helps automate the provisioning and management of AWS resources, making it easier and more efficient to build and deploy applications in the cloud.

### CDK Implementation
This section will illustrate the steps to create a CDK project.

#### New Directory

In order to contain our cdk pipeline, created a new top level directory called `thumbing-severless-cdk` :
```sh
gipod/workspace/aws-bootcamp-cruddur-2023 $
mkdir thumbing-serverless-cdk
cd thumbing-serverless-cdk
```
#### Install CDK globally

This is so we can use the AWS CDK CLI for anywhere.
```sh
npm install aws-cdk -g
```
 Added the the install to the gitpod.yml task file:
 ```sh
 - name: cdk
    before: |
      cd thumbing-serverless-cdk
      cp .env.example .env
      npm i
      npm install aws-cdk -g
      cdk --version
```
#### Initialize a new project
To initialise a new project within the folder we created type:
```sh
cdk init app --language typescript
```
Note instead of typescript, one can choose another language supported by cdk such JavaScript, TypeScript, Python, Java, C#.

To work with the cdkfile, go to the file inside the `lib/thumbing-serverless-cdk-stack.ts`. This is where all the libraries are imported and codes for whatever 
we want to deploy written.
#### Provsioning an S3Bucket 
Inside the `thumbing-serverless-cdk-stack.ts` file, the following code is added after uncommenting the commented parts to create an S3 bucket:
```sh
import * as s3 from 'aws-cdk-lib/aws-s3';

    // The code that defines your stack goes here
    const bucketName: string = process.env.THUMBING_BUCKET_NAME as string;
    const bucket = this.createBucket(bucketName);
  }

createBucket(bucketName: string): s3.IBucket {
  const bucket = new s3.Bucket(this, 'ThumbingBucket', {
    bucketName: bucketName,
    removalPolicy: cdk.RemovalPolicy.DESTROY
  });
  return bucket;
}

}

```
To generate the AWS CloudFormation template for the CDK application run the command:
```sh
cdk synth
```
The `cdk synth` short for synthesize command scans the CDK application code, including all the defined constructs and their dependencies, and generates the corresponding CloudFormation template in YAML or JSON format. By running cdk synth, one can validate and review the generated CloudFormation template before actually deploying the infrastructure. It allows one to inspect the resulting template, check resource configurations, review dependencies, and ensure that the CDK application code is correctly translated into the desired infrastructure definition.

It is not compulsory one does this before deploying only that it is best practice. It is also a great tool for troubleshooting so one can confirm that you are getting what you expect.

**Note**
- To update the code, you run the command again the folder cdk.out will be updated.
- Infrastructure stack can be deployed and new resources added on top, but one can face potential issues when handling some resources such as Dynamodb for instance, when it is renamed and there is some data on it, this will delete the entire Dynamodb resource and create a new one.
- Hence, one has to be careful when running consistent deploys and later renaming it especially when deploying in a production environment because it can wipe out the entire data.

Before launching or deploying the CDK, you need to boostrap.

Bootstrapping is the process of provisioning resources for the AWS CDK before you can deploy AWS CDK apps into an AWS environment. An AWS environment is a combination of an AWS account and Region. Bootstrapping is done only once if using just a single region but for multiple regions, it is done several times.
```sh
For a single region
cdk bootstrap "aws://AWS_ACCOUNt_ID/AWS_DEFAULT_REGION"

For multiple regions
cdk bootstrap aws://AWS_ACCOUNT_ID/AWS_DEFAULT_REGION AWS_ACCOUNT_ID/name of another REGION
```
### Creating Lambda
The next step is to add lambda to our stack.
From the folder, run the following command to install the dotenv dependency to import the file .env
```sh
 npm i dotenv
 ```
Load the Environment variables for the lambda
```sh
const uploadsBucketName: string = process.env.UPLOADS_BUCKET_NAME as string;
const assetsBucketName: string = process.env.ASSETS_BUCKET_NAME as string;
const functionPath: string = process.env.THUMBING_FUNCTION_PATH as string;
const folderInput: string = process.env.THUMBING_S3_FOLDER_INPUT as string;
const folderOutput: string = process.env.THUMBING_S3_FOLDER_OUTPUT as string;
const webhookUrl: string = process.env.THUMBING_WEBHOOK_URL as string;
const topicName: string = process.env.THUMBING_TOPIC_NAME as string;
console.log('uploadsBucketName',uploadsBucketName)
console.log('assetsBucketName',assetsBucketName)
console.log('folderInput',folderInput)
console.log('folderOutput',folderOutput)
console.log('webhookUrl',webhookUrl)
console.log('topicName',topicName)
console.log('functionPath',functionPath)

const lambda = this.createLambda(functionPath, uploadsBucketName, assetsBucketName, folderInput, folderOutput)
```
Create the lambda function
```sh
  createLambda(functionPath: string, uploadsBucketName: string, assetsBucketName:string, folderInput: string, folderOutput: string): lambda.IFunction{
    const lambdaFunction = new lambda.Function(this, 'thumbLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(functionPath),
      environment: {
        DEST_BUCKET_NAME: assetsBucketName,
        FOLDER_INPUT: folderInput,
        FOLDER_OUTPUT: folderOutput,
        PROCESS_WIDTH: '512',
        PROCESS_HEIGHT: '512'
      }
    });
    return lambdaFunction;
  }
  ```
Note Lambda function needs at least 3 parameters Runtime (language of the code), handler and code (which is the source where is located our code)

Created a new file the .env.example inside of our cdk project with the following information:
```sh
THUMBING_BUCKET_NAME="assets.bennieo.me"
THUMBING_S3_FOLDER_INPUT="avatars/original"
THUMBING_S3_FOLDER_OUTPUT="avatars/processed"
THUMBING_WEBHOOK_URL="https://api.bennieo.me/webhooks/avatar"
THUMBING_TOPIC_NAME="cruddur-assets"
THUMBING_FUNCTION_PATH="/workspace/aws-bootcamp-cruddur-2023/aws/lambdas/process-images"
```
It is a good practice to create a folder for the lambda codes for each project so it is to refer to which project belongs the code.
Copied the .env.example file into the ".env" in order to load the env vars and this will be necessery for thumbing-serverless-cdk-stack file.
```sh
cp .env.example .env
```
#### Create Source Codes
Created a new folder `process-images`with the following files with their contents below for the lambda in the `aws/lambdas` directory
- Index.js file
```sh
const process = require('process');
const {getClient, getOriginalImage, processImage, uploadProcessedImage} = require('./s3-image-processing.js')
const path = require('path');

const bucketName = process.env.DEST_BUCKET_NAME
const folderInput = process.env.FOLDER_INPUT
const folderOutput = process.env.FOLDER_OUTPUT
const width = parseInt(process.env.PROCESS_WIDTH)
const height = parseInt(process.env.PROCESS_HEIGHT)

client = getClient();

exports.handler = async (event) => {
  console.log('event',event)

  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  console.log('srcBucket',srcBucket)
  console.log('srcKey',srcKey)

  const dstBucket = bucketName;
  filename = path.parse(srcKey).name
  const dstKey = `${folderOutput}/${filename}.jpg`
  console.log('dstBucket',dstBucket)
  console.log('dstKey',dstKey)

  const originalImage = await getOriginalImage(client,srcBucket,srcKey)
  const processedImage = await processImage(originalImage,width,height)
  await uploadProcessedImage(client,dstBucket,dstKey,processedImage)
};
```
- Test.js file
```sh
const {getClient, getOriginalImage, processImage, uploadProcessedImage} = require('./s3-image-processing.js')

async function main(){
  client = getClient()
  const srcBucket = 'cruddur-thumbs'
  const srcKey = 'avatar/original/data.jpg'
  const dstBucket = 'cruddur-thumbs'
  const dstKey = 'avatar/processed/data.png'
  const width = 256
  const height = 256

  const originalImage = await getOriginalImage(client,srcBucket,srcKey)
  console.log(originalImage)
  const processedImage = await processImage(originalImage,width,height)
  await uploadProcessedImage(client,dstBucket,dstKey,processedImage)
}

main()
```
- s3-image-processing.js file
```sh
const sharp = require('sharp');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

function getClient(){
  const client = new S3Client();
  return client;
}

async function getOriginalImage(client,srcBucket,srcKey){
  console.log('get==')
  const params = {
    Bucket: srcBucket,
    Key: srcKey
  };
  console.log('params',params)
  const command = new GetObjectCommand(params);
  const response = await client.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return buffer;
}

async function processImage(image,width,height){
  const processedImage = await sharp(image)
    .resize(width, height)
    .jpeg()
    .toBuffer();
  return processedImage;
}

async function uploadProcessedImage(client,dstBucket,dstKey,image){
  console.log('upload==')
  const params = {
    Bucket: dstBucket,
    Key: dstKey,
    Body: image,
    ContentType: 'image/jpeg'
  };
  console.log('params',params)
  const command = new PutObjectCommand(params);
  const response = await client.send(command);
  console.log('repsonse',response);
  return response;
}

module.exports = {
  getClient: getClient,
  getOriginalImage: getOriginalImage,
  processImage: processImage,
  uploadProcessedImage: uploadProcessedImage
}
```
- example.json file.This file is just for reference in order to see the data structure.
```sh
{
  "Records": [
    {
      "eventVersion": "2.0",
      "eventSource": "aws:s3",
      "awsRegion": "us-east-1",
      "eventTime": "1970-01-01T00:00:00.000Z",
      "eventName": "ObjectCreated:Put",
      "userIdentity": {
        "principalId": "EXAMPLE"
      },
      "requestParameters": {
        "sourceIPAddress": "127.0.0.1"
      },
      "responseElements": {
        "x-amz-request-id": "EXAMPLE123456789",
        "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH"
      },
      "s3": {
        "s3SchemaVersion": "1.0",
        "configurationId": "testConfigRule",
        "bucket": {
          "name": "assets.bennieo.me",
          "ownerIdentity": {
            "principalId": "EXAMPLE"
          },
          "arn": "arn:aws:s3:::assets.bennieo.me"
        },
        "object": {
          "key": "avatars/original/data.jpg",
          "size": 1024,
          "eTag": "0123456789abcdef0123456789abcdef",
          "sequencer": "0A1B2C3D4E5F678901"
        }
      }
    }
  ]
```
#### Installing Packages
Next thing is to install some necessary packages and to do this we have to be in the right path where lambda and the process-image is so from the terminal, move to or cd into `aws\lambdas\process-image\` and run the following command:
```sh
npm init -y
```
This creates a new init file.
Launch these commands to install the libraries;
```sh
npm i sharp
npm i @aws-sdk/client-s3
```
N/B: Make sure to type the name correctly when installing the libraries because there are so many junk libraries out there so that one does not accidentally install them. 
The reason for the @aws-sdk/client-s3 is because the sdk library is broken up into a bunch of sub-packages or isolate packages so one can install exactly what one wants. Most sdks do this like Ruby and Nodejs, there are some where one has to install wholesale and some individually, individually is better because it results in smaller footprints. 
Before deploying, run `cdk synth` to check if the code is correct which gave the following output:
```sh
bucketName assets.bennieo.me
folderInput avatars/original
folderOutput avatars/processed
webhookUrl https://api.bennieo.me/webhooks/avatar
topicName cruddur-assets
functionPath /workspace/aws-bootcamp-cruddur-2023/aws/lambdas/process-images
Resources:
  AssetsBucket5CB76180:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: assets.bennieo.me
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/AssetsBucket/Resource
  AssetsBucketNotificationsA137991F:
    Type: Custom::S3BucketNotifications
    Properties:
      ServiceToken:
        Fn::GetAtt:
          - BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691
          - Arn
      BucketName:
        Ref: AssetsBucket5CB76180
      NotificationConfiguration:
        LambdaFunctionConfigurations:
          - Events:
              - s3:ObjectCreated:Put
            Filter:
              Key:
                FilterRules:
                  - Name: prefix
                    Value: avatars/original
            LambdaFunctionArn:
              Fn::GetAtt:
                - ThumbLambda5C775138
                - Arn
        TopicConfigurations:
          - Events:
              - s3:ObjectCreated:Put
            Filter:
              Key:
                FilterRules:
                  - Name: prefix
                    Value: avatars/processed
            TopicArn:
              Ref: ThumbingTopic6D1C97CE
      Managed: true
    DependsOn:
      - AssetsBucketAllowBucketNotificationsToThumbingServerlessCdkStackThumbLambdaF947A79C32211236
      - ThumbingTopichttpsapibennieomewebhooksavatarBF7FA56E
      - ThumbingTopicPolicy9FC24222
      - ThumbingTopic6D1C97CE
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/AssetsBucket/Notifications/Resource
  AssetsBucketAllowBucketNotificationsToThumbingServerlessCdkStackThumbLambdaF947A79C32211236:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName:
        Fn::GetAtt:
          - ThumbLambda5C775138
          - Arn
      Principal: s3.amazonaws.com
      SourceAccount:
        Ref: AWS::AccountId
      SourceArn:
        Fn::GetAtt:
          - AssetsBucket5CB76180
          - Arn
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/AssetsBucket/AllowBucketNotificationsToThumbingServerlessCdkStackThumbLambdaF947A79C
  ThumbLambdaServiceRole4BE4E3E0:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Action: sts:AssumeRole
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
        Version: "2012-10-17"
      ManagedPolicyArns:
        - Fn::Join:
            - ""
            - - "arn:"
              - Ref: AWS::Partition
              - :iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/ThumbLambda/ServiceRole/Resource
  ThumbLambdaServiceRoleDefaultPolicyB74653D4:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action:
              - s3:GetObject
              - s3:PutObject
            Effect: Allow
            Resource:
              Fn::Join:
                - ""
                - - Fn::GetAtt:
                      - AssetsBucket5CB76180
                      - Arn
                  - /*
        Version: "2012-10-17"
      PolicyName: ThumbLambdaServiceRoleDefaultPolicyB74653D4
      Roles:
        - Ref: ThumbLambdaServiceRole4BE4E3E0
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/ThumbLambda/ServiceRole/DefaultPolicy/Resource
  ThumbLambda5C775138:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        S3Bucket:
          Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
        S3Key: dbc52e2f9a10c186ab7243f7caa1f865525515685db56961ce5f53a42b4d2f8a.zip
      Role:
        Fn::GetAtt:
          - ThumbLambdaServiceRole4BE4E3E0
          - Arn
      Environment:
        Variables:
          DEST_BUCKET_NAME: assets.bennieo.me
          FOLDER_INPUT: avatars/original
          FOLDER_OUTPUT: avatars/processed
          PROCESS_WIDTH: "512"
          PROCESS_HEIGHT: "512"
      Handler: index.handler
      Runtime: nodejs18.x
    DependsOn:
      - ThumbLambdaServiceRoleDefaultPolicyB74653D4
      - ThumbLambdaServiceRole4BE4E3E0
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/ThumbLambda/Resource
      aws:asset:path: asset.dbc52e2f9a10c186ab7243f7caa1f865525515685db56961ce5f53a42b4d2f8a
      aws:asset:is-bundled: false
      aws:asset:property: Code
  ThumbingTopic6D1C97CE:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: cruddur-assets
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/ThumbingTopic/Resource
  ThumbingTopichttpsapibennieomewebhooksavatarBF7FA56E:
    Type: AWS::SNS::Subscription
    Properties:
      Protocol: https
      TopicArn:
        Ref: ThumbingTopic6D1C97CE
      Endpoint: https://api.bennieo.me/webhooks/avatar
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/ThumbingTopic/https:----api.bennieo.me--webhooks--avatar/Resource
  ThumbingTopicPolicy9FC24222:
    Type: AWS::SNS::TopicPolicy
    Properties:
      PolicyDocument:
        Statement:
          - Action: sns:Publish
            Condition:
              ArnLike:
                aws:SourceArn:
                  Fn::GetAtt:
                    - AssetsBucket5CB76180
                    - Arn
            Effect: Allow
            Principal:
              Service: s3.amazonaws.com
            Resource:
              Ref: ThumbingTopic6D1C97CE
            Sid: "0"
        Version: "2012-10-17"
      Topics:
        - Ref: ThumbingTopic6D1C97CE
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/ThumbingTopic/Policy/Resource
  BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Action: sts:AssumeRole
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
        Version: "2012-10-17"
      ManagedPolicyArns:
        - Fn::Join:
            - ""
            - - "arn:"
              - Ref: AWS::Partition
              - :iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/Resource
  BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action: s3:PutBucketNotification
            Effect: Allow
            Resource: "*"
        Version: "2012-10-17"
      PolicyName: BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36
      Roles:
        - Ref: BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy/Resource
  BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691:
    Type: AWS::Lambda::Function
    Properties:
      Description: AWS CloudFormation handler for "Custom::S3BucketNotifications" resources (@aws-cdk/aws-s3)
      Code:
        ZipFile: |
          import boto3  # type: ignore
          import json
          import logging
          import urllib.request

          s3 = boto3.client("s3")

          EVENTBRIDGE_CONFIGURATION = 'EventBridgeConfiguration'

          CONFIGURATION_TYPES = ["TopicConfigurations", "QueueConfigurations", "LambdaFunctionConfigurations"]

          def handler(event: dict, context):
            response_status = "SUCCESS"
            error_message = ""
            try:
              props = event["ResourceProperties"]
              bucket = props["BucketName"]
              notification_configuration = props["NotificationConfiguration"]
              request_type = event["RequestType"]
              managed = props.get('Managed', 'true').lower() == 'true'
              stack_id = event['StackId']

              if managed:
                config = handle_managed(request_type, notification_configuration)
              else:
                config = handle_unmanaged(bucket, stack_id, request_type, notification_configuration)

              put_bucket_notification_configuration(bucket, config)
            except Exception as e:
              logging.exception("Failed to put bucket notification configuration")
              response_status = "FAILED"
              error_message = f"Error: {str(e)}. "
            finally:
              submit_response(event, context, response_status, error_message)

          def handle_managed(request_type, notification_configuration):
            if request_type == 'Delete':
              return {}
            return notification_configuration

          def handle_unmanaged(bucket, stack_id, request_type, notification_configuration):
            external_notifications = find_external_notifications(bucket, stack_id)

            if request_type == 'Delete':
              return external_notifications

            def with_id(notification):
              notification['Id'] = f"{stack_id}-{hash(json.dumps(notification, sort_keys=True))}"
              return notification

            notifications = {}
            for t in CONFIGURATION_TYPES:
              external = external_notifications.get(t, [])
              incoming = [with_id(n) for n in notification_configuration.get(t, [])]
              notifications[t] = external + incoming

            if EVENTBRIDGE_CONFIGURATION in notification_configuration:
              notifications[EVENTBRIDGE_CONFIGURATION] = notification_configuration[EVENTBRIDGE_CONFIGURATION]
            elif EVENTBRIDGE_CONFIGURATION in external_notifications:
              notifications[EVENTBRIDGE_CONFIGURATION] = external_notifications[EVENTBRIDGE_CONFIGURATION]

            return notifications

          def find_external_notifications(bucket, stack_id):
            existing_notifications = get_bucket_notification_configuration(bucket)
            external_notifications = {}
            for t in CONFIGURATION_TYPES:
              external_notifications[t] = [n for n in existing_notifications.get(t, []) if not n['Id'].startswith(f"{stack_id}-")]

            if EVENTBRIDGE_CONFIGURATION in existing_notifications:
              external_notifications[EVENTBRIDGE_CONFIGURATION] = existing_notifications[EVENTBRIDGE_CONFIGURATION]

            return external_notifications

          def get_bucket_notification_configuration(bucket):
            return s3.get_bucket_notification_configuration(Bucket=bucket)

          def put_bucket_notification_configuration(bucket, notification_configuration):
            s3.put_bucket_notification_configuration(Bucket=bucket, NotificationConfiguration=notification_configuration)

          def submit_response(event: dict, context, response_status: str, error_message: str):
            response_body = json.dumps(
              {
                "Status": response_status,
                "Reason": f"{error_message}See the details in CloudWatch Log Stream: {context.log_stream_name}",
                "PhysicalResourceId": event.get("PhysicalResourceId") or event["LogicalResourceId"],
                "StackId": event["StackId"],
                "RequestId": event["RequestId"],
                "LogicalResourceId": event["LogicalResourceId"],
                "NoEcho": False,
              }
            ).encode("utf-8")
            headers = {"content-type": "", "content-length": str(len(response_body))}
            try:
              req = urllib.request.Request(url=event["ResponseURL"], headers=headers, data=response_body, method="PUT")
              with urllib.request.urlopen(req) as response:
                print(response.read().decode("utf-8"))
              print("Status code: " + response.reason)
            except Exception as e:
                print("send(..) failed executing request.urlopen(..): " + str(e))
      Handler: index.handler
      Role:
        Fn::GetAtt:
          - BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC
          - Arn
      Runtime: python3.9
      Timeout: 300
    DependsOn:
      - BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36
      - BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Resource
  CDKMetadata:
    Type: AWS::CDK::Metadata
    Properties:
      Analytics: v2:deflate64:H4sIAAAAAAAA/1WQzQ7CIBCEn8U7Xa0mxquaeDbq3VC6mrUtmC5oDOHdheLvab4dJszCFBYlTEbyzoWqm6KlCvzeStWIaB09z8CvnGrQivVJvyjLSjIG0cquqiX4eLrFviNmMlpsnFY2QbTfHATJDvzOtJjsQbemJfVIY6YgeHaUzGgZlkkEawZ/MFdSKZVh7ypWPV3fDX/zEPne+zOGMPQiG9crFB8YiuKbz6TPKbE2uqa8sTY1woXHt3IB5Tz+04WJit5pSx3CLusTxYgJ+UMBAAA=
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/CDKMetadata/Default
    Condition: CDKMetadataAvailable
Conditions:
  CDKMetadataAvailable:
    Fn::Or:
      - Fn::Or:
          - Fn::Equals:
              - Ref: AWS::Region
              - af-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-east-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-northeast-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-northeast-2
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-southeast-1
          - Fn::Equals:
              - Ref: AWS::Region
              - ap-southeast-2
          - Fn::Equals:
              - Ref: AWS::Region
              - ca-central-1
          - Fn::Equals:
              - Ref: AWS::Region
              - cn-north-1
          - Fn::Equals:
              - Ref: AWS::Region
              - cn-northwest-1
      - Fn::Or:
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-central-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-north-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-west-1
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-west-2
          - Fn::Equals:
              - Ref: AWS::Region
              - eu-west-3
          - Fn::Equals:
              - Ref: AWS::Region
              - me-south-1
          - Fn::Equals:
              - Ref: AWS::Region
              - sa-east-1
          - Fn::Equals:
              - Ref: AWS::Region
              - us-east-1
          - Fn::Equals:
              - Ref: AWS::Region
              - us-east-2
      - Fn::Or:
          - Fn::Equals:
              - Ref: AWS::Region
              - us-west-1
          - Fn::Equals:
              - Ref: AWS::Region
              - us-west-2
Parameters:
  BootstrapVersion:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /cdk-bootstrap/hnb659fds/version
    Description: Version of the CDK Bootstrap resources in this environment, automatically retrieved from SSM Parameter Store. [cdk:skip]
Rules:
  CheckBootstrapVersion:
    Assertions:
      - Assert:
          Fn::Not:
            - Fn::Contains:
                - - "1"
                  - "2"
                  - "3"
                  - "4"
                  - "5"
                - Ref: BootstrapVersion
        AssertDescription: CDK bootstrap stack version 6 required. Please run 'cdk bootstrap' with a recent version of the CDK CLI.


```
Next is to deploy the CDK project using the following code. Then to see what has been deployed, it is checked in AWS Cloudformation.
```sh
cdk deploy
```
If you rename a bucket and deploy the entire stack, this wont affect the changes, you need to destroy the entire stack and relaunch using the following command:
```sh
cdk destroy
```
In order to build sharp library for AWS lambda, this is done because in order to use it it has to be built in a particular way. This is done using the following commands:
```sh
npm install
rm -rf node_modules/sharp
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --arch=x64 --platform=linux --libc=glibc sharp
```
Using this same code, a new folder `severless` and script file `build` was created in the `bin/serverless` directory.
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
SERVERLESS_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $SERVERLESS_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
SERVERLESS_PROJECT_PATH="$PROJECT_PATH/thumbing-serverless-cdk"

cd $SERVERLESS_PROJECT_PATH
npm install
rm -rf node_modules/sharp
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --arch=x64 --platform=linux --libc=glibc sharp
```
Then in this same `serverless` folder another script file `clear` was created. 
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
SERVERLESS_PATH=$(dirname $ABS_PATH)
DATA_FILE_PATH="$SERVERLESS_PATH/files/data.jpg"

aws s3 rm "s3://assets.$DOMAIN_NAME/avatars/original/data.jpg"
aws s3 rm "s3://assets.$DOMAIN_NAME/avatars/processed/data.jpg"
```
Also another script file `upload` and a `files` folder for uploading images for the s3 bucket were also created
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
SERVERLESS_PATH=$(dirname $ABS_PATH)
DATA_FILE_PATH="$SERVERLESS_PATH/files/data.jpg"

aws s3 cp "$DATA_FILE_PATH" "s3://assets.$DOMAIN_NAME/avatars/original/data.jpg"
```
Made the files executable at once using:
```sh
chmod -R u+x bin/serverless
```
#### Create S3 Event Notification to Lambda
Next is to Create the s3 event notification to lambda in the `thumbing-serverless-cdk/lib/thumbing-serverless-cdk-stacks.ts` folder using the following code:
```sh
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

this.createS3NotifyToLambda(folderInput,lambda,uploadsBucket)
this.createS3NotifyToSns(folderOutput,snsTopic,assetsBucket)

createS3NotifyToLambda(prefix: string, lambda: lambda.IFunction, bucket: s3.IBucket): void {
  const destination = new s3n.LambdaDestination(lambda);
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED_PUT,
    destination,
    {prefix: prefix}
  )
}
```
#### Create Policy and Permission for Bucket Access
Added an import code for the s3 bucket in order to make it persistent so if we destroyed our stacks the s3 bucket isnt destroyed along with it;
```sh
const assetsBucket = this.importBucket(assetsBucketName);

importBucket(bucketName: string): s3.IBucket{
    const bucket = s3.Bucket.fromBucketName(this,"AssetsBucket", bucketName);
    return bucket;
  }
```
Added perrmissions for s3 bucket for lambda using;
```sh
import * as iam from 'aws-cdk-lib/aws-iam';

Bucket Policy
const s3AssetsReadWritePolicy = this.createPolicyBucketAccess(assetsBucket.bucketArn)

createPolicyBucketAccess(bucketArn: string){
    const s3ReadWritePolicy = new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
      ],
      resources: [
        `${bucketArn}/*`,
      ]
    });
    return s3ReadWritePolicy;
  }

Lambda code for the s3 bucket policy
lambda.addToRolePolicy(s3AssetsReadWritePolicy);
```

Lambda S3 bucket
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/e2be9663-d989-4958-9ea8-d7482f54a128)


Cloudwatch logs
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/7acd26bf-4f4b-4e78-b4b5-593a9951ec2d)


Then added the codes for creating the following still in the `thumbing-serverless-cdk/lib/thumbing-serverless-cdk-stacks.ts` folder:
#### Create SNS Topic
```sh
import * as sns from 'aws-cdk-lib/aws-sns';

const snsTopic = this.createSnsTopic(topicName)

createSnsTopic(topicName: string): sns.ITopic{
  const logicalName = "ThumbingTopic";
  const snsTopic = new sns.Topic(this, logicalName, {
    topicName: topicName
  });
  return snsTopic;
}
```
#### Create an SNS Subscription
```sh
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

this.createSnsSubscription(snsTopic,webhookUrl)

createSnsSubscription(snsTopic: sns.ITopic, webhookUrl: string): sns.Subscription {
  const snsSubscription = snsTopic.addSubscription(
    new subscriptions.UrlSubscription(webhookUrl)
  )
  return snsSubscription;
}
```
#### Create S3 Event Notification to SNS
```sh
this.createS3NotifyToSns(folderOutput,snsTopic,bucket)

createS3NotifyToSns(prefix: string, snsTopic: sns.ITopic, bucket: s3.IBucket): void {
  const destination = new s3n.SnsDestination(snsTopic)
  bucket.addEventNotification(
    s3.EventType.OBJECT_CREATED_PUT, 
    destination,
    {prefix: prefix}
  );
}
```
#### Create Policy for SNS Publishing
```sh
const snsPublishPolicy = this.createPolicySnSPublish(snsTopic.topicArn)

  /*
  createPolicySnSPublish(topicArn: string){
    const snsPublishPolicy = new iam.PolicyStatement({
      actions: [
        'sns:Publish',
      ],
      resources: [
        topicArn
      ]
    });
    return snsPublishPolicy;
  }
```
#### Attach the Policies to the Lambda Role 
```sh
lambda.addToRolePolicy(s3ReadWritePolicy);
lambda.addToRolePolicy(snsPublishPolicy);
```
The `thumbing-serverless-cdk-stacks.ts` file
```sh
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

dotenv.config();

export class ThumbingServerlessCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const bucketName: string = process.env.THUMBING_BUCKET_NAME as string;
    const folderInput: string = process.env.THUMBING_S3_FOLDER_INPUT as string;
    const folderOutput: string = process.env.THUMBING_S3_FOLDER_OUTPUT as string;
    const webhookUrl: string = process.env.THUMBING_WEBHOOK_URL as string;
    const topicName: string = process.env.THUMBING_TOPIC_NAME as string;
    const functionPath: string = process.env.THUMBING_FUNCTION_PATH as string;
    console.log('bucketName',bucketName)
    console.log('folderInput',folderInput)
    console.log('folderOutput',folderOutput)
    console.log('webhookUrl',webhookUrl)
    console.log('topicName',topicName)
    console.log('functionPath',functionPath)

    //const bucket = this.createBucket(bucketName);
    const bucket = this.importBucket(bucketName);

    // create a lambda
    const lambda = this.createLambda(functionPath, bucketName, folderInput, folderOutput);

    // create topic and subscription
    const snsTopic = this.createSnsTopic(topicName)
    this.createSnsSubscription(snsTopic,webhookUrl)

    // add our s3 event notifications
    this.createS3NotifyToLambda(folderInput,lambda,bucket)
    this.createS3NotifyToSns(folderOutput,snsTopic,bucket)

    // create policies
    const s3ReadWritePolicy = this.createPolicyBucketAccess(bucket.bucketArn)
    //const snsPublishPolicy = this.createPolicySnSPublish(snsTopic.topicArn)

    // attach policies for permissions
    lambda.addToRolePolicy(s3ReadWritePolicy);
    //lambda.addToRolePolicy(snsPublishPolicy);
  }

  createBucket(bucketName: string): s3.IBucket {
    const bucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    return bucket;
  }

  importBucket(bucketName: string): s3.IBucket {
    const bucket = s3.Bucket.fromBucketName(this,"AssetsBucket",bucketName);
    return bucket;
  }

  createLambda(functionPath: string, bucketName: string, folderInput: string, folderOutput: string): lambda.IFunction {
    const lambdaFunction = new lambda.Function(this, 'ThumbLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(functionPath),
      environment: {
        DEST_BUCKET_NAME: bucketName,
        FOLDER_INPUT: folderInput,
        FOLDER_OUTPUT: folderOutput,
        PROCESS_WIDTH: '512',
        PROCESS_HEIGHT: '512'
      }
    });
    return lambdaFunction;
  } 

  createS3NotifyToLambda(prefix: string, lambda: lambda.IFunction, bucket: s3.IBucket): void {
    const destination = new s3n.LambdaDestination(lambda);
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      destination,
      {prefix: prefix} // folder to contain the original images
    )
  }

  createPolicyBucketAccess(bucketArn: string){
    const s3ReadWritePolicy = new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
      ],
      resources: [
        `${bucketArn}/*`,
      ]
    });
    return s3ReadWritePolicy;
  }

  createSnsTopic(topicName: string): sns.ITopic{
    const logicalName = "ThumbingTopic";
    const snsTopic = new sns.Topic(this, logicalName, {
      topicName: topicName
    });
    return snsTopic;
  }

  createSnsSubscription(snsTopic: sns.ITopic, webhookUrl: string): sns.Subscription {
    const snsSubscription = snsTopic.addSubscription(
      new subscriptions.UrlSubscription(webhookUrl)
    )
    return snsSubscription;
  }

  createS3NotifyToSns(prefix: string, snsTopic: sns.ITopic, bucket: s3.IBucket): void {
    const destination = new s3n.SnsDestination(snsTopic)
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT, 
      destination,
      {prefix: prefix}
    );
  }

  /*
  createPolicySnSPublish(topicArn: string){
    const snsPublishPolicy = new iam.PolicyStatement({
      actions: [
        'sns:Publish',
      ],
      resources: [
        topicArn
      ]
    });
    return snsPublishPolicy;
  }
  */
}
```
