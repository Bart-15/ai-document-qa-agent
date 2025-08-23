import "dotenv/config";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Service } from "./services/s3.service";
import { createResponse } from "./utils/response";
import { allowedTypes } from "./utils/const";

const s3Service = new S3Service();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!process.env.BUCKET_NAME) {
      return createResponse(500, {
        message: "BUCKET_NAME environment variable is not set",
      });
    }

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const contentType = body.contentType;
    const originalFileName = body.fileName;

    if (!originalFileName) {
      return createResponse(400, {
        message: "fileName is required in the request",
      });
    }

    if (!contentType || !allowedTypes[contentType]) {
      return createResponse(400, {
        message: "Invalid content type. Only PDF and DOCX files are supported.",
      });
    }

    const extension = allowedTypes[contentType];
    const fileName = s3Service.generateFileName(originalFileName, extension);
    const url = await s3Service.getPresignedUrl(
      process.env.BUCKET_NAME,
      fileName,
      contentType
    );

    return createResponse(200, {
      url,
      key: fileName,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return createResponse(500, { message: "Failed to generate upload URL" });
  }
};
