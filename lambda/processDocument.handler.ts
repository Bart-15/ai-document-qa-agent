import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { createResponse, handleError } from "../middleware/errorHandler";
import validateResource from "../middleware/validateResource";
import { DocumentProcessingService } from "./services/document-processing.service";
import { S3Service } from "./services/s3.service";
import { SSMParameterService } from "./services/ssm-parameter.service";
import {
  ProcessDocumentInput,
  processDocumentSchema,
} from "./validation/processDocument.validation";

dotenv.config();

// Initialize services
const ssmService = new SSMParameterService();
const s3Service = new S3Service();
const documentService = new DocumentProcessingService(ssmService);
const sqsClient = new SQSClient({});

const BATCH_SIZE = 10; // Number of messages to send in each batch

/**
 * Processes a document by downloading from S3, splitting into chunks, and sending to SQS for embedding.
 * @param {APIGatewayProxyEventV2} event - API Gateway event containing documentKey.
 * @returns {Promise<APIGatewayProxyResultV2>} API response with processing status or error info.
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  let tmpFilePath: string | undefined;

  try {
    // Validate request
    if (!event.body) {
      return createResponse(400, { message: "Request body is required" });
    }

    const body: ProcessDocumentInput = JSON.parse(event.body);

    validateResource(processDocumentSchema, body);

    const { documentKey } = body;

    if (!documentKey) {
      return createResponse(400, {
        message: "Document key is required in request body",
      });
    }

    // Get file from S3
    const s3Response = await s3Service.getObject(documentKey);
    if (!s3Response.Body) {
      return createResponse(500, { message: "S3 returned empty body" });
    }

    // Save to temp file for processing
    const buffer = await s3Response.Body.transformToByteArray();
    tmpFilePath = path.join("/tmp", path.basename(documentKey));
    fs.writeFileSync(tmpFilePath, Buffer.from(buffer));

    // Split document into chunks
    const { chunks } = await documentService.processDocument(tmpFilePath);

    // Send chunks to SQS in batches
    const queueUrl = process.env.DOCUMENT_PROCESSING_QUEUE_URL;

    let processedChunks = 0;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const entries = batch.map((chunk, index) => ({
        Id: `${i + index}`,
        MessageBody: JSON.stringify({
          chunk: chunk.pageContent,
          documentKey: documentKey,
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
          chunks.length / BATCH_SIZE,
        )}`,
      );
    }

    return createResponse(202, {
      message: "Document processing started",
      status: "PROCESSING",
      documentKey: documentKey,
      totalChunks: chunks.length,
      queuedChunks: processedChunks,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return handleError(error, event);
  } finally {
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
  }
};
