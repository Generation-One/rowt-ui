/**
 * Application Configuration System
 *
 * Simple .env based configuration for the Rowt UI application.
 * Just create a .env file with ROWT_API_ENDPOINT=your-server-url
 */

export interface AppConfig {
  apiEndpoint: string;
  environment: 'development' | 'production' | 'test';
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly missingKeys: string[] = []) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Simple configuration loader that reads from .env file or environment
 */
export class ConfigLoader {
  private static instance: ConfigLoader | null = null;
  private config: AppConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from build-time or runtime injection
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    const apiEndpoint = this.getApiEndpoint();
    if (!apiEndpoint) {
      throw new ConfigurationError(
        'Missing ROWT_API_ENDPOINT. Please set it as an environment variable during build or inject it at runtime.',
        ['ROWT_API_ENDPOINT']
      );
    }

    this.config = {
      apiEndpoint,
      environment: this.getEnvironment()
    };

    return this.config;
  }

  /**
   * Get API endpoint from build-time environment or runtime injection
   */
  private getApiEndpoint(): string | null {
    // 1. Check build-time environment variables (injected by esbuild)
    // esbuild will replace process.env.ROWT_API_ENDPOINT with the actual value
    const buildTimeEndpoint = process.env.ROWT_API_ENDPOINT;
    if (buildTimeEndpoint) {
      return buildTimeEndpoint;
    }

    // 2. Check window global (for runtime injection by server)
    if (typeof window !== 'undefined') {
      const windowGlobal = window as any;
      if (windowGlobal.ROWT_API_ENDPOINT) {
        return windowGlobal.ROWT_API_ENDPOINT;
      }
    }

    return null;
  }

  /**
   * Determine the current environment
   */
  private getEnvironment(): 'development' | 'production' | 'test' {
    // Check build-time environment variables first
    if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
      const nodeEnv = process.env.NODE_ENV;
      if (nodeEnv === 'development' || nodeEnv === 'production' || nodeEnv === 'test') {
        return nodeEnv;
      }
    }

    // Check window global (for runtime injection)
    if (typeof window !== 'undefined') {
      const windowGlobal = window as any;
      if (windowGlobal.NODE_ENV) {
        return windowGlobal.NODE_ENV;
      }
    }

    // Default to production
    return 'production';
  }

  /**
   * Validate that the API endpoint is reachable (optional health check)
   */
  async validateApiEndpoint(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.warn('API endpoint validation failed:', error);
      return false;
    }
  }

  /**
   * Reset configuration (useful for testing)
   */
  reset(): void {
    this.config = null;
  }

  /**
   * Get current configuration without loading (returns null if not loaded)
   */
  getCurrentConfig(): AppConfig | null {
    return this.config;
  }
}

/**
 * Convenience function to get the current configuration
 */
export async function getAppConfig(): Promise<AppConfig> {
  return await ConfigLoader.getInstance().loadConfig();
}

/**
 * Convenience function to check if configuration is valid
 */
export async function isConfigurationValid(): Promise<boolean> {
  try {
    await getAppConfig();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get configuration errors without throwing
 */
export async function getConfigurationErrors(): Promise<ConfigurationError | null> {
  try {
    await getAppConfig();
    return null;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return error;
    }
    return new ConfigurationError('Unknown configuration error');
  }
}


