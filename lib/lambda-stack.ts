import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import * as path from "path";

import { getSanitizedConfig } from "../config/environment";

const config = getSanitizedConfig(["PINECONE_INDEX"]);

interface LambdaStackProps extends StackProps {
  bucket: s3.IBucket;
  documentProcessingQueue: sqs.IQueue;
  sessionTable: dynamodb.ITable;
}

export class LambdaStack extends Stack {
  public readonly getPresignedUrlFunction: NodejsFunction;
  public readonly askDocumentFunction: NodejsFunction;
  public readonly processDocumentFunction: NodejsFunction;
  public readonly processChunkFunction: NodejsFunction;
  public readonly streamAskDocumentFunction: NodejsFunction;
  public readonly getSessionFunction: NodejsFunction;

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
      },
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
        ALLOWED_ORIGINS: "http://localhost:5173/",
        PINECONE_INDEX: config.PINECONE_INDEX!,
        SESSION_TABLE_NAME: props.sessionTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    this.processDocumentFunction = new NodejsFunction(
      this,
      "ProcessDocumentFunction",
      {
        runtime: Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/processDocument.handler.ts"),
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
          externalModules: ["aws-sdk"],
          forceDockerBundling: false,
        },
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        environment: {
          ALLOWED_ORIGINS: "http://localhost:5173/",
          BUCKET_NAME: props.bucket.bucketName,
          PINECONE_INDEX: config.PINECONE_INDEX!,
          DOCUMENT_PROCESSING_QUEUE_URL: props.documentProcessingQueue.queueUrl,
        },
      },
    );

    // Create chunk processing Lambda
    this.processChunkFunction = new NodejsFunction(
      this,
      "ProcessChunkFunction",
      {
        runtime: Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/processChunk.handler.ts"),
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
          externalModules: ["aws-sdk"],
          forceDockerBundling: false,
        },
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        environment: {
          ALLOWED_ORIGINS: "http://localhost:5173/",
          PINECONE_INDEX: config.PINECONE_INDEX!,
        },
      },
    );

    // Create chunk processing Lambda
    this.getSessionFunction = new NodejsFunction(this, "GetSessionFunction", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getSession.handler.ts"),
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020",
        externalModules: ["aws-sdk"],
        forceDockerBundling: false,
      },
      environment: {
        ALLOWED_ORIGINS: "http://localhost:5173/",
        SESSION_TABLE_NAME: props.sessionTable.tableName,
      },
    });

    // Grant SSM permissions
    const ssmPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["ssm:GetParameter"],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/ai-qa-agent/dev/*`,
      ],
    });
    this.askDocumentFunction.addToRolePolicy(ssmPolicy);
    this.processDocumentFunction.addToRolePolicy(ssmPolicy);
    this.processChunkFunction.addToRolePolicy(ssmPolicy);
    this.getSessionFunction.addToRolePolicy(ssmPolicy);
    this.getPresignedUrlFunction.addToRolePolicy(ssmPolicy);

    const kmsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["kms:Decrypt"],
      resources: ["*"], // or the specific KMS key ARN if using custom
    });
    this.askDocumentFunction.addToRolePolicy(kmsPolicy);
    this.processDocumentFunction.addToRolePolicy(kmsPolicy);
    this.processChunkFunction.addToRolePolicy(kmsPolicy);
    this.getSessionFunction.addToRolePolicy(kmsPolicy);
    this.getPresignedUrlFunction.addToRolePolicy(kmsPolicy);

    // Add SQS trigger to chunk processing Lambda
    this.processChunkFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(props.documentProcessingQueue, {
        batchSize: 10,
      }),
    );

    if (props.bucket) {
      props.bucket.grantRead(this.processDocumentFunction);
      props.bucket.grantRead(this.processChunkFunction);
      props.bucket.grantReadWrite(this.getPresignedUrlFunction);
    }

    // Grant DynamoDB permissions
    props.sessionTable.grantReadWriteData(this.askDocumentFunction);
    props.sessionTable.grantReadWriteData(this.getSessionFunction);

    // Grant SQS permissions
    props.documentProcessingQueue.grantSendMessages(
      this.processDocumentFunction,
    );
    props.documentProcessingQueue.grantConsumeMessages(
      this.processChunkFunction,
    );
  }
}
