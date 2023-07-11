# Week 9 — CI/CD with CodePipeline, CodeBuild and CodeDeploy

This week we will be working with CI/CD using AWS CodePipeline and CodeBuild.

- [CICD](#cicd)
- [AWS Codebuild and AWS CodePipeline](#aws-codebuild-and-aws-codePipeline)
- [Implementation of CodePipeline](#implementation-of-codepipeline)

## What is CI/CD

CI/CD, short for Continuous Integration and Continuous Deployment, is a software development approach that emphasizes automating the processes of building, testing, and deploying code changes. It aims to deliver software updates to production frequently and consistently, ensuring high quality and reducing manual effort.

A source code repository is a system for storing, versioning, and tracking changes to source code. It is a central location where all of the code for a project is stored, and it allows developers to collaborate on the code and track changes over time. eg Gtihub, Bitbucket etc. CI/CD usually requires a source code repository which is all the codes required to build an application at any given point in time no matter at what stage it is, it uses it to interact and deploy application into any given environment.

AWS services that can be used for CI/CD pipeline includes;
- Code Commit
- Code Build
- Code Deploy
- Code Pipeline

We wiil be focusing and using CodeBuild and CodePipeline.

## AWS Codebuild and AWS CodePipeline

AWS CodeBuild is a service that helps you automate the building, testing, and deploying of your code. CodeBuild provides a managed environment for building your code, so you don't have to worry about provisioning or managing servers. It is a set of scripts or actions that will automatically happen by deploying or updating an application when triggered by CodePipeline or any other external api it accepts as a way to be be triggered for making changes to an application.

AWS CodePipeline is a service that helps to automate the release process for software. CodePipeline can be used to automate the steps involved in releasing your software, such as building, testing, and deploying your code. It is basically the stage orchestrator, it orchestrates the entire flow of a CI/CD pipeline.

CodeBuild and CodePipeline work together to automate the entire software release process. CodeBuild builds your code, and CodePipeline then deploys your code to a staging or production environment.

How CodeBuild and CodePipeline work together:

- A developer commits changes to the code in a version control system, such as GitHub or Bitbucket.
- CodePipeline detects the change and triggers a build in CodeBuild.
- CodeBuild builds the code and runs tests.
- If the tests pass, CodePipeline deploys the code to a staging environment.
- The developer tests the code in the staging environment.
- If the developer is satisfied with the changes, they can approve the deployment to production.
  
CodePipeline deploys the code to production.

CodeBuild and CodePipeline can help you to:

- Automate the software release process: CodeBuild and CodePipeline can automate the steps involved in releasing your software, such as building, testing, and deploying your code. This can save you time and effort, and it can also help to ensure that your software is released in a reliable and timely manner.
- Improve the quality of your software: CodeBuild and CodePipeline can help to improve the quality of your software by running tests on your code before it is deployed. This can help to identify and fix bugs early in the development process.
- Increase the reliability of your software deployments: CodeBuild and CodePipeline can help to increase the reliability of software deployments by automating the deployment process. This can help to ensure that software is deployed in a consistent and repeatable manner.

## Implementation of CodePipeline

Created a new file `buildspec.yml` in the `backend-flask` directory;
```sh
# Buildspec runs in the build stage of your pipeline.
version: 0.2
phases:
  install:
    runtime-versions:
      docker: 20
    commands:
      - echo "cd into $CODEBUILD_SRC_DIR/backend-flask"
      - cd $CODEBUILD_SRC_DIR/backend-flask
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $IMAGE_URL
  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker image...
      - docker build -f Dockerfile.prod -t backend-flask .
      - docker tag $REPO_NAME $IMAGE_URL/$REPO_NAME
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker image..
      - docker push $IMAGE_URL/$REPO_NAME
      - cd $CODEBUILD_SRC_DIR
      - echo "imagedefinitions.json > [{\"name\":\"$CONTAINER_NAME\",\"imageUri\":\"$IMAGE_URL/$REPO_NAME\"}]" > imagedefinitions.json
      - printf "[{\"name\":\"$CONTAINER_NAME\",\"imageUri\":\"$IMAGE_URL/$REPO_NAME\"}]" > imagedefinitions.json

env:
  variables:
    AWS_ACCOUNT_ID:${AWS_ACCOUNT_ID}
    AWS_DEFAULT_REGION: us-east-1
    CONTAINER_NAME: backend-flask
    IMAGE_URL: ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
    REPO_NAME: backend-flask:latest
  

artifacts:
  files:
    - imagedefinitions.json
```

In AWS created CodeBuild and CodePipeline.

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/c966794c-03a0-44ff-86df-a78ad0639db3)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/e1a2a0b0-7087-4f05-aa09-187a44086151)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/c505a394-3743-43ae-8cc5-fb97662dbbce)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/5ec06969-910b-4cb0-93ae-033330b4dadd)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/ca7922e4-0e44-4c63-83d5-14bb4fe53e6b)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/4ee207b2-6a5c-4511-a818-7e59e57dcec2)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/eba39e5d-23c2-4bab-89e4-278d58215c84)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/0784a384-1311-4d07-8d4e-64d81879036f)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/160d9d93-94ee-42be-95d3-8966e8420349)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/d5780749-8964-438a-9f3a-a0a4a132b8f8)



AWS CodePipeline

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/130ba02e-7595-4d52-adb8-0f7a84840a9f)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/2d647b44-a7cb-4e3e-9c9f-12d4b1b78177)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/dec6c67d-5b4b-4419-b9d3-f595c8d7eab3)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/049d8261-a7ff-437c-906e-61d31a6ec390)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/30d7c37e-276d-4600-b975-64882bc03e82)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/ea684dce-a30f-449d-897a-11569e13105e)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/aec4a474-4d0c-44fb-b2d3-d7bae6663b22)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/2f575224-348b-49b8-bb46-74957c201cf9)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/03889e67-4ea2-4e98-9221-dcbea2917b4b)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/e29bc342-ad7f-4558-a22d-c05ecfa58816)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/6a162d59-41e4-4db7-8788-12bcddd0b6da)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/0318cfe4-7783-4017-9311-b79b70529eaa)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/7b3c0d39-233e-45be-a92d-d6e09bf04963)



Created and attached a policy to the `Codebuild role`with the following json policy:
```sh
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ECRPermissions",
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetRepositoryPolicy",
                "ecr:DescribeRepositories",
                "ecr:ListImages",
                "ecr:DescribeImages",
                "ecr:BatchGetImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:PutImage",
                "ecr:BatchDeleteImage"
            ],
            "Resource": "*"
        }
    ]
}
```

In Github created a branch `prod` and triggered the pipeline by pushing, pulling and merging the code. 

Updated the healthcheck in the `aap.py`file in the `backend-flask` folder with:
```sh
@app.route('/api/health-check')
def health_check():
  return {'success': True, 'ver':1 }, 200
```

The deployment was successful.

![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/abc6b5f6-263b-4dfd-8af1-d954347b989c)
![image](https://github.com/Benedicta-Onyekwere/aws-bootcamp-cruddur-2023/assets/105982108/000e68a5-1762-41a4-a263-3caa5280f7b8)




