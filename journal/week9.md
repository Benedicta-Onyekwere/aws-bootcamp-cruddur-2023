# Week 9 — CI/CD with CodePipeline, CodeBuild and CodeDeploy

This week we will be working with CI/CD using AWS CodePipeline, CodeBuild and CodeDeploy

### **What is CI/CD**
CI/CD, short for Continuous Integration and Continuous Deployment, is a software development approach that emphasizes automating the processes of building, testing, and deploying code changes. It aims to deliver software updates to production frequently and consistently, ensuring high quality and reducing manual effort.

 A source code repository is a system for storing, versioning, and tracking changes to source code. It is a central location where all of the code for a project is stored, and it allows developers to collaborate on the code and track changes over time. eg Gtihub, Bitbucket etc. CI/CD usually requires a source code repository which is all the codes required to build an application at any given point in time no matter at what stage it is, it uses it to interact and deploy application into any given environment.

AWS services that can be used for CI/CD pipeline includes;
- Code Commit
- Code Build
- Code Deploy
- Code Pipeline

  We wiil be focusing and using CodeBuild and CodePipeline.

### AWS Codebuild and CodePipeline

AWS CodeBuild is a service that helps you automate the building, testing, and deploying of your code. CodeBuild provides a managed environment for building your code, so you don't have to worry about provisioning or managing servers.

AWS CodePipeline is a service that helps you automate the release process for your software. CodePipeline can be used to automate the steps involved in releasing your software, such as building, testing, and deploying your code.

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
- Increase the reliability of your software deployments: CodeBuild and CodePipeline can help to increase the reliability of your software deployments by automating the deployment process. This can help to ensure that your software is deployed in a consistent and repeatable manner.

CodeBuild**: This is a set of scripts or actions that will automatically happen

