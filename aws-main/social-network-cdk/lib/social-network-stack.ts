import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SocialNetworkStack extends cdk.Stack {
  private readonly userTable: dynamodb.Table;
  private readonly profilePicturesBucket: s3.Bucket;
  private readonly likesTable: dynamodb.Table;
  private readonly likesQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use existing IAM role
    const labRole = iam.Role.fromRoleArn(this, 'Role', "arn:aws:iam::414526742113:role/LabRole", { mutable: false });

    // Use existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-03667e42a5d7ab9d0',
    });

    // Define the DynamoDB table for users
    const userTableName = 'stav-shlomit-users-table';
    this.userTable = new dynamodb.Table(this, userTableName, {
      tableName: userTableName,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    this.userTable.grantFullAccess(labRole);

    // Define the DynamoDB table for likes
    const likesTableName = 'stav-shlomit-likes-table';
    this.likesTable = new dynamodb.Table(this, likesTableName, {
      tableName: likesTableName,
      partitionKey: { name: 'profilePictureUserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'likerUserId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    this.likesTable.grantFullAccess(labRole);

    // Define the S3 bucket for profile pictures
    this.profilePicturesBucket = new s3.Bucket(this, 'ProfilePicturesBucket', {
      bucketName: 'stav-shlomit-profile-pictures',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for development; use RETAIN for production
    });

    // Define the Lambda functions
    const createUserFunction = new lambda.Function(this, 'CreateUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/createUser'),
      handler: 'createUser.handler',
      environment: {
        USER_TABLE_NAME: userTableName,
      },
      vpc: vpc,
      role: labRole,
    });

    const getUserFunction = new lambda.Function(this, 'GetUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/getUser'),
      handler: 'getUser.handler',
      environment: {
        USER_TABLE_NAME: userTableName,
      },
      vpc: vpc,
      role: labRole,
    });

    const deleteUserFunction = new lambda.Function(this, 'DeleteUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/deleteUser'),
      handler: 'deleteUser.handler',
      environment: {
        USER_TABLE_NAME: userTableName,
      },
      vpc: vpc,
      role: labRole,
    });

    const updateUserProfilePictureFunction = new lambda.Function(this, 'UpdateUserProfilePictureFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/updateUserProfilePicture'),
      handler: 'updateUserProfilePicture.handler',
      environment: {
        USER_TABLE_NAME: userTableName,
        BUCKET_NAME: this.profilePicturesBucket.bucketName,
      },
      vpc: vpc,
      role: labRole,
    });

    const serveStaticContentFunction = new lambda.Function(this, 'ServeStaticContentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/serveStaticContent'),
      handler: 'serveStaticContent.handler',
      vpc: vpc,
      role: labRole,
    });

    const getAllUsersFunction = new lambda.Function(this, 'GetAllUsersFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/getAllUsers'), // Make sure this path is correct
      handler: 'getAllUsers.handler',
      vpc: vpc,
      role: labRole,
    });

    // Define the Lambda functions for likes
    const likeProfilePictureFunction = new lambda.Function(this, 'LikeProfilePictureFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/likeProfilePicture'),
      handler: 'likeProfilePicture.handler',
      environment: {
        LIKES_TABLE_NAME: likesTableName,
      },
      vpc: vpc,
      role: labRole,
    });

    const getLikesForProfilePictureFunction = new lambda.Function(this, 'GetLikesForProfilePictureFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/getLikesForProfilePicture'),
      handler: 'getLikesForProfilePicture.handler',
      environment: {
        LIKES_TABLE_NAME: likesTableName,
      },
      vpc: vpc,
      role: labRole,
    });

    // Grant the Lambda functions appropriate permissions
    this.userTable.grantWriteData(createUserFunction);
    this.userTable.grantReadData(getUserFunction);
    this.userTable.grantWriteData(deleteUserFunction);
    this.userTable.grantWriteData(updateUserProfilePictureFunction);
    this.userTable.grantReadData(getAllUsersFunction);

    this.likesTable.grantWriteData(likeProfilePictureFunction);
    this.likesTable.grantReadData(getLikesForProfilePictureFunction);

    // Define an API Gateway to trigger the Lambda functions
    const api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: 'User Service',
      description: 'This service handles user operations.',
    });

    // Serve static content
    const staticContentIntegration = new apigateway.LambdaIntegration(serveStaticContentFunction);
    api.root.addMethod('GET', staticContentIntegration);

    // Create User API
    const createUserIntegration = new apigateway.LambdaIntegration(createUserFunction);
    api.root.addMethod('POST', createUserIntegration);

    // Get User API
    const getUserIntegration = new apigateway.LambdaIntegration(getUserFunction);
    const userResource = api.root.addResource('{userId}'); // Add a resource for /{userId}
    userResource.addMethod('GET', getUserIntegration);

    // Delete User API
    const deleteUserIntegration = new apigateway.LambdaIntegration(deleteUserFunction);
    userResource.addMethod('DELETE', deleteUserIntegration); // Add DELETE method for /{userId}

    // Update Profile Picture API
    const updateProfilePictureIntegration = new apigateway.LambdaIntegration(updateUserProfilePictureFunction);
    const updateProfilePictureResource = userResource.addResource('updateProfilePicture'); // Add /updateProfilePicture under /{userId}
    updateProfilePictureResource.addMethod('PUT', updateProfilePictureIntegration); // Add PUT method for /{userId}/updateProfilePicture

    // Add the new /users resource
    const usersResource = api.root.addResource('users');
    const getAllUsersIntegration = new apigateway.LambdaIntegration(getAllUsersFunction);
    usersResource.addMethod('GET', getAllUsersIntegration); // Add GET method for /users

    // Define Like API
    const likeProfilePictureIntegration = new apigateway.LambdaIntegration(likeProfilePictureFunction);
    const likeResource = api.root.addResource('like');
    likeResource.addMethod('POST', likeProfilePictureIntegration); // Add POST method for /like

    const getLikesForProfilePictureIntegration = new apigateway.LambdaIntegration(getLikesForProfilePictureFunction);
    const getLikesResource = userResource.addResource('likes');
    getLikesResource.addMethod('GET', getLikesForProfilePictureIntegration); // Add GET method for /likes

    // Define the SQS queue
    this.likesQueue = new sqs.Queue(this, 'LikesQueue', {
      queueName: 'stav-shlomit-likes-queue',
      visibilityTimeout: cdk.Duration.seconds(300), // Adjust as needed
      retentionPeriod: cdk.Duration.days(4), // Adjust as needed
    });

    // Grant the Lambda function permission to send messages to the SQS queue
    this.likesQueue.grantSendMessages(likeProfilePictureFunction);

    // Pass the SQS queue URL to the Lambda function as an environment variable
    likeProfilePictureFunction.addEnvironment('LIKES_QUEUE_URL', this.likesQueue.queueUrl);

    const checkMessagesFunction = new lambda.Function(this, 'CheckMessagesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/checkMessages'),
      handler: 'checkMessages.handler',
      environment: {
        LIKES_QUEUE_URL: this.likesQueue.queueUrl,
      },
      vpc: vpc,
      role: labRole,
    });
    
    // Grant the Lambda function permission to receive messages from the SQS queue
    this.likesQueue.grantConsumeMessages(checkMessagesFunction);
    
    // API Gateway Integration
    const checkMessagesIntegration = new apigateway.LambdaIntegration(checkMessagesFunction);
    const checkMessagesResourse = userResource.addResource('messages');
    checkMessagesResourse.addMethod('GET', checkMessagesIntegration);
  }
}
