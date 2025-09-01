import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { DocumentProcessingService } from "../document-processing.service";
import { SSMParameterService } from "../ssm-parameter.service";

// Mock dependencies
jest.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: jest.fn(() => ({
    embedQuery: jest.fn(),
  })),
}));

jest.mock("@langchain/community/document_loaders/fs/pdf", () => ({
  PDFLoader: jest.fn(() => ({
    load: jest.fn(),
  })),
}));

jest.mock("@langchain/textsplitters", () => ({
  RecursiveCharacterTextSplitter: jest.fn(() => ({
    splitDocuments: jest.fn(),
  })),
}));

describe("DocumentProcessingService", () => {
  let documentProcessingService: DocumentProcessingService;
  let ssmService: SSMParameterService;
  let mockEmbedQuery: jest.Mock;
  let mockLoad: jest.Mock;
  let mockSplitDocuments: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEmbedQuery = jest.fn();
    mockLoad = jest.fn();
    mockSplitDocuments = jest.fn();

    (OpenAIEmbeddings as jest.Mock).mockImplementation(() => ({
      embedQuery: mockEmbedQuery,
    }));
    (PDFLoader as unknown as jest.Mock).mockImplementation(() => ({
      load: mockLoad,
    }));
    (RecursiveCharacterTextSplitter as unknown as jest.Mock).mockImplementation(
      () => ({
        splitDocuments: mockSplitDocuments,
      }),
    );
    ssmService = new SSMParameterService();
    documentProcessingService = new DocumentProcessingService(ssmService);
    await documentProcessingService.init();
  });

  describe("generateEmbedding", () => {
    it("generates embedding for text", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockEmbedQuery.mockResolvedValue(mockEmbedding);

      const result =
        await documentProcessingService.generateEmbedding("test text");

      expect(mockEmbedQuery).toHaveBeenCalledWith("test text");
      expect(result).toEqual(mockEmbedding);
    });

    it("throws error if embedding is empty", async () => {
      mockEmbedQuery.mockResolvedValue([]);

      await expect(
        documentProcessingService.generateEmbedding("test text"),
      ).rejects.toThrow("Failed to generate embedding for text chunk");
    });
  });

  describe("processDocument", () => {
    it("processes PDF and returns chunks", async () => {
      const mockDocs = [{ pageContent: "test content", metadata: {} }];
      const mockChunks = [
        { pageContent: "chunk 1", metadata: {} },
        { pageContent: "chunk 2", metadata: {} },
      ];

      mockLoad.mockResolvedValue(mockDocs);
      mockSplitDocuments.mockResolvedValue(mockChunks);

      const result =
        await documentProcessingService.processDocument("/test/file.pdf");

      expect(PDFLoader).toHaveBeenCalledWith("/test/file.pdf");
      expect(mockLoad).toHaveBeenCalled();
      expect(mockSplitDocuments).toHaveBeenCalledWith(mockDocs);
      expect(result.chunks).toEqual(mockChunks);
    });

    it("throws error if no documents extracted", async () => {
      mockLoad.mockResolvedValue([]);

      await expect(
        documentProcessingService.processDocument("/test/file.pdf"),
      ).rejects.toThrow("No documents extracted from PDF");
    });

    it("throws error if no chunks created", async () => {
      mockLoad.mockResolvedValue([{ pageContent: "test", metadata: {} }]);
      mockSplitDocuments.mockResolvedValue([]);

      await expect(
        documentProcessingService.processDocument("/test/file.pdf"),
      ).rejects.toThrow("No text chunks created from PDF");
    });
  });
});
