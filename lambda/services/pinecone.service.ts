import {
  Pinecone,
  type RecordMetadata,
  type ScoredPineconeRecord,
} from "@pinecone-database/pinecone";

import { SSMParameterService } from "./ssm-parameter.service";

/**
 * Service for interacting with the Pinecone vector database.
 */
export class PineconeService {
  private pc: Pinecone;

  constructor(private ssmService: SSMParameterService) {}

  /**
   * Initializes the Pinecone client using API key from SSM.
   * @returns {Promise<void>}
   */
  async init() {
    const apiKey = await this.ssmService.getParameter(
      "/ai-qa-agent/dev/PINECONE_API_KEY",
    );
    this.pc = new Pinecone({ apiKey });
  }

  /**
   * Upserts vectors into the specified Pinecone index.
   * @param {string} indexName - The Pinecone index name.
   * @param {Array<{id: string, values: number[], metadata: {text: string, source: string}}>} vectors - Vectors to upsert.
   * @returns {Promise<void>}
   */
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

  /**
   * Queries the Pinecone index for similar vectors.
   * @param {string} indexName - The Pinecone index name.
   * @param {number[]} vector - The query vector.
   * @param {number} [topK=5] - Number of top results.
   * @param {string} documentKey - Document key to filter.
   * @returns {Promise<any>} Query result from Pinecone.
   */
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

  /**
   * Extracts and concatenates context text from Pinecone query matches.
   * @param {ScoredPineconeRecord<RecordMetadata>[]} matches - Pinecone query matches.
   * @returns {string} Concatenated context string.
   */
  getContext(matches: ScoredPineconeRecord<RecordMetadata>[]) {
    return matches
      ?.map((m) => m.metadata?.text)
      .filter(Boolean)
      .join("\n\n");
  }
}
