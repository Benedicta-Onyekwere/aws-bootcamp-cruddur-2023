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
      npm install aws-cdk -g
      cd thumbing-serverless-cdk
      npm i
```
#### Initialize a new project
To initialise a new project within the folder we created type:
```sh
cdk init app --language typescript
```
Note instead of typescript, one can choose another language supported by cdk such JavaScript, TypeScript, Python, Java, C#.

To work with the cdkfile, go to the file inside the `lib/thumbing-serverless-cdk-stack.ts`.

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
ASSETS_BUCKET_NAME="assets.yourdomanin.com"
THUMBING_FUNCTION_PATH="/workspace/aws-bootcamp-cruddur-2023/aws/lambdas/process-images"
THUMBING_S3_FOLDER_INPUT="avatars/original"
THUMBING_S3_FOLDER_OUTPUT="avatars/processed"
THUMBING_WEBHOOK_URL="https://api.yourdomain.com/webhooks/avatar"
THUMBING_TOPIC_NAME="cruddur-assets"
```
It is a good practice to create a folder for the lambda codes for each project so it is to refer to which project belongs the code.

The UPLOADS_BUCKET_NAME and ASSETS_BUCKET_NAME must be unique as this will refer to the s3 bucket. change the name of the bucket with your domain (for example assets.example.com)

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
          "name": "assets.cruddur.com",
          "ownerIdentity": {
            "principalId": "EXAMPLE"
          },
          "arn": "arn:aws:s3:::assets.cruddur.com"
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
Next thing is to install some necessary packages and to do this we have to be in the right path where lambda and the process-image is so from the terminal, move to or cd into `aws\lambdas\process-image\` and launch the following command:
```sh
npm init -y
```
This create a new init file.
Launch these command to install the libraries
```sh
npm i sharp
npm i @aws-sdk/client-s3
```
N/B: Make sure to type the name correctly when installing the libraries because there are so many junk libraries out there so that one does not accidentally install them. 
The reason for the @aws-sdk/client-s3 is because the sdk library is broken up into a bunch of sub-packages or isolate packages so one can install exactly what one wants. Most sdks do this like Ruby and Nodejs, there are some where one has to install wholesale and some individually, individually is better because it results in smaller footprints. 
Before deploying, run `cdk synth` to check if the code is correct which gave the following output:
```sh

```
To deploy the CDK project launch the following code. then check it on cloudformation
