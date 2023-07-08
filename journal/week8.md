# Week 8 — Serverless Image Processing

This week we will be working with CDK.
- [CDK](#cdk)
- [Serving Avatars Via Cloudfront](#serving-avatars-via-cloudfront)
- [Implementation of User Profile Page](#implementation-of-user-profile-page)
- [Implementation of Migration Backend Endpoint and profile form](#implementation-of-migration-backend-endpoint-and-profile-form)
- [Implementation of Avatar Upload](#implementation-of-avatar-upload)
- [Rendering Avatar using Cloudfront](#rendering-avatar-using-cloudfront)

## CDK

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
UPLOADS_BUCKET_NAME="bennieo-uploaded-avatars"
ASSETS_BUCKET_NAME="assets.$DOMAIN_NAME"
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
uploadsBucketName bennieo-uploaded-avatars
assetsBucketName assets.$DOMAIN_NAME
folderInput avatars/original
folderOutput avatars/processed
webhookUrl https://api.$DOMAIN_NAME/webhooks/avatar
topicName cruddur-assets
functionPath /workspace/aws-bootcamp-cruddur-2023/aws/lambdas/process-images
Resources:
  UploadsBucket5E5E9B64:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: uploads.bennieo.me
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/UploadsBucket/Resource
  UploadsBucketNotifications4592A072:
    Type: Custom::S3BucketNotifications
    Properties:
      ServiceToken:
        Fn::GetAtt:
          - BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691
          - Arn
      BucketName:
        Ref: UploadsBucket5E5E9B64
      NotificationConfiguration:
        LambdaFunctionConfigurations:
          - Events:
              - s3:ObjectCreated:Put
            LambdaFunctionArn:
              Fn::GetAtt:
                - thumbLambda4F6A0672
                - Arn
      Managed: true
    DependsOn:
      - UploadsBucketAllowBucketNotificationsToThumbingServerlessCdkStackthumbLambda1253FE4746FC7FD1
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/UploadsBucket/Notifications/Resource
  UploadsBucketAllowBucketNotificationsToThumbingServerlessCdkStackthumbLambda1253FE4746FC7FD1:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName:
        Fn::GetAtt:
          - thumbLambda4F6A0672
          - Arn
      Principal: s3.amazonaws.com
      SourceAccount:
        Ref: AWS::AccountId
      SourceArn:
        Fn::GetAtt:
          - UploadsBucket5E5E9B64
          - Arn
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/UploadsBucket/AllowBucketNotificationsToThumbingServerlessCdkStackthumbLambda1253FE47
  AssetsBucketNotificationsA137991F:
    Type: Custom::S3BucketNotifications
    Properties:
      ServiceToken:
        Fn::GetAtt:
          - BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691
          - Arn
      BucketName: assets.bennieo.me
      NotificationConfiguration:
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
      Managed: false
    DependsOn:
      - ThumbingTopichttpsapibennieomewebhooksavatarBF7FA56E
      - ThumbingTopicPolicy9FC24222
      - ThumbingTopic6D1C97CE
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/AssetsBucket/Notifications/Resource
  thumbLambdaServiceRole961849F1:
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
      aws:cdk:path: ThumbingServerlessCdkStack/thumbLambda/ServiceRole/Resource
  thumbLambdaServiceRoleDefaultPolicyBCEB6E65:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action:
              - s3:GetObject
              - s3:PutObject
            Effect: Allow
            Resource:
              - Fn::Join:
                  - ""
                  - - "arn:"
                    - Ref: AWS::Partition
                    - :s3:::assets.bennieo.me/*
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - UploadsBucket5E5E9B64
                        - Arn
                    - /*
        Version: "2012-10-17"
      PolicyName: thumbLambdaServiceRoleDefaultPolicyBCEB6E65
      Roles:
        - Ref: thumbLambdaServiceRole961849F1
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/thumbLambda/ServiceRole/DefaultPolicy/Resource
  thumbLambda4F6A0672:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        S3Bucket:
          Fn::Sub: cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}
        S3Key: cdc8425fb080cf2f85482b7cee899038be5fa8dfe94d7619d8dd9c6c98cdb9b2.zip
      Role:
        Fn::GetAtt:
          - thumbLambdaServiceRole961849F1
          - Arn
      Environment:
        Variables:
          DEST_BUCKET_NAME: assets.$DOMAIN_NAME
          FOLDER_INPUT: avatars/original
          FOLDER_OUTPUT: avatars/processed
          PROCESS_WIDTH: "512"
          PROCESS_HEIGHT: "512"
      Handler: index.handler
      Runtime: nodejs18.x
    DependsOn:
      - thumbLambdaServiceRoleDefaultPolicyBCEB6E65
      - thumbLambdaServiceRole961849F1
    Metadata:
      aws:cdk:path: ThumbingServerlessCdkStack/thumbLambda/Resource
      aws:asset:path: asset.cdc8425fb080cf2f85482b7cee899038be5fa8dfe94d7619d8dd9c6c98cdb9b2
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
      Endpoint: https://api.$DOMAIN_NAME/webhooks/avatar
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
                  Fn::Join:
                    - ""
                    - - "arn:"
                      - Ref: AWS::Partition
                      - :s3:::assets.bennieo.me
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
          - Action:
              - s3:GetBucketNotification
              - s3:PutBucketNotification
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
        AssertDescription: CDK bootstrap stack version 6 required. Please run 'cdk bootstrap' with a recent version of the CDK CLI
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

aws s3 rm "s3://bennieo-uploaded-avatars/data.jpg"
aws s3 rm "s3://assets.$DOMAIN_NAME/avatars/data.jpg"
```

Also another script file `upload` and a `files` folder for uploading images for the s3 bucket were also created
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
SERVERLESS_PATH=$(dirname $ABS_PATH)
DATA_FILE_PATH="$SERVERLESS_PATH/files/data.jpg"

aws s3 cp "$DATA_FILE_PATH" "s3://bennieo-uploaded-avatars/data.jpg""
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

The thumbing-serverless-cdk-stacks.ts file
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

// Load Env Variables
//const dotenv= require('dotenv')
dotenv.config();

export class ThumbingServerlessCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
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

    const uploadsBucket = this.createBucket(uploadsBucketName);
    const assetsBucket = this.importBucket(assetsBucketName);
    //create a lambda
    const lambda = this.createLambda(
      functionPath,
      uploadsBucketName,
      assetsBucketName,
      folderInput,
      folderOutput
    );

    //create topic and subscription
    const snsTopic = this.createSnsTopic(topicName);
    this.createSnsSubscription(snsTopic,webhookUrl);

    //add our s3 event notification
    this.createS3NotifyToLambda(folderInput,lambda,uploadsBucket);
    this.createS3NotifyToSns(folderOutput,snsTopic,assetsBucket);

    //create policies
    const s3UploadsReadWritePolicy = this.createPolicyBucketAccess(uploadsBucket.bucketArn);
    const s3AssetsReadWritePolicy = this.createPolicyBucketAccess(assetsBucket.bucketArn);

    //const snsPublishPolicy = this.createPolicySnSPublish(snsTopic.topicArn)

   //attach policies
    lambda.addToRolePolicy(s3UploadsReadWritePolicy);
    lambda.addToRolePolicy(s3AssetsReadWritePolicy);
    //lambda.addToRolePolicy(snsPublishPolicy);
    

  }

  createBucket(bucketName: string): s3.IBucket{
    const bucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    return bucket;
  }

  importBucket(bucketName: string): s3.IBucket{
    const bucket = s3.Bucket.fromBucketName(this,"AssetsBucket", bucketName);
    return bucket;
  }

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

  createS3NotifyToLambda(prefix: string, lambda: lambda.IFunction, bucket: s3.IBucket): void {
    const destination = new s3n.LambdaDestination(lambda);
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      destination//,
      //{prefix: prefix}
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

  
  //createPolicySnSPublish(topicArn: string){
    //const snsPublishPolicy = new iam.PolicyStatement({
      //actions: [
        //'sns:Publish',
      //],
      //resources: [
        //topicArn
      //]
    //});
    //return snsPublishPolicy;
 //}

}
```
 
## Serving Avatars Via Cloudfront

We are going to be serving our images or assets using CDN which means Content Distribution Network. This is done because we dont want to download our images every single time and serve them up for the application instead we are using Cloudfront which is a CDN. 

To do this we need to create Cloudfront in AWS as shown below:

![Screenshot 2023-06-15 at 00-57-44 Create - Distributions - CloudFront](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/0cbea857-6ba1-41b7-a9a1-c1a43a11032a)


After creating it tested it on the browser to see if it will output my image using my DNS assets.bennieo.me/avartars/processed/data.jpg but it didnt.

Configured Route53 to point to the CDN by creating a record in Route53 but it still didnt work.

To configure the bucket policy because it is a requirement that will grant the bucket permission to be publicly accessisble because the bucket accessibility was blocked, clicked on origins in cloudfront and then edit and copied the policy. Next went to my s3 bucket permissions and attached the policy then saved it and it then worked.


## Implementation of User Profile Page

A new script file `bootstrap` is created in the bin directory with the following content:
```sh
#! /usr/bin/bash
set -e
CYAN='\033[1;36m'
NO_COLOR='\033[0m'
LABEL="bootstrap"
printf "${CYAN}==== ${LABEL}${NO_COLOR}\n"

ABS_PATH=$(readlink -f "$0")
bin_dir=$(dirname $ABS_PATH)

echo "Creation local database"
source "$bin_dir/db/setup"
echo "Creation local dynamodb"
python3 "$bin_dir/ddb/schema-load"
echo "Seeding mock data"
python3 "$bin_dir/ddb/seed"
```

Another file `show.sql` was created in the `backend-flask/db/sql/users` folder with:
```sh
SELECT
 (SELECT COALESCE(row_to_json(object_row),'{}'::json) FROM (
    SELECT  
      users.uuid,
      users.handle,
      users.display_name
      (SELECT
        count(true)
       FROM public.activities
       WHERE
        activities.users_uuid=users.uuid) as cruds_count
  ) object_row) as profile,
  (SELECT COALESCE(array_to_json(array_agg(row_to_json(array_row))),'[]'::json) FROM (
    SELECT
      activities.uuid,
      users.display_name,
      users.handle,
      activities.message,
      activities.created_at,
      activities.expires_at
    FROM public.activities
    WHERE
      activities.user_uuid = users.uuid
    ORDER by activities.created_at DESC
    LIMIT 40
  ) array_row) as activities
FROM public.users
WHERE
  users.handle = %(handle)s
```
The `users_activities.py` file in the backend-flask/services folder, was updated with the following:
This code was changed 
```sh
  now = datetime.now(timezone.utc).astimezone()
      
      if user_handle == None or len(user_handle) < 1:
        model['errors'] = ['blank_user_handle']
      else:
        now = datetime.now()
        results = [{
          'uuid': '248959df-3079-4947-b847-9e0892d1bab4',
          'handle':  'Andrew Brown',
          'message': 'Cloud is fun!',
          'created_at': (now - timedelta(days=1)).isoformat(),
          'expires_at': (now + timedelta(days=31)).isoformat()
        }]
        model['data'] = results
```
With
```sh
      if user_handle == None or len(user_handle) < 1:
        model['errors'] = ['blank_user_handle']
      else:
        sql = db.template('users','show')
        results = db.query_object_json(sql,{'handle': user_handle})
        return results
```

Created a new component files `EditProfileButton.js` and `EditProfileButton.css` in the `frontend-react-js/src/components` folder this allows the users to edit their profile.  
EditProfileButton.js
```sh
import './EditProfileButton.css';
import EditProfileButton from '../components/EditProfileButton';

export default function EditProfileButton(props) {
  const pop_profile_form = (event) => {
    event.preventdefault();
    props.setPopped(true);
    return false;
  }

  return (
    <button onClick={pop_profile_form} className='profile-edit-button' href="#">Edit Profile</button>
  );
}
```

EditProfileButton.css
```sh
.profile-edit-button {
  border: solid 1px rgba (255,255,255,0.5);
  padding: 12px 20px;
  font-size: 18px;
  background: none;
  border-radius: 999px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
}

.profile-edit-button:hover {
  background:  rgba(255,255,255,0.3);
}
```

The `ActivityFeed.js` file in the `frontend-react-js/src/components` is updated with the following line of code:
```sh
export default function ActivityFeed(props) {
  return (

    <div className='activity_feed_collection'>
      {props.activities.map(activity => {
      return  <ActivityItem setReplyActivity={props.setReplyActivity} setPopped={props.setPopped} key={activity.uuid} activity={activity} />
      })}
    </div>
  );
}
```

 The `HomeFeedPage.js` file in the `frontend-react-js/scr/pages` folder is refactored with the following:
 ```sh
 return (
    <article>
      <DesktopNavigation user={user} active={'home'} setPopped={setPopped} />
      <div className='content'>
        <ActivityForm
          user_handle={user} 
          popped={popped}
          setPopped={setPopped} 
          setActivities={setActivities} 
        />
        <ReplyForm 
          activity={replyActivity} 
          popped={poppedReply} 
          setPopped={setPoppedReply} 
          setActivities={setActivities} 
          activities={activities} 
        />
        <div className='activity_feed'>
          <div className='activity_feed_heading'>
            <div className='title'>Home</div>
          </div>
        <ActivityFeed 
            setReplyActivity={setReplyActivity} 
            setPopped={setPoppedReply} 
            activities={activities} 
          />
        </div>
      </div>
      <DesktopSidebar user={user} />
    </article>
  );
 ```
Same refactoring is also done for `NotificationsFeedPage.js` in the same folder with:
```sh
return (
    <article>
      <DesktopNavigation user={user} active={'notification'} setPopped={setPopped} />
      <div className='content'>
        <ActivityForm  
          popped={popped}
          setPopped={setPopped} 
          setActivities={setActivities} 
        />
        <ReplyForm 
          activity={replyActivity} 
          popped={poppedReply} 
          setPopped={setPoppedReply} 
          setActivities={setActivities} 
          activities={activities} 
        />
        <div className='activity_feed'>
          <div className='activity_feed_heading'>
            <div className='title'>Notifications</div>
          </div>
          <ActivityFeed 
            title="Notification" 
            setReplyActivity={setReplyActivity} 
            setPopped={setPoppedReply} 
            activities={activities} 
          />
        </div>
      </div>
      <DesktopSidebar user={user} />
    </article>
  );
}
```
Created new files `ProfileHeading.js` and `ProfileHeading.css` also in the `frontend-react-js/src/components` folder.
ProfileHeading.js
```sh
import './ProfileHeading.css';

export default function ProfileHeading(props) {
  const backgroundImage = 'url("https://assets.example.com/banners/banner.jpg")';
  const style = {
    backgroundImage: backgroundImage,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
  return (
  <div className='activity_feed_heading profile_heading'>
    <div className='title'>{props.profile.display_name}</div>
    <div className="cruds_count">{props.profile.cruds_count} Cruds</div>
    <div className="banner" style={styles}>
      <div className="avatar">
        <img src="https://assets.example.com/avatars/data.jpg"></ img>  
      </div>
    </div>
    <div classname="info">
      <div class='id'>
        <div className="display_name">{props.profile.display_name}</div>
        <div className="handle">@{props.profile.handle}</div>
      </div>
      <EditProfileButton setPopped={props.setPopped} />  
    </div>
  </div>
  );
}
```

ProfileHeading.css
```sh
.profile_heading {
  padding-bottom: 0px;
}
.profile_heading .avatar {
  position: absolute;
  bottom: -74px;
  left: 16px;
}

.profile_heading .avatar img {
  width: 150px;
  height: 150px;
  border-radius: 999px;
  border: solid 8px var(--fg);
}

.profile_heading .banner {
  position: relative; 
  height: 200;
}

.profile_heading .info {
  display: flex;
  flex-direction: row;
  align-items: start;
  padding: 16px;
}

.profile_heading .info .id {
  padding-top: 70px;
  flex-grow: 1;
}

.profile_heading .info .id .display_name {
  font-size: 24px;
  font-weight: bold;
  color: rgb(255,255,255);
    
}

.profile_heading .info .id .handle {
  font-size: 16px;
  color: rgb(255,255,255,0.7);

}

.profile_heading .cruds_Count{
  color: rgb(255,255,255,0.7);
}
```

To create a background image for the profile, created a folder named banners in S3 bucket assets.example.com and loaded the background image named banner.jpg.

## Implementation of Migration Backend Endpoint and Profile form

Since our previous postgres database didn't have the column for saving bio, migration is required. We also need to update some backend scripts in order to let users edit bio and save the updated bio in the database. 

Created a file `jsconfig.json` in the `frontend-react-js` folder and added the following:
```sh
{
  "compilerOptions": {
    "baseUrl": "src"
  },
  "include": ["src"]
}
```

Created a new file `ProfileForm.js` in the `frontend-react-js/src/components` folder.
```sh

import './ProfileForm.css';
import React from "react";
import process from 'process';
import {getAccessToken} from 'lib/CheckAuth';

export default function ProfileForm(props) {
  const [bio, setBio] = React.useState(0);
  const [displayName, setDisplayName] = React.useState(0);

  React.useEffect(()=>{
    console.log('useEffects',props)
    setBio(props.profile.bio);
    setDisplayName(props.profile.display_name);
  }, [props.profile])

  const onsubmit = async (event) => {
    event.preventDefault();
    try {
      const backend_url = `${process.env.REACT_APP_BACKEND_URL}/api/profile/update`
      await getAccessToken()
      const access_token = localStorage.getItem("access_token")
      const res = await fetch(backend_url, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bio: bio,
          display_name: displayName
        }),
      });
      let data = await res.json();
      if (res.status === 200) {
        setBio(null)
        setDisplayName(null)
        props.setPopped(false)
      } else {
        console.log(res)
      }
    } catch (err) {
      console.log(err);
    }
  }

  const bio_onchange = (event) => {
    setBio(event.target.value);
  }

  const display_name_onchange = (event) => {
    setDisplayName(event.target.value);
  }

  const close = (event)=> {
    if (event.target.classList.contains("profile_popup")) {
      props.setPopped(false)
    }
  }

  if (props.popped === true) {
    return (
      <div className="popup_form_wrap profile_popup" onClick={close}>
        <form 
          className='profile_form popup_form'
          onSubmit={onsubmit}
        >
          <div className="popup_heading">
            <div className="popup_title">Edit Profile</div>
            <div className='submit'>
              <button type='submit'>Save</button>
            </div>
          </div>
          <div className="popup_content">
            <div className="field display_name">
              <label>Display Name</label>
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={display_name_onchange} 
              />
            </div>
            <div className="field bio">
              <label>Bio</label>
              <textarea
                placeholder="Bio"
                value={bio}
                onChange={bio_onchange} 
              />
            </div>
          </div>
        </form>
      </div>
    );
  }
}
```

Created the corresponding `ProfileForm.css` for it.
```sh
form.profile_form input[type='text'],
form.profile_form textarea {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16px;
  border-radius: 4px;
  border: none;
  outline: none;
  display: block;
  outline: none;
  resize: none;
  width: 100%;
  padding: 16px;
  border: solid 1px var(--field-border);
  background: var(--field-bg);
  color: #fff;
}

.profile_popup .popup_content {
  padding: 16px;
}

form.profile_form .field.display_name {
  margin-bottom: 24px;
}

form.profile_form label {
  color: rgba(255,255,255,0.8);
  padding-bottom: 4px;
  display: block;
}

form.profile_form textarea {
  height: 140px;
}

form.profile_form input[type='text']:hover,
form.profile_form textarea:focus {
  border: solid 1px var(--field-border-focus)
}

.profile_popup button[type='submit'] {
  font-weight: 800;
  outline: none;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 16px;
  background: rgba(149,0,255,1);
  color: #fff;
}
```

Edited the `ReplyForm.css` file in the `frontend-react-js/scr/component` folder by removing this part of code from the file:
```sh
.popup_form_wrap {
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 48px;
  background: rgba(255,255,255,0.1)
}

.popup_form {
  background: #000;
  box-shadow: 0px 0px 6px rgba(190, 9, 190, 0.6);
  border-radius: 16px;
  width: 600px;
}
```

Then instead created a new file `Popup.css` still in the same folder.
```sh
.popup_form_wrap {
  z-index: 100;
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 48px;
  background: rgba(255,255,255,0.1)
}

.popup_form {
  background: #000;
  box-shadow: 0px 0px 6px rgba(190, 9, 190, 0.6);
  border-radius: 16px;
  width: 600px;
}

.popup_form .popup_heading {
  display: flex;
  flex-direction: row;
  border-bottom: solid 1px rgba(255,255,255,0.4);
  padding: 16px;
}

.popup_form .popup_heading .popup_title{
  flex-grow: 1;
  color: rgb(255,255,255);
  font-size: 18px;

}
```

Imported `Popup.css` in the `App.js` file still in the same directory.
```sh
import './components/Popup.css';
```

Updated the `app.py` file in the `backend-flask` folder with:
```sh
from services.update_profile import *

@app.route("/api/profile/update", methods=['POST','OPTIONS'])
@cross_origin()
def data_update_profile():
  bio          = request.json.get('bio',None)
  display_name = request.json.get('display_name',None)
  access_token = extract_access_token(request.headers)
  try:
    claims = cognito_token.verify(access_token)
    cognito_user_id = claims['sub']
    model = UpdateProfile.run(
      cognito_user_id=cognito_user_id,
      bio=bio,
      display_name=display_name
    )
    if model['errors'] is not None:
      return model['errors'], 422
    else:
      return model['data'], 200
  except TokenVerifyError as e:
    # unauthenicatied request
    app.logger.debug(e)
    return {}, 401
```

Crated a new file `update_profile.py` in the `backend/services` folder:
```sh
from lib.db import db

class UpdateProfile:
  def run(cognito_user_id,bio,display_name):
    model = {
      'errors': None,
      'data': None
    }

    if display_name == None or len(display_name) < 1:
      model['errors'] = ['display_name_blank']

    if model['errors']:
      model['data'] = {
        'bio': bio,
        'display_name': display_name
      }
    else:
      handle = UpdateProfile.update_profile(bio,display_name,cognito_user_id)
      data = UpdateProfile.query_users_short(handle)
      model['data'] = data
    return model

  def update_profile(bio,display_name,cognito_user_id):
    if bio == None:    
      bio = ''

    sql = db.template('users','update')
    handle = db.query_commit(sql,{
      'cognito_user_id': cognito_user_id,
      'bio': bio,
      'display_name': display_name
    })
  def query_users_short(handle):
    sql = db.template('users','short')
    data = db.query_object_json(sql,{
      'handle': handle
    })
    return data
```

Created a newfile `update.sql` in the `backend-flask/db/sql/users` folder. 
```sh
UPDATE public.users 
SET 
  bio = %(bio)s,
  display_name= %(display_name)s
WHERE 
  users.cognito_user_id = %(cognito_user_id)s
RETURNING handle;
```

Created a new folder `generate`  and file `migration`in the `./bin/generate` folder. 
```sh
#!/usr/bin/env python3
import time
import os
import sys

if len(sys.argv) == 2:
  name = sys.argv[1].lower()
else:
  print("pass a filename: eg. ./bin/generate/migration add_bio_column")
  exit(0)

timestamp = str(time.time()).replace(".","")

filename = f"{timestamp}_{name.replace('_', '')}.py"

klass = name.replace('_', ' ').title().replace(' ','')

file_content = f"""
from lib.db import db

class {klass}Migration:
  def migrate_sql():
    data = \"\"\"
    \"\"\"
    return data
  def rollback_sql():
    data = \"\"\"
    \"\"\"
    return data

  def migrate():
    db.query_commit({klass}Migration.migrate_sql(),{{
    }})
  def rollback():
    db.query_commit({klass}Migration.rollback_sql(),{{
    }})

migration = AddBioColumnMigration
"""
#remove leading and trailing new line
file_content = file_content.lstrip('\n').rstrip('\n')

current_path = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.abspath(os.path.join(current_path, '..', '..','backend-flask','db','migrations',filename))
print(file_path)

with open(file_path, 'w') as f:
  f.write(file_content)
```  

Made it executable using;
```sh
chmod u+x bin/generate/migration
```

Created a new folder `migrations` in the `backend-flask/db`. This is where the output of the `./bin/generate/migration` will be launched using the command;
```sh
./bin/generate/migration add_bio_column
```
This script generated a file `1687055262088531_add_bio_column.py` in the `backend-flask/migrations` folder which is then updated with SQL commands .
```sh
from lib.db import db

class AddBioColumnMigration:
  def migrate_sql():
    data = """
    ALTER TABLE public.users ADD COLUMN bio text;
    """
    return data
  def rollback_sql():
    data = """
    ALTER TABLE public.users DROP COLUMN bio;
    """
    return data

  def migrate():
    db.query_commit(AddBioColumnMigration.migrate_sql(),{
    })

  def rollback():
    db.query_commit(AddBioColumnMigration.rollback_sql(),{
    })

migration = AddBioColumnMigration
```

Created new executable scripts `./bin/db/migrate` and `./bin/db/rollback` in the `bin/db` folder. When command `./bin/db/migrate` is run, a new column called `bio` will be created in the db table of users. While the `bin/db/rollback` takes it back to it's previous state that is without the bio column.
Migrate
```sh
#!/usr/bin/env python3

import os
import sys
import glob
import re
import time
import importlib

current_path = os.path.dirname(os.path.abspath(__file__))
parent_path = os.path.abspath(os.path.join(current_path, '..', '..','backend-flask'))
sys.path.append(parent_path)
from lib.db import db

def get_last_successful_run():
  sql = """
    SELECT last_successful_run
    FROM public.schema_information
    LIMIT 1
  """
  return int(db.query_value(sql,{},verbose=False))

def set_last_successful_run(value):
  sql = """
  UPDATE schema_information
  SET last_successful_run = %(last_successful_run)s
  WHERE id = 1
  """
  db.query_commit(sql,{'last_successful_run': value})
  return value

last_successful_run = get_last_successful_run()

migrations_path = os.path.abspath(os.path.join(current_path, '..', '..','backend-flask','db','migrations'))
sys.path.append(migrations_path)
migration_files = glob.glob(f"{migrations_path}/*")


last_migration_file = None
for migration_file in migration_files:
  if last_migration_file == None:
    filename = os.path.basename(migration_file)
    module_name = os.path.splitext(filename)[0]
    match = re.match(r'^\d+', filename)
    if match:
      file_time = int(match.group())
      print("====")
      print(last_successful_run, file_time)
      print(last_successful_run > file_time)
      if last_successful_run > file_time:
        last_migration_file = module_name
        mod = importlib.import_module(module_name)
        print('===== rolling back: ',module_name)
        mod.migration.rollback()
        set_last_successful_run(file_time)

print(last_migration_file)
```

Rollback
```sh
#!/usr/bin/env python3

import os
import sys
import glob
import re
import time
import importlib

current_path = os.path.dirname(os.path.abspath(__file__))
parent_path = os.path.abspath(os.path.join(current_path, '..', '..','backend-flask'))
sys.path.append(parent_path)
from lib.db import db

def get_last_successful_run():
  sql = """
    SELECT last_successful_run
    FROM public.schema_information
    LIMIT 1
  """
  return int(db.query_value(sql,{},verbose=False))

def set_last_successful_run(value):
  sql = """
  UPDATE schema_information
  SET last_successful_run = %(last_successful_run)s
  WHERE id = 1
  """
  db.query_commit(sql,{'last_successful_run': value})
  return value

last_successful_run = get_last_successful_run()

migrations_path = os.path.abspath(os.path.join(current_path, '..', '..','backend-flask','db','migrations'))
sys.path.append(migrations_path)
migration_files = glob.glob(f"{migrations_path}/*")


last_migration_file = None
for migration_file in migration_files:
  if last_migration_file == None:
    filename = os.path.basename(migration_file)
    module_name = os.path.splitext(filename)[0]
    match = re.match(r'^\d+', filename)
    if match:
      file_time = int(match.group())
      print("==<><>")
      print(last_successful_run, file_time)
      print(last_successful_run > file_time)
      if last_successful_run > file_time:
        last_migration_file = module_name
        mod = importlib.import_module(module_name)
        print('=== rolling back: ',module_name)
        mod.migration.rollback()
        set_last_successful_run(file_time)
```

The `schema.sql` file in the `backend-flask/db` folder is updated with the following code which creates a new table that creates the schema_information stores the last successful run and the last migration file in the postgresql database. Using the script `./bin/db/connect` we can enter into the psql.
```sh
CREATE TABLE IF NOT EXISTS public.schema_information (
  id integer UNIQUE,
  last_successful_run text
);

INSERT INTO public.schema_information (id,last_successful_run)
VALUES (1,'0')
ON CONFLICT (id) DO NOTHING;
```

Also the `db.py` file is updated with the following lines of code at the commit, array_json, object_json and value with verbose respectively;
That is from
```sh
def query_commit(self,sql,params={}):
self.print_sql('commit with returning',sql,params)

def query_array_json(self,sql,params={}):
self.print_sql('array',sql,params)

def query_object_json(self,sql,params={}):
self.print_sql('json',sql,params)
self.print_params(params)

def query_value(self,sql,params={}):
self.print_sql('value',sql,params)
````

With
```sh
def query_commit(self,sql,params={},verbose=True):
  if verbose:
  self.print_sql('commit with returning',sql,params)
  
def query_array_json(self,sql,params={},verbose=True):
  if verbose:
    self.print_sql('array',sql,params)
    
def query_object_json(self,sql,params={},verbose=True):
  if verbose:
    self.print_sql('json',sql,params)
    self.print_params(params)
    
def query_value(self,sql,params={},verbose=True):
  if verbose:
    self.print_sql('value',sql,params)
```

Schema.sql worked


![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/248976c9-c034-4bd3-ab5e-fa0027d82509)


migrate and rollback script worked


![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/e77e1d6c-f011-477a-9bd4-cb48a19830a0)



![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/36d1fe1e-9101-4598-98ef-cfcef3ee820f)


Updated the ProfileHeading.js and ProfileHeading.css  with
```sh
<div className="bio">{props.profile.bio}</div>
```

ProfileHeading.css 
```sh
.profile_heading .bio {
  padding: 16px;
  color: rgba(255,255,255,0.7);
```

Bio

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/dd0dd23a-22f2-4d2a-aa2c-e14ae7990bfb)




## Implementation of Avatar Upload

In this section, we are implementing the Client-side javascript upload for s3 bucket. To do this, we need to to first generate a presigned url to upload an object. The way to trigger this is by uploading a file and when the file is attached, we can call an api endpoint to the server to give back a presigned url for a particular location then we can use that to do the upload. So we will be using an api gateway to do this. Then used the following steps below to achieve this.

Requirements:

Install Thunder Client from VScode Extensions. This tool will be necessary to test the api that I will be generating. 

#### Create Cruddur Upload Avatar Lambbda Function

Created a new Lambda function using Ruby named `cruddur-upload-avatar`.

Created a new folder `cruddur-upload-avatar`and file `function.rb` in the `aws/lambdas/cruddur-upload-avatar` folder. 
function.rb
```sh 
#use for debugging
require 'aws-sdk-s3'
require 'json'
require 'aws-sdk-ssm'
require 'jwt'

def handler(event:, context:)
  # Create an AWS SSM client
  ssm_client = Aws::SSM::Client.new
  # Retrieve the value of an environment variable from SSM Parameter Store
  response = ssm_client.get_parameter({
    name: '/cruddur/CruddurAvatarUpload/LAMBDA_FRONTEND',
    with_decryption: true
  })
  # Access the environment variable value
  frontend_url = response.parameter.value
  puts frontend_url

  puts event
  # Return CORS headers for preflight check
  if event['routeKey'] == "OPTIONS /{prefix+}"
    puts({ step: 'preflight', message: 'preflight CORS check' }.to_json)
    {
      headers: {
        "Access-Control-Allow-Headers": "*, Authorization",
        "Access-Control-Allow-Origin": frontend_url,
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
      },
      statusCode: 200,
    }
  else
    token = event['headers']['authorization'].split(' ')[1]
    puts({ step: 'presigned url', access_token: token }.to_json)
    
    body_hash = JSON.parse(event["body"])
    extension = body_hash["extension"]

    decoded_token = JWT.decode token, nil, false
    puts decoded_token
    cognito_user_uuid = decoded_token[0]['sub']
    s3 = Aws::S3::Resource.new
    bucket_name = ENV["UPLOADS_BUCKET_NAME"]
    object_key = "#{cognito_user_uuid}.#{extension}"

    puts({object_key: object_key}.to_json)

    obj = s3.bucket(bucket_name).object(object_key)
    url = obj.presigned_url(:put, expires_in: 300)
    url # this is the data that will be returned
    body = { url: url }.to_json
    {
      headers: {
        "Access-Control-Allow-Headers": "*, Authorization",
        "Access-Control-Allow-Origin": frontend_url,
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
      },
      statusCode: 200,
      body: body
    }
  end
end
#puts handler(
#  event: {},
#  context: {}
#)
```

Next is to generate Gemfiles which manages libraries same way as we have package.json and requirements.txt files. The Gemfiles are generated using the following steps:
- cd into `aws/lambdas/cruddur-upload-avatar` folder.
- Run command which generates the Gemfile.
```sh
bundle init
```
- In the generated Gemfile add the following codes:
```sh
gem "aws-sdk-s3"
gem "ox"
get "jwt"
```
- Run the following command to install them
```sh
bundle install
```
- Make sure to have included UPLOADS_BUCKET_NAME to env by exporting it.
- Execute `functin.rb` using the command:
```sh
bundle exec ruby function.rb
```
- Upload Star trek lore in the `aws/lambdas/cruddue-upload-avatar` folder.

- The url generated above is then copied and paste into the thunder client. To test if the upload will work, uploaded an image Lore from star trek, clicked on the the body and then binary and chose the image which then uploads the image and instead of `Get` it is changed to `Put` on the Url part and then click on send and if everything is ok and it works it will return a 200 we can then go to our s3 bucket in AWS and confirm it was sent.
- Then created a new file `s3-upload-avatar-presigned-url-policy.json` in the folder `aws/policies` and attach the following code for permission for the presigned url:
```sh
{
  "Version": "2012-10-17",
  "Statement": [
      {
          "Sid": "VisualEditor0",
          "Effect": "Allow",
          "Action": "s3:PutObject",
          "Resource": "arn:aws:s3:::johnbuen-uploaded-avatars/*"
      }
  ]
}
```

In order to render the `"Access-Control-Allow-Origin": frontend_url` without hardcoding the `frontend_url`, did the following:
- Created a new script file and folder  `parameters` and `ssm`in the `./bin/ssm/parameters` folder with the following content:
```sh
#! /usr/bin/bash

export URL="https://3000-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}"
aws ssm put-parameter --type "SecureString" --name "/cruddur/CruddurAvatarUpload/LAMBDA_FRONTEND" --value $URL --overwrite
```
- This creates an `SSM Parameter` in the AWS Systems Manager.
- Then also created and attached this policy to retrieve the ssm. Then copied and pasted the policy in the new file `cruddur-ssm-parameter`in the `aws/policies` folder.
```sh
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameters",
                "ssm:GetParameter"
            ],
            "Resource": "arn:aws:ssm:eu-west-2:ADDYOURACCOUNTNUMBERHERE:parameter/cruddur/CruddurAvatarUpload/LAMBDA_FRONTEND"
        }
    ]
}
```

Next created a new script file `ruby-jwt` in the `/bin/lambda-layers` folder which generates the jwt token and passes it to the aws lambda layer with the following code:
```sh
#! /usr/bin/bash

gem i jwt -Ni /tmp/lambda-layers/ruby-jwt/ruby/gems/2.7.1
cd  /tmp/lambda-layers/ruby-jwt
zip -r lambda-layers . -x ".*" -x "*/.*"
zipinfo -t lambda-layers

aws lambda publish-layer-version \
  --layer-name jwt \
  --description "Lambda Layer for JWT" \
  --license-info "MIT" \
  --zip-file fileb://lambda-layers.zip \
  --compatible-runtimes ruby3.2
```

#### Create Lambda Authorizer

The next step is to create the `CruddurApiGatewayLambdaAuthorizer` Lambda function in AWS Lambda for the ApiGatway that will trigger the `CruddurAvatarUpload`.

Created a new file and folder `index.js` and `lambda-authorizer` in the `aws/lambdas` folder.
```sh
"use strict";
const { CognitoJwtVerifier } = require("aws-jwt-verify");
//const { assertStringEquals } = require("aws-jwt-verify/assert");

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.CLIENT_ID//,
  //customJwtCheck: ({ payload }) => {
  //  assertStringEquals("e-mail", payload["email"], process.env.USER_EMAIL);
  //},
});

exports.handler = async (event) => {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const token = JSON.stringify(event.headers["authorization"]).split(" ")[1].replace(/['"]+/g, '');
  try {
    const payload = await jwtVerifier.verify(token);
    console.log("Access allowed. JWT payload:", payload);
  } catch (err) {
    console.error("Access forbidden:", err);
    return {
      isAuthorized: false,
    };
  }
  return {
    isAuthorized: true,
  };
};
```
In the `aws/lambda/lambda-authorizer` folder ran the following command;
```sh
npm install aws-jwt-verify --save
```

Once installed, created a zip file containing all the files of the `lambda-authorizer` by using the following code:
```sh
zip -r lambda-authorizer.zip .
```

At AWS Lambda, created the corresponding two functions:

`CruddurAvatarUpload`

- Code source as seen in `aws/lambdas/cruddur-upload-avatar/function.rb` above.
- Renamed Handler as function.handler.
- Added environment variable UPLOADS_BUCKET_NAME
- Created a new policy PresignedUrlAvatarPolicy as seen in `aws/policies/s3-upload-avatar-presigned-url-policy.json` above, and then attached this policy to the role of this Lambda.
- Added the layer from the `/bin/lambda-layers/rubt-jwt` code above to the lambda function under the section layers, click Add a layer.


![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/191beb92-569b-45ea-b7b2-dcdf4f1fc04f)

  
`CruddurApiGatewayLambdaAuthorizer`

- Uploaded the lambda_authorizer.zip into the code source
- Added environment variables USER_POOL_ID and CLIENT_ID.

Created at AWS API Gateway, api.<domain_name> and create two routes:

`POST /avatars/key_upload` with authorizer `CruddurJWTAuthorizer` which invoke Lambda `CruddurApiGatewayLambdaAuthorizer`, and with integration `CruddurAvatarUpload`.
`OPTIONS /{prefix+}` with the authorizer, and with integration CruddurAvatarUpload.

Next, updated the following files:

ProfileForm.js
```sh
import './ProfileForm.css';
import React from "react";
import process from 'process';
import {getAccessToken} from 'lib/CheckAuth';

export default function ProfileForm(props) {
  const [bio, setBio] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');

  React.useEffect(()=>{
    setBio(props.profile.bio || '');
    setDisplayName(props.profile.display_name);
  }, [props.profile])

  const s3uploadkey = async (extension)=> {
    console.log('external',extension)
    try {
      const api_gateway = `${process.env.REACT_APP_API_GATEWAY_ENDPOINT_URL}/avatars/key_upload`
      await getAccessToken()
      const access_token = localStorage.getItem("access_token")
      const json = {
          extension: extension
      }
      const res = await fetch(api_gateway, {
        method: "POST",
        body: JSON.stringify(json),
        headers: {
          'Origin': process.env.REACT_APP_FRONTEND_URL,
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      }})
      let data = await res.json();
      if (res.status === 200) {
        return data.url
      } else {
        console.log(res)
      }
    } catch (err) {
      console.log(err);
    }
  }

  const s3upload = async (event) => {
    console.log('event',event)
    const file = event.target.files[0]
    console.log('file',file)
    const filename = file.name
    const size = file.size
    const type = file.type
    const preview_image_url = URL.createObjectURL(file)
    console.log(filename, size, type)
    //const formData = new FormData();
    //formData.append('file', file);
    const fileparts = filename.split('.')
    const extension = fileparts[fileparts.length-1]
    const presignedurl = await s3uploadkey(extension)
    try {
      console.log('s3upload')
      const res = await fetch(presignedurl, {
        method: "PUT",
        body: file,
        headers: {
          'Content-Type': type
        }})
   
      //let data = await res.json();
      if (res.status === 200) {
        //setPresignedurl(data.url)
      } else {
        console.log(res)
      }
    } catch (err) {
      console.log(err);
    }
  }

  const onsubmit = async (event) => {
    event.preventDefault();
    try {
      const backend_url = `${process.env.REACT_APP_BACKEND_URL}/api/profile/update`
      await getAccessToken()
      const access_token = localStorage.getItem("access_token")
      const res = await fetch(backend_url, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bio: bio,
          display_name: displayName
        }),
      });
      let data = await res.json();
      if (res.status === 200) {
        setBio(null)
        setDisplayName(null)
        props.setPopped(false)
      } else {
        console.log(res)
      }
    } catch (err) {
      console.log(err);
    }
  }

  const bio_onchange = (event) => {
    setBio(event.target.value);
  }

  const display_name_onchange = (event) => {
    setDisplayName(event.target.value);
  }

  const close = (event)=> {
    if (event.target.classList.contains("profile_popup")) {
      props.setPopped(false)
    }
  }

  if (props.popped === true) {
    return (
      <div className="popup_form_wrap profile_popup" onClick={close}>
        <form 
          className='profile_form popup_form'
          onSubmit={onsubmit}
        >
          <div className="popup_heading">
            <div className="popup_title">Edit Profile</div>
            <div className='submit'>
              <button type='submit'>Save</button>
            </div>
          </div>
          <div className="popup_content">
          <input type="file" name="avatarupload" onChange={s3upload} />
            <div className="field display_name">
              <label>Display Name</label>
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={display_name_onchange} 
              />
            </div>
            <div className="field bio">
              <label>Bio</label>
              <textarea
                placeholder="Bio"
                value={bio}
                onChange={bio_onchange} 
              />
            </div>
          </div>
        </form>
      </div>
    );
  }
}
```

Added the following code to the `ProfileForm.css`
```sh
.profile_popup .upload {
  color: white;
  background: rgba(149,0,255,1);
}
```

Added to the `frontend-react-js.env.erb`:
```sh
REACT_APP_FRONTEND_URL=https://3000-<%= ENV['GITPOD_WORKSPACE_ID'] %>.<%= ENV['GITPOD_WORKSPACE_CLUSTER_HOST'] %>
REACT_APP_API_GATEWAY_ENDPOINT_URL=<%= ENV['API_GATEWAY_ENDPOINT_URL'] %>
```
At AWS S3, updated the permissions of bennieo-uploaded-avatars by editing the CORS configuration section and adding the following code which helps to resolve the Cors issue:
```sh
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT"
        ],
        "AllowedOrigins": [
            "https://*.gitpod.io"
        ],
        "ExposeHeaders": [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
```
Then created a new file `cors.json` and folder `s3`in the `aws/s3` folder and pasted the above code into it. 

## Rendering Avatar using Cloudfront

Created 2 new files `ProfileAvatar.js` and `ProfileAvatar.css` in the `frontend-react-js/src/components` folder.

Added the following content for the `ProfileAvatar.js`.
```sh
import './ProfileAvatar.css';

export default function ProfileAvatar(props) {
    const backgroundImage = `url("https://assets.johnbuen.co.uk/avatars/${props.id}.jpg"`;

    const styles = {
      backgroundImage: backgroundImage,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };

  return (
    <div 
      className="profile-avatar"
      style={styles}
    ></div>
  );
}
```
Then updated the following files in the  `frontend-react-js/src/components` with the following codes:

ProfileHeading.js 
Replaced
```sh
 <div className="avatar">
        <img src="https://assets.cruddur.com/avatars/data.jpg"></img>
      </div>
```

With and added the import statement
```sh
import ProfileAvatar from 'components/ProfileAvatar'

 <ProfileAvatar id={props.profile.cognito_user_uuid} />
```

ProfileHeading.css
Replaced
```sh
profile_heading .avatar {
  position: absolute;
  bottom:-74px;
  left: 16px;
}
.profile_heading .avatar img {
  width: 148px;
  height: 148px;
  border-radius: 999px;
```
With 
```sh
.profile_heading .profile-avatar {
  position: absolute;
  bottom:-74px;
  left: 16px;
}
```

ProfileInfo.js
Replaced 
```sh
      <div className="profile-info" onClick={click_pop}>
      <div className="profile-avatar"></div>
```
With and added impot statement
```sh
import ProfileAvatar from 'components/ProfileAvatar'

<div className="profile-info" onClick={click_pop}>
<ProfileAvatar id={props.user.cognito_user_uuid} />
```

In the `frontend-react-js/src/lib/` folder
CheckAuth
Replaced
```sh
 .then((cognito_user) => {
    setUser({
      display_name: cognito_user.attributes.name,
      handle: cognito_user.attributes.preferred_username
    })
```
With
```sh
 .then((cognito_user) => {
    setUser({
      cognito_user_uuid: cognito_user.attributes.sub,
      display_name: cognito_user.attributes.name,
      handle: cognito_user.attributes.preferred_username
    })
```

In 
UserFeedPage.js
Replaced
```sh
let resJson = await res.json();
      if (res.status === 200) {
        setProfile(resJson.profile)
        setActivities(resJson.activities)
      } else {
```
With
```sh
let resJson = await res.json();
      if (res.status === 200) {
        console.log('setprofile',resJson.profile)
        setProfile(resJson.profile)
        setActivities(resJson.activities)
      } else {
```

In the `backendflask/db/sl/users` folder
Show.sql
Replaced
```sh
(SELECT COALESCE(row_to_json(object_row),'{}'::json) FROM (
    SELECT
      users.uuid,
      users.handle,
      users.display_name,
      users.bio,
```
With
```sh
(SELECT COALESCE(row_to_json(object_row),'{}'::json) FROM (
    SELECT
      users.uuid,
      users.cognito_user_id as cognito_user_uuid,
      users.handle,
      users.display_name,
      users.bio,
```

Rendered Avatar

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/288d9370-a995-4b45-ad3a-1a6768b453d8)













