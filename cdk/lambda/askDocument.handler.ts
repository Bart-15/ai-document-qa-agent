import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { OpenAIService } from "./services/openai.service";
import { PineconeService } from "./services/pinecone.service";
import { createResponse, handleError } from "../middleware/errorHandler";
import {
  AskDocumentInput,
  askDocumentSchema,
} from "./validation/askDocument.validation";
import validateResource from "../middleware/validateResource";

const openaiService = new OpenAIService();
const pineconeService = new PineconeService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const body: AskDocumentInput = event.body ? JSON.parse(event.body) : {};

    validateResource(askDocumentSchema, body);

    const { question, documentKey } = body;

    const pinceConeIndex = process.env.PINECONE_INDEX!;

    // Get embeddings
    const vector = await openaiService.generateEmbeddings(question);

    // Query Pinecone
    const queryRes = await pineconeService.queryIndex(
      pinceConeIndex,
      vector,
      5,
      documentKey
    );

    // Build context from metadata
    const context = pineconeService.getContext(queryRes.matches ?? []);

    // Get completion from OpenAI
    const answer = await openaiService.getCompletion(context ?? "", question);

    return createResponse(200, { answer });
  } catch (err) {
    console.error("❌ Error:", JSON.stringify(err, null, 2));
    return handleError(err, event);
  }
};
