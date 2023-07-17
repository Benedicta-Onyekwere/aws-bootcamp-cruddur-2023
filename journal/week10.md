# Week 10 — CloudFormation Part 1

This week we will be working with CloudFormation

[CloudFormation Basics](#cloudformation-basics)

[Implement CFN Networking Layer](#implementin-cfn-networking-layer)

[Implement CFN Cluster Layer](#implement-cfn-cluster-layer)

[Implement CFN Toml](#Implement-CFN-Toml)

[Implement CFN Service Layer for Backend](#Implement-CFN-Service-Layer-for-Backend)

[Implement CFN Database Layer (RDS)](#Implement-CFN-Database-Layer-(RDS))

## CloudFormation Basics (CFN)

### What is CloudFormation? 
CloudFormation is a service provided by Amazon Web Services (AWS) that enables you to define and deploy infrastructure resources in a declarative manner. It allows you to create a template, known as a CloudFormation template, which describes the desired state of your infrastructure resources such as Amazon EC2 instances, Amazon S3 buckets, Amazon RDS databases, and more.

With CloudFormation, you define your infrastructure as code using a JSON(JavaScript Object Notation) or YAML(YAML Ain't Markup Language) template. This template specifies the resources you want to create, their configurations, and any dependencies between them. You can define parameters and variables within the template to make it more flexible and reusable across different environments.

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
set -e # stop the execution of the script if it fails

CFN_PATH="/workspace/aws-bootcamp-cruddur-2023/aws/cfn/template.yaml"
echo $CFN_PATH

cfn-lint $CFN_PATH

aws cloudformation deploy \
  --stack-name "my-cluster" \
  --s3-bucket "cfn-artifacts-$RANDOM_STRING" \
  --template-file "$CFN_PATH" \
  --no-execute-changeset \
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

## Implement CFN Networking Layer
Started by first deleting the initial cluster created in the AWS console.

Create a new file `template.yaml` and folder `networking` in the `aws/cfn` directory. This file will contain the structure of our network layer such as VPC, Internet Gateway, Route tables and 6 Public/Private Subnets, Availability zones etc.
```sh
AWSTemplateFormatVersion: 2010-09-09

Description: |
  The base networking components for our stack:
  - VPC
    - sets DNS hostnames for EC2 instances
    - Only IPV4, IPV6 is disabled
  - InternetGateway
  - Route Table
    - route to the IGW
    - route to Local
  - 6 Subnets Explicity Associated to Route Table
    - 3 Public Subnets numbered 1 to 3
    - 3 Private Subnets numbered 1 to 3
Parameters:
  VpcCidrBlock:
    Type: String
    Default: 10.0.0.0/16
  Az1:
    Type: AWS::EC2::AvailabilityZone::Name
    Default: us-east-1a
  SubnetCidrBlocks: 
    Description: "Comma-delimited list of CIDR blocks for our private public subnets"
    Type: CommaDelimitedList
    Default: >
      10.0.0.0/24, 
      10.0.4.0/24, 
      10.0.8.0/24, 
      10.0.12.0/24,
      10.0.16.0/24,
      10.0.20.0/24
  Az2:
    Type: AWS::EC2::AvailabilityZone::Name
    Default: us-east-1b
  Az3:
    Type: AWS::EC2::AvailabilityZone::Name
    Default: us-east-1c
Resources:
  VPC:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-vpc.html
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidrBlock
      EnableDnsHostnames: true
      EnableDnsSupport: true
      InstanceTenancy: default
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}VPC"
  IGW:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-internetgateway.html
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}IGW"
  AttachIGW:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref IGW
  RouteTable:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-routetable.html
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId:  !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}RT"
  RouteToIGW:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-route.html
    Type: AWS::EC2::Route
    DependsOn: AttachIGW
    Properties:
      RouteTableId: !Ref RouteTable
      GatewayId: !Ref IGW
      DestinationCidrBlock: 0.0.0.0/0
  SubnetPub1:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone: !Ref Az1
      CidrBlock: !Select [0, !Ref SubnetCidrBlocks]
      EnableDns64: false
      MapPublicIpOnLaunch: true #public subnet
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}SubnetPub1"
  SubnetPub2:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone: !Ref Az2
      CidrBlock: !Select [1, !Ref SubnetCidrBlocks]
      EnableDns64: false
      MapPublicIpOnLaunch: true #public subnet
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}SubnetPub2"
  SubnetPub3:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone: !Ref Az3
      CidrBlock: !Select [2, !Ref SubnetCidrBlocks]
      EnableDns64: false
      MapPublicIpOnLaunch: true #public subnet
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}SubnetPub3"
  SubnetPriv1:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone: !Ref Az1
      CidrBlock: !Select [3, !Ref SubnetCidrBlocks]
      EnableDns64: false
      MapPublicIpOnLaunch: false #public subnet
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}SubnetPriv1"
  SubnetPriv2:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone: !Ref Az2
      CidrBlock: !Select [4, !Ref SubnetCidrBlocks]
      EnableDns64: false
      MapPublicIpOnLaunch: false #public subnet
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}SubnetPriv2"
  SubnetPriv3:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone: !Ref Az3
      CidrBlock: !Select [5, !Ref SubnetCidrBlocks]
      EnableDns64: false
      MapPublicIpOnLaunch: false #public subnet
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub "${AWS::StackName}SubnetPriv3"
  SubnetPub1RTAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref SubnetPub1
      RouteTableId: !Ref RouteTable
  SubnetPub2RTAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref SubnetPub2
      RouteTableId: !Ref RouteTable
  SubnetPub3RTAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref SubnetPub3
      RouteTableId: !Ref RouteTable
  SubnetPriv1RTAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref SubnetPriv1
      RouteTableId: !Ref RouteTable
  SubnetPriv2RTAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref SubnetPriv2
      RouteTableId: !Ref RouteTable
  SubnetPriv3RTAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref SubnetPriv3
      RouteTableId: !Ref RouteTable
Outputs:
  VpcId:
    Value: !Ref VPC
    Export:
      Name: VpcId
  VpcCidrBlock:
    Value: !GetAtt VPC.CidrBlock
    Export:
      Name: VpcCidrBlock
  SubnetCidrBlocks:
    Value: !Join [",", !Ref SubnetCidrBlocks]
    Export:
      Name: SubnetCidrBlocks
  SubnetIds:
    Value: !Join 
      - ","
      - - !Ref SubnetPub1
        - !Ref SubnetPub2
        - !Ref SubnetPub3
        - !Ref SubnetPriv1
        - !Ref SubnetPriv2
        - !Ref SubnetPriv3
    Export:
      Name: SubnetIds
  AvailabilityZones:
    Value: !Join 
      - ","
      - - !Ref Az1
        - !Ref Az2
        - !Ref Az3
    Export:
      Name: AvailabilityZones
```
Renamed the `deploy` script to `networking-deploy` in the `bin/cfn` directory, updated the script with:
```sh
#! /usr/bin/env bash
set -e # stop the execution of the script if it fails

CFN_PATH="/workspace/aws-bootcamp-cruddur-2023/aws/cfn/networking/template.yaml"
echo $CFN_PATH

cfn-lint $CFN_PATH

aws cloudformation deploy \
  --stack-name "CrdNet" \
  --s3-bucket $CFN_BUCKET \
  --template-file "$CFN_PATH" \
  --no-execute-changeset \
  --tags group=cruddur-networking \
  --capabilities CAPABILITY_NAMED_IAM
```
Then deployed it in the AWS console went to changeset clicked on execute change set and the resources where deployed.

**Note**
Whenever we are debugging AWS networking issues, always take note of Main Network ACL because it will block everything for spcific IP addresses or security groups so always make sure they have outbound routes because if it isnt there it will deny everything on that rule there.

## Implement CFN Cluster Layer

Started by first creating a new bash script file `cluster-deploy` in the `/bin/cfn` directory.
```sh
#! /usr/bin/env bash
set -e # stop the execution of the script if it fails

CFN_PATH="/workspace/aws-bootcamp-cruddur-2023/aws/cfn/cluster/template.yaml"
echo $CFN_PATH

cfn-lint $CFN_PATH

aws cloudformation deploy \
  --stack-name "CrdCluster" \
  --s3-bucket $CFN_BUCKET \
  --template-file "$CFN_PATH" \
  --no-execute-changeset \
  --tags group=cruddur-cluster \
  --capabilities CAPABILITY_NAMED_IAM
```

Create a new file `template.yaml` and folder `cluster` in the `aws/cfn` directory. This file will contain the structure of our containers such as the frontend and the backend container, target groups, application load balancer.
```sh
AWSTemplateFormatVersion: 2010-09-09

Description: |
  The networking and cluster configuration to support fargate containers
  - ECS Fargate Cluster
  - Application Load Balanacer (ALB)
    - ipv4 only
    - internet facing
    - certificate attached from Amazon Certification Manager (ACM)
  - ALB Security Group
  - HTTPS Listerner
    - send naked domain to frontend Target Group
    - send api. subdomain to backend Target Group
  - HTTP Listerner
    - redirects to HTTPS Listerner
  - Backend Target Group
  - Frontend Target Group

Parameters:
  NetworkingStack:
    Type: String
    Description: This is our base layer of networking components eg. VPC, Subnets
    Default: CrdNet
  CertificateArn:
    Type: String
  #Frontend ------
  FrontendPort:
    Type: Number
    Default: 3000
  FrontendHealthCheckIntervalSeconds:
    Type: Number
    Default: 15
  FrontendHealthCheckPath:
    Type: String
    Default: "/"
  FrontendHealthCheckPort:
    Type: String
    Default: 80
  FrontendHealthCheckProtocol:
    Type: String
    Default: HTTP
  FrontendHealthCheckTimeoutSeconds:
    Type: Number
    Default: 5
  FrontendHealthyThresholdCount:
    Type: Number
    Default: 2
  FrontendUnhealthyThresholdCount:
    Type: Number
    Default: 2
  #Backend ------
  BackendPort:
    Type: Number
    Default: 4567
  BackendHealthCheckIntervalSeconds:
    Type: String
    Default: 15
  BackendHealthCheckPath:
    Type: String
    Default: "/api/health-check"
  BackendHealthCheckPort:
    Type: String
    Default: 80
  BackendHealthCheckProtocol:
    Type: String
    Default: HTTP
  BackendHealthCheckTimeoutSeconds:
    Type: Number
    Default: 5
  BackendHealthyThresholdCount:
    Type: Number
    Default: 2
  BackendUnhealthyThresholdCount:
    Type: Number
    Default: 2
Resources:
  FargateCluster:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-cluster.html
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub "${AWS::StackName}FargateCluster"
      CapacityProviders:
        - FARGATE
      ClusterSettings:
        - Name: containerInsights
          Value: enabled
      Configuration:
        ExecuteCommandConfiguration:
          # KmsKeyId: !Ref KmsKeyId
          Logging: DEFAULT
      ServiceConnectDefaults:
        Namespace: cruddur
  ALB:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-loadbalancer.html
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties: 
      Name: !Sub "${AWS::StackName}ALB"
      Type: application
      IpAddressType: ipv4
      # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-elasticloadbalancingv2-loadbalancer-loadbalancerattributes.html
      Scheme: internet-facing
      SecurityGroups:
        - !GetAtt ALBSG.GroupId
      Subnets:
        Fn::Split:
          - ","
          - Fn::ImportValue:
              !Sub "${NetworkingStack}PublicSubnetIds"
      LoadBalancerAttributes:
        - Key: routing.http2.enabled
          Value: true
        - Key: routing.http.preserve_host_header.enabled
          Value: false
        - Key: deletion_protection.enabled
          Value: true
        - Key: load_balancing.cross_zone.enabled
          Value: true
        - Key: access_logs.s3.enabled
          Value: false
        # In-case we want to turn on logs
        # - Name: access_logs.s3.bucket
        #   Value: bucket-name
        # - Name: access_logs.s3.prefix
        #   Value: ""
  HTTPSListener:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listener.html
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      Protocol: HTTPS
      Port: 443
      LoadBalancerArn: !Ref ALB
      Certificates: 
        - CertificateArn: !Ref CertificateArn
      DefaultActions:
        - Type: forward
          TargetGroupArn:  !Ref FrontendTG
  HTTPListener:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listener.html
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
        Protocol: HTTP
        Port: 80
        LoadBalancerArn: !Ref ALB
        DefaultActions:
          - Type: redirect
            RedirectConfig:
              Protocol: "HTTPS"
              Port: 443
              Host: "#{host}"
              Path: "/#{path}"
              Query: "#{query}"
              StatusCode: "HTTP_301"
  ApiALBListernerRule:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listenerrule.html
    Type: AWS::ElasticLoadBalancingV2::ListenerRule
    Properties:
      Conditions: 
        - Field: host-header
          HostHeaderConfig: 
            Values: 
              - api.DOMAIN NAME
      Actions: 
        - Type: forward
          TargetGroupArn:  !Ref BackendTG
      ListenerArn: !Ref HTTPSListener
      Priority: 1
  ALBSG:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub "${AWS::StackName}AlbSG"
      GroupDescription: Public Facing SG for our Cruddur ALB
      VpcId:
        Fn::ImportValue:
          !Sub ${NetworkingStack}VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: '0.0.0.0/0'
          Description: INTERNET HTTPS
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: '0.0.0.0/0'
          Description: INTERNET HTTP
  # We have to create this SG before the service so we can pass it to database SG
  ServiceSG:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub "${AWS::StackName}ServSG"
      GroupDescription: Security for Fargate Services for Cruddur
      VpcId:
        Fn::ImportValue:
          !Sub ${NetworkingStack}VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          SourceSecurityGroupId: !GetAtt ALBSG.GroupId
          FromPort: !Ref BackendPort
          ToPort: !Ref BackendPort
          Description: ALB HTTP
  BackendTG:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-targetgroup.html
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      #Name: !Sub "${AWS::StackName}BackendTG"
      Port: !Ref BackendPort
      HealthCheckEnabled: true
      HealthCheckProtocol: !Ref BackendHealthCheckProtocol
      HealthCheckIntervalSeconds: !Ref BackendHealthCheckIntervalSeconds
      HealthCheckPath: !Ref BackendHealthCheckPath
      HealthCheckPort: !Ref BackendHealthCheckPort
      HealthCheckTimeoutSeconds: !Ref BackendHealthCheckTimeoutSeconds
      HealthyThresholdCount: !Ref BackendHealthyThresholdCount
      UnhealthyThresholdCount: !Ref BackendUnhealthyThresholdCount
      IpAddressType: ipv4
      Matcher: 
        HttpCode: 200
      Protocol: HTTP
      ProtocolVersion: HTTP2
      TargetType: ip
      TargetGroupAttributes: 
        - Key: deregistration_delay.timeout_seconds
          Value: 0
      VpcId:
        Fn::ImportValue:
          !Sub ${NetworkingStack}VpcId
      Tags:
        - Key: target-group-name
          Value: backend
  FrontendTG:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-targetgroup.html
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      #Name: !Sub "${AWS::StackName}FrontendTG"
      Port: !Ref FrontendPort
      HealthCheckEnabled: true
      HealthCheckProtocol: !Ref FrontendHealthCheckProtocol
      HealthCheckIntervalSeconds: !Ref FrontendHealthCheckIntervalSeconds
      HealthCheckPath: !Ref FrontendHealthCheckPath
      HealthCheckPort: !Ref FrontendHealthCheckPort
      HealthCheckTimeoutSeconds: !Ref FrontendHealthCheckTimeoutSeconds
      HealthyThresholdCount: !Ref FrontendHealthyThresholdCount
      UnhealthyThresholdCount: !Ref FrontendUnhealthyThresholdCount
      IpAddressType: ipv4
      Matcher: 
        HttpCode: 200
      Protocol: HTTP
      ProtocolVersion: HTTP2
      TargetType: ip
      TargetGroupAttributes: 
        - Key: deregistration_delay.timeout_seconds
          Value: 0
      VpcId:
        Fn::ImportValue:
          !Sub ${NetworkingStack}VpcId
      Tags:
        - Key: target-group-name
          Value: frontend
Outputs:
  ClusterName:
    Value: !Ref FargateCluster
    Export:
      Name: !Sub "${AWS::StackName}ClusterName"
  ServiceSecurityGroupId:
    Value: !GetAtt ServiceSG.GroupId
    Export:
      Name: !Sub "${AWS::StackName}ServiceSecurityGroupId"
  ALBSecurityGroupId:
    Value: !GetAtt ALBSG.GroupId
    Export:
      Name: !Sub "${AWS::StackName}ALBSecurityGroupId"
  FrontendTGArn:
    Value: !Ref FrontendTG
    Export:
      Name: !Sub "${AWS::StackName}FrontendTGArn"
  BackendTGArn:
    Value: !Ref BackendTG
    Export:
      Name: !Sub "${AWS::StackName}BackendTGArn"
```
To proceed with NetworkDeploy and ClusterDeploy, remove obsolete resources, including CFN cruddur, ECS cluster, Namespace (via CloudMap), and ALB (Loadbalancer and Target Groups).

## Implement CFN TOML
TOML (Tom's Obvious, Minimal Language) is a file format used for configuration files. In order to pass the env vars inside a Cloud Formation template, we used cfn-toml. This was used to pass the `CertificationArn ` value in the `template.yaml` file in `aws/cfn/cluster` folder which was needed in order for the cluster to be deployed and following best practice instead of hardcoding it, CFN toml is used instead. 

First, installed cfn-toml using:
```sh
gem install cfn-toml
```

Updated `gitpod.yml` file with:
```sh
tasks:
  - name: CFN
    before: |
      pip install cfn-lint
      cargo install cfn-guard
      gem install cfn-toml
```

Create a new file `config.toml` and `config-toml-example` in the `aws/cfn/cluster` directoy.
```sh
[deploy]
bucket = 'cfn-artifacts-${RANDOM_STRING}'
region = '${AWS_DEFAULT_REGION}'
stack_name = 'CrdCluster'

[parameters]
CertificateArn = 'arn:aws:acm:AWS_DEFAULT_REGION:AWS_ACCOUNT_ID:certificate/73de0faa-4ce3-4d0a-84c3-e2dbf725cb76'
NetworkingStack = 'CrdNet'
```
config-toml-example
```sh
[deploy]
bucket = ''
region = ''
stack_name = ''

[parameters]
CertificateArn = ''
```
The following command can be used to get the `CertificationArn`:
```sh
aws acm list-certificates --query 'CertificateSummaryList[0].CertificateArn' --output text
```

Updated both `cluster-deploy` and `netwoking-deploy` scripts in the `bin/cfn` directory which now contains code for the `cfn-toml` with:
`cluster-deploy`
```sh
#! /usr/bin/env bash
set -e # stop execution of the script if it fails


CFN_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/cluster/template.yaml"
CONFIG_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/cluster/config.toml"
echo $CONFIG_PATH

cfn-lint $CFN_PATH

BUCKET=$(cfn-toml key deploy.bucket -t $CONFIG_PATH)
REGION=$(cfn-toml key deploy.region -t $CONFIG_PATH)
STACK_NAME=$(cfn-toml key deploy.stack_name -t $CONFIG_PATH)
PARAMETERS=$(cfn-toml params v2 -t $CONFIG_PATH)


aws cloudformation deploy \
  --stack-name $STACK_NAME \
  --template-file $CFN_PATH \
  --s3-bucket $BUCKET \
  --region $REGION \
  --no-execute-changeset \
  --tags group=cruddur-cluster \
  --parameter-overrides $PARAMETERS \
  --capabilities CAPABILITY_NAMED_IAM
```

`netwoking-deploy`
```sh
#! /usr/bin/env bash
set -e # stop execution of the script if it fails

#This script will pass the value of the main root
export THEIA_WORKSPACE_ROOT=$(pwd)

CFN_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/networking/template.yaml"
CONFIG_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/networking/config.toml"
echo $CONFIG_PATH

cfn-lint $CFN_PATH

BUCKET=$(cfn-toml key deploy.bucket -t $CONFIG_PATH)
REGION=$(cfn-toml key deploy.region -t $CONFIG_PATH)
STACK_NAME=$(cfn-toml key deploy.stack_name -t $CONFIG_PATH)
#PARAMETERS=$(cfn-toml params v2 -t $CONFIG_PATH)



cfn-lint $CFN_PATH
aws cloudformation deploy \
  --stack-name $STACK_NAME \
  --template-file $CFN_PATH \
  --s3-bucket $BUCKET \
  --region $REGION \
  --no-execute-changeset \
  --tags group=cruddur-network \
  --capabilities CAPABILITY_NAMED_IAM
```

Create new files `config.toml` and `config-toml-example` in the `aws/cfn/networking` directory.
```sh
[deploy]
bucket = 'cfn-artifacts-${RANDOM_STRING}'
region = '${AWS_DEFAULT_REGION}'
stack_name = 'CrdNet'
```
config-toml-example
```sh
[deploy]
bucket = ''
region = ''
stack_name = ''
```

## Implement CFN Service Layer for Backend
Create a new file `config.toml` in the `aws/cfn/service` directory.
```sh
[deploy]
bucket = 'cfn-artifacts-${RANDOM_STRING}'
region = '${AWS_DEFAULT_REGION}'
stack_name = 'CrdSrvBackendFlask'
```

Created another file `template.yaml` in the `aws/cfn/service` directory.
```sh
AWSTemplateFormatVersion: 2010-09-09

Description: |
  Task Definition
  Fargate Service
  Execution Role
  Task Role

Parameters:
  NetworkingStack:
    Type: String
    Description: This is our base layer of networking components eg. VPC, Subnets
    Default: CrdNet
  ClusterStack:
    Type: String
    Description: This is our cluster layer eg. ECS Cluster, ALB
    Default: CrdCluster
  ContainerPort:
    Type: Number
    Default: 4567
  ServiceCpu:
    Type: String
    Default: '256'
  ServiceMemory:
    Type: String
    Default: '512'
  ServiceName:
    Type: String
    Default: backend-flask
  ContainerName:
    Type: String
    Default: backend-flask
  TaskFamily:
    Type: String
    Default: backend-flask
  EcrImage:
    Type: String
    Default: 'AWS_ACCOUNT_ID.dkr.ecr.AWS_DEFAULT_REGION.amazonaws.com/backend-flask'
  EnvOtelServiceName:
    Type: String
    Default: backend-flask
  EnvOtelExporterOtlpEndpoint:
    Type: String
    Default: https://api.honeycomb.io
  EnvAWSCognitoUserPoolId:
    Type: String
    Default: us-east-1_nCzleL11X
  EnvCognitoUserPoolClientId:
    Type: String
    Default: 6rvluth75jaeg605hblpdhqmbq
  EnvFrontendUrl:
    Type: String
    Default: "*"
  EnvBackendUrl:
    Type: String
    Default: "*"
  SecretsAWSAccessKeyId:
    Type: String
    Default: 'arn:aws:ssm:AWS_DEFAULT_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/AWS_ACCESS_KEY_ID'
  SecretsSecretAccessKey:
    Type: String
    Default: 'arn:aws:ssm:AWS_DEFAULT_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/AWS_SECRET_ACCESS_KEY'
  SecretsConnectionUrl:
    Type: String
    Default: 'arn:aws:ssm:AWS_DEFAULT_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/CONNECTION_URL'
  SecretsRollbarAccessToken:
    Type: String
    Default: 'arn:aws:ssm:AWS_DEFAULT_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/ROLLBAR_ACCESS_TOKEN'
  SecretsOtelExporterOltpHeaders:
    Type: String
    Default: 'arn:aws:ssm:AWS_DEFAULT_REGION:AWS_ACCOUNT_ID:parameter/cruddur/backend-flask/OTEL_EXPORTER_OTLP_HEADERS'
  
Resources:
  FargateService:
  # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-service.html
    Type: AWS::ECS::Service
    Properties:
      Cluster:
        Fn::ImportValue:
          !Sub "${ClusterStack}ClusterName"
      DeploymentController:
        Type: ECS
      DesiredCount: 1
      EnableECSManagedTags: true
      EnableExecuteCommand: true
      HealthCheckGracePeriodSeconds: 0
      LaunchType: FARGATE
      LoadBalancers:
        - TargetGroupArn:
            Fn::ImportValue:
              !Sub "${ClusterStack}BackendTGArn"
          ContainerName: 'backend-flask'
          ContainerPort: !Ref ContainerPort
      NetworkConfiguration:
        AwsvpcConfiguration:
          AssignPublicIp: ENABLED
          SecurityGroups:
            - Fn::ImportValue:
                !Sub "${ClusterStack}ServiceSecurityGroupId"
          Subnets:
            Fn::Split:
              - ","
              - Fn::ImportValue:
                  !Sub "${NetworkingStack}PublicSubnetIds"
      PlatformVersion: LATEST
      PropagateTags: SERVICE
      ServiceConnectConfiguration:
        Enabled: true
        Namespace: "cruddur"
        # TODO - If you want to log
        # LogConfiguration
        Services:
          - DiscoveryName: backend-flask
            PortName: backend-flask
            ClientAliases:
              - Port: !Ref ContainerPort
      #ServiceRegistries:
      #  - RegistryArn: !Sub 'arn:aws:servicediscovery:${AWS::Region}:${AWS::AccountId}:service/srv-cruddur-backend-flask'
      #    Port: !Ref ContainerPort
      #    ContainerName: 'backend-flask'
      #    ContainerPort: !Ref ContainerPort
      ServiceName: !Ref ServiceName
      TaskDefinition: !Ref TaskDefinition

  TaskDefinition:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-taskdefinition.html
    Type: 'AWS::ECS::TaskDefinition'
    Properties:
      Family: !Ref TaskFamily
      ExecutionRoleArn: !GetAtt ExecutionRole.Arn
      TaskRoleArn: !GetAtt TaskRole.Arn
      NetworkMode: 'awsvpc'
      Cpu: !Ref ServiceCpu
      Memory: !Ref ServiceMemory
      RequiresCompatibilities:
        - 'FARGATE'
      ContainerDefinitions:
        - Name: 'xray'
          Image: 'public.ecr.aws/xray/aws-xray-daemon'
          Essential: true
          User: '1337'
          PortMappings:
            - Name: 'xray'
              ContainerPort: 2000
              Protocol: 'udp'
        - Name: 'backend-flask'
          Image: !Ref EcrImage 
          Essential: true
          HealthCheck:
            Command:
              - 'CMD-SHELL'
              - 'python /backend-flask/bin/health-check'
            Interval: 30
            Timeout: 5
            Retries: 3
            StartPeriod: 60
          PortMappings:
            - Name: !Ref ContainerName
              ContainerPort: !Ref ContainerPort
              Protocol: 'tcp'
              AppProtocol: 'http'
          LogConfiguration:
            LogDriver: 'awslogs'
            Options:
              awslogs-group: 'cruddur'
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: !Ref ServiceName
          Environment:
            - Name: 'OTEL_SERVICE_NAME'
              Value: !Ref EnvOtelServiceName
            - Name: 'OTEL_EXPORTER_OTLP_ENDPOINT'
              Value: !Ref EnvOtelExporterOtlpEndpoint
            - Name: 'AWS_COGNITO_USER_POOL_ID'
              Value: !Ref EnvAWSCognitoUserPoolId
            - Name: 'AWS_COGNITO_USER_POOL_CLIENT_ID'
              Value: !Ref EnvCognitoUserPoolClientId
            - Name: 'FRONTEND_URL'
              Value: !Ref EnvFrontendUrl
            - Name: 'BACKEND_URL'
              Value: !Ref EnvBackendUrl
            - Name: 'AWS_DEFAULT_REGION'
              Value: !Ref AWS::Region
          Secrets:
            - Name: 'AWS_ACCESS_KEY_ID'
              ValueFrom: !Ref SecretsAWSAccessKeyId
            - Name: 'AWS_SECRET_ACCESS_KEY'
              ValueFrom: !Ref SecretsSecretAccessKey
            - Name: 'CONNECTION_URL'
              ValueFrom: !Ref SecretsConnectionUrl
            - Name: 'ROLLBAR_ACCESS_TOKEN'
              ValueFrom: !Ref SecretsRollbarAccessToken
            - Name: 'OTEL_EXPORTER_OTLP_HEADERS'
              ValueFrom: !Ref SecretsOtelExporterOltpHeaders
  ExecutionRole:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html
    Type: AWS::IAM::Role
    Properties:
      RoleName: CruddurServiceExecutionRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: 'Allow'
            Principal:
              Service: 'ecs-tasks.amazonaws.com'
            Action: 'sts:AssumeRole'
      Policies:
        - PolicyName: 'cruddur-execution-policy'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Sid: 'VisualEditor0'
                Effect: 'Allow'
                Action:
                  - 'ecr:GetAuthorizationToken'
                  - 'ecr:BatchCheckLayerAvailability'
                  - 'ecr:GetDownloadUrlForLayer'
                  - 'ecr:BatchGetImage'
                  - 'logs:CreateLogStream'
                  - 'logs:PutLogEvents'
                Resource: '*'
              - Sid: 'VisualEditor1'
                Effect: 'Allow'
                Action:
                  - 'ssm:GetParameters'
                  - 'ssm:GetParameter'
                Resource: !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/cruddur/${ServiceName}/*'
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
  TaskRole:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html
    Type: AWS::IAM::Role
    Properties:
      RoleName: CruddurServiceTaskRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: 'Allow'
            Principal:
              Service: 'ecs-tasks.amazonaws.com'
            Action: 'sts:AssumeRole'
      Policies:
        - PolicyName: 'cruddur-task-policy'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Sid: 'VisualEditor0'
                Effect: 'Allow'
                Action:
                  - ssmmessages:CreateControlChannel
                  - ssmmessages:CreateDataChannel
                  - ssmmessages:OpenControlChannel
                  - ssmmessages:OpenDataChannel
                Resource: '*'
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
        - arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess
#Outputs:
#  ServiceSecurityGroupId:
#    Value: !GetAtt  ServiceSG.GroupId
#    Export:
#      Name: !Sub "${AWS::StackName}ServiceSecurityGroupId"
```
Create a new bash script file `service-deploy` in the `bin/cfn` directory.
```sh
#! /usr/bin/env bash
set -e # stop execution of the script if it fails

#This script will pass the value of the main root
export THEIA_WORKSPACE_ROOT=$(pwd)


CFN_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/service/template.yaml"
CONFIG_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/service/config.toml"
echo $CONFIG_PATH

cfn-lint $CFN_PATH

BUCKET=$(cfn-toml key deploy.bucket -t $CONFIG_PATH)
REGION=$(cfn-toml key deploy.region -t $CONFIG_PATH)
STACK_NAME=$(cfn-toml key deploy.stack_name -t $CONFIG_PATH)
#PARAMETERS=$(cfn-toml params v2 -t $CONFIG_PATH)



aws cloudformation deploy \
  --stack-name $STACK_NAME \
  --template-file $CFN_PATH \
  --s3-bucket $BUCKET \
  --region $REGION \
  --no-execute-changeset \
  --tags group=cruddur-backend-flask \
  --capabilities CAPABILITY_NAMED_IAM \
  # --parameter-overrides $PARAMETERS \
```
Deploy Service Layer and before approving the changeset delete existing policies/roles in AWS listed below.

- CruddurTaskRole
- CruddurServiceExecutionRole

## Implement CFN Database Layer (RDS)
Create a new file `template.yaml` and folder `db` in the `aws/cfn` directory.
```sh
AWSTemplateFormatVersion: 2010-09-09

Description: |
  Database in RDS Postgres component for the application
  - RDS Instance
  - Database Security Group
  - DB Subnetgroup

Parameters:
  NetworkingStack:
    Type: String
    Description: This is the base layer of networking components
    Default: CrdNet
  ClusterStack:
    Type: String
    Description: This is the Cluster Layer 
    Default: CrdCluster
  BackupRetentionPeriod:
    Type: Number
    Default: 0
  DBInstanceClass:
    Type: String
    Default: db.t4g.micro
  DBInstanceIdentifier:
    Type: String
    Default: cruddur-instance
  DBName:
    Type: String
    Default: cruddur
  DeletionProtection:
  #set this in on true for production
    Type: String
    AllowedValues:
         - true
         - false
    Default: false
  EngineVersion:
    Type: String
    #  DB Proxy only supports very specific versions of Postgres
    #  https://stackoverflow.com/questions/63084648/which-rds-db-instances-are-supported-for-db-proxy
    Default: '15.3'
  MasterUsername:
    Type: String

  MasterUserPassword:
    Type: String
    NoEcho: true 

Resources:
  RDSPostgresSG:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub "${AWS::StackName}RDSSG"
      GroupDescription: Security Group RDS
      VpcId:
        Fn::ImportValue:
          !Sub ${NetworkingStack}VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          SourceSecurityGroupId:
            Fn::ImportValue:
              !Sub ${ClusterStack}ServiceSecurityGroupId
          FromPort: 5432
          ToPort: 5432
          Description: Security Group Cluster
  DBSubnetGroup:
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbsubnetgroup.html
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupName: !Sub "${AWS::StackName}DBSubnetGroup"
      DBSubnetGroupDescription: !Sub "${AWS::StackName}DBSubnetGroup"
      SubnetIds: { 'Fn::Split' : [ ','  , { "Fn::ImportValue": { "Fn::Sub": "${NetworkingStack}PublicSubnetIds" }}] }
  

  Database:
    #https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html
    Type: AWS::RDS::DBInstance
    # Remember to change this back to snapshot for production
    # cant use !Ref on DeletionPolicy and Condition Stacks
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html
    #DeletionPolicy: 'Snapshot'
    # https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-updatereplacepolicy.html
    #UpdateReplacePolicy: 'Snapshot'
    Properties:
      AllocatedStorage: '20'
      AllowMajorVersionUpgrade: true
      AutoMinorVersionUpgrade: true
      BackupRetentionPeriod: !Ref  BackupRetentionPeriod
      DBInstanceClass: !Ref DBInstanceClass
      DBInstanceIdentifier: !Ref DBInstanceIdentifier
      DBName: !Ref DBName
      DBSubnetGroupName: !Ref DBSubnetGroup
      DeletionProtection: !Ref DeletionProtection
      EnablePerformanceInsights: true
      Engine: postgres
      EngineVersion: !Ref EngineVersion


# Must be 1 to 63 letters or numbers.
# First character must be a letter.
# Can't be a reserved word for the chosen database engine.
      MasterUsername:  !Ref MasterUsername
      # Constraints: Must contain from 8 to 128 characters.
      MasterUserPassword: !Ref MasterUserPassword
      PubliclyAccessible: true
      VPCSecurityGroups:
        - !GetAtt RDSPostgresSG.GroupId
#Outputs:
#  ServiceSecurityGroupId:
#    Value: !GetAtt ServiceSG.GroupId
#    Export:
#      Name: !Sub "${AWS::StackName}ServiceSecurityGroupId"
```

Create a bash script `service-deploy` in the `bin/cfn` directory.
```sh
#! /usr/bin/env bash
set -e # stop execution of the script if it fails

#This script will pass the value of the main root
export THEIA_WORKSPACE_ROOT=$(pwd)


CFN_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/db/template.yaml"
CONFIG_PATH="$THEIA_WORKSPACE_ROOT/aws/cfn/db/config.toml"
echo $CONFIG_PATH

cfn-lint $CFN_PATH

BUCKET=$(cfn-toml key deploy.bucket -t $CONFIG_PATH)
REGION=$(cfn-toml key deploy.region -t $CONFIG_PATH)
STACK_NAME=$(cfn-toml key deploy.stack_name -t $CONFIG_PATH)
PARAMETERS=$(cfn-toml params v2 -t $CONFIG_PATH)


aws cloudformation deploy \
  --stack-name $STACK_NAME \
  --template-file $CFN_PATH \
  --s3-bucket $BUCKET \
  --region $REGION \
  --no-execute-changeset \
  --tags group=cruddur-database \
  --parameter-overrides $PARAMETERS MasterUserPassword=$DB_PASSWORD \
  --capabilities CAPABILITY_NAMED_IAM
```

**Note**
- Make sure to export DB_PASSWORD as env var.
- After the deployment, ensure to update the connection URL in the parameter store to utilize the new RDS endpoint.
- Delete old RDS instance.
- Update Route53 main domain and api. subdomain to point to new load balancer (this can be automated using a bash script) and visit the api health check.

The following command can be used to generate a new password for RDS:
```sh
export DB_PASSWORD=$(aws secretsmanager get-random-password \
--exclude-punctuation \
--password-length 41 --require-each-included-type \
--output text \
--query RandomPassword)

echo $DB_PASSWORD

#save the env var on gitpod
gp env MasterUserPassword=$DB_PASSWORD
```

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/7a5bd05a-61d8-4336-9f2c-9a81190666a7)


