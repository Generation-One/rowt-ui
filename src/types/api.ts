// Re-export SDK types (except Link and Project which we extend)
export type {
  RowtUser as User,
  RowtLoginDTO as LoginRequest,
  RowtTokens,
  RowtLoginResponseDTO as LoginResponse,
  CreateProjectDTO as CreateProjectRequest,
  UpdateProjectDTO,
  RowtInteraction as Interaction,
  RowtGetProjectOptions,
  UsageStats,
  TierStats
} from 'rowt-console-sdk';

// Import for internal use
import type { RowtLink, RowtProject } from 'rowt-console-sdk';

// Extended Link type with UI compatibility properties
export interface Link extends RowtLink {
  shortCode?: string; // Generated from link ID or server response
  projectId?: string; // For backward compatibility
  clickCount?: number; // Mapped from lifetimeClicks
  active?: boolean; // Link active status for edit mode
}

// Extended Project type with UI compatibility properties
export interface Project extends RowtProject {
  createdAt?: string; // For UI display
  updatedAt?: string; // For UI display
}

// Additional UI-specific types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

// Link creation and update types for UI compatibility
export interface CreateLinkRequest {
  projectId: string;
  apiKey: string;
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  fallbackUrlOverride?: string;
  additionalMetadata?: Record<string, any>;
  properties?: Record<string, any>;
  expiration?: string;
  customShortcode?: string;
}

export interface UpdateLinkRequest {
  id: string;
  projectId: string;
  apiKey: string;
  url?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  fallbackUrlOverride?: string;
  additionalMetadata?: Record<string, any>;
  properties?: Record<string, any>;
  active?: boolean;
}

export interface DeleteLinkRequest {
  projectId: string;
  apiKey: string;
}

export interface EditProjectRequest {
  name?: string;
  baseUrl?: string;
  fallbackUrl?: string;
  appstoreId?: string;
  playstoreId?: string;
  iosScheme?: string;
  androidScheme?: string;
}

// UI-specific types for filtering, sorting, and pagination
export interface LinkFilter {
  projectId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  hasTitle?: boolean;
  hasDescription?: boolean;
}

export interface LinkSort {
  field: 'createdAt' | 'title' | 'lifetimeClicks' | 'url';
  direction: 'asc' | 'desc';
}

export interface GetLinksRequest {
  projectId?: string;
  filter?: LinkFilter;
  sort?: LinkSort;
  page?: number;
  limit?: number;
  includeInteractions?: boolean;
}

export interface GetLinksResponse {
  links: RowtLink[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Statistics for dashboard
export interface DashboardStats {
  totalProjects: number;
  totalLinks: number;
  totalClicks: number;
  serverStatus: 'ok' | 'error';
}
