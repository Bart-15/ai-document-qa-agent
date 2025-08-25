import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { S3Stack } from "../lib/s3-stack";

describe("S3Stack", () => {
  let s3StackTemplate: Template;

  beforeEach(() => {
    jest.resetAllMocks();
    const testApp = new App({
      outdir: "cdk.out",
    });

    const stack = new S3Stack(testApp, "test-stack");
    s3StackTemplate = Template.fromStack(stack);
  });

  it("creates an S3 bucket with correct configuration", () => {
    s3StackTemplate.hasResourceProperties("AWS::S3::Bucket", {
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "HEAD"],
            AllowedOrigins: ["*"],
            ExposedHeaders: ["ETag"],
          },
        ],
      },
      LifecycleConfiguration: {
        Rules: [
          {
            Enabled: true,
            ExpirationInDays: 1,
          },
        ],
      },
    });
  });

  it("configures bucket with correct removal policy", () => {
    s3StackTemplate.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Delete",
      UpdateReplacePolicy: "Delete",
    });
  });

  it("creates bucket with auto-delete objects", () => {
    s3StackTemplate.resourceCountIs("Custom::S3AutoDeleteObjects", 1);
  });
});
