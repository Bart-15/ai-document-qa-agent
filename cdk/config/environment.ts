import "dotenv/config";

interface EnvironmentConfig {
  allowedOrigins: string[];
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const allowedOriginsStr = process.env.ALLOWED_ORIGINS;
  if (!allowedOriginsStr) {
    throw new Error("ALLOWED_ORIGINS environment variable must be set");
  }

  // Split by comma and trim whitespace
  const allowedOrigins = allowedOriginsStr
    .split(",")
    .map((origin) => origin.trim());

  // Validate origins
  allowedOrigins.forEach((origin) => {
    if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
      throw new Error(
        `Invalid origin: ${origin}. Origins must start with http:// or https://`
      );
    }
  });

  return {
    allowedOrigins,
  };
};
