import type {
  LoginRequest,
  LoginResponse,
  User,
  Project,
  CreateProjectRequest,
  EditProjectRequest,
  Link,
  UpdateLinkRequest,
  DeleteLinkRequest,
  GetLinksRequest,
  GetLinksResponse,
  DashboardStats
} from '../types/api.js';
import { getRowtSDK, RowtSDKError } from './rowt-sdk-service.js';
import { transformLink, transformLinks, transformProjects } from '../utils/data-transformers.js';

/**
 * ApiClient - Compatibility wrapper around the Rowt SDK
 *
 * This maintains the same interface as the old ApiClient but uses
 * the rowt-console-sdk internally for all API calls.
 */
export class ApiClient {
  private sdkService = getRowtSDK();

  constructor(baseUrl: string = '') {
    // The SDK service handles configuration internally
    // This constructor is kept for backward compatibility
  }

  /**
   * Initialize the SDK - called automatically when needed
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.sdkService.isReady()) {
      await this.sdkService.initialize();
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      await this.ensureInitialized();
      const user = await this.sdkService.login(credentials);

      // Return in the expected format
      return {
        tokens: {
          access_token: 'managed-by-sdk',
          refresh_token: 'managed-by-sdk'
        },
        user
      };
    } catch (error) {
      if (error instanceof RowtSDKError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.sdkService.isReady()) {
        await this.sdkService.logout();
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      await this.ensureInitialized();
      return await this.sdkService.getCurrentUser();
    } catch (error) {
      if (error instanceof RowtSDKError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  // Health Check
  async getHealth(): Promise<{ status: string; timestamp: string; service: string; version: string }> {
    // Simple health check - if SDK is ready, we're healthy
    try {
      await this.ensureInitialized();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'rowt-ui',
        version: '1.0.0'
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'rowt-ui',
        version: '1.0.0'
      };
    }
  }

  // Projects
  async getUserProjects(): Promise<Project[]> {
    try {
      await this.ensureInitialized();
      const sdkProjects = await this.sdkService.getUserProjects();
      return transformProjects(sdkProjects);
    } catch (error) {
      if (error instanceof RowtSDKError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    try {
      await this.ensureInitialized();
      return await this.sdkService.createProject(projectData);
    } catch (error) {
      if (error instanceof RowtSDKError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async editProject(projectId: string, projectData: EditProjectRequest): Promise<Project> {
    try {
      await this.ensureInitialized();

      // Make direct API call to update project using JWT authentication
      const config = await import('../config/app-config.js').then(m => m.getAppConfig());
      const token = this.sdkService.getTokens()?.accessToken;

      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${config.apiEndpoint}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.project;
    } catch (error) {
      console.error('Failed to edit project:', error);
      throw error;
    }
  }

  async getProjectById(id: string): Promise<Project> {
    try {
      await this.ensureInitialized();
      return await this.sdkService.getProjectById(id, { includeLinks: true });
    } catch (error) {
      if (error instanceof RowtSDKError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  // Links - These operations use direct API calls with project API keys
  async createLink(linkData: any): Promise<Link> {
    try {
      await this.ensureInitialized();

      // Make direct API call to create link using project API key
      const config = await import('../config/app-config.js').then(m => m.getAppConfig());
      const response = await fetch(`${config.apiEndpoint}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(linkData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      // The API returns just the short code, we need to construct a Link object
      const shortCode = await response.text();

      // Return a basic Link object - the real data will be fetched when refreshing
      return {
        id: shortCode,
        url: linkData.url,
        title: linkData.title,
        description: linkData.description,
        imageUrl: linkData.imageUrl,
        lifetimeClicks: 0,
        createdAt: new Date(),
        properties: linkData.properties || {},
        additionalMetadata: linkData.additionalMetadata || {}
      } as Link;
    } catch (error) {
      console.error('Failed to create link:', error);
      throw error;
    }
  }

  async getLinksByProject(projectId: string): Promise<Link[]> {
    try {
      await this.ensureInitialized();
      const links = await this.sdkService.getLinksByProjectId(projectId, true);
      return transformLinks(Array.isArray(links) ? links : [], projectId);
    } catch (error) {
      if (error instanceof RowtSDKError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async getLinks(params: GetLinksRequest = {}): Promise<GetLinksResponse> {
    try {
      await this.ensureInitialized();

      if (params.projectId) {
        const links = await this.sdkService.getLinksByProjectId(params.projectId, params.includeInteractions);
        const linksArray = transformLinks(Array.isArray(links) ? links : [], params.projectId);

        // Apply client-side filtering and pagination since SDK doesn't support it
        let filteredLinks = linksArray;

        if (params.filter) {
          filteredLinks = linksArray.filter(link => {
            if (params.filter!.search) {
              const search = params.filter!.search.toLowerCase();
              return link.title?.toLowerCase().includes(search) ||
                     link.url.toLowerCase().includes(search) ||
                     link.description?.toLowerCase().includes(search);
            }
            return true;
          });
        }

        // Apply sorting
        if (params.sort) {
          filteredLinks.sort((a, b) => {
            const field = params.sort!.field;
            const direction = params.sort!.direction === 'desc' ? -1 : 1;

            let aVal: any, bVal: any;
            if (field === 'lifetimeClicks') {
              aVal = a.lifetimeClicks || 0;
              bVal = b.lifetimeClicks || 0;
            } else if (field === 'createdAt') {
              aVal = new Date(a.createdAt).getTime();
              bVal = new Date(b.createdAt).getTime();
            } else {
              aVal = (a as any)[field] || '';
              bVal = (b as any)[field] || '';
            }

            if (aVal < bVal) return -1 * direction;
            if (aVal > bVal) return 1 * direction;
            return 0;
          });
        }

        // Apply pagination
        const page = params.page || 1;
        const limit = params.limit || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedLinks = filteredLinks.slice(startIndex, endIndex);

        return {
          links: paginatedLinks,
          total: filteredLinks.length,
          page,
          limit,
          totalPages: Math.ceil(filteredLinks.length / limit)
        };
      }

      // No specific project ID provided, fetch links from all projects
      const projects = await this.sdkService.getUserProjects();
      let allLinks: any[] = [];

      // Fetch links from all projects
      for (const project of projects) {
        try {
          const projectLinks = await this.sdkService.getLinksByProjectId(project.id, params.includeInteractions);
          const transformedLinks = transformLinks(Array.isArray(projectLinks) ? projectLinks : [], project.id);
          allLinks = allLinks.concat(transformedLinks);
        } catch (error) {
          console.warn(`Failed to load links for project ${project.id}:`, error);
          // Continue with other projects
        }
      }

      // Apply client-side filtering and pagination
      let filteredLinks = allLinks;

      if (params.filter) {
        filteredLinks = allLinks.filter(link => {
          if (params.filter!.search) {
            const search = params.filter!.search.toLowerCase();
            return link.title?.toLowerCase().includes(search) ||
                   link.url.toLowerCase().includes(search) ||
                   link.description?.toLowerCase().includes(search);
          }
          return true;
        });
      }

      // Apply sorting
      if (params.sort) {
        filteredLinks.sort((a, b) => {
          const field = params.sort!.field;
          const direction = params.sort!.direction === 'desc' ? -1 : 1;

          let aVal: any, bVal: any;
          if (field === 'lifetimeClicks') {
            aVal = a.lifetimeClicks || 0;
            bVal = b.lifetimeClicks || 0;
          } else if (field === 'createdAt') {
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
          } else {
            aVal = (a as any)[field] || '';
            bVal = (b as any)[field] || '';
          }

          if (aVal < bVal) return -1 * direction;
          if (aVal > bVal) return 1 * direction;
          return 0;
        });
      }

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLinks = filteredLinks.slice(startIndex, endIndex);

      return {
        links: paginatedLinks,
        total: filteredLinks.length,
        page,
        limit,
        totalPages: Math.ceil(filteredLinks.length / limit)
      };
    } catch (error) {
      if (error instanceof RowtSDKError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  // Link management operations via direct API calls
  async updateLink(linkData: UpdateLinkRequest): Promise<Link> {
    try {
      await this.ensureInitialized();

      // Make direct API call to update link using project API key
      const config = await import('../config/app-config.js').then(m => m.getAppConfig());
      const { id, ...updateData } = linkData;

      const response = await fetch(`${config.apiEndpoint}/link/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return transformLink(result.link, linkData.projectId);
    } catch (error) {
      console.error('Failed to update link:', error);
      throw error;
    }
  }

  async deleteLink(linkId: string, deleteData: DeleteLinkRequest): Promise<void> {
    try {
      await this.ensureInitialized();

      // Make direct API call to delete link using project API key
      const config = await import('../config/app-config.js').then(m => m.getAppConfig());

      const response = await fetch(`${config.apiEndpoint}/link/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deleteData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Delete operation successful - no return value needed
    } catch (error) {
      console.error('Failed to delete link:', error);
      throw error;
    }
  }

  async bulkLinkOperation(operation: any): Promise<{ success: number; failed: number; errors?: string[] }> {
    // Bulk operations are not supported
    throw new Error('Bulk operations are not currently supported.');
  }

  async getLinkById(id: string, projectId: string): Promise<Link> {
    // Get all links for the project and find the specific one
    try {
      const links = await this.getLinksByProject(projectId);
      const link = links.find(l => l.id === id);
      if (!link) {
        throw new Error('Link not found');
      }
      return link;
    } catch (error) {
      throw error;
    }
  }

  async validateUrl(url: string): Promise<{ valid: boolean; title?: string; description?: string; imageUrl?: string }> {
    // Basic URL validation - could be enhanced
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return this.sdkService.isReady();
  }

  getAccessToken(): string | null {
    // Token is managed internally by the SDK
    return this.sdkService.isReady() ? 'managed-by-sdk' : null;
  }

  // Dashboard stats - computed from available data
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      await this.ensureInitialized();
      const projects = await this.sdkService.getUserProjects();

      let totalLinks = 0;
      let totalClicks = 0;

      // Get links for each project to calculate totals
      for (const project of projects) {
        try {
          const links = await this.sdkService.getLinksByProjectId(project.id, false);
          const linksArray = Array.isArray(links) ? links : [];
          totalLinks += linksArray.length;
          totalClicks += linksArray.reduce((sum, link) => sum + (link.lifetimeClicks || 0), 0);
        } catch (error) {
          console.warn(`Failed to get links for project ${project.id}:`, error);
        }
      }

      return {
        totalProjects: projects.length,
        totalLinks,
        totalClicks,
        serverStatus: 'ok' as const
      };
    } catch (error) {
      return {
        totalProjects: 0,
        totalLinks: 0,
        totalClicks: 0,
        serverStatus: 'error' as const
      };
    }
  }
}
