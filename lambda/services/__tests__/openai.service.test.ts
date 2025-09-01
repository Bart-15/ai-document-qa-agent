import { OpenAI } from "openai";

import { OpenAIService } from "../openai.service";
import { SSMParameterService } from "../ssm-parameter.service";

// Mock SSMParameterService
const mockGetParameter = jest.fn();
jest.mock("../ssm-parameter.service", () => ({
  SSMParameterService: jest.fn().mockImplementation(() => ({
    getParameter: mockGetParameter,
  })),
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
  let openAIService: OpenAIService;
  let ssmService: SSMParameterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetParameter.mockResolvedValue("fake-api-key");
    ssmService = new SSMParameterService();
    openAIService = new OpenAIService(ssmService);
    await openAIService.init();
  });

  it("should initialize OpenAI client with API key from SSM", async () => {
    expect(mockGetParameter).toHaveBeenCalledWith(
      "/ai-qa-agent/dev/OPENAI_API_KEY",
    );
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: "fake-api-key" });
  });

  describe("generateEmbeddings", () => {
    it("should call embeddings.create with correct params and return embedding", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockCreateEmbedding.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await openAIService.generateEmbeddings("test input");

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

      const result = await openAIService.getCompletion(
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
