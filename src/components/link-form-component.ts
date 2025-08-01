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

    // URL field - use 'text' type to allow custom schemes and templates
    const urlGroup = this.createLinkFormGroup('URL', 'text', 'url', true, 'Enter the URL to shorten...');
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

    // Custom Shortcode field (only for create mode)
    if (this.config.mode === 'create') {
      const shortcodeGroup = this.createCustomShortcodeFormGroup();
      this.form.appendChild(shortcodeGroup);
    }

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

    // Image URL field - use 'text' type to allow custom schemes
    const imageGroup = this.createLinkFormGroup('Image URL', 'text', 'imageUrl', false, 'Optional image URL...');
    const imageInput = imageGroup.querySelector('input') as HTMLInputElement;
    if (this.config.link?.imageUrl) {
      imageInput.value = this.config.link.imageUrl;
    }
    this.form.appendChild(imageGroup);

    // Fallback URL field - use 'text' type to allow custom schemes
    const fallbackGroup = this.createLinkFormGroup('Fallback URL', 'text', 'fallbackUrlOverride', false, 'Optional fallback URL for when app is not installed...');
    const fallbackInput = fallbackGroup.querySelector('input') as HTMLInputElement;
    if (this.config.link?.fallbackUrlOverride) {
      fallbackInput.value = this.config.link.fallbackUrlOverride;
    }
    this.form.appendChild(fallbackGroup);

    // Additional Metadata (JSONB) - Social media tags
    const metadataGroup = this.createEnhancedMetadataEditor('Additional Metadata', 'additionalMetadata',
      'Open Graph, Twitter Cards, and other social media metadata', this.config.link?.additionalMetadata, 'social');
    this.form.appendChild(metadataGroup);

    // Properties (JSONB) - Complex JSON for tracking/analytics
    const propertiesGroup = this.createEnhancedMetadataEditor('Properties', 'properties',
      'Custom properties for tracking, analytics, campaigns, etc.', this.config.link?.properties, 'analytics');
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

  private createCustomShortcodeFormGroup(): HTMLElement {
    const group = createElement('div', { className: 'form-group custom-shortcode-group' });

    const labelEl = createElement('label', {
      textContent: 'Custom Shortcode (optional)',
      attributes: { for: 'customShortcode' },
      className: 'form-label'
    });

    const input = createElement('input', {
      attributes: {
        type: 'text',
        id: 'customShortcode',
        name: 'customShortcode',
        placeholder: 'my-custom-link',
        maxlength: '12'
      },
      className: 'form-control'
    }) as HTMLInputElement;

    // Create help text
    const helpText = createElement('small', {
      textContent: 'Leave empty for auto-generated shortcode. Use letters, numbers, hyphens, and underscores only (1-12 characters).',
      className: 'form-text text-muted'
    });

    // Create validation feedback element
    const validationFeedback = createElement('div', {
      className: 'validation-feedback'
    });

    // Add real-time validation
    input.addEventListener('input', this.validateCustomShortcode.bind(this));
    input.addEventListener('blur', this.validateCustomShortcode.bind(this));

    group.appendChild(labelEl);
    group.appendChild(input);
    group.appendChild(helpText);
    group.appendChild(validationFeedback);

    return group;
  }

  private createEnhancedMetadataEditor(label: string, name: string, description: string, initialData?: Record<string, any>, type: 'social' | 'analytics' = 'analytics'): HTMLElement {
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
    const editorContainer = createElement('div', { className: 'enhanced-metadata-editor' });

    // Mode toggle
    const modeToggle = createElement('div', { className: 'editor-mode-toggle' });
    const kvModeBtn = createElement('button', {
      textContent: '📝 Key-Value Editor',
      className: 'btn btn-sm btn-primary mode-btn active',
      attributes: { type: 'button', 'data-mode': 'kv' }
    });
    const templateModeBtn = createElement('button', {
      textContent: '📋 Templates',
      className: 'btn btn-sm btn-outline-secondary mode-btn',
      attributes: { type: 'button', 'data-mode': 'template' }
    });
    const jsonModeBtn = createElement('button', {
      textContent: '⚙️ Raw JSON',
      className: 'btn btn-sm btn-outline-secondary mode-btn',
      attributes: { type: 'button', 'data-mode': 'json' }
    });

    modeToggle.appendChild(kvModeBtn);
    modeToggle.appendChild(templateModeBtn);
    modeToggle.appendChild(jsonModeBtn);

    // Key-Value Editor (default view)
    const kvEditor = createElement('div', { className: 'kv-editor-enhanced' });
    const kvContainer = createElement('div', { className: 'kv-container' });

    // Add existing key-value pairs
    if (initialData && Object.keys(initialData).length > 0) {
      Object.entries(initialData).forEach(([key, value]) => {
        const pair = this.createEnhancedKeyValuePair(key, value, type);
        kvContainer.appendChild(pair);
      });
    } else {
      // Add one empty pair to start
      const emptyPair = this.createEnhancedKeyValuePair('', '', type);
      kvContainer.appendChild(emptyPair);
    }

    const addPairBtn = createElement('button', {
      textContent: '+ Add Pair',
      className: 'btn btn-sm btn-outline-primary add-pair-btn',
      attributes: { type: 'button' }
    });

    addPairBtn.addEventListener('click', () => {
      const newPair = this.createEnhancedKeyValuePair('', '', type);
      kvContainer.appendChild(newPair);
    });

    kvEditor.appendChild(kvContainer);
    kvEditor.appendChild(addPairBtn);

    // Template view
    const templateView = createElement('div', { className: 'template-view hidden' });
    templateView.innerHTML = this.getTemplateHTML(type);

    // Add click handlers for template examples
    templateView.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const templatePair = target.closest('.template-pair') as HTMLElement;
      if (templatePair) {
        const key = templatePair.getAttribute('data-key');
        const value = templatePair.getAttribute('data-value');
        if (key && value) {
          // Add new pair with template data
          const newPair = this.createEnhancedKeyValuePair(key, value, type);
          kvContainer.appendChild(newPair);

          // Switch back to KV mode to show the added pair
          switchToMode('kv');

          // Scroll to the new pair
          newPair.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });

    // JSON textarea
    const jsonEditor = createElement('div', { className: 'json-editor-section hidden' });
    const jsonTextarea = createElement('textarea', {
      attributes: {
        name: name,
        id: name,
        placeholder: 'Enter JSON data...',
        rows: '10'
      },
      className: 'form-control json-editor'
    }) as HTMLTextAreaElement;

    // Validation feedback
    const validationFeedback = createElement('div', { className: 'validation-feedback' });

    jsonEditor.appendChild(jsonTextarea);
    jsonEditor.appendChild(validationFeedback);

    // Mode switching logic
    let currentMode = 'kv'; // Track current mode
    const switchToMode = (mode: string) => {
      if (currentMode === mode) return; // Don't switch if already in this mode

      // Update button states
      [kvModeBtn, templateModeBtn, jsonModeBtn].forEach(btn => {
        btn.classList.remove('active', 'btn-primary', 'btn-secondary');
        btn.classList.add('btn-outline-secondary');
      });

      // Hide all views
      kvEditor.classList.add('hidden');
      templateView.classList.add('hidden');
      jsonEditor.classList.add('hidden');

      if (mode === 'kv') {
        kvModeBtn.classList.remove('btn-outline-secondary');
        kvModeBtn.classList.add('btn-primary', 'active');
        kvEditor.classList.remove('hidden');
        // Only sync from JSON to KV if we're coming from JSON mode
        if (currentMode === 'json') {
          syncEnabled = false; // Disable sync during conversion
          this.syncJsonToKV(jsonTextarea, kvContainer, type);
          // Re-enable sync after DOM is fully updated
          setTimeout(() => {
            syncEnabled = true;
          }, 500); // Increased delay to ensure DOM is ready
        }
      } else if (mode === 'template') {
        templateModeBtn.classList.remove('btn-outline-secondary');
        templateModeBtn.classList.add('btn-secondary', 'active');
        templateView.classList.remove('hidden');
      } else if (mode === 'json') {
        jsonModeBtn.classList.remove('btn-outline-secondary');
        jsonModeBtn.classList.add('btn-secondary', 'active');
        jsonEditor.classList.remove('hidden');
        // Only sync from KV to JSON if we're coming from KV mode
        if (currentMode === 'kv') {
          this.syncKVToJson(kvContainer, jsonTextarea);
        }
        this.validateJsonInput(jsonTextarea, validationFeedback);
      }

      currentMode = mode;
    };

    // Event handlers
    kvModeBtn.addEventListener('click', () => switchToMode('kv'));
    templateModeBtn.addEventListener('click', () => switchToMode('template'));
    jsonModeBtn.addEventListener('click', () => switchToMode('json'));

    // JSON validation
    jsonTextarea.addEventListener('input', () => {
      this.validateJsonInput(jsonTextarea, validationFeedback);
    });

    // Sync KV changes to JSON with debounce
    let syncTimeout: NodeJS.Timeout;
    let syncEnabled = true; // Flag to temporarily disable sync

    kvContainer.addEventListener('input', () => {
      if (!syncEnabled) return; // Skip sync if disabled

      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        this.syncKVToJson(kvContainer, jsonTextarea);
      }, 300); // 300ms debounce
    });

    // Initial sync - only if there's no existing data in JSON
    if (!jsonTextarea.value.trim()) {
      this.syncKVToJson(kvContainer, jsonTextarea);
    }

    // Add datalists for key suggestions
    const datalistId = type === 'social' ? 'social-keys-datalist' : 'analytics-keys-datalist';
    if (!document.getElementById(datalistId)) {
      const datalist = createElement('datalist', { attributes: { id: datalistId } });
      const suggestions = type === 'social'
        ? ['og:title', 'og:description', 'og:image', 'og:type', 'og:url', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'author', 'keywords', 'robots']
        : ['campaign', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'product', 'tags', 'user', 'customData', 'source', 'medium', 'content'];

      suggestions.forEach(suggestion => {
        const option = createElement('option', { attributes: { value: suggestion } });
        datalist.appendChild(option);
      });

      document.body.appendChild(datalist);
    }

    editorContainer.appendChild(modeToggle);
    editorContainer.appendChild(kvEditor);
    editorContainer.appendChild(templateView);
    editorContainer.appendChild(jsonEditor);

    group.appendChild(labelElement);
    group.appendChild(descElement);
    group.appendChild(editorContainer);

    return group;
  }

  private createEnhancedKeyValuePair(key: string, value: any, type: 'social' | 'analytics'): HTMLElement {
    const pair = createElement('div', { className: 'kv-pair-enhanced' });

    const keyInput = createElement('input', {
      attributes: {
        type: 'text',
        placeholder: 'Key',
        value: key
      },
      className: 'form-control kv-key'
    }) as HTMLInputElement;

    // Add suggestions dropdown for keys
    if (type === 'social') {
      keyInput.setAttribute('list', 'social-keys-datalist');
    } else {
      keyInput.setAttribute('list', 'analytics-keys-datalist');
    }

    const valueContainer = createElement('div', { className: 'kv-value-container' });
    const valueInput = createElement('textarea', {
      attributes: {
        placeholder: 'Value (can be text or JSON)',
        rows: '1'
      },
      className: 'form-control kv-value'
    }) as HTMLTextAreaElement;

    // Set the value after creation to ensure it's properly set
    const valueToSet = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    valueInput.value = valueToSet;

    // Ensure the value is properly set by using both attribute and property
    valueInput.setAttribute('value', valueToSet);

    // Auto-resize textarea
    valueInput.addEventListener('input', () => {
      valueInput.style.height = 'auto';
      valueInput.style.height = Math.max(32, valueInput.scrollHeight) + 'px';
    });

    // Format JSON button
    const formatBtn = createElement('button', {
      textContent: '{}',
      className: 'btn btn-sm btn-outline-info format-btn',
      attributes: { type: 'button', title: 'Format as JSON' }
    });

    formatBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(valueInput.value);
        valueInput.value = JSON.stringify(parsed, null, 2);
        valueInput.style.height = 'auto';
        valueInput.style.height = Math.max(32, valueInput.scrollHeight) + 'px';
      } catch (error) {
        // If not valid JSON, try to wrap in quotes
        if (valueInput.value && !valueInput.value.startsWith('"')) {
          valueInput.value = `"${valueInput.value.replace(/"/g, '\\"')}"`;
        }
      }
    });

    const removeBtn = createElement('button', {
      textContent: '×',
      className: 'btn btn-sm btn-outline-danger remove-pair-btn',
      attributes: { type: 'button', title: 'Remove this pair' }
    });

    removeBtn.addEventListener('click', () => {
      pair.remove();
    });

    valueContainer.appendChild(valueInput);
    valueContainer.appendChild(formatBtn);

    pair.appendChild(keyInput);
    pair.appendChild(valueContainer);
    pair.appendChild(removeBtn);

    // Initial resize
    setTimeout(() => {
      valueInput.style.height = 'auto';
      valueInput.style.height = Math.max(32, valueInput.scrollHeight) + 'px';
    }, 0);

    return pair;
  }

  private syncKVToJson(kvContainer: HTMLElement, jsonTextarea: HTMLTextAreaElement): void {
    const pairs = kvContainer.querySelectorAll('.kv-pair-enhanced');
    const data: Record<string, any> = {};

    pairs.forEach(pair => {
      const keyInput = pair.querySelector('.kv-key') as HTMLInputElement;
      const valueInput = pair.querySelector('.kv-value') as HTMLTextAreaElement;

      if (keyInput.value.trim()) {
        let value: any = valueInput.value.trim();

        // Only try to parse as JSON if the value is not empty
        if (value) {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(value);
            value = parsed;
          } catch {
            // Keep as string if not valid JSON
            // This is fine - strings are valid values too
          }
        } else {
          // If value is empty, set it as empty string
          value = '';
        }

        data[keyInput.value.trim()] = value;
      }
    });

    jsonTextarea.value = Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '';
  }

  private syncJsonToKV(jsonTextarea: HTMLTextAreaElement, kvContainer: HTMLElement, type: 'social' | 'analytics'): void {
    try {
      const data = jsonTextarea.value.trim() ? JSON.parse(jsonTextarea.value) : {};

      // Clear existing pairs
      kvContainer.innerHTML = '';

      // Add pairs from JSON
      if (Object.keys(data).length > 0) {
        Object.entries(data).forEach(([key, value]) => {
          const pair = this.createEnhancedKeyValuePair(key, value, type);
          kvContainer.appendChild(pair);
        });

        // Trigger auto-resize for all textareas after they're all added to DOM
        setTimeout(() => {
          const valueInputs = kvContainer.querySelectorAll('.kv-value') as NodeListOf<HTMLTextAreaElement>;
          valueInputs.forEach(valueInput => {
            valueInput.style.height = 'auto';
            valueInput.style.height = Math.max(32, valueInput.scrollHeight) + 'px';
          });
        }, 50); // Small delay to ensure DOM is updated
      } else {
        // Add empty pair if no data
        const emptyPair = this.createEnhancedKeyValuePair('', '', type);
        kvContainer.appendChild(emptyPair);
      }
    } catch (error) {
      console.warn('Invalid JSON in metadata editor:', error);
      // Add empty pair on error
      kvContainer.innerHTML = '';
      const emptyPair = this.createEnhancedKeyValuePair('', '', type);
      kvContainer.appendChild(emptyPair);
    }
  }





  private getTemplateHTML(type: 'social' | 'analytics'): string {
    if (type === 'social') {
      return `
        <div class="template-content">
          <h4>Social Media Metadata Templates</h4>
          <div class="template-section">
            <h5>📘 Open Graph (Facebook, LinkedIn)</h5>
            <div class="template-examples">
              <div class="template-pair" data-key="og:title" data-value="Your Amazing Page Title">
                <strong>og:title</strong> → "Your Amazing Page Title"
              </div>
              <div class="template-pair" data-key="og:description" data-value="A compelling description of your content">
                <strong>og:description</strong> → "A compelling description of your content"
              </div>
              <div class="template-pair" data-key="og:image" data-value="https://example.com/image.jpg">
                <strong>og:image</strong> → "https://example.com/image.jpg"
              </div>
              <div class="template-pair" data-key="og:type" data-value="website">
                <strong>og:type</strong> → "website"
              </div>
            </div>
          </div>
          <div class="template-section">
            <h5>🐦 Twitter Cards</h5>
            <div class="template-examples">
              <div class="template-pair" data-key="twitter:card" data-value="summary_large_image">
                <strong>twitter:card</strong> → "summary_large_image"
              </div>
              <div class="template-pair" data-key="twitter:title" data-value="Your Page Title">
                <strong>twitter:title</strong> → "Your Page Title"
              </div>
              <div class="template-pair" data-key="twitter:description" data-value="Your page description">
                <strong>twitter:description</strong> → "Your page description"
              </div>
            </div>
          </div>
          <div class="template-section">
            <h5>🔧 Custom Meta Tags</h5>
            <div class="template-examples">
              <div class="template-pair" data-key="author" data-value="Your Name">
                <strong>author</strong> → "Your Name"
              </div>
              <div class="template-pair" data-key="keywords" data-value="keyword1, keyword2, keyword3">
                <strong>keywords</strong> → "keyword1, keyword2, keyword3"
              </div>
            </div>
          </div>
          <p class="template-note">💡 Click any example above to add it to your metadata!</p>
        </div>
      `;
    } else {
      return `
        <div class="template-content">
          <h4>Analytics & Tracking Templates</h4>
          <div class="template-section">
            <h5>📊 Campaign Tracking</h5>
            <div class="template-examples">
              <div class="template-pair" data-key="campaign" data-value='{"name": "summer-2024", "channel": "email", "variant": "A"}'>
                <strong>campaign</strong> → {"name": "summer-2024", "channel": "email", "variant": "A"}
              </div>
              <div class="template-pair" data-key="utm_source" data-value="newsletter">
                <strong>utm_source</strong> → "newsletter"
              </div>
              <div class="template-pair" data-key="utm_medium" data-value="email">
                <strong>utm_medium</strong> → "email"
              </div>
            </div>
          </div>
          <div class="template-section">
            <h5>🛍️ Product Information</h5>
            <div class="template-examples">
              <div class="template-pair" data-key="product" data-value='{"sku": "PROD-123", "category": "electronics", "price": 299.99, "currency": "USD"}'>
                <strong>product</strong> → {"sku": "PROD-123", "category": "electronics", "price": 299.99, "currency": "USD"}
              </div>
              <div class="template-pair" data-key="tags" data-value='["featured", "sale", "limited-time"]'>
                <strong>tags</strong> → ["featured", "sale", "limited-time"]
              </div>
            </div>
          </div>
          <div class="template-section">
            <h5>👤 User Segmentation</h5>
            <div class="template-examples">
              <div class="template-pair" data-key="user" data-value='{"segmentId": "high-value", "cohort": "2024-Q2"}'>
                <strong>user</strong> → {"segmentId": "high-value", "cohort": "2024-Q2"}
              </div>
              <div class="template-pair" data-key="customData" data-value='{"experimentId": "exp-456", "metadata": {"version": "v2"}}'>
                <strong>customData</strong> → {"experimentId": "exp-456", "metadata": {"version": "v2"}}
              </div>
            </div>
          </div>
          <p class="template-note">💡 Click any example above to add it to your properties!</p>
        </div>
      `;
    }
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

    // Only attempt to fetch metadata for standard HTTP/HTTPS URLs
    const isStandardUrl = this.isStandardHttpUrl(url);
    if (!isStandardUrl) {
      // For custom schemes, templates, or deep links, just clear the preview
      // The URL is valid but we can't fetch metadata for it
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

  private isStandardHttpUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isValidUrl(url: string): boolean {
    // Allow any non-empty string as a valid URL
    // This supports custom schemes, templates, and deep links
    // Examples:
    // - Standard URLs: https://example.com
    // - Custom schemes: myapp://page/123
    // - Templates: merchant/{{publickey}}@{{domain}}
    // - Deep links: app://action?param=value

    if (!url || url.trim().length === 0) {
      return false;
    }

    // Basic sanity checks - reject obviously invalid inputs
    const trimmed = url.trim();

    // Reject URLs that are just whitespace or contain only special characters
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      return false;
    }

    // Try standard URL validation first (for http/https URLs)
    try {
      new URL(trimmed);
      return true;
    } catch {
      // If standard URL validation fails, allow it anyway
      // This covers custom schemes, templates, and deep links
      return true;
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

  private validateCustomShortcode(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    const group = input.closest('.custom-shortcode-group') as HTMLElement;
    const feedback = group?.querySelector('.validation-feedback') as HTMLElement;

    if (!feedback) return;

    // Clear previous validation state
    input.classList.remove('is-valid', 'is-invalid');
    feedback.className = 'validation-feedback';
    feedback.textContent = '';

    // If empty, it's valid (optional field)
    if (!value) {
      input.classList.add('is-valid');
      feedback.className = 'validation-feedback valid-feedback';
      feedback.textContent = 'Auto-generated shortcode will be used';
      return;
    }

    // Validate format: letters, numbers, hyphens, underscores only
    const validFormat = /^[a-zA-Z0-9_-]+$/.test(value);

    // Validate length: 1-12 characters
    const validLength = value.length >= 1 && value.length <= 12;

    // Check for reserved words (case-insensitive)
    const reservedWords = ['api', 'admin', 'www', 'health', 'static'];
    const isReserved = reservedWords.includes(value.toLowerCase());

    if (!validFormat) {
      input.classList.add('is-invalid');
      feedback.className = 'validation-feedback invalid-feedback';
      feedback.textContent = 'Only letters, numbers, hyphens, and underscores are allowed';
    } else if (!validLength) {
      input.classList.add('is-invalid');
      feedback.className = 'validation-feedback invalid-feedback';
      feedback.textContent = 'Must be between 1 and 12 characters long';
    } else if (isReserved) {
      input.classList.add('is-invalid');
      feedback.className = 'validation-feedback invalid-feedback';
      feedback.textContent = 'This shortcode uses a reserved word. Please choose a different one.';
    } else {
      input.classList.add('is-valid');
      feedback.className = 'validation-feedback valid-feedback';
      feedback.textContent = 'Valid custom shortcode';
    }
  }

  private validateCustomShortcodeValue(value: string): { isValid: boolean; message: string } {
    if (!value || !value.trim()) {
      return { isValid: true, message: '' }; // Empty is valid (optional)
    }

    const trimmedValue = value.trim();

    // Validate format: letters, numbers, hyphens, underscores only
    const validFormat = /^[a-zA-Z0-9_-]+$/.test(trimmedValue);
    if (!validFormat) {
      return {
        isValid: false,
        message: 'Custom shortcode can only contain letters, numbers, hyphens, and underscores'
      };
    }

    // Validate length: 1-12 characters
    if (trimmedValue.length < 1 || trimmedValue.length > 12) {
      return {
        isValid: false,
        message: 'Custom shortcode must be between 1 and 12 characters long'
      };
    }

    // Check for reserved words (case-insensitive)
    const reservedWords = ['api', 'admin', 'www', 'health', 'static'];
    if (reservedWords.includes(trimmedValue.toLowerCase())) {
      return {
        isValid: false,
        message: 'This shortcode uses a reserved word. Please choose a different one.'
      };
    }

    return { isValid: true, message: '' };
  }

  private getFormattedErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Failed to save link. Please try again.';
    }

    const errorMessage = error.message.toLowerCase();

    // Handle specific custom shortcode errors
    if (errorMessage.includes('custom shortcode already exists')) {
      return 'This custom shortcode is already taken. Please choose a different one.';
    }

    if (errorMessage.includes('custom shortcode uses a reserved word')) {
      return 'This shortcode uses a reserved word. Please choose a different one.';
    }

    if (errorMessage.includes('invalid characters') || errorMessage.includes('shortcode format')) {
      return 'Custom shortcode can only contain letters, numbers, hyphens, and underscores.';
    }

    if (errorMessage.includes('shortcode length') || errorMessage.includes('too long') || errorMessage.includes('too short')) {
      return 'Custom shortcode must be between 1 and 12 characters long.';
    }

    // Handle general validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'Please check your input and try again.';
    }

    // Handle network/server errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (errorMessage.includes('500') || errorMessage.includes('internal server error')) {
      return 'Server error. Please try again later.';
    }

    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return 'Authentication error. Please refresh the page and try again.';
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'You do not have permission to perform this action.';
    }

    // Return the original error message if it's user-friendly, otherwise a generic message
    const originalMessage = error.message;
    if (originalMessage.length < 100 && !originalMessage.includes('HTTP') && !originalMessage.includes('fetch')) {
      return originalMessage;
    }

    return 'Failed to save link. Please try again.';
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
      // Handle enhanced metadata editors
      const metadataEditors = this.form.querySelectorAll('.enhanced-metadata-editor');

      metadataEditors.forEach(editor => {
        const textarea = editor.querySelector('.json-editor') as HTMLTextAreaElement;
        if (textarea) {
          const fieldName = textarea.name;
          if (fieldName === 'additionalMetadata') {
            data.additionalMetadata = textarea.value.trim() ? JSON.parse(textarea.value) : {};
          } else if (fieldName === 'properties') {
            data.properties = textarea.value.trim() ? JSON.parse(textarea.value) : {};
          }
        }
      });
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

    // Validate custom shortcode if provided
    if (data.customShortcode) {
      const shortcodeValidation = this.validateCustomShortcodeValue(data.customShortcode);
      if (!shortcodeValidation.isValid) {
        this.showError(shortcodeValidation.message);
        return;
      }
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
          properties: data.properties,
          ...(data.customShortcode && { customShortcode: data.customShortcode })
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
      const errorMessage = this.getFormattedErrorMessage(error);
      this.showError(errorMessage);
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
