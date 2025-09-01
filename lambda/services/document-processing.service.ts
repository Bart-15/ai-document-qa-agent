import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { SSMParameterService } from "./ssm-parameter.service";

/**
 * Service for processing documents (PDF loading, chunking, and embedding).
 */
export class DocumentProcessingService {
  private embeddings: OpenAIEmbeddings;

  constructor(private ssmService: SSMParameterService) {}

  /**
   * Initializes the OpenAI embeddings client using API key from SSM.
   * @returns {Promise<void>}
   */
  async init() {
    const openAIAPIKey = await this.ssmService.getParameter(
      "/ai-qa-agent/dev/OPENAI_API_KEY",
    );
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: openAIAPIKey,
      modelName: "text-embedding-3-small",
    });
  }

  /**
   * Generates an embedding vector for the given text.
   * @param {string} text - The text to embed.
   * @returns {Promise<number[]>} The embedding vector.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    if (!embedding || embedding.length === 0) {
      throw new Error("Failed to generate embedding for text chunk");
    }
    return embedding;
  }

  /**
   * Loads a PDF file, splits it into text chunks, and returns the chunks.
   * @param {string} filePath - Path to the PDF file.
   * @returns {Promise<{chunks: any[]}>} The extracted text chunks.
   */
  async processDocument(filePath: string) {
    // Load PDF
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    if (!Array.isArray(docs) || docs.length === 0) {
      throw new Error("No documents extracted from PDF");
    }

    // Split into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await textSplitter.splitDocuments(docs);

    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error("No text chunks created from PDF");
    }

    return {
      chunks,
    };
  }
}
