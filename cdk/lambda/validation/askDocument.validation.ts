import { z } from "zod";

export const askDocumentSchema = z.object({
  question: z.string().min(1, "Question is required"),
  documentKey: z.string().min(1, "Document key is required"),
  userId: z.string().min(1, "User ID is required"),
  sessionId: z.string().optional(), // Optional because it might be a new session
});

export type AskDocumentInput = z.infer<typeof askDocumentSchema>;
