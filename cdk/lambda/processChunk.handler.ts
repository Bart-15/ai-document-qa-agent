import { SQSEvent, SQSHandler } from "aws-lambda";

import { getSanitizedConfig } from "../config/environment";
import { DocumentProcessingService } from "./services/document-processing.service";
import { PineconeService } from "./services/pinecone.service";

const config = getSanitizedConfig(["PINECONE_INDEX"]);

// Initialize services
const pineconeService = new PineconeService();
const documentService = new DocumentProcessingService();

interface ChunkMessage {
  chunk: string;
  documentKey: string;
  chunkIndex: number;
  totalChunks: number;
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const message: ChunkMessage = JSON.parse(record.body);

      // Generate embedding for the chunk
      const embedding = await documentService.generateEmbedding(message.chunk);

      // Prepare vector for Pinecone
      const vector = {
        id: `${message.documentKey}-${message.chunkIndex}`,
        values: embedding,
        metadata: {
          text: message.chunk,
          source: message.documentKey,
          chunkIndex: message.chunkIndex,
          totalChunks: message.totalChunks,
        },
      };

      // Store vector in Pinecone
      await pineconeService.upsertVectors(config.PINECONE_INDEX!, [vector]);

      console.log(
        `Successfully processed chunk ${message.chunkIndex + 1}/${
          message.totalChunks
        } for document ${message.documentKey}`,
      );
    }
  } catch (error) {
    console.error("Error processing chunks:", error);
    throw error; // Re-throw to trigger SQS retry
  }
};
