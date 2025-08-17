import { OpenAI } from "openai";
import "dotenv/config";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
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
