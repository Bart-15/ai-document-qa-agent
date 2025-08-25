import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { DynamoDBStack } from "../lib/dynamodb-stack";
import { LambdaStack } from "../lib/lambda-stack";
import { S3Stack } from "../lib/s3-stack";
import { SQSStack } from "../lib/sqs-stack";

describe("LambdaStack", () => {
  let lambdaStackTemplate: Template;

  beforeEach(() => {
    jest.resetAllMocks();
    const testApp = new App({
      outdir: "cdk.out",
    });
    // Create S3 bucket for document storage
    const s3Stack = new S3Stack(testApp, "S3Stack");

    // Create SQS queues for document processing
    const sqsStack = new SQSStack(testApp, "SQSStack");

    // Create DynamoDb tables
    const dynamoDBStack = new DynamoDBStack(testApp, "DynamoDBStack");
    const stack = new LambdaStack(testApp, "test-stack", {
      bucket: s3Stack.bucket,
      documentProcessingQueue: sqsStack.documentProcessingQueue,
      sessionTable: dynamoDBStack.sessionTable,
    });

    lambdaStackTemplate = Template.fromStack(stack);
  });

  test("Lambda functions are created", () => {
    lambdaStackTemplate.resourceCountIs("AWS::Lambda::Function", 5);
  });
});
