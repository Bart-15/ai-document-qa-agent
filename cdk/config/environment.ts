// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config().parsed;

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
        `Invalid origin: ${origin}. Origins must start with http:// or https://`,
      );
    }
  });

  return {
    allowedOrigins,
  };
};

// env variable config
interface ENV {
  PINECONE_API_KEY: string | undefined;
  PINECONE_ENVIRONMENT: string | undefined;
  PINECONE_INDEX: string | undefined;
  OPENAI_API_KEY: string | undefined;
  DOCUMENT_PROCESSING_QUEUE_URL: string | undefined;
}

export const getConfig = (): ENV => {
  return {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DOCUMENT_PROCESSING_QUEUE_URL: process.env.DOCUMENT_PROCESSING_QUEUE_URL,
  };
};

// ✅ validate only what you pass in
export const getSanitizedConfig = <K extends keyof ENV>(
  requiredKeys: K[],
): Pick<Required<ENV>, K> & ENV => {
  const config = getConfig();

  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(`❌ Missing required key: ${key}`);
    }
  }

  return config as Pick<Required<ENV>, K> & ENV;
};
