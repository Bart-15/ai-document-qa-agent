import "dotenv/config";

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { createResponse, handleError } from "../middleware/errorHandler";
import validateResource from "../middleware/validateResource";
import { S3Service } from "./services/s3.service";
import { allowedTypes } from "./utils/const";
import {
  GetPresignedUrlInput,
  getPresignedUrlSchema,
} from "./validation/getPresignedUrl.validation";

const s3Service = new S3Service();

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse request body
    const body: GetPresignedUrlInput = event.body ? JSON.parse(event.body) : {};

    validateResource(getPresignedUrlSchema, body);

    const { fileName: originalFileName, contentType } = body;

    const extension = allowedTypes[contentType];
    const fileName = s3Service.generateFileName(originalFileName, extension);
    const url = await s3Service.getPresignedUrl(
      process.env.BUCKET_NAME!,
      fileName,
      contentType,
    );

    return createResponse(200, {
      url,
      key: fileName,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return handleError(error, event);
  }
};
