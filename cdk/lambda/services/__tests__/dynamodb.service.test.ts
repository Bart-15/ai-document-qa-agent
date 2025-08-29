import { DynamoDBService } from "../dynamodb.service";

// Mock the DynamoDB client and commands
const mockSend = jest.fn();
jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  QueryCommand: jest.fn(),
  UpdateCommand: jest.fn().mockImplementation((params) => ({ input: params })),
}));

// Mock uuid
jest.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

describe("DynamoDBService", () => {
  let service: DynamoDBService;
  const mockDate = 1640995200000; // 2022-01-01
  const mockTTL = Math.floor(mockDate / 1000) + 24 * 60 * 60; // 1 day from mock date

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now()
    jest.spyOn(Date, "now").mockImplementation(() => mockDate);
    // Set environment variable
    process.env.SESSION_TABLE_NAME = "test-table";
    service = new DynamoDBService();
  });

  describe("createSession", () => {
    it("should create session without initial messages", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await service.createSession("user1", "doc1");

      expect(result).toEqual({
        userId: "user1",
        sessionId: "mock-uuid",
        documentKey: "doc1",
        chatHistory: [],
        lastAccessedAt: mockDate,
        expiryTime: mockTTL,
        ttl: mockTTL,
      });
    });

    it("should create session with initial messages", async () => {
      mockSend.mockResolvedValueOnce({});
      const initialMessages = [
        { role: "user" as const, content: "hello" },
        { role: "assistant" as const, content: "hi" },
      ];

      const result = await service.createSession(
        "user1",
        "doc1",
        initialMessages,
      );

      expect(result.chatHistory).toEqual(
        initialMessages.map((msg) => ({ ...msg, timestamp: mockDate })),
      );
    });
  });

  describe("getSession", () => {
    it("should return null if session not found", async () => {
      mockSend.mockResolvedValueOnce({ Item: null });

      const result = await service.getSession("user1", "session1");

      expect(result).toBeNull();
    });

    it("should return session if found", async () => {
      const mockSession = {
        userId: "user1",
        sessionId: "session1",
        chatHistory: [],
      };
      mockSend.mockResolvedValueOnce({ Item: mockSession });

      const result = await service.getSession("user1", "session1");

      expect(result).toEqual(mockSession);
    });
  });

  describe("addMessageToSession", () => {
    it("should add message to session", async () => {
      mockSend.mockResolvedValueOnce({});
      const message = { role: "user" as const, content: "hello" };

      await service.addMessageToSession("user1", "session1", message);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: "test-table",
            Key: { userId: "user1", sessionId: "session1" },
            UpdateExpression: expect.stringContaining("SET chatHistory"),
            ExpressionAttributeNames: {
              "#expiry": "ttl",
            },
            ExpressionAttributeValues: {
              ":message": [{ ...message, timestamp: mockDate }],
              ":empty_list": [],
              ":now": mockDate,
              ":ttl": mockTTL,
            },
          },
        }),
      );
    });
  });

  describe("getLatestSession", () => {
    it("should return latest session", async () => {
      const mockSession = {
        userId: "user1",
        sessionId: "session1",
        chatHistory: [],
      };
      mockSend.mockResolvedValueOnce({ Items: [mockSession] });

      const result = await service.getLatestSession("user1");

      expect(result).toEqual(mockSession);
    });

    it("should return null if no sessions found", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await service.getLatestSession("user1");

      expect(result).toBeNull();
    });
  });
});
