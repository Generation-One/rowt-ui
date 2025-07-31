import { BaseComponent } from './base-component.js';
import { ApiClient } from '../services/api-client.js';
import { createElement, querySelector } from '../utils/dom-helpers.js';
import type { Link, Project, CreateLinkRequest, UpdateLinkRequest } from '../types/api.js';

export interface LinkFormConfig {
  mode: 'create' | 'edit';
  link?: Link;
  projects: Project[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export class LinkFormComponent extends BaseComponent {
  private apiClient: ApiClient;
  private config: LinkFormConfig;
  private form: HTMLFormElement | null = null;
  private urlPreview: HTMLElement | null = null;
  private isValidatingUrl = false;

  constructor(container: HTMLElement, apiClient: ApiClient, config: LinkFormConfig) {
    super(container);
    this.apiClient = apiClient;
    this.config = config;
  }

  render(): void {
    this.checkDestroyed();
    this.clear();

    // Check if edit mode is supported
    if (this.config.mode === 'edit') {
      this.renderEditNotSupported();
      return;
    }

    const formContainer = createElement('div', { className: 'link-form-container' });
    
    // Form header
    const header = createElement('div', { className: 'form-header' });
    const title = createElement('h3', { 
      textContent: this.config.mode === 'create' ? 'Create New Link' : 'Edit Link',
      className: 'form-title'
    });
    header.appendChild(title);

    // Form
    this.form = createElement('form', { className: 'link-form' }) as HTMLFormElement;
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    // Project selection (only for create mode)
    if (this.config.mode === 'create') {
      const projectGroup = this.createLinkFormGroup('Project', 'select', 'projectId', true);
      const projectSelect = projectGroup.querySelector('select') as HTMLSelectElement;
      
      // Add default option
      const defaultOption = createElement('option', { 
        textContent: 'Select a project...',
        attributes: { value: '', disabled: 'true', selected: 'true' }
      });
      projectSelect.appendChild(defaultOption);
      
      // Add project options
      this.config.projects.forEach(project => {
        const option = createElement('option', {
          textContent: project.name,
          attributes: { value: project.id }
        });
        projectSelect.appendChild(option);
      });
      
      this.form.appendChild(projectGroup);
    }

    // URL field
    const urlGroup = this.createLinkFormGroup('URL', 'url', 'url', true, 'Enter the URL to shorten...');
    const urlInput = urlGroup.querySelector('input') as HTMLInputElement;
    if (this.config.link?.url) {
      urlInput.value = this.config.link.url;
    }
    
    // Add URL validation
    urlInput.addEventListener('blur', this.validateUrl.bind(this));
    urlInput.addEventListener('input', this.clearUrlPreview.bind(this));
    
    this.form.appendChild(urlGroup);

    // URL Preview
    this.urlPreview = createElement('div', { className: 'url-preview hidden' });
    this.form.appendChild(this.urlPreview);

    // Title field
    const titleGroup = this.createLinkFormGroup('Title', 'text', 'title', false, 'Optional title for the link...');
    const titleInput = titleGroup.querySelector('input') as HTMLInputElement;
    if (this.config.link?.title) {
      titleInput.value = this.config.link.title;
    }
    this.form.appendChild(titleGroup);

    // Description field
    const descGroup = this.createLinkFormGroup('Description', 'textarea', 'description', false, 'Optional description...');
    const descTextarea = descGroup.querySelector('textarea') as HTMLTextAreaElement;
    if (this.config.link?.description) {
      descTextarea.value = this.config.link.description;
    }
    this.form.appendChild(descGroup);

    // Image URL field
    const imageGroup = this.createLinkFormGroup('Image URL', 'url', 'imageUrl', false, 'Optional image URL...');
    const imageInput = imageGroup.querySelector('input') as HTMLInputElement;
    if (this.config.link?.imageUrl) {
      imageInput.value = this.config.link.imageUrl;
    }
    this.form.appendChild(imageGroup);

    // Form actions
    const actions = createElement('div', { className: 'form-actions' });
    
    const cancelBtn = this.createButton('Cancel', 'btn btn-secondary', () => {
      this.config.onCancel();
    });
    
    const submitBtn = this.createButton(
      this.config.mode === 'create' ? 'Create Link' : 'Update Link',
      'btn btn-primary',
      () => this.form?.requestSubmit()
    );
    submitBtn.type = 'submit';
    
    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);
    this.form.appendChild(actions);

    // Assemble form
    formContainer.appendChild(header);
    formContainer.appendChild(this.form);
    this.container.appendChild(formContainer);
  }

  private renderEditNotSupported(): void {
    const container = createElement('div', { className: 'edit-not-supported' });

    const header = createElement('div', { className: 'form-header' });
    const titleElement = createElement('h3', {
      textContent: 'Link Editing Not Available',
      className: 'form-title'
    });
    header.appendChild(titleElement);

    const message = createElement('div', { className: 'info-message' });
    message.innerHTML = `
      <div class="info-icon">ℹ️</div>
      <div class="info-content">
        <h4>Link Editing Not Currently Supported</h4>
        <p>The current version of the Rowt Console doesn't support editing existing links.
           If you need to change a link, you can:</p>
        <ul>
          <li>Create a new link with the updated information</li>
          <li>The old link will remain active until it expires based on server configuration</li>
          <li>Update your applications to use the new short link</li>
        </ul>
        <p>This feature may be added in future updates.</p>
      </div>
    `;

    const backButton = createElement('button', {
      textContent: '← Back to Links',
      className: 'btn btn-secondary'
    });
    backButton.addEventListener('click', () => this.config.onCancel());

    container.appendChild(header);
    container.appendChild(message);
    container.appendChild(backButton);
    this.container.appendChild(container);
  }

  private createLinkFormGroup(
    label: string,
    type: string,
    name: string,
    required: boolean = false,
    placeholder?: string
  ): HTMLElement {
    const group = createElement('div', { className: 'form-group' });
    
    const labelEl = createElement('label', {
      textContent: label + (required ? ' *' : ''),
      attributes: { for: name }
    });
    
    let input: HTMLElement;
    if (type === 'textarea') {
      input = createElement('textarea', {
        attributes: {
          id: name,
          name: name,
          ...(placeholder && { placeholder }),
          ...(required && { required: 'true' }),
          rows: '3'
        }
      });
    } else if (type === 'select') {
      input = createElement('select', {
        attributes: {
          id: name,
          name: name,
          ...(required && { required: 'true' })
        }
      });
    } else {
      input = createElement('input', {
        attributes: {
          type: type,
          id: name,
          name: name,
          ...(placeholder && { placeholder }),
          ...(required && { required: 'true' })
        }
      });
    }
    
    group.appendChild(labelEl);
    group.appendChild(input);
    
    return group;
  }

  private async validateUrl(): Promise<void> {
    if (this.isValidatingUrl) return;
    
    const urlInput = this.form?.querySelector('input[name="url"]') as HTMLInputElement;
    const url = urlInput?.value?.trim();
    
    if (!url || !this.isValidUrl(url)) {
      this.clearUrlPreview();
      return;
    }

    this.isValidatingUrl = true;
    this.showUrlPreviewLoading();

    try {
      const result = await this.apiClient.validateUrl(url);
      
      if (result.valid) {
        const previewData: { title?: string; description?: string; imageUrl?: string } = {};
        if (result.title) previewData.title = result.title;
        if (result.description) previewData.description = result.description;
        if (result.imageUrl) previewData.imageUrl = result.imageUrl;

        this.showUrlPreview(previewData);
        
        // Auto-fill title and description if empty
        const titleInput = this.form?.querySelector('input[name="title"]') as HTMLInputElement;
        const descInput = this.form?.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
        
        if (result.title && !titleInput.value) {
          titleInput.value = result.title;
        }
        
        if (result.description && !descInput.value) {
          descInput.value = result.description;
        }
      } else {
        this.clearUrlPreview();
      }
    } catch (error) {
      console.warn('URL validation failed:', error);
      this.clearUrlPreview();
    } finally {
      this.isValidatingUrl = false;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private showUrlPreviewLoading(): void {
    if (!this.urlPreview) return;
    
    this.urlPreview.className = 'url-preview loading';
    this.urlPreview.innerHTML = `
      <div class="preview-loading">
        <div class="loader-small"></div>
        <span>Validating URL...</span>
      </div>
    `;
  }

  private showUrlPreview(data: { title?: string; description?: string; imageUrl?: string }): void {
    if (!this.urlPreview) return;
    
    this.urlPreview.className = 'url-preview';
    
    const preview = createElement('div', { className: 'preview-content' });
    
    if (data.imageUrl) {
      const img = createElement('img', {
        attributes: { src: data.imageUrl, alt: 'Preview' },
        className: 'preview-image'
      });
      preview.appendChild(img);
    }
    
    const textContent = createElement('div', { className: 'preview-text' });
    
    if (data.title) {
      const title = createElement('h4', { 
        textContent: data.title,
        className: 'preview-title'
      });
      textContent.appendChild(title);
    }
    
    if (data.description) {
      const desc = createElement('p', { 
        textContent: data.description,
        className: 'preview-description'
      });
      textContent.appendChild(desc);
    }
    
    preview.appendChild(textContent);
    this.urlPreview.innerHTML = '';
    this.urlPreview.appendChild(preview);
  }

  private clearUrlPreview(): void {
    if (!this.urlPreview) return;
    this.urlPreview.className = 'url-preview hidden';
    this.urlPreview.innerHTML = '';
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this.form) return;
    
    const formData = new FormData(this.form);
    const data: any = {};
    
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'string' && value.trim()) {
        data[key] = value.trim();
      }
    }

    // Validate required fields
    if (this.config.mode === 'create' && !data.projectId) {
      this.showError('Please select a project');
      return;
    }
    
    if (!data.url) {
      this.showError('URL is required');
      return;
    }

    try {
      this.setLoading(true);
      
      if (this.config.mode === 'create') {
        // Get project details for API key
        const project = this.config.projects.find(p => p.id === data.projectId);
        if (!project) {
          throw new Error('Selected project not found');
        }
        
        const createData: CreateLinkRequest = {
          projectId: data.projectId,
          apiKey: project.apiKey,
          url: data.url,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl
        };
        
        await this.config.onSubmit(createData);
      } else {
        // Edit mode
        if (!this.config.link) {
          throw new Error('Link data not available for editing');
        }
        
        const project = this.config.projects.find(p => p.id === this.config.link!.projectId);
        if (!project) {
          throw new Error('Project not found for this link');
        }
        
        const updateData: UpdateLinkRequest = {
          id: this.config.link.id,
          projectId: this.config.link.projectId || this.config.link.id,
          apiKey: project.apiKey,
          url: data.url,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl
        };
        
        await this.config.onSubmit(updateData);
      }
    } catch (error) {
      console.error('Form submission failed:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to save link');
    } finally {
      this.setLoading(false);
    }
  }

  protected showError(message: string): void {
    // Remove existing error
    const existingError = this.container.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }
    
    const error = createElement('div', {
      textContent: message,
      className: 'form-error error'
    });
    
    this.container.insertBefore(error, this.container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (error.parentNode) {
        error.remove();
      }
    }, 5000);
  }
}
