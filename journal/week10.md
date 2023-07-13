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


