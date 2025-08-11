import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export interface ApiGatewayStackProps extends cdk.StackProps {
  getPresignedUrlFunction: lambda.IFunction;
  askDocumentFunction: lambda.IFunction;
}

export class ApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    // API Gateway REST API
    const api = new apigateway.RestApi(this, "DocumentQaApi", {
      restApiName: "Document Q&A Service",
      description: "API for uploading docs and asking AI questions",
    });

    // Upload URL endpoint
    const presignedUrl = api.root.addResource("upload-url");
    presignedUrl.addMethod(
      "GET",
      new apigateway.LambdaIntegration(props.getPresignedUrlFunction, {
        proxy: true,
      })
    );

    // Ask endpoint
    const askResource = api.root.addResource("ask");
    askResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.askDocumentFunction)
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });
  }
}
