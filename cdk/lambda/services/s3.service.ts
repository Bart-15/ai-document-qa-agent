import "dotenv/config";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

export class S3Service {
  private s3Client: S3Client;

  constructor(client?: S3Client) {
    this.s3Client = client || new S3Client({});
  }

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

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
  }

  generateFileName(originalFileName: string, extension: string): string {
    // Remove the extension from originalFileName if it exists
    const nameWithoutExtension = originalFileName.replace(/\.[^/.]+$/, "");

    // Sanitize the filename by removing special characters and spaces
    const sanitizedName = nameWithoutExtension
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
    return this.s3Client.send(command);
  }
}
