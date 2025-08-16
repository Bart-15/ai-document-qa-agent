import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { S3Stack } from "./s3-stack";
import { LambdaStack } from "./lambda-stack";
import { ApiGatewayStack } from "./api-gw-stack";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3Stack = new S3Stack(this, "S3Stack");

    const lambdaStack = new LambdaStack(this, "LambdaStack", {
      bucket: s3Stack.bucket,
    });

    new ApiGatewayStack(this, "ApiGatewayStack", {
      getPresignedUrlFunction: lambdaStack.getPresignedUrlFunction,
      askDocumentFunction: lambdaStack.askDocumentFunction,
      processDocumentFunction: lambdaStack.processDocumentFunction,
    });
  }
}
