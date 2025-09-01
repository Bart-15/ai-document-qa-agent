import {
  Pinecone,
  type RecordMetadata,
  type ScoredPineconeRecord,
} from "@pinecone-database/pinecone";

import { PineconeService } from "../pinecone.service";
import { SSMParameterService } from "../ssm-parameter.service";

// Mock SSMParameterService
const mockGetParameter = jest.fn();
jest.mock("../ssm-parameter.service", () => ({
  SSMParameterService: jest.fn().mockImplementation(() => ({
    getParameter: mockGetParameter,
  })),
}));

// Mock Pinecone and its index
const mockUpsert = jest.fn();
const mockQuery = jest.fn();

jest.mock("@pinecone-database/pinecone", () => {
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: jest.fn().mockImplementation(() => ({
        upsert: mockUpsert,
        query: mockQuery,
      })),
    })),
  };
});

describe("PineconeService", () => {
  let pineConeService: PineconeService;
  let ssmService: SSMParameterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetParameter.mockResolvedValueOnce("fake-api-key");
    ssmService = new SSMParameterService();
    pineConeService = new PineconeService(ssmService);

    await pineConeService.init();
  });

  it("should initialize Pinecone client with API key", () => {
    expect(Pinecone).toHaveBeenCalledWith({ apiKey: "fake-api-key" });
  });

  describe("upsertVectors", () => {
    it("should call index.upsert with given vectors", async () => {
      const vectors = [
        {
          id: "1",
          values: [0.1, 0.2],
          metadata: { text: "hello", source: "src1" },
        },
      ];

      await pineConeService.upsertVectors("test-index", vectors);

      expect(mockUpsert).toHaveBeenCalledWith(vectors);
    });
  });

  describe("queryIndex", () => {
    it("should call index.query with correct params", async () => {
      const fakeResponse = { matches: [{ id: "1", score: 0.9 }] };
      mockQuery.mockResolvedValueOnce(fakeResponse);

      const res = await pineConeService.queryIndex(
        "test-index",
        [0.1, 0.2],
        3,
        "src1",
      );

      expect(mockQuery).toHaveBeenCalledWith({
        vector: [0.1, 0.2],
        topK: 3,
        includeMetadata: true,
        filter: { source: { $eq: "src1" } },
      });
      expect(res).toEqual(fakeResponse);
    });
  });

  describe("getContext", () => {
    it("should join metadata.text fields", () => {
      const matches: ScoredPineconeRecord<RecordMetadata>[] = [
        { id: "1", metadata: { text: "First", source: "s1" } },
        { id: "2", metadata: { text: "Second", source: "s2" } },
        { id: "3", metadata: {} }, // ignored because no text
      ];

      const result = pineConeService.getContext(matches);
      expect(result).toBe("First\n\nSecond");
    });

    it("should return empty string if no matches", () => {
      expect(pineConeService.getContext([])).toBe("");
    });
  });
});
