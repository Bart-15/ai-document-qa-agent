import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import "dotenv/config";

export class DocumentProcessingService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    if (!embedding || embedding.length === 0) {
      throw new Error("Failed to generate embedding for text chunk");
    }
    return embedding;
  }

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
