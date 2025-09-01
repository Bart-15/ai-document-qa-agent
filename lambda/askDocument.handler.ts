import type { APIGatewayProxyEventV2 } from "aws-lambda";

import { getSanitizedConfig } from "../config/environment";
import { createResponse, handleError } from "../middleware/errorHandler";
import validateResource from "../middleware/validateResource";
import { DynamoDBService } from "./services/dynamodb.service";
import { OpenAIService } from "./services/openai.service";
import { PineconeService } from "./services/pinecone.service";
import { SSMParameterService } from "./services/ssm-parameter.service";
import {
  AskDocumentInput,
  askDocumentSchema,
} from "./validation/askDocument.validation";

const config = getSanitizedConfig(["PINECONE_INDEX"]);

const ssmService = new SSMParameterService();
const openaiService = new OpenAIService(ssmService);
const pineconeService = new PineconeService(ssmService);
const dynamoDBService = new DynamoDBService();

/**
 * Handles question answering for a document chat session.
 * @param {APIGatewayProxyEventV2} event - API Gateway event containing the user question and session info.
 * @returns {Promise<object>} API response with answer, sessionId, and chatHistory, or error info.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    // Initialize services to get api key from ssm
    await openaiService.init();
    await pineconeService.init();

    const body: AskDocumentInput = event.body ? JSON.parse(event.body) : {};

    validateResource(askDocumentSchema, body);

    const { question, documentKey, userId, sessionId } = body;

    // Get embeddings and context before session creation for first message
    const pinceConeIndex = config.PINECONE_INDEX!;
    const vector = await openaiService.generateEmbeddings(question);
    const queryRes = await pineconeService.queryIndex(
      pinceConeIndex,
      vector,
      5,
      documentKey,
    );
    const context = pineconeService.getContext(queryRes.matches ?? []);
    const answer = await openaiService.getCompletion(context ?? "", question);

    // Get or create session with both messages for first chat
    const session = sessionId
      ? await dynamoDBService.getSession(userId, sessionId)
      : await dynamoDBService.createSession(userId, documentKey, [
          { role: "user", content: question },
          ...(answer ? [{ role: "assistant" as const, content: answer }] : []),
        ]);

    // Handle session not found
    if (!session) {
      return createResponse(404, { error: "Session not found" });
    }

    // Verify document key consistency
    if (session.documentKey !== documentKey) {
      return createResponse(400, {
        error: "Session document key mismatch",
        message: "Cannot use the same session for different documents",
      });
    }

    // For existing sessions, add both messages
    if (sessionId) {
      // Add user question
      await dynamoDBService.addMessageToSession(userId, session.sessionId, {
        role: "user",
        content: question,
      });

      // Add assistant response if available
      if (answer) {
        await dynamoDBService.addMessageToSession(userId, session.sessionId, {
          role: "assistant",
          content: answer,
        });
      }
    }

    // Return response with session information
    return createResponse(200, {
      answer,
      sessionId: session.sessionId,
      chatHistory: session.chatHistory,
    });
  } catch (err) {
    console.error("❌ Error:", JSON.stringify(err, null, 2));
    return handleError(err, event);
  }
};
