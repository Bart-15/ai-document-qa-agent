import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { DynamoDBStack } from "../lib/dynamodb-stack";

describe("DynamoDBStack", () => {
  let dynamoDBStackTemplate: Template;

  beforeEach(() => {
    jest.resetAllMocks();
    const testApp = new App({
      outdir: "cdk.out",
    });

    const stack = new DynamoDBStack(testApp, "test-stack");
    dynamoDBStackTemplate = Template.fromStack(stack);
  });

  test("Session table is created with correct configuration", () => {
    dynamoDBStackTemplate.hasResourceProperties("AWS::DynamoDB::Table", {
      KeySchema: [
        { AttributeName: "userId", KeyType: "HASH" },
        { AttributeName: "sessionId", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "userId", AttributeType: "S" },
        { AttributeName: "sessionId", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      TimeToLiveSpecification: {
        AttributeName: "ttl",
        Enabled: true,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: "SessionIdIndex",
          KeySchema: [{ AttributeName: "sessionId", KeyType: "HASH" }],
          Projection: {
            ProjectionType: "ALL",
          },
        },
      ],
    });
  });

  test("Table has correct removal policy", () => {
    dynamoDBStackTemplate.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Delete",
    });
  });
});
