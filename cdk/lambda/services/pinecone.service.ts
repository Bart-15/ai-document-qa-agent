import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

export class PineconeService {
  private pc: Pinecone;

  constructor() {
    this.pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }

  async upsertVectors(
    indexName: string,
    vectors: Array<{
      id: string;
      values: number[];
      metadata: {
        text: string;
        source: string;
      };
    }>
  ) {
    const index = await this.pc.index(indexName);
    await index.upsert(vectors);
  }
}
