import {
  Pinecone,
  type RecordMetadata,
  type ScoredPineconeRecord,
} from "@pinecone-database/pinecone";
import "dotenv/config";

export class PineconeService {
  public pc: Pinecone;

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

  async queryIndex(indexName: string, vector: number[], topK: number = 5) {
    const index = this.pc.index(indexName);
    const queryRes = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });
    return queryRes;
  }

  getContext(matches: ScoredPineconeRecord<RecordMetadata>[]) {
    return matches
      ?.map((m) => m.metadata?.text)
      .filter(Boolean)
      .join("\n\n");
  }
}
