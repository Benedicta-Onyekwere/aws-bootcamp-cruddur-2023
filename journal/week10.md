# Week 10 — CloudFormation Part 1

This week we will be working with CloudFormation

[Creating CloudFormation Template](#creating-cloud-formation-template)
[CFN Network Template](#cfn-network-template)

## Creating CloudFormation Template (CFN)

### What is CloudFormation? 
CloudFormation is a service provided by Amazon Web Services (AWS) that enables you to define and deploy infrastructure resources in a declarative manner. It allows you to create a template, known as a CloudFormation template, which describes the desired state of your infrastructure resources such as Amazon EC2 instances, Amazon S3 buckets, Amazon RDS databases, and more.

With CloudFormation, you define your infrastructure as code using a JSON or YAML template. This template specifies the resources you want to create, their configurations, and any dependencies between them. You can define parameters and variables within the template to make it more flexible and reusable across different environments.

Once you have created the CloudFormation template, you can use it to provision and manage your AWS resources. CloudFormation takes care of orchestrating the creation, updating, and deletion of resources, ensuring that they are created in the right order and with the correct configurations. It also provides features for rolling back changes and managing complex deployments.

Using CloudFormation, you can achieve infrastructure as code practices, making your infrastructure easily version-controlled, reproducible, and scalable. It simplifies the process of managing and maintaining infrastructure resources and helps ensure consistency and reliability across your AWS environment.

Started by creating a file `template.yaml` and folder `cfn` in the `aws` directory.
```sh
AWSTempleteFormatVersion: 2010-09-09
Description: |
    Setup ECS Cluster

Resources:
  ECSCluster: #Logical Name 
    Type: 'AWS::ECS::Cluster'
    Properties:
        ClusterName: MyCluster
        CapacityProviders:
            - FARGATE
#Parameters:
#Mappings:
#Resources:
#Outputs:
#Metadata
```

Created an S3 bucket in the same region using the following command:
```sh
export RANDOM_STRING=$(aws secretsmanager get-random-password --exclude-punctuation --exclude-uppercase --password-length 6 --output text --query RandomPassword)
aws s3 mb s3://cfn-artifacts-$RANDOM_STRING

export CFN_BUCKET="cfn-artifacts-$RANDOM_STRING"

gp env CFN_BUCKET="cfn-artifacts-$RANDOM_STRING"
```
This command creates an S3 Bucket called cfn-artifacts-xxxxxx. The xxxxxx will be generated randomly by the secret manager.

### Deploy CloudFormation Template
To deploy the cloudformation template, created a script file `deploy` inside a folder `cfn` in the `bin` directory.
```sh
#! /usr/bin/env bash
set -e # stop execution of the script if it fails

#This script will pass the value of the main root in case you use a local dev
export THEIA_WORKSPACE_ROOT=$(pwd)
echo $THEIA_WORKSPACE_ROOT


CFN_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/template.yaml"

cfn-lint $CFN_PATH
aws cloudformation deploy \
  --stack-name "CrdNet" \
  --template-file $CFN_PATH \
  --s3-bucket cfn-artifacts-$RANDOM_STRING \
  --no-execute-changeset \
  --tags group=cruddur-cluster \
  --capabilities CAPABILITY_NAMED_IAM
```
Made it executable using:
```
chmod u+x bin/cfn/deploy
```
**Note**
- The --no-execute-changeset will review the changeset before we accept it.
- Once the command `bin/cfn/deploy` is executed, the cli will create a script to check the output. you can use the code generated to see the output or check in the AWS CloudFormation via the console.
-  The  --capabilities CAPABILITY_NAMED_IAM grants permission.

### In AWS Console
- The changeset using the AWS console is useful and important to see precisely what is changing, otherwise, one could lose important data because instead of updating it could be tearing down the resources such as a database so one needs to be careful. For instance when renaming a cluster, this would tear down the entire resources based on this `Update requires: Replacement` which is in the Properties of AWS Cloudformation Documentation when this wasn't what one intended.
- Check in the `Changes` section look at the `Action` column, this displays what is changing such as Add when creating resources, Modify when changing the name of the cluster which replaces it and it is seen in the `Replacement` column as `True`. 
- After reviewing the changeset and confiriming that the actions is exactly what one wants, then click on `Execute change set` this gives two options pick the option that suits what you want and then deploy the resources.
- For debugging after seeing the `Status Reason` in the `Events` section in the CloudFormation stacks detail and error is not clear enough, use `Cloudtrail` which gives additional and detailed information about the error.

Install cfn lint which is used for validating the JSON or YAML  syntax using the following command
```sh
pip install cfn-lint
```
To run it use:
```sh
cfn-lint /workspace/aws-bootcamp-cruddur-2023/aws/cfn/template.yaml
```
This command is now incorporated into the `deploy` script as shown above but to make use of it globally so we can use it in the future, it is incoporated into our `gitpod.yml` file:
```sh
- name: CFN
    before: |
      pip install cfn-lint
      cargo install cfn-guard
```
### Create CFN Guard
AWS CloudFormation Guard is an open-source command-line general purpose `policy-as-code` tool that provides developers with a simple to use yet powerful and expressive specific domain language(DSL) to define policies and enables developers to validate JSON or YAML formatted structured data with those policies.

It allows you to enforce specific guidelines, best practices, and security requirements for your infrastructure deployments. CloudFormation Guard helps you catch potential misconfigurations or issues in your templates early in the development process, improving the quality and security of your AWS infrastructure. It provides a way to define and enforce custom rules using a simple syntax and integrates seamlessly with your existing CloudFormation workflows.

Created a `policy-as-code` ecs cluster for fargate by:

Creating a new file `task-definition.guard` in the `aws/cfn` directory
```sh
aws_ecs_cluster_configuration {
  rules = [
    {
      rule = "task_definition_encryption"
      description = "Ensure task definitions are encrypted"
      level = "error"
      action {
        type = "disallow"
        message = "Task definitions in the Amazon ECS cluster must be encrypted"
      }
      match {
        type = "ecs_task_definition"
        expression = "encrypt == false"
      }
    },
    {
      rule = "network_mode"
      description = "Ensure Fargate tasks use awsvpc network mode"
      level = "error"
      action {
        type = "disallow"
        message = "Fargate tasks in the Amazon ECS cluster must use awsvpc network mode"
      }
      match {
        type = "ecs_task_definition"
        expression = "network_mode != 'awsvpc'"
      }
    },
    {
      rule = "execution_role"
      description = "Ensure Fargate tasks have an execution role"
      level = "error"
      action {
        type = "disallow"
        message = "Fargate tasks in the Amazon ECS cluster must have an execution role"
      }
      match {
        type = "ecs_task_definition"
        expression = "execution_role == null"
      }
    },
  ]
}
```
Installed the cfn-guard using:
```sh
cargo install cfn-guard
```
Launched the following command:
```sh
cfn-guard rulegen --template /workspace/aws-bootcamp-cruddur-2023/aws/cfn/template.yaml
```
Which generated out the following output:
```sh
let aws_ecs_cluster_resources = Resources.*[ Type == 'AWS::ECS::Cluster' ]
rule aws_ecs_cluster when %aws_ecs_cluster_resources !empty {
  %aws_ecs_cluster_resources.Properties.CapacityProviders == ["FARGATE"]
  %aws_ecs_cluster_resources.Properties.ClusterName == "MyCluster"
}
```
Created a new file `ecs-cluster.guard` in the `aws/cfn` directory and copied the generated output above into it.

In the `aws/cfn` directory, ran the following command:
```sh
cfn-guard validate -r ecs-cluster.guard
```



