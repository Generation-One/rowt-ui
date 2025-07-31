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

    // Fallback URL field
    const fallbackGroup = this.createLinkFormGroup('Fallback URL', 'url', 'fallbackUrlOverride', false, 'Optional fallback URL for when app is not installed...');
    const fallbackInput = fallbackGroup.querySelector('input') as HTMLInputElement;
    if (this.config.link?.fallbackUrlOverride) {
      fallbackInput.value = this.config.link.fallbackUrlOverride;
    }
    this.form.appendChild(fallbackGroup);

    // Additional Metadata (JSONB) - Social media tags
    const metadataGroup = this.createSocialMetadataEditor('Additional Metadata', 'additionalMetadata',
      'Open Graph, Twitter Cards, and other social media metadata', this.config.link?.additionalMetadata);
    this.form.appendChild(metadataGroup);

    // Properties (JSONB) - Complex JSON for tracking/analytics
    const propertiesGroup = this.createJsonEditor('Properties', 'properties',
      'Custom properties for tracking, analytics, campaigns, etc.', this.config.link?.properties);
    this.form.appendChild(propertiesGroup);

    // Active status field (only for edit mode)
    if (this.config.mode === 'edit') {
      const activeGroup = createElement('div', { className: 'form-group checkbox-group' });
      const activeLabel = createElement('label', {
        textContent: 'Active',
        className: 'form-label'
      });

      const checkboxContainer = createElement('div', { className: 'checkbox-container' });
      const activeCheckbox = createElement('input', {
        attributes: {
          type: 'checkbox',
          name: 'active',
          id: 'active'
        }
      }) as HTMLInputElement;

      // Set default value - assume active if not specified
      const isActive = this.config.link?.active !== false;
      activeCheckbox.checked = isActive;

      const checkboxLabel = createElement('label', {
        textContent: 'Link is active and can receive clicks',
        attributes: { for: 'active' },
        className: 'checkbox-label'
      });

      checkboxContainer.appendChild(activeCheckbox);
      checkboxContainer.appendChild(checkboxLabel);
      activeGroup.appendChild(activeLabel);
      activeGroup.appendChild(checkboxContainer);
      this.form.appendChild(activeGroup);
    }

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

  private createJsonEditor(label: string, name: string, description: string, initialData?: Record<string, any>): HTMLElement {
    const group = createElement('div', { className: 'form-group metadata-group' });

    const labelElement = createElement('label', {
      textContent: label,
      className: 'form-label',
      attributes: { for: name }
    });

    const descElement = createElement('small', {
      textContent: description,
      className: 'form-description'
    });

    // Container for the metadata editor
    const editorContainer = createElement('div', { className: 'metadata-editor' });

    // Editor mode toggle
    const modeToggle = createElement('div', { className: 'editor-mode-toggle' });
    const jsonModeBtn = createElement('button', {
      textContent: 'JSON Editor',
      className: 'btn btn-sm btn-outline-primary mode-btn active',
      attributes: { type: 'button', 'data-mode': 'json' }
    });
    const templateModeBtn = createElement('button', {
      textContent: 'Template',
      className: 'btn btn-sm btn-outline-secondary mode-btn',
      attributes: { type: 'button', 'data-mode': 'template' }
    });

    modeToggle.appendChild(jsonModeBtn);
    modeToggle.appendChild(templateModeBtn);

    // JSON textarea for complex structures
    const jsonTextarea = createElement('textarea', {
      attributes: {
        name: name,
        id: name,
        placeholder: this.getJsonPlaceholder(name),
        rows: '12'
      },
      className: 'form-control json-editor'
    }) as HTMLTextAreaElement;

    // Pre-populate with existing data or template
    if (initialData && Object.keys(initialData).length > 0) {
      jsonTextarea.value = JSON.stringify(initialData, null, 2);
    } else {
      jsonTextarea.value = this.getJsonTemplate(name);
    }

    // Template view
    const templateView = createElement('div', { className: 'template-view hidden' });
    templateView.innerHTML = this.getTemplateHTML(name);

    // Validation feedback
    const validationFeedback = createElement('div', { className: 'validation-feedback' });

    // Mode toggle handlers
    jsonModeBtn.addEventListener('click', () => {
      jsonModeBtn.classList.add('active');
      jsonModeBtn.classList.remove('btn-outline-primary');
      jsonModeBtn.classList.add('btn-primary');
      templateModeBtn.classList.remove('active', 'btn-secondary');
      templateModeBtn.classList.add('btn-outline-secondary');

      jsonTextarea.classList.remove('hidden');
      templateView.classList.add('hidden');
    });

    templateModeBtn.addEventListener('click', () => {
      templateModeBtn.classList.add('active');
      templateModeBtn.classList.remove('btn-outline-secondary');
      templateModeBtn.classList.add('btn-secondary');
      jsonModeBtn.classList.remove('active', 'btn-primary');
      jsonModeBtn.classList.add('btn-outline-primary');

      jsonTextarea.classList.add('hidden');
      templateView.classList.remove('hidden');
    });

    // JSON validation
    jsonTextarea.addEventListener('input', () => {
      this.validateJsonInput(jsonTextarea, validationFeedback);
    });

    // Initial validation
    this.validateJsonInput(jsonTextarea, validationFeedback);

    editorContainer.appendChild(modeToggle);
    editorContainer.appendChild(jsonTextarea);
    editorContainer.appendChild(templateView);
    editorContainer.appendChild(validationFeedback);

    group.appendChild(labelElement);
    group.appendChild(descElement);
    group.appendChild(editorContainer);

    return group;
  }

  private createSocialMetadataEditor(label: string, name: string, description: string, initialData?: Record<string, any>): HTMLElement {
    const group = createElement('div', { className: 'form-group metadata-group' });

    const labelElement = createElement('label', {
      textContent: label,
      className: 'form-label',
      attributes: { for: name }
    });

    const descElement = createElement('small', {
      textContent: description,
      className: 'form-description'
    });

    // Container for the social metadata editor
    const editorContainer = createElement('div', { className: 'social-metadata-editor' });

    // Common social media fields
    const fieldsContainer = createElement('div', { className: 'social-fields' });

    // Title field
    const titleField = this.createSocialField('Title', 'og:title', initialData?.['og:title'] || '');
    fieldsContainer.appendChild(titleField);

    // Description field
    const descField = this.createSocialField('Description', 'og:description', initialData?.['og:description'] || '');
    fieldsContainer.appendChild(descField);

    // Image field
    const imageField = this.createSocialField('Image URL', 'og:image', initialData?.['og:image'] || '');
    fieldsContainer.appendChild(imageField);

    // Type field
    const typeField = this.createSocialField('Type', 'og:type', initialData?.['og:type'] || 'website');
    fieldsContainer.appendChild(typeField);

    // Twitter Card field
    const twitterCardField = this.createSocialField('Twitter Card', 'twitter:card', initialData?.['twitter:card'] || 'summary_large_image');
    fieldsContainer.appendChild(twitterCardField);

    // Advanced JSON editor toggle
    const advancedToggle = createElement('div', { className: 'advanced-toggle' });
    const toggleBtn = createElement('button', {
      textContent: '⚙️ Advanced JSON Editor',
      className: 'btn btn-sm btn-outline-secondary',
      attributes: { type: 'button' }
    });

    const jsonEditor = createElement('div', { className: 'json-editor-section hidden' });
    const jsonTextarea = createElement('textarea', {
      attributes: {
        name: name,
        id: name,
        placeholder: 'Enter additional JSON metadata...',
        rows: '6'
      },
      className: 'form-control json-editor'
    }) as HTMLTextAreaElement;

    // Pre-populate JSON editor with all data
    if (initialData && Object.keys(initialData).length > 0) {
      jsonTextarea.value = JSON.stringify(initialData, null, 2);
    }

    // Validation feedback
    const validationFeedback = createElement('div', { className: 'validation-feedback' });

    jsonEditor.appendChild(jsonTextarea);
    jsonEditor.appendChild(validationFeedback);

    // Toggle functionality
    let isAdvancedMode = false;
    toggleBtn.addEventListener('click', () => {
      isAdvancedMode = !isAdvancedMode;
      if (isAdvancedMode) {
        // Switch to JSON mode
        toggleBtn.textContent = '📝 Simple Fields';
        toggleBtn.classList.remove('btn-outline-secondary');
        toggleBtn.classList.add('btn-secondary');
        fieldsContainer.classList.add('hidden');
        jsonEditor.classList.remove('hidden');

        // Sync simple fields to JSON
        this.syncFieldsToJson(fieldsContainer, jsonTextarea);
      } else {
        // Switch to simple mode
        toggleBtn.textContent = '⚙️ Advanced JSON Editor';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-outline-secondary');
        fieldsContainer.classList.remove('hidden');
        jsonEditor.classList.add('hidden');

        // Sync JSON to simple fields
        this.syncJsonToFields(jsonTextarea, fieldsContainer);
      }
    });

    // JSON validation
    jsonTextarea.addEventListener('input', () => {
      this.validateJsonInput(jsonTextarea, validationFeedback);
    });

    // Sync simple fields to JSON when they change
    fieldsContainer.addEventListener('input', () => {
      if (isAdvancedMode) {
        this.syncFieldsToJson(fieldsContainer, jsonTextarea);
      }
    });

    advancedToggle.appendChild(toggleBtn);

    editorContainer.appendChild(fieldsContainer);
    editorContainer.appendChild(advancedToggle);
    editorContainer.appendChild(jsonEditor);

    group.appendChild(labelElement);
    group.appendChild(descElement);
    group.appendChild(editorContainer);

    return group;
  }

  private createSocialField(label: string, key: string, value: string): HTMLElement {
    const fieldGroup = createElement('div', { className: 'social-field' });

    const labelElement = createElement('label', {
      textContent: label,
      className: 'social-field-label'
    });

    const input = createElement('input', {
      attributes: {
        type: key.includes('image') ? 'url' : 'text',
        value: value,
        placeholder: this.getSocialFieldPlaceholder(key),
        'data-key': key
      },
      className: 'form-control social-field-input'
    });

    fieldGroup.appendChild(labelElement);
    fieldGroup.appendChild(input);

    return fieldGroup;
  }

  private getSocialFieldPlaceholder(key: string): string {
    const placeholders: Record<string, string> = {
      'og:title': 'Your page title',
      'og:description': 'Brief description of your content',
      'og:image': 'https://example.com/image.jpg',
      'og:type': 'website',
      'twitter:card': 'summary_large_image'
    };
    return placeholders[key] || '';
  }

  private syncFieldsToJson(fieldsContainer: HTMLElement, jsonTextarea: HTMLTextAreaElement): void {
    const inputs = fieldsContainer.querySelectorAll('.social-field-input') as NodeListOf<HTMLInputElement>;
    const data: Record<string, string> = {};

    inputs.forEach(input => {
      const key = input.getAttribute('data-key');
      const value = input.value.trim();
      if (key && value) {
        data[key] = value;
      }
    });

    // Preserve any existing JSON data that's not in simple fields
    try {
      const existingData = jsonTextarea.value.trim() ? JSON.parse(jsonTextarea.value) : {};
      const mergedData = { ...existingData, ...data };
      jsonTextarea.value = JSON.stringify(mergedData, null, 2);
    } catch {
      jsonTextarea.value = JSON.stringify(data, null, 2);
    }
  }

  private syncJsonToFields(jsonTextarea: HTMLTextAreaElement, fieldsContainer: HTMLElement): void {
    try {
      const data = jsonTextarea.value.trim() ? JSON.parse(jsonTextarea.value) : {};
      const inputs = fieldsContainer.querySelectorAll('.social-field-input') as NodeListOf<HTMLInputElement>;

      inputs.forEach(input => {
        const key = input.getAttribute('data-key');
        if (key && data[key]) {
          input.value = data[key];
        }
      });
    } catch (error) {
      console.warn('Invalid JSON in social metadata editor:', error);
    }
  }

  private getJsonPlaceholder(fieldName: string): string {
    if (fieldName === 'additionalMetadata') {
      return 'Enter JSON metadata for Open Graph, Twitter Cards, etc.\nExample: {"og:title": "My Page", "og:image": "https://example.com/image.jpg"}';
    } else if (fieldName === 'properties') {
      return 'Enter JSON properties for tracking, analytics, etc.\nExample: {"campaign": "summer-2024", "source": "email"}';
    }
    return 'Enter valid JSON...';
  }

  private getJsonTemplate(fieldName: string): string {
    if (fieldName === 'additionalMetadata') {
      return `{
  "og:title": "Your Page Title",
  "og:description": "Your page description",
  "og:image": "https://example.com/image.jpg",
  "og:type": "website",
  "twitter:card": "summary_large_image",
  "twitter:title": "Your Page Title",
  "twitter:description": "Your page description"
}`;
    } else if (fieldName === 'properties') {
      return `{
  "campaign": {
    "name": "summer-2024",
    "channel": "email",
    "variant": "A"
  },
  "analytics": {
    "source": "newsletter",
    "medium": "email",
    "content": "hero-banner"
  },
  "product": {
    "sku": "PROD-123",
    "category": "electronics",
    "price": 299.99,
    "currency": "USD"
  },
  "user": {
    "segmentId": "high-value",
    "cohort": "2024-Q2"
  },
  "tags": ["featured", "sale", "limited-time"],
  "customData": {
    "experimentId": "exp-456",
    "metadata": {
      "version": "v2",
      "timestamp": "${new Date().toISOString()}"
    }
  }
}`;
    }
    return '{}';
  }

  private getTemplateHTML(fieldName: string): string {
    if (fieldName === 'additionalMetadata') {
      return `
        <div class="template-content">
          <h4>Additional Metadata Examples</h4>
          <div class="template-section">
            <h5>Open Graph (Facebook, LinkedIn)</h5>
            <code>
              "og:title": "Your Page Title"<br>
              "og:description": "Your page description"<br>
              "og:image": "https://example.com/image.jpg"<br>
              "og:type": "website"
            </code>
          </div>
          <div class="template-section">
            <h5>Twitter Cards</h5>
            <code>
              "twitter:card": "summary_large_image"<br>
              "twitter:title": "Your Page Title"<br>
              "twitter:description": "Your page description"<br>
              "twitter:image": "https://example.com/image.jpg"
            </code>
          </div>
          <div class="template-section">
            <h5>Custom Meta Tags</h5>
            <code>
              "author": "Your Name"<br>
              "keywords": "keyword1, keyword2"<br>
              "robots": "index, follow"
            </code>
          </div>
        </div>
      `;
    } else if (fieldName === 'properties') {
      return `
        <div class="template-content">
          <h4>Properties Examples</h4>
          <div class="template-section">
            <h5>Campaign Tracking</h5>
            <code>
              "campaign": {<br>
              &nbsp;&nbsp;"name": "summer-2024",<br>
              &nbsp;&nbsp;"channel": "email",<br>
              &nbsp;&nbsp;"variant": "A"<br>
              }
            </code>
          </div>
          <div class="template-section">
            <h5>Analytics Data</h5>
            <code>
              "analytics": {<br>
              &nbsp;&nbsp;"source": "newsletter",<br>
              &nbsp;&nbsp;"medium": "email",<br>
              &nbsp;&nbsp;"content": "hero-banner"<br>
              }
            </code>
          </div>
          <div class="template-section">
            <h5>Product Information</h5>
            <code>
              "product": {<br>
              &nbsp;&nbsp;"sku": "PROD-123",<br>
              &nbsp;&nbsp;"category": "electronics",<br>
              &nbsp;&nbsp;"price": 299.99,<br>
              &nbsp;&nbsp;"currency": "USD"<br>
              }
            </code>
          </div>
          <div class="template-section">
            <h5>Arrays and Nested Objects</h5>
            <code>
              "tags": ["featured", "sale", "limited-time"],<br>
              "customData": {<br>
              &nbsp;&nbsp;"experimentId": "exp-456",<br>
              &nbsp;&nbsp;"metadata": {<br>
              &nbsp;&nbsp;&nbsp;&nbsp;"version": "v2"<br>
              &nbsp;&nbsp;}<br>
              }
            </code>
          </div>
        </div>
      `;
    }
    return '<div class="template-content"><p>No template available</p></div>';
  }

  private validateJsonInput(textarea: HTMLTextAreaElement, feedbackElement: HTMLElement): void {
    const value = textarea.value.trim();

    if (!value) {
      feedbackElement.className = 'validation-feedback';
      feedbackElement.textContent = '';
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const jsonString = JSON.stringify(parsed);
      const sizeInBytes = new Blob([jsonString]).size;

      if (sizeInBytes > 10240) { // 10KB limit
        feedbackElement.className = 'validation-feedback error';
        feedbackElement.textContent = `⚠️ Size: ${Math.round(sizeInBytes/1024)}KB (exceeds 10KB limit)`;
      } else {
        feedbackElement.className = 'validation-feedback success';
        feedbackElement.textContent = `✓ Valid JSON (${Math.round(sizeInBytes/1024 * 100)/100}KB)`;
      }
    } catch (error) {
      feedbackElement.className = 'validation-feedback error';
      feedbackElement.textContent = `❌ Invalid JSON: ${error instanceof Error ? error.message : 'Syntax error'}`;
    }
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

    // Handle checkbox fields separately (they don't appear in FormData if unchecked)
    if (this.config.mode === 'edit') {
      const activeCheckbox = this.form.querySelector('input[name="active"]') as HTMLInputElement;
      if (activeCheckbox) {
        data.active = activeCheckbox.checked;
      }
    }

    // Parse metadata fields
    try {
      // Handle social metadata editor (additionalMetadata)
      const socialEditor = this.form.querySelector('.social-metadata-editor');
      if (socialEditor) {
        const jsonEditor = socialEditor.querySelector('.json-editor-section');
        const fieldsContainer = socialEditor.querySelector('.social-fields');

        if (jsonEditor && !jsonEditor.classList.contains('hidden')) {
          // Advanced JSON mode
          const jsonTextarea = jsonEditor.querySelector('.json-editor') as HTMLTextAreaElement;
          data.additionalMetadata = jsonTextarea.value.trim() ? JSON.parse(jsonTextarea.value) : {};
        } else if (fieldsContainer) {
          // Simple fields mode
          const inputs = fieldsContainer.querySelectorAll('.social-field-input') as NodeListOf<HTMLInputElement>;
          const socialData: Record<string, string> = {};

          inputs.forEach(input => {
            const key = input.getAttribute('data-key');
            const value = input.value.trim();
            if (key && value) {
              socialData[key] = value;
            }
          });

          data.additionalMetadata = socialData;
        }
      }

      // Handle properties JSON editor
      if (data.properties) {
        data.properties = data.properties.trim() ? JSON.parse(data.properties) : {};
      }
    } catch (error) {
      this.showError('Invalid JSON in metadata fields. Please check your JSON syntax.');
      return;
    }

    // Validate JSONB size limits (10KB each)
    const validateJsonSize = (obj: any, fieldName: string) => {
      if (obj && Object.keys(obj).length > 0) {
        const jsonString = JSON.stringify(obj);
        const sizeInBytes = new Blob([jsonString]).size;
        if (sizeInBytes > 10240) { // 10KB limit
          throw new Error(`${fieldName} exceeds 10KB limit (current: ${Math.round(sizeInBytes/1024)}KB)`);
        }
      }
    };

    try {
      validateJsonSize(data.additionalMetadata, 'Additional Metadata');
      validateJsonSize(data.properties, 'Properties');
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Metadata size validation failed');
      return;
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
          imageUrl: data.imageUrl,
          fallbackUrlOverride: data.fallbackUrlOverride,
          additionalMetadata: data.additionalMetadata,
          properties: data.properties
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
          imageUrl: data.imageUrl,
          fallbackUrlOverride: data.fallbackUrlOverride,
          additionalMetadata: data.additionalMetadata,
          properties: data.properties,
          active: data.active
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
