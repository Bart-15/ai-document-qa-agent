import { z } from "zod";
import { allowedTypes } from "../utils/const";

export const getPresignedUrlSchema = z.object({
  fileName: z.string().min(1, "Filename is required"),
  contentType: z
    .string()
    .min(1, "Content type is required")
    .refine(
      (value) => Object.keys(allowedTypes).includes(value),
      "Invalid content type. Only PDF and DOCX files are supported."
    ),
});

export type GetPresignedUrlInput = z.infer<typeof getPresignedUrlSchema>;
