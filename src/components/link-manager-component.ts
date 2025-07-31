import { BaseComponent } from './base-component.js';
import { LinkFormComponent, LinkFormConfig } from './link-form-component.js';
import { LinkListComponent, LinkListConfig } from './link-list-component.js';
import { QRCodeModalComponent, QRCodePageConfig } from './qr-code-modal-component.js';
import { ApiClient } from '../services/api-client.js';
import { createElement, querySelector } from '../utils/dom-helpers.js';
import { generateShortUrl } from '../utils/data-transformers.js';
import type { Link, Project, CreateLinkRequest, UpdateLinkRequest } from '../types/api.js';

export class LinkManagerComponent extends BaseComponent {
  private apiClient: ApiClient;
  private projects: Project[] = [];
  private currentView: 'list' | 'form' | 'qr' = 'list';
  private linkListComponent: LinkListComponent | null = null;
  private linkFormComponent: LinkFormComponent | null = null;
  private qrCodeModalComponent: QRCodeModalComponent | null = null;
  private editingLink: Link | null = null;

  constructor(container: HTMLElement, apiClient: ApiClient) {
    super(container);
    this.apiClient = apiClient;
  }

  async render(): Promise<void> {
    this.checkDestroyed();
    this.clear();

    // Load projects first
    await this.loadProjects();

    const managerContainer = createElement('div', { className: 'link-manager-container' });
    
    // Create main content area
    const contentArea = createElement('div', { className: 'link-manager-content' });
    managerContainer.appendChild(contentArea);

    this.container.appendChild(managerContainer);

    // Show initial view
    this.showListView();
  }

  private async loadProjects(): Promise<void> {
    try {
      this.projects = await this.apiClient.getUserProjects();
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.showError('Failed to load projects. Please refresh the page.');
      this.projects = [];
    }
  }

  private async showListView(): Promise<void> {
    this.currentView = 'list';
    this.editingLink = null;

    const contentArea = querySelector('.link-manager-content', this.container) as HTMLElement;
    if (!contentArea) return;

    contentArea.innerHTML = '';

    if (this.projects.length === 0) {
      this.showNoProjectsState(contentArea);
      return;
    }

    // Create link list component
    const listConfig: LinkListConfig = {
      projects: this.projects,
      onEdit: (link: Link) => this.handleEditLink(link),
      onDelete: (link: Link) => this.handleDeleteLink(link),
      onBulkDelete: (linkIds: string[]) => this.handleBulkDelete(linkIds),
      onCreateNew: () => this.showCreateForm(),
      onGenerateQR: (link: Link) => this.handleGenerateQR(link)
    };

    this.linkListComponent = new LinkListComponent(contentArea, this.apiClient, listConfig);
    await this.linkListComponent.render();
  }

  private showCreateForm(): void {
    this.currentView = 'form';
    this.editingLink = null;

    const contentArea = querySelector('.link-manager-content', this.container) as HTMLElement;
    if (!contentArea) return;

    contentArea.innerHTML = '';

    const formConfig: LinkFormConfig = {
      mode: 'create',
      projects: this.projects,
      onSubmit: (data: CreateLinkRequest) => this.handleCreateLink(data),
      onCancel: () => this.showListView()
    };

    this.linkFormComponent = new LinkFormComponent(contentArea, this.apiClient, formConfig);
    this.linkFormComponent.render();
  }

  private showEditForm(link: Link): void {
    this.currentView = 'form';
    this.editingLink = link;

    const contentArea = querySelector('.link-manager-content', this.container) as HTMLElement;
    if (!contentArea) return;

    contentArea.innerHTML = '';

    const formConfig: LinkFormConfig = {
      mode: 'edit',
      link: link,
      projects: this.projects,
      onSubmit: (data: UpdateLinkRequest) => this.handleUpdateLink(data),
      onCancel: () => this.showListView()
    };

    this.linkFormComponent = new LinkFormComponent(contentArea, this.apiClient, formConfig);
    this.linkFormComponent.render();
  }

  private showNoProjectsState(container: HTMLElement): void {
    const emptyState = createElement('div', { className: 'empty-state' });
    
    emptyState.innerHTML = `
      <div class="empty-icon">📁</div>
      <h3>No Projects Found</h3>
      <p>You need to create a project before you can manage links.</p>
      <p>Projects help organize your links and provide the necessary configuration for URL shortening.</p>
    `;
    
    const createProjectBtn = this.createButton('Create Your First Project', 'btn btn-primary', () => {
      this.emit('projects:create');
    });
    
    emptyState.appendChild(createProjectBtn);
    container.appendChild(emptyState);
  }

  private async handleCreateLink(data: CreateLinkRequest): Promise<void> {
    try {
      const shortUrl = await this.apiClient.createLink(data);
      this.showSuccess(`Link created successfully! Short URL: ${shortUrl}`);

      // Show list view which will create a new LinkListComponent and load fresh data
      await this.showListView();
    } catch (error) {
      console.error('Failed to create link:', error);
      throw error; // Let the form component handle the error display
    }
  }

  private async handleUpdateLink(data: UpdateLinkRequest): Promise<void> {
    try {
      await this.apiClient.updateLink(data);
      this.showSuccess('Link updated successfully!');

      // Show list view which will create a new LinkListComponent and load fresh data
      await this.showListView();
    } catch (error) {
      console.error('Failed to update link:', error);
      throw error; // Let the form component handle the error display
    }
  }

