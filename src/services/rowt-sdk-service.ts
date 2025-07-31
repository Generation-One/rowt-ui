/**
 * Rowt SDK Service Wrapper
 * 
 * This service provides a wrapper around the rowt-console-sdk with proper
 * configuration validation, error handling, and a consistent interface.
 */

import RowtConsole from 'rowt-console-sdk';
import type { 
  RowtUser, 
  RowtProject, 
  RowtLink, 
  RowtLoginDTO, 
  CreateProjectDTO, 
  UpdateProjectDTO,
  RowtGetProjectOptions,
  UsageStats,
  TierStats
} from 'rowt-console-sdk';
import { getAppConfig, ConfigurationError } from '../config/app-config.js';

export class RowtSDKError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'RowtSDKError';
  }
}

/**
 * Service wrapper for the Rowt Console SDK
 */
export class RowtSDKService {
  private static instance: RowtSDKService | null = null;
  private sdk: RowtConsole | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): RowtSDKService {
    if (!RowtSDKService.instance) {
      RowtSDKService.instance = new RowtSDKService();
    }
    return RowtSDKService.instance;
  }

  /**
   * Initialize the SDK with configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.sdk) {
      return;
    }

    try {
      const config = await getAppConfig();
      this.sdk = new RowtConsole(config.apiEndpoint);
      this.isInitialized = true;

      if (config.environment === 'development') {
        console.log('Rowt SDK initialized with endpoint:', config.apiEndpoint);
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw new RowtSDKError(
          'Cannot initialize Rowt SDK: Missing required configuration. ' +
          'Please create a .env file with ROWT_API_ENDPOINT=your-server-url',
          error
        );
      }
      throw new RowtSDKError('Failed to initialize Rowt SDK', error);
    }
  }

  /**
   * Get the SDK instance (throws if not initialized)
   */
  private getSDK(): RowtConsole {
    if (!this.sdk || !this.isInitialized) {
      throw new RowtSDKError('Rowt SDK not initialized. Call initialize() first.');
    }
    return this.sdk;
  }

  /**
   * Check if the SDK is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.sdk !== null;
  }

  // Authentication Methods
  async login(credentials: RowtLoginDTO): Promise<RowtUser> {
    try {
      return await this.getSDK().login(credentials);
    } catch (error) {
      throw new RowtSDKError('Login failed', error);
    }
  }

  async logout(): Promise<string> {
    try {
      return await this.getSDK().logout();
    } catch (error) {
      throw new RowtSDKError('Logout failed', error);
    }
  }

  async validateUser(credentials: RowtLoginDTO): Promise<boolean> {
    try {
      return await this.getSDK().validateUser(credentials);
    } catch (error) {
      throw new RowtSDKError('User validation failed', error);
    }
  }

  async createUser(email: string, password: string): Promise<RowtUser> {
    try {
      return await this.getSDK().createUser(email, password);
    } catch (error) {
      throw new RowtSDKError('User creation failed', error);
    }
  }

  async getCurrentUser(): Promise<RowtUser> {
    try {
      return await this.getSDK().getCurrentUser();
    } catch (error) {
      throw new RowtSDKError('Failed to get current user', error);
    }
  }

  async getProfile(): Promise<RowtUser> {
    try {
      return await this.getSDK().getProfile();
    } catch (error) {
      throw new RowtSDKError('Failed to get user profile', error);
    }
  }

  // Project Methods
  async getUserProjects(): Promise<RowtProject[]> {
    try {
      return await this.getSDK().getUserProjects();
    } catch (error) {
      throw new RowtSDKError('Failed to get user projects', error);
    }
  }

  async getProjectById(projectId: string, options?: RowtGetProjectOptions): Promise<RowtProject> {
    try {
      return await this.getSDK().getProjectById(projectId, options);
    } catch (error) {
      throw new RowtSDKError(`Failed to get project ${projectId}`, error);
    }
  }

  async createProject(project: CreateProjectDTO): Promise<RowtProject> {
    try {
      return await this.getSDK().createProject(project);
    } catch (error) {
      throw new RowtSDKError('Failed to create project', error);
    }
  }

  async updateProject(project: UpdateProjectDTO): Promise<RowtProject> {
    try {
      return await this.getSDK().updateProject(project);
    } catch (error) {
      throw new RowtSDKError('Failed to update project', error);
    }
  }

  async regenerateApiKey(projectId: string): Promise<string> {
    try {
      return await this.getSDK().regenerateApiKey(projectId);
    } catch (error) {
      throw new RowtSDKError('Failed to regenerate API key', error);
    }
  }

  // Link Methods
  async getLinksByProjectId(projectId: string, includeInteractions?: boolean): Promise<any> {
    try {
      return await this.getSDK().getLinksByProjectId(projectId, includeInteractions);
    } catch (error) {
      throw new RowtSDKError(`Failed to get links for project ${projectId}`, error);
    }
  }

  // Usage and Analytics Methods
  async getUserUsage(userId: string): Promise<UsageStats> {
    try {
      return await this.getSDK().getUserUsage(userId);
    } catch (error) {
      throw new RowtSDKError('Failed to get user usage statistics', error);
    }
  }

  async getUserTier(userId: string): Promise<TierStats> {
    try {
      return await this.getSDK().getUserTier(userId);
    } catch (error) {
      throw new RowtSDKError('Failed to get user tier information', error);
    }
  }

  /**
   * Reset the service (useful for testing or re-initialization)
   */
  reset(): void {
    this.sdk = null;
    this.isInitialized = false;
  }
}

/**
 * Convenience function to get the SDK service instance
 */
export function getRowtSDK(): RowtSDKService {
  return RowtSDKService.getInstance();
}
