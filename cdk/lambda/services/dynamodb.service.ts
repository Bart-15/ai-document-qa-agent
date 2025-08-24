import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
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

export class DynamoDBService {
  private dynamoDB: DynamoDBDocumentClient;
  private tableName: string;
  private readonly TTL_DAYS = 1; // Sessions expire after 1 day

  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoDB = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.SESSION_TABLE_NAME!;
  }

  private calculateTTL(): number {
    return Math.floor(Date.now() / 1000) + this.TTL_DAYS * 24 * 60 * 60;
  }

  async createSession(
    userId: string,
    documentKey: string,
    initialMessages?: Array<{ role: "user" | "assistant"; content: string }>
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
      })
    );

    return {
      ...sessionData,
      ttl: sessionData.expiryTime,
    } as UserSession;
  }

  async getSession(
    userId: string,
    sessionId: string
  ): Promise<UserSession | null> {
    const result = await this.dynamoDB.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          userId,
          sessionId,
        },
      })
    );

    return (result.Item as UserSession) || null;
  }

  async addMessageToSession(
    userId: string,
    sessionId: string,
    message: Omit<ChatMessage, "timestamp">
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
      })
    );
  }

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
      })
    );

    return (result.Items?.[0] as UserSession) || null;
  }
}
