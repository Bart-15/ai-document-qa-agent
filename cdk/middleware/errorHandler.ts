import { ZodError } from "zod";
import { APIGatewayProxyResult, APIGatewayProxyEventV2 } from "aws-lambda";
import { getEnvironmentConfig } from "../config/environment";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  Vary: "Origin",
};

const validateOrigin = (requestOrigin: string | undefined): string => {
  const { allowedOrigins } = getEnvironmentConfig();

  if (!requestOrigin) {
    return allowedOrigins[0];
  }

  return allowedOrigins.includes(requestOrigin.trim())
    ? requestOrigin.trim()
    : allowedOrigins[0];
};

export function createResponse<T>(
  statusCode: number,
  body: Partial<T>,
  event?: APIGatewayProxyEventV2
): APIGatewayProxyResult {
  const origin = event?.headers?.["origin"] || event?.headers?.["Origin"];
  const allowedOrigin = validateOrigin(origin);

  return {
    statusCode,
    headers: {
      ...headers,
      "Access-Control-Allow-Origin": allowedOrigin,
    },
    body: JSON.stringify(body),
  };
}

export function handleError(error: unknown, event?: APIGatewayProxyEventV2) {
  if (error instanceof ZodError) {
    const errMessages = error.issues.map((issue) => ({
      field: issue.path[0],
      message: issue.message,
    }));
    return createResponse(400, { errors: errMessages }, event);
  }

  //TODO: Add more error handling

  if (error instanceof SyntaxError) {
    return createResponse(
      400,
      {
        error: `Invalid request body format : "${error.message}"`,
      },
      event
    );
  }

  if (error instanceof Error) {
    return createResponse(500, { message: error.message }, event);
  }

  throw error;
}
