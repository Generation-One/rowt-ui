import { BaseComponent } from './base-component.js';
import { ApiClient } from '../services/api-client.js';
import { createElement } from '../utils/dom-helpers.js';
import type { Link, CreateLinkRequest, Project } from '../types/api.js';

export class LinkManager extends BaseComponent {
  private apiClient: ApiClient;
  private links: Link[] = [];
  private projects: Project[] = [];
  private selectedProjectId: string | null = null;

  constructor(container: HTMLElement, apiClient: ApiClient) {
    super(container);
    this.apiClient = apiClient;
  }

  async render(): Promise<void> {
    this.container.innerHTML = '';
    
    const header = this.createHeader();
    const content = await this.createContent();
    
    this.container.appendChild(header);
    this.container.appendChild(content);
  }

  private createHeader(): HTMLElement {
    const header = createElement('div', { className: 'section-header' });
    
    const title = createElement('h2', { textContent: 'Short Links' });
    const createBtn = this.createButton('Create New Link', 'btn btn-primary', () => {
      this.showCreateLinkModal();
    });
    
    header.appendChild(title);
    header.appendChild(createBtn);
    
    return header;
  }

  private async createContent(): Promise<HTMLElement> {
    const content = createElement('div', { className: 'links-content' });
    
    // Project selector
    const projectSelector = await this.createProjectSelector();
    content.appendChild(projectSelector);
    
    // Links list
    const linksList = createElement('div', { 
      id: 'links-list',
      className: 'links-list' 
    });
    content.appendChild(linksList);
    
    // Load initial data
    await this.loadProjects();
    
    return content;
  }

