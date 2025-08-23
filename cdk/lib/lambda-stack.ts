import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import "dotenv/config";

interface LambdaStackProps extends StackProps {
  bucket: s3.IBucket;
}

export class LambdaStack extends Stack {
  public readonly getPresignedUrlFunction: NodejsFunction;
  public readonly askDocumentFunction: NodejsFunction;
  public readonly processDocumentFunction: NodejsFunction;
  public readonly processChunkFunction: NodejsFunction;
  public readonly documentProcessingQueue: sqs.Queue;
  public readonly streamAskDocumentFunction: NodejsFunction;

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
        PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
        PINECONE_INDEX: process.env.PINECONE_INDEX!,
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
          ALLOWED_ORIGINS:
            process.env.ALLOWED_ORIGINS ?? "http://localhost:5173/",
          BUCKET_NAME: props.bucket.bucketName,
          PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
          PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT!,
          PINECONE_INDEX: process.env.PINECONE_INDEX!,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
          DOCUMENT_PROCESSING_QUEUE_URL:
            process.env.DOCUMENT_PROCESSING_QUEUE_URL!,
        },
      }
    );

    // Create DLQ for failed processing
    const dlq = new sqs.Queue(this, "DocumentProcessingDLQ", {
      queueName: "document-processing-dlq",
      retentionPeriod: cdk.Duration.days(14),
    });

    // Create main processing queue
    this.documentProcessingQueue = new sqs.Queue(
      this,
      "DocumentProcessingQueue",
      {
        queueName: "document-processing-queue",
        visibilityTimeout: cdk.Duration.minutes(5),
        deadLetterQueue: {
          queue: dlq,
          maxReceiveCount: 3,
        },
      }
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
          ALLOWED_ORIGINS:
            process.env.ALLOWED_ORIGINS ?? "http://localhost:5173/",
          PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
          PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT!,
          PINECONE_INDEX: process.env.PINECONE_INDEX!,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
        },
      }
    );

    // Add SQS trigger to chunk processing Lambda
    this.processChunkFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.documentProcessingQueue, {
        batchSize: 10,
      })
    );

    if (props.bucket) {
      props.bucket.grantRead(this.processDocumentFunction);
      props.bucket.grantRead(this.processChunkFunction);
      props.bucket.grantReadWrite(this.getPresignedUrlFunction);
    }

    // Grant SQS permissions
    this.documentProcessingQueue.grantSendMessages(
      this.processDocumentFunction
    );
    this.documentProcessingQueue.grantConsumeMessages(
      this.processChunkFunction
    );
  }
}
