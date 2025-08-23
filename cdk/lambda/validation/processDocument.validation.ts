import z from "zod";

export const processDocumentSchema = z.object({
  documentKey: z.string().min(1, "Document key is required"),
});

export type ProcessDocumentInput = z.infer<typeof processDocumentSchema>;