  private async createProjectSelector(): Promise<HTMLElement> {
    const selectorContainer = createElement('div', { className: 'project-selector' });
    
    const label = createElement('label', { 
      textContent: 'Select Project:',
      className: 'selector-label'
    });
    
    const select = createElement('select', { 
      id: 'project-select',
      className: 'form-control'
    });
    
    select.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.selectedProjectId = target.value;
      this.loadLinksForProject(target.value);
    });
    
    selectorContainer.appendChild(label);
    selectorContainer.appendChild(select);
    
    return selectorContainer;
  }

  private async loadProjects(): Promise<void> {
    try {
      this.projects = await this.apiClient.getUserProjects();
      this.updateProjectSelector();
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.showError('Failed to load projects');
    }
  }

  private updateProjectSelector(): void {
    const select = this.container.querySelector('#project-select') as HTMLSelectElement;
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a project...</option>';
    
    this.projects.forEach(project => {
      const option = createElement('option', {
        textContent: project.name,
        attributes: { value: project.id }
      });
      select.appendChild(option);
    });
  }

  private async loadLinksForProject(projectId: string): Promise<void> {
    if (!projectId) {
      this.renderLinksList([]);
      return;
    }
    
    try {
      this.setLoading(true);
      this.links = await this.apiClient.getLinksByProject(projectId);
      this.renderLinksList(this.links);
    } catch (error) {
      console.error('Failed to load links:', error);
      this.showError('Failed to load links');
      this.renderLinksList([]);
    } finally {
      this.setLoading(false);
    }
  }

  private renderLinksList(links: Link[]): void {
    const linksList = this.container.querySelector('#links-list');
    if (!linksList) return;
    
    linksList.innerHTML = '';
    
    if (links.length === 0) {
      const emptyState = createElement('div', {
        className: 'empty-state',
        textContent: this.selectedProjectId ? 'No links found for this project.' : 'Select a project to view links.'
      });
      linksList.appendChild(emptyState);
      return;
    }
    
    links.forEach(link => {
      const linkCard = this.createLinkCard(link);
      linksList.appendChild(linkCard);
    });
  }

  private createLinkCard(link: Link): HTMLElement {
    const card = createElement('div', { className: 'link-card' });
    
    // Header
    const header = createElement('div', { className: 'link-header' });
    const title = createElement('h3', { 
      textContent: link.title || 'Untitled Link',
      className: 'link-title'
    });
    const shortUrl = createElement('a', {
      textContent: `/${link.shortCode}`,
      className: 'short-url',
      attributes: { 
        href: `/${link.shortCode}`,
        target: '_blank'
      }
    });
    
    header.appendChild(title);
    header.appendChild(shortUrl);
    
    // Details
    const details = createElement('div', { className: 'link-details' });
    
    const targetUrl = createElement('div', { className: 'detail-row' });
    const targetLabel = createElement('span', { 
      textContent: 'Target URL:',
      className: 'detail-label'
    });
    const targetValue = createElement('a', {
      textContent: link.url,
      className: 'detail-value link-url',
      attributes: { href: link.url, target: '_blank' }
    });
    targetUrl.appendChild(targetLabel);
    targetUrl.appendChild(targetValue);
    
    const clickCount = createElement('div', { className: 'detail-row' });
    const clickLabel = createElement('span', { 
      textContent: 'Clicks:',
      className: 'detail-label'
    });
    const clickValue = createElement('span', {
      textContent: (link.clickCount || 0).toString(),
      className: 'detail-value click-count'
    });
    clickCount.appendChild(clickLabel);
    clickCount.appendChild(clickValue);
    
    const created = createElement('div', { className: 'detail-row' });
    const createdLabel = createElement('span', { 
      textContent: 'Created:',
      className: 'detail-label'
    });
    const createdValue = createElement('span', {
      textContent: new Date(link.createdAt).toLocaleDateString(),
      className: 'detail-value'
    });
    created.appendChild(createdLabel);
    created.appendChild(createdValue);
    
    details.appendChild(targetUrl);
    details.appendChild(clickCount);
    details.appendChild(created);
    
    // Actions
    const actions = createElement('div', { className: 'link-actions' });
    
    const copyBtn = this.createButton('Copy', 'btn btn-secondary btn-sm', () => {
      this.copyToClipboard(`${window.location.origin}/${link.shortCode}`);
    });
    
    const analyticsBtn = this.createButton('Analytics', 'btn btn-primary btn-sm', () => {
      this.emit('link:analytics', link);
    });
    
    actions.appendChild(copyBtn);
    actions.appendChild(analyticsBtn);
    
    // Assemble card
    card.appendChild(header);
    card.appendChild(details);
    card.appendChild(actions);
    
    return card;
  }

  showCreateLinkModal(): void {
    if (!this.selectedProjectId) {
      this.showError('Please select a project first');
      return;
    }
    
    const modalContent = this.createLinkForm();
    this.emit('modal:show', {
      title: 'Create New Link',
      content: modalContent
    });
  }

  private createLinkForm(): HTMLElement {
    const form = createElement('form', { id: 'create-link-form' });
    
    // Target URL
    const urlInput = this.createInput('url', 'https://example.com/page', '', true);
    urlInput.name = 'url';
    const urlGroup = this.createFormGroup(
      'Target URL:', 
      urlInput, 
      'target-url',
      'The URL where users will be redirected when they click your short link'
    );
    
    // Title (optional)
    const titleInput = this.createInput('text', 'My Link Title', '');
    titleInput.name = 'title';
    const titleGroup = this.createFormGroup(
      'Title (optional):', 
      titleInput, 
      'link-title',
      'A descriptive title for your link to help you identify it'
    );
    
    // Description (optional)
    const descInput = this.createInput('text', 'Link description', '');
    descInput.name = 'description';
    const descGroup = this.createFormGroup(
      'Description (optional):', 
      descInput, 
      'link-description',
      'A brief description of what this link leads to'
    );
    
    // Submit button
    const submitButton = this.createButton('Create Link', 'btn btn-primary');
    submitButton.type = 'submit';
    
    // Assemble form
    form.appendChild(urlGroup);
    form.appendChild(titleGroup);
    form.appendChild(descGroup);
    form.appendChild(submitButton);
    
    // Add form submit handler
    form.addEventListener('submit', this.handleCreateLink.bind(this));
    
    return form;
  }

  private async handleCreateLink(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this.selectedProjectId) {
      this.showError('No project selected');
      return;
    }
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const selectedProject = this.projects.find(p => p.id === this.selectedProjectId);
    if (!selectedProject) {
      this.showError('Selected project not found');
      return;
    }
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    const linkData: CreateLinkRequest = {
      projectId: this.selectedProjectId,
      apiKey: selectedProject.apiKey,
      url: formData.get('url') as string,
      ...(title && { title }),
      ...(description && { description })
    };
    
    // Validate required fields
    if (!linkData.url) {
      this.showError('Please enter a target URL');
      return;
    }
    
    try {
      this.setLoading(true, form);
      
      await this.apiClient.createLink(linkData);
      
      this.emit('modal:hide');
      this.showSuccess('Link created successfully!');
      
      // Reload links for current project
      await this.loadLinksForProject(this.selectedProjectId);
      
    } catch (error) {
      console.error('Failed to create link:', error);
      this.showError('Failed to create link. Please try again.');
    } finally {
      this.setLoading(false, form);
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError('Failed to copy link');
    }
  }
}
