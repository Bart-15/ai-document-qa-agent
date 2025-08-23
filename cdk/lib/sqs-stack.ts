import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as cdk from "aws-cdk-lib";

export class SQSStack extends Stack {
  public readonly documentProcessingQueue: sqs.Queue;
  public readonly documentProcessingDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create DLQ for failed processing
    this.documentProcessingDLQ = new sqs.Queue(this, "DocumentProcessingDLQ", {
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
          queue: this.documentProcessingDLQ,
          maxReceiveCount: 3,
        },
      }
    );
  }
}
