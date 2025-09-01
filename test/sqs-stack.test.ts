import { App, Duration } from "aws-cdk-lib";
import { Capture, Match, Template } from "aws-cdk-lib/assertions";

import { SQSStack } from "../lib/sqs-stack";

describe("SQSStack", () => {
  let sqsStackTemplate: Template;

  beforeEach(() => {
    jest.resetAllMocks();
    const testApp = new App({
      outdir: "cdk.out",
    });

    const stack = new SQSStack(testApp, "test-stack");
    sqsStackTemplate = Template.fromStack(stack);
  });

  it("creates DLQ with correct configuration", () => {
    sqsStackTemplate.hasResourceProperties(
      "AWS::SQS::Queue",
      Match.objectLike({
        QueueName: Match.exact("document-processing-dlq"),
        MessageRetentionPeriod: Duration.days(14).toSeconds(),
      }),
    );
  });

  it("creates main queue with correct configuration", () => {
    const dlqArnCapture = new Capture();

    sqsStackTemplate.hasResourceProperties(
      "AWS::SQS::Queue",
      Match.objectLike({
        QueueName: Match.exact("document-processing-queue"),
        VisibilityTimeout: Duration.minutes(5).toSeconds(),
        RedrivePolicy: Match.objectLike({
          maxReceiveCount: Match.exact(3),
          deadLetterTargetArn: dlqArnCapture,
        }),
      }),
    );
  });

  it("creates exactly two SQS queues", () => {
    sqsStackTemplate.resourceCountIs("AWS::SQS::Queue", 2);
  });
});
