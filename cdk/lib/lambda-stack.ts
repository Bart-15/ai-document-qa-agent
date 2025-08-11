import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import "dotenv/config";

interface LambdaStackProps extends StackProps {
  bucket: s3.IBucket;
}

export class LambdaStack extends Stack {
  public readonly getPresignedUrlFunction: NodejsFunction;
  public readonly askDocumentFunction: NodejsFunction;
  // public readonly getStatsFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // Create the presigned URL generator function
    this.getPresignedUrlFunction = new NodejsFunction(
      this,
      "GetPresignedUrlFunction",
      {
        runtime: Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/getPresignedUrl.handler.ts"),
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
          externalModules: ["aws-sdk"],
          forceDockerBundling: false,
        },
        environment: {
          BUCKET_NAME: props.bucket.bucketName,
          ALLOWED_ORIGINS:
            process.env.ALLOWED_ORIGINS ?? "http://localhost:5173/",
        },
      }
    );

    this.askDocumentFunction = new NodejsFunction(this, "AskDocumentFunction", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/askDocument.handler.ts"),
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020",
        externalModules: ["aws-sdk"],
        forceDockerBundling: false,
      },
      environment: {
        ALLOWED_ORIGINS:
          process.env.ALLOWED_ORIGINS ?? "http://localhost:5173/",
      },
    });
  }
}
