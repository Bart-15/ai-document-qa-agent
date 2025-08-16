import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import "dotenv/config";

const s3Client = new S3Client({});

export class S3Service {
  async getPresignedUrl(
    bucketName: string,
    fileName: string,
    contentType: string
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  }

  generateFileName(extension: string): string {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}.${extension}`;
  }

  async getObject(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: key,
    });
    return s3Client.send(command);
  }
}
