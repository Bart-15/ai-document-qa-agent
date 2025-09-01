import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface UserSession {
  userId: string;
  sessionId: string;
  documentKey: string;
  chatHistory: ChatMessage[];
  lastAccessedAt: number;
  ttl: number;
}

/**
 * Service for managing chat sessions and messages in DynamoDB.
 */
export class DynamoDBService {
  private dynamoDB: DynamoDBDocumentClient;
  private tableName: string;
  private readonly TTL_DAYS = 1; // Sessions expire after 1 day

  /**
   * Creates a new DynamoDBService instance.
   */
  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoDB = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.SESSION_TABLE_NAME!;
  }

  private calculateTTL(): number {
    return Math.floor(Date.now() / 1000) + this.TTL_DAYS * 24 * 60 * 60;
  }

  /**
   * Creates a new chat session for a user and document.
   * @param {string} userId - The user ID.
   * @param {string} documentKey - The document key.
   * @param {Array<{ role: "user" | "assistant"; content: string }>} [initialMessages] - Initial messages.
   * @returns {Promise<UserSession>} The created session.
   */
  async createSession(
    userId: string,
    documentKey: string,
    initialMessages?: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<UserSession> {
    const now = Date.now();
    const sessionData = {
      userId,
      sessionId: uuidv4(),
      documentKey,
      chatHistory: initialMessages
        ? initialMessages.map((msg) => ({ ...msg, timestamp: now }))
        : [],
      lastAccessedAt: now,
      expiryTime: this.calculateTTL(),
    };

    await this.dynamoDB.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          ...sessionData,
          ttl: sessionData.expiryTime, // DynamoDB expects the attribute to be named 'ttl'
        },
      }),
    );

    return {
      ...sessionData,
      ttl: sessionData.expiryTime,
    } as UserSession;
  }

  /**
   * Retrieves a session by user ID and session ID.
   * @param {string} userId - The user ID.
   * @param {string} sessionId - The session ID.
   * @returns {Promise<UserSession|null>} The session or null.
   */
  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<UserSession | null> {
    const result = await this.dynamoDB.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          userId,
          sessionId,
        },
      }),
    );

    return (result.Item as UserSession) || null;
  }

  /**
   * Adds a message to an existing session.
   * @param {string} userId - The user ID.
   * @param {string} sessionId - The session ID.
   * @param {Omit<ChatMessage, "timestamp">} message - The message to add.
   * @returns {Promise<void>}
   */
  async addMessageToSession(
    userId: string,
    sessionId: string,
    message: Omit<ChatMessage, "timestamp">,
  ): Promise<void> {
    const now = Date.now();
    await this.dynamoDB.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          userId,
          sessionId,
        },
        UpdateExpression:
          "SET chatHistory = list_append(if_not_exists(chatHistory, :empty_list), :message), lastAccessedAt = :now, #expiry = :ttl",
        ExpressionAttributeNames: {
          "#expiry": "ttl",
        },
        ExpressionAttributeValues: {
          ":message": [{ ...message, timestamp: now }],
          ":empty_list": [],
          ":now": now,
          ":ttl": this.calculateTTL(),
        },
      }),
    );
  }

  /**
   * Retrieves the most recent session for a user.
   * @param {string} userId - The user ID.
   * @returns {Promise<UserSession|null>} The latest session or null.
   */
  async getLatestSession(userId: string): Promise<UserSession | null> {
    const result = await this.dynamoDB.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        ScanIndexForward: false, // Get most recent first
        Limit: 1,
      }),
    );

    return (result.Items?.[0] as UserSession) || null;
  }
}
