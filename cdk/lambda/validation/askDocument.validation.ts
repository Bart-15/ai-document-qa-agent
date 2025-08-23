import z from "zod";

export const askDocumentSchema = z.object({
  question: z.string().min(1, "Question is required"),
  documentKey: z.string().min(1, "Document key is required"),
});

export type AskDocumentInput = z.infer<typeof askDocumentSchema>;
