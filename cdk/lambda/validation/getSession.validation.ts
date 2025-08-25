import z from "zod";

export const getSessionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
});

export type GetSessionInput = z.infer<typeof getSessionSchema>;
