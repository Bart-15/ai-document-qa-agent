import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "./utils/response";
import "dotenv/config";
import fs from "fs";
import path from "path";

import { S3Service } from "./services/s3.service";
import { PineconeService } from "./services/pinecone.service";
import { DocumentProcessingService } from "./services/document-processing.service";

// Initialize services
const s3Service = new S3Service();
const pineconeService = new PineconeService();
const documentService = new DocumentProcessingService();

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

    // Process document and generate embeddings
    const { chunks, embeddings } = await documentService.processDocument(
      tmpFilePath
    );

    // Prepare vectors for Pinecone
    const vectors = embeddings.map((values, i) => ({
      id: `${body.key}-${i}`,
      values,
      metadata: {
        text: chunks[i].pageContent,
        source: body.key,
      },
    }));

    // Store vectors in Pinecone
    await pineconeService.upsertVectors(process.env.PINECONE_INDEX!, vectors);

    return createResponse(200, {
      message: "Document processed successfully",
      chunks: chunks.length,
      documentKey: body.key,
    });
  } catch (error) {
    return createResponse(500, {
      message: `Failed to process document: ${error}`,
    });
  } finally {
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }

    console.log("tempFile cleaned", tmpFilePath);
  }
};