  private handleEditLink(link: Link): void {
    this.showEditForm(link);
  }

  private async handleDeleteLink(link: Link): Promise<void> {
    const confirmed = await this.showConfirmDialog(
      'Delete Link',
      `Are you sure you want to delete the link "${link.shortCode}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (!confirmed) return;

    try {
      const project = this.projects.find(p => p.id === link.projectId);
      if (!project) {
        throw new Error('Project not found for this link');
      }

      await this.apiClient.deleteLink(link.id, {
        projectId: link.projectId || project.id,
        apiKey: project.apiKey
      });

      this.showSuccess('Link deleted successfully!');
      
      // Refresh the list
      if (this.linkListComponent) {
        this.linkListComponent.refresh();
      }
    } catch (error) {
      console.error('Failed to delete link:', error);
      this.showError('Failed to delete link. Please try again.');
    }
  }

  private async handleBulkDelete(linkIds: string[]): Promise<void> {
    const count = linkIds.length;
    const confirmed = await this.showConfirmDialog(
      'Delete Links',
      `Are you sure you want to delete ${count} link${count === 1 ? '' : 's'}? This action cannot be undone.`,
      'Delete All',
      'Cancel'
    );

    if (!confirmed) return;

    try {
      // Group links by project to get the correct API keys
      const linksByProject = new Map<string, string[]>();
      
      // We need to get the full link data to know which project each belongs to
      // For now, we'll assume all selected links are from the same project
      // In a real implementation, you might want to fetch link details or store project info
      
      const results = await Promise.allSettled(
        linkIds.map(async (linkId) => {
          // Find the project for this link - this is a simplified approach
          // In practice, you might want to batch this or store project info with links
          for (const project of this.projects) {
            try {
              await this.apiClient.deleteLink(linkId, {
                projectId: project.id,
                apiKey: project.apiKey
              });
              return { success: true, linkId };
            } catch (error) {
              // Try next project or handle error
              continue;
            }
          }
          throw new Error(`Could not delete link ${linkId}`);
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        this.showSuccess(`Successfully deleted ${successful} link${successful === 1 ? '' : 's'}${failed > 0 ? `, ${failed} failed` : ''}.`);
      }

      if (failed > 0 && successful === 0) {
        this.showError('Failed to delete links. Please try again.');
      }

      // Refresh the list and clear selection
      if (this.linkListComponent) {
        this.linkListComponent.refresh();
        this.linkListComponent.clearSelectionPublic();
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
      this.showError('Failed to delete links. Please try again.');
    }
  }

  private async showConfirmDialog(
    title: string,
    message: string,
    confirmText: string,
    cancelText: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = createElement('div', { className: 'modal-overlay' });
      
      const modalContent = createElement('div', { className: 'modal' });
      
      const header = createElement('div', { className: 'modal-header' });
      const titleEl = createElement('h3', { textContent: title });
      header.appendChild(titleEl);
      
      const body = createElement('div', { className: 'modal-body' });
      const messageEl = createElement('p', { textContent: message });
      body.appendChild(messageEl);
      
      const footer = createElement('div', { className: 'modal-footer' });
      
      const cancelBtn = this.createButton(cancelText, 'btn btn-secondary', () => {
        modal.remove();
        resolve(false);
      });
      
      const confirmBtn = this.createButton(confirmText, 'btn btn-danger', () => {
        modal.remove();
        resolve(true);
      });
      
      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);
      
      modalContent.appendChild(header);
      modalContent.appendChild(body);
      modalContent.appendChild(footer);
      modal.appendChild(modalContent);
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      });
      
      document.body.appendChild(modal);
    });
  }

  protected showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  protected showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = createElement('div', {
      textContent: message,
      className: `notification ${type}`
    });
    
    // Position at top of container
    this.container.insertBefore(notification, this.container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  // Public methods for external control
  public showCreateLinkForm(): void {
    this.showCreateForm();
  }

  public refreshLinks(): void {
    if (this.currentView === 'list' && this.linkListComponent) {
      this.linkListComponent.refresh();
    }
  }

  private async handleGenerateQR(link: Link): Promise<void> {
    try {
      // Generate the short URL for the QR code
      const shortUrl = await generateShortUrl(link.shortCode || link.id);

      // Switch to QR code view
      this.showQRCodePage(link, shortUrl);

    } catch (error) {
      console.error('Failed to generate QR code:', error);
      this.showError('Failed to generate QR code. Please try again.');
    }
  }

  private showQRCodePage(link: Link, shortUrl: string): void {
    this.currentView = 'qr';

    const contentArea = querySelector('.link-manager-content', this.container) as HTMLElement;
    if (!contentArea) return;

    contentArea.innerHTML = '';

    // Create QR code page config
    const qrConfig: QRCodePageConfig = {
      link: link,
      shortUrl: shortUrl,
      onClose: () => {
        this.showListView();
      }
    };

    // Create and render QR code page
    this.qrCodeModalComponent = new QRCodeModalComponent(contentArea, qrConfig);
    this.qrCodeModalComponent.render();
  }

  public async refreshProjects(): Promise<void> {
    await this.loadProjects();

    // If we're showing the no projects state and now have projects, show the list
    if (this.projects.length > 0 && this.currentView === 'list') {
      this.showListView();
    }
  }
}
