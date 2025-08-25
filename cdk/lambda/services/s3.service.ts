import "dotenv/config";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({});

export class S3Service {
  async getPresignedUrl(
    bucketName: string,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  }

  generateFileName(originalFileName: string, extension: string): string {
    // Sanitize the original filename by removing special characters and spaces
    const sanitizedName = originalFileName
      .replace(/[^a-zA-Z0-9]/g, "-") // Replace special chars with hyphen
      .toLowerCase()
      .replace(/-+/g, "-") // Replace multiple consecutive hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens

    // Generate UUID for uniqueness
    const uuid = uuidv4();

    return `${uuid}-${sanitizedName}.${extension}`;
  }

  async getObject(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: key,
    });
    return s3Client.send(command);
  }
}
