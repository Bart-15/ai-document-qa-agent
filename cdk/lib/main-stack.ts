import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { S3Stack } from "./s3-stack";
import { LambdaStack } from "./lambda-stack";
import { ApiGatewayStack } from "./api-gw-stack";
import { SQSStack } from "./sqs-stack";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for document storage
    const s3Stack = new S3Stack(this, "S3Stack");

    // Create SQS queues for document processing
    const sqsStack = new SQSStack(this, "SQSStack");

    // Create Lambda functions
    const lambdaStack = new LambdaStack(this, "LambdaStack", {
      bucket: s3Stack.bucket,
      documentProcessingQueue: sqsStack.documentProcessingQueue,
    });

    // Create API Gateway
    new ApiGatewayStack(this, "ApiGatewayStack", {
      getPresignedUrlFunction: lambdaStack.getPresignedUrlFunction,
      processDocumentFunction: lambdaStack.processDocumentFunction,
      askDocumentFunction: lambdaStack.askDocumentFunction,
    });
  }
}
