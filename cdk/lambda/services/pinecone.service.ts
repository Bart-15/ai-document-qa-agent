import {
  Pinecone,
  type RecordMetadata,
  type ScoredPineconeRecord,
} from "@pinecone-database/pinecone";
import { getSanitizedConfig } from "../../config/environment";

const config = getSanitizedConfig(["PINECONE_ENVIRONMENT"]);

export class PineconeService {
  public pc: Pinecone;

  constructor() {
    this.pc = new Pinecone({ apiKey: config.PINECONE_API_KEY! });
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
    const index = this.pc.index(indexName);
    await index.upsert(vectors);
  }

  async queryIndex(
    indexName: string,
    vector: number[],
    topK: number = 5,
    documentKey: string
  ) {
    const index = this.pc.index(indexName);
    const queryRes = await index.query({
      vector,
      topK,
      includeMetadata: true,
      filter: {
        source: {
          $eq: documentKey,
        },
      },
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
