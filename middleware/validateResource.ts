import { ZodObject } from "zod";

const validateResource = (schema: ZodObject, payload: unknown) =>
  schema.parse(payload);

export default validateResource;
