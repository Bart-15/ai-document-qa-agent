import { z } from "zod";

import { createResponse, handleError } from "../errorHandler";

// Mock environment config
jest.mock("../../config/environment", () => ({
  getEnvironmentConfig: jest.fn().mockReturnValue({
    allowedOrigins: ["https://allowed-origin.com"],
  }),
}));

describe("createResponse", () => {
  it("should create response with correct status and body", () => {
    const response = createResponse(200, { message: "success" });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ message: "success" });
  });
});

describe("handleError", () => {
  it("should handle ZodError", () => {
    const schema = z.object({
      name: z.string(),
    });

    try {
      schema.parse({ name: 123 });
    } catch (error) {
      const response = handleError(error);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toMatchObject({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: "name",
            message: expect.any(String),
          }),
        ]),
      });
    }
  });

  it("should handle SyntaxError", () => {
    const error = new SyntaxError("Invalid JSON");
    const response = handleError(error);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: expect.stringContaining("Invalid JSON"),
    });
  });

  it("should handler generic Error", () => {
    const error = new Error("Ooops, something went wrong.");
    const response = handleError(error);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "Ooops, something went wrong.",
    });
  });

  it("should throw unknown errors", () => {
    const unknownError = { custom: "error" };
    expect(() => handleError(unknownError)).toThrow();
  });
});
