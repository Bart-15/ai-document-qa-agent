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
  PINECONE_INDEX: string | undefined;
}

export const getConfig = (): ENV => {
  return {
    PINECONE_INDEX: process.env.PINECONE_INDEX,
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
