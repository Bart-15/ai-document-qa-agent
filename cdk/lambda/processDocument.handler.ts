import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "./utils/response";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";

import { DocumentProcessingService } from "./services/document-processing.service";
import { S3Service } from "./services/s3.service";

// Initialize services
const s3Service = new S3Service();
const documentService = new DocumentProcessingService();
const sqsClient = new SQSClient({});

const BATCH_SIZE = 10; // Number of messages to send in each batch

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let tmpFilePath: string | undefined;

  try {
    // Validate request
    if (!event.body) {
      return createResponse(400, { message: "Request body is required" });
    }

    const body = JSON.parse(event.body);

    if (!body.key) {
      return createResponse(400, {
        message: "Document key is required in request body",
      });
    }

    // Get file from S3
    const s3Response = await s3Service.getObject(body.key);
    if (!s3Response.Body) {
      return createResponse(500, { message: "S3 returned empty body" });
    }

    // Save to temp file for processing
    const buffer = await s3Response.Body.transformToByteArray();
    tmpFilePath = path.join("/tmp", path.basename(body.key));
    fs.writeFileSync(tmpFilePath, Buffer.from(buffer));

    // Split document into chunks
    const { chunks } = await documentService.processDocument(tmpFilePath);

    // Send chunks to SQS in batches
    const queueUrl = process.env.DOCUMENT_PROCESSING_QUEUE_URL;
    if (!queueUrl) {
      throw new Error(
        "DOCUMENT_PROCESSING_QUEUE_URL environment variable is not set"
      );
    }

    let processedChunks = 0;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const entries = batch.map((chunk, index) => ({
        Id: `${i + index}`,
        MessageBody: JSON.stringify({
          chunk: chunk.pageContent,
          documentKey: body.key,
          chunkIndex: i + index,
          totalChunks: chunks.length,
        }),
      }));

      const command = new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries,
      });

      await sqsClient.send(command);
      processedChunks += batch.length;

      console.log(
        `Sent batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          chunks.length / BATCH_SIZE
        )}`
      );
    }

    return createResponse(202, {
      message: "Document processing started",
      status: "PROCESSING",
      documentKey: body.key,
      totalChunks: chunks.length,
      queuedChunks: processedChunks,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return createResponse(500, {
      message: `Failed to process document: ${error}`,
    });
  } finally {
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
  }
};
