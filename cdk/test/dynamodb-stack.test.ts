import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";

import { DynamoDBStack } from "../lib/dynamodb-stack";

describe("DynamoDBStack", () => {
  let template: Template;

  beforeEach(() => {
    const app = new App();
    const stack = new DynamoDBStack(app, "TestStack");
    template = Template.fromStack(stack);
  });

  it("creates a DynamoDB table", () => {
    const resources = template.findResources("AWS::DynamoDB::Table");
    expect(Object.keys(resources).length).toBe(1);

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: Match.arrayWith([
        Match.objectLike({
          AttributeName: "userId",
          AttributeType: "S",
        }),
      ]),
    });
  });
});
