import "dotenv/config";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Service } from "./services/s3.service";
import { createResponse } from "./utils/response";

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
    const contentType = body.contentType || "image/jpeg";
    const extension = contentType.split("/")[1] || "jpg";

    const fileName = s3Service.generateFileName(extension);
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
