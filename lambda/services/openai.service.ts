import { OpenAI } from "openai";

import { SSMParameterService } from "./ssm-parameter.service";

/**
 * Service for interacting with the OpenAI API (embeddings and completions).
 */
export class OpenAIService {
  private openai: OpenAI;

  constructor(private ssmService: SSMParameterService) {}

  /**
   * Initializes the OpenAI client using API key from SSM.
   * @returns {Promise<void>}
   */
  async init() {
    const apiKey = await this.ssmService.getParameter(
      "/ai-qa-agent/dev/OPENAI_API_KEY",
    );
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generates an embedding vector for the given input text.
   * @param {string} input - The input text to embed.
   * @returns {Promise<number[]>} The embedding vector.
   */
  async generateEmbeddings(input: string) {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    return response.data[0].embedding;
  }

  /**
   * Gets a completion (answer) from OpenAI given context and question.
   * @param {string} context - The context for the model.
   * @param {string} question - The user question.
   * @returns {Promise<string>} The generated answer.
   */
  async getCompletion(context: string, question: string) {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers questions based only on the provided context. If the answer is not in the context, say 'I could not find an answer in the document.'",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

    return completion.choices[0].message.content;
  }
}
