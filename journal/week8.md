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
The `cdk synth` short for synthesize command scans the CDK application code, including all the defined constructs and their dependencies, and generates the corresponding CloudFormation template in YAML or JSON format. By running cdk synth, one can validate and review the generated CloudFormation template before actually deploying the infrastructure. It allows me to inspect the resulting template, check resource configurations, review dependencies, and ensure that the CDK application code is correctly translated into the desired infrastructure definition.

It is not compulsory one does this before deploying only that it is best practice. It is also a great tool for troubleshooting so one can confirm that you are getting what you expect.

**Note**
- To update the code, you run the command again the folder cdk.out will be updated.
- Infrastructure stack can be deployed and new resources added on top, but one can face potential issues when handling some resources such as Dynamodb for instance, when it is renamed and there is some data on it, this will delete the entire Dynamodb resource and create a new one.
- Hence, one has to be careful when running consistent deploys and later renaming it especially when deploying in a production environment because it can wipe out the entire data.

Before launching or deploying the CDK, you need to boostrap.

Bootstrapping is the process of provisioning resources for the AWS CDK before you can deploy AWS CDK apps into an AWS environment. An AWS environment is a combination of an AWS account and Region. Bootstrapping is done only once if using just a single region but for multiple regions, it is done several times.
```sh
For a single region
cdk bootstrap "aws://ACCOUNTNUMBER/REGION"

For multiple regions
cdk bootstrap aws://ACCOUNTNUMBER/REGION ACCOUNTNUMBER/name of another REGION
```




