import { OpenAI } from "openai";

import { OpenAIService } from "../openai.service";

// Mock the environment config
jest.mock("../../../config/environment", () => ({
  getSanitizedConfig: () => ({
    OPENAI_API_KEY: "fake-api-key",
  }),
}));

// Mock OpenAI client
const mockCreateEmbedding = jest.fn();
const mockCreateCompletion = jest.fn();

jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: mockCreateEmbedding,
    },
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  })),
}));

describe("OpenAIService", () => {
  let service: OpenAIService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OpenAIService();
  });

  it("should initialize OpenAI client with API key", () => {
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: "fake-api-key" });
  });

  describe("generateEmbeddings", () => {
    it("should call embeddings.create with correct params and return embedding", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockCreateEmbedding.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await service.generateEmbeddings("test input");

      expect(mockCreateEmbedding).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: "test input",
      });
      expect(result).toEqual(mockEmbedding);
    });
  });

  describe("getCompletion", () => {
    it("should call chat.completions.create with correct params and return content", async () => {
      const mockResponse = "This is the answer";
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: mockResponse } }],
      });

      const result = await service.getCompletion(
        "some context",
        "test question",
      );

      expect(mockCreateCompletion).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that answers questions based only on the provided context. If the answer is not in the context, say 'I could not find an answer in the document.'",
          },
          {
            role: "user",
            content: "Context:\nsome context\n\nQuestion: test question",
          },
        ],
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
