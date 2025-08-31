import {
  Pinecone,
  type RecordMetadata,
  type ScoredPineconeRecord,
} from "@pinecone-database/pinecone";

import { SSMParameterService } from "./ssm-parameter.service";

export class PineconeService {
  private pc: Pinecone;

  constructor(private ssmService: SSMParameterService) {}

  async init() {
    const apiKey = await this.ssmService.getParameter(
      "/ai-qa-agent/dev/PINECONE_API_KEY",
    );
    this.pc = new Pinecone({ apiKey });
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
    }>,
  ) {
    const index = this.pc.index(indexName);
    await index.upsert(vectors);
  }

  async queryIndex(
    indexName: string,
    vector: number[],
    topK: number = 5,
    documentKey: string,
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
