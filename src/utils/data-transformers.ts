/**
 * Data transformation utilities for converting SDK types to UI-compatible types
 */

import type { RowtLink, RowtProject } from 'rowt-console-sdk';
import type { Link, Project } from '../types/api.js';

/**
 * Transform SDK Link to UI-compatible Link
 */
export function transformLink(sdkLink: RowtLink, projectId?: string): Link {
  return {
    ...sdkLink,
    shortCode: sdkLink.id, // Use ID as shortCode for now
    projectId: projectId || sdkLink.id, // Fallback to link ID if no projectId provided
    clickCount: sdkLink.lifetimeClicks || 0
  };
}

/**
 * Transform array of SDK Links to UI-compatible Links
 */
export function transformLinks(sdkLinks: RowtLink[], projectId?: string): Link[] {
  if (!Array.isArray(sdkLinks)) {
    return [];
  }
  return sdkLinks.map(link => transformLink(link, projectId));
}

/**
 * Transform SDK Project to UI-compatible Project
 */
export function transformProject(sdkProject: RowtProject): Project {
  return {
    ...sdkProject,
    createdAt: new Date().toISOString(), // SDK doesn't provide this, use current time
    updatedAt: new Date().toISOString()
  };
}

/**
 * Transform array of SDK Projects to UI-compatible Projects
 */
export function transformProjects(sdkProjects: RowtProject[]): Project[] {
  if (!Array.isArray(sdkProjects)) {
    return [];
  }
  return sdkProjects.map(transformProject);
}

/**
 * Generate a short code from a link ID or URL
 * This is a fallback for when the server doesn't provide a short code
 */
export function generateShortCode(linkId: string): string {
  // Use the link ID directly, or generate a short version
  return linkId.length > 8 ? linkId.substring(0, 8) : linkId;
}

/**
 * Extract project ID from link data when available
 */
export function extractProjectId(link: any): string | undefined {
  // Try different possible property names
  return link.projectId || link.project_id || link.project?.id;
}

/**
 * Safely get click count from link data
 */
export function getClickCount(link: RowtLink): number {
  return link.lifetimeClicks || 0;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return 'Unknown';
  }
}
