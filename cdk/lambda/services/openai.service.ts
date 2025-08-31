import { OpenAI } from "openai";

import { SSMParameterService } from "./ssm-parameter.service";

export class OpenAIService {
  private openai: OpenAI;

  constructor(private ssmService: SSMParameterService) {}

  async init() {
    const apiKey = await this.ssmService.getParameter(
      "/ai-qa-agent/dev/OPENAI_API_KEY",
    );
    this.openai = new OpenAI({ apiKey });
  }

  async generateEmbeddings(input: string) {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    return response.data[0].embedding;
  }

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
