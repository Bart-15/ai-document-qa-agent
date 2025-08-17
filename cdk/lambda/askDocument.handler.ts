import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { OpenAIService } from "./services/openai.service";
import { PineconeService } from "./services/pinecone.service";
import { createResponse } from "./utils/response";

const openaiService = new OpenAIService();
const pineconeService = new PineconeService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const question = body.question;

    if (!question) {
      return createResponse(400, {
        message: "Question is required in request body",
      });
    }

    const pinceConeIndex = process.env.PINECONE_INDEX!;

    // Get embeddings
    const vector = await openaiService.generateEmbeddings(question);

    // Query Pinecone
    const queryRes = await pineconeService.queryIndex(pinceConeIndex, vector);

    // Build context from metadata
    const context = pineconeService.getContext(queryRes.matches ?? []);

    // Get completion from OpenAI
    const answer = await openaiService.getCompletion(context ?? "", question);

    return createResponse(200, { answer });
  } catch (err) {
    console.error("❌ Error:", JSON.stringify(err, null, 2));
    return createResponse(500, {
      message: "Internal server error",
      error: err instanceof Error ? err.message : err,
    });
  }
};
