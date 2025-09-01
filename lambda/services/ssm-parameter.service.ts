import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/**
 * Service for securely fetching and caching parameters from AWS SSM Parameter Store.
 */
export class SSMParameterService {
  private ssmClient: SSMClient;
  private cache: Record<string, string> = {};

  /**
   * Creates a new SSMParameterService instance.
   * @param {string} [region] - AWS region to use.
   */
  constructor(region?: string) {
    this.ssmClient = new SSMClient({
      region: region ?? process.env.AWS_REGION,
    });
  }

  // Fetch a single parameter (SecureString) and cache it
  /**
   * Fetches a secure string parameter from SSM and caches it.
   * @param {string} name - The parameter name.
   * @returns {Promise<string>} The parameter value.
   */
  async getParameter(name: string): Promise<string> {
    // Return cached value if available
    if (this.cache[name]) {
      return this.cache[name];
    }

    const result = await this.ssmClient.send(
      new GetParameterCommand({
        Name: name,
        WithDecryption: true,
      }),
    );

    if (!result.Parameter?.Value) {
      throw new Error(`Parameter ${name} not found`);
    }

    // Cache and return
    this.cache[name] = result.Parameter.Value;
    return result.Parameter.Value;
  }
}
