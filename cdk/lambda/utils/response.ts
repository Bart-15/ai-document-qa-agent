import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { getEnvironmentConfig } from "../../config/environment";

const validateOrigin = (requestOrigin: string | undefined): string => {
  const { allowedOrigins } = getEnvironmentConfig();

  if (!requestOrigin) {
    return allowedOrigins[0]; // Default to first allowed origin
  }

  // Return the actual origin if it's allowed, otherwise return first allowed origin
  return allowedOrigins.includes(requestOrigin.trim())
    ? requestOrigin.trim()
    : allowedOrigins[0];
};

export function createResponse<T>(
  statusCode: number,
  body: Partial<T>,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult {
  const origin = event?.headers?.["origin"] || event?.headers?.["Origin"];
  const allowedOrigin = validateOrigin(origin);

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      Vary: "Origin",
    },
    body: JSON.stringify(body),
  };
}
