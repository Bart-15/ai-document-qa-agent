import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { createResponse, handleError } from "../middleware/errorHandler";
import validateResource from "../middleware/validateResource";
import { DynamoDBService } from "./services/dynamodb.service";
import {
  GetSessionInput,
  getSessionSchema,
} from "./validation/getSession.validation";

const dynamoDBService = new DynamoDBService();

/**
 * Retrieves a chat session from DynamoDB by userId and sessionId.
 * @param {APIGatewayProxyEventV2} event - API Gateway event with query parameters userId and sessionId.
 * @returns {Promise<APIGatewayProxyResultV2>} API response with session data or error info.
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.queryStringParameters) {
      return createResponse(400, { message: "Missing query parameters" });
    }

    const { userId, sessionId } = event.queryStringParameters;

    const input: GetSessionInput = {
      userId: userId ?? "",
      sessionId: sessionId ?? "",
    };

    // Validate input
    validateResource(getSessionSchema, input);

    // Get session from DynamoDB
    const session = await dynamoDBService.getSession(
      input.userId,
      input.sessionId,
    );

    if (!session) {
      return createResponse(404, { message: "Session not found" });
    }

    // Check if session is expired (optional, since DynamoDB TTL might have already removed it)
    if (session.ttl && session.ttl < Math.floor(Date.now() / 1000)) {
      return createResponse(410, { message: "Session expired" });
    }

    return createResponse(200, session);
  } catch (error) {
    console.error("❌ Error retrieving session:", error);
    return handleError(error, event);
  }
};
