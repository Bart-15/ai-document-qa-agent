import "dotenv/config";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

/**
 * Service for interacting with AWS S3 (upload, download, presigned URLs).
 */
export class S3Service {
  private s3Client: S3Client;

  /**
   * Creates a new S3Service instance.
   * @param {S3Client} [client] - Optional custom S3 client.
   */
  constructor(client?: S3Client) {
    this.s3Client = client || new S3Client({});
  }

  /**
   * Generates a presigned URL for uploading a file to S3.
   * @param {string} bucketName - The S3 bucket name.
   * @param {string} fileName - The file name (key).
   * @param {string} contentType - MIME type of the file.
   * @returns {Promise<string>} The presigned URL.
   */
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

  /**
   * Generates a sanitized, unique file name for S3 uploads.
   * @param {string} originalFileName - The original file name.
   * @param {string} extension - The file extension.
   * @returns {string} The generated file name.
   */
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

  /**
   * Retrieves an object from S3 by key.
   * @param {string} key - The object key in S3.
   * @returns {Promise<any>} The S3 object response.
   */
  async getObject(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: key,
    });
    return this.s3Client.send(command);
  }
}
