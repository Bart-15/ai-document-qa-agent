import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

export class SSMParameterService {
  private ssmClient: SSMClient;
  private cache: Record<string, string> = {};

  constructor(region?: string) {
    this.ssmClient = new SSMClient({
      region: region ?? process.env.AWS_REGION,
    });
  }

  // Fetch a single parameter (SecureString) and cache it
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
