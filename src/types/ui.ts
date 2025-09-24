// Import SDK types
import type { User } from './api.js';

// UI State Types
export type TabName = 'overview' | 'projects' | 'links' | 'analytics' | 'well-known';

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  currentTab: TabName;
  isLoading: boolean;
  error: string | null;
}

// Re-export User type
export type { User };

// Modal Types
export interface ModalConfig {
  title: string;
  content: string | HTMLElement;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'url' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  value?: string;
  options?: { value: string; label: string }[];
}

export interface FormConfig {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  submitText?: string;
}

// Event Types
export interface CustomEvent<T = any> {
  type: string;
  data?: T;
}

// Component Props
export interface ComponentProps {
  container: HTMLElement;
  data?: any;
}

// API Client Configuration
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Link Management UI Types
export interface LinkTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface LinkViewMode {
  type: 'table' | 'cards';
}

export interface LinkSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

export interface LinkSearchState {
  query: string;
  projectFilter: string;
  dateRange: {
    from: string;
    to: string;
  };
  showAdvanced: boolean;
}

export interface LinkSortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface LinkManagerState {
  links: any[];
  projects: any[];
  loading: boolean;
  error: string | null;
  selection: LinkSelectionState;
  search: LinkSearchState;
  sort: LinkSortState;
  viewMode: LinkViewMode;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
