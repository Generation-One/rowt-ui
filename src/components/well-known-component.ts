import { BaseComponent } from './base-component.js';
import { ApiClient } from '../services/api-client.js';
import { createElement, querySelector, querySelectorAll } from '../utils/dom-helpers.js';
import type { WellKnownFile, CreateWellKnownRequest, UpdateWellKnownRequest } from '../types/api.js';

export class WellKnownComponent extends BaseComponent {
  private apiClient: ApiClient;
  private files: WellKnownFile[] = [];
  private isLoading: boolean = false;
  private editingFile: WellKnownFile | null = null;

  constructor(container: HTMLElement, apiClient: ApiClient) {
    super(container);
    this.apiClient = apiClient;
  }

  async render(): Promise<void> {
    this.checkDestroyed();
    
    // Clear container
    this.container.innerHTML = '';
    this.container.className = 'well-known-container';

    // Create header
    const header = this.createHeader();
    this.container.appendChild(header);

    // Create content area
    const content = createElement('div', { className: 'well-known-content' });
    
    // Create files list
    const filesList = this.createFilesList();
    content.appendChild(filesList);

    this.container.appendChild(content);

    // Load files
    await this.loadFiles();
  }

  private createHeader(): HTMLElement {
    const header = createElement('div', { className: 'well-known-header' });
    
    const titleSection = createElement('div', { className: 'well-known-title-section' });
    const title = createElement('h2', { textContent: 'Well-Known Files' });
    const subtitle = createElement('p', { 
      textContent: 'Manage well-known files for domain verification and app association. Files are served at /.well-known/{filename}',
      className: 'well-known-subtitle'
    });
    
    const createBtn = this.createButton('Add New File', 'btn btn-primary', () => {
      this.showCreateModal();
    });

    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);
    titleSection.appendChild(createBtn);

    header.appendChild(titleSection);
    return header;
  }

  private createFilesList(): HTMLElement {
    const container = createElement('div', { className: 'well-known-files' });
    
    // Loading indicator
    const loading = createElement('div', { 
      className: 'loading-indicator hidden',
      id: 'well-known-loading'
    });
    loading.innerHTML = '<div class="spinner"></div><p>Loading well-known files...</p>';
    
    // Files container
    const filesContainer = createElement('div', { 
      className: 'files-container',
      id: 'well-known-files-container'
    });

    container.appendChild(loading);
    container.appendChild(filesContainer);
    
    return container;
  }

  private async loadFiles(): Promise<void> {
    this.setLoading(true);
    
    try {
      this.files = await this.apiClient.getWellKnownFiles();
      this.renderFiles();
    } catch (error) {
      console.error('Failed to load well-known files:', error);
      this.showError('Failed to load well-known files. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  private renderFiles(): void {
    const container = querySelector('#well-known-files-container', this.container);
    if (!container) return;

    container.innerHTML = '';

    if (this.files.length === 0) {
      const emptyState = createElement('div', { className: 'empty-state' });
      emptyState.innerHTML = `
        <div class="empty-state-icon">📄</div>
        <h3>No well-known files yet</h3>
        <p>Create your first well-known file to get started with domain verification and app association.</p>
      `;
      container.appendChild(emptyState);
      return;
    }

    this.files.forEach(file => {
      const fileCard = this.createFileCard(file);
      container.appendChild(fileCard);
    });
  }

  private createFileCard(file: WellKnownFile): HTMLElement {
    const card = createElement('div', { className: 'file-card' });
    
    const header = createElement('div', { className: 'file-card-header' });
    
    const info = createElement('div', { className: 'file-info' });
    const filename = createElement('h4', { textContent: file.filename });
    const url = createElement('code', { 
      textContent: `/.well-known/${file.filename}`,
      className: 'file-url'
    });
    const meta = createElement('div', { className: 'file-meta' });
    meta.innerHTML = `
      <span class="file-type">${file.contentType}</span>
      <span class="file-status ${file.enabled ? 'enabled' : 'disabled'}">
        ${file.enabled ? '✅ Enabled' : '❌ Disabled'}
      </span>
    `;
    
    info.appendChild(filename);
    info.appendChild(url);
    info.appendChild(meta);
    
    const actions = createElement('div', { className: 'file-actions' });
    
    const editBtn = this.createButton('Edit', 'btn btn-secondary btn-sm', () => {
      this.showEditModal(file);
    });
    
    const deleteBtn = this.createButton('Delete', 'btn btn-danger btn-sm', () => {
      this.deleteFile(file);
    });
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    header.appendChild(info);
    header.appendChild(actions);
    
    const content = createElement('div', { className: 'file-content' });
    const contentPreview = createElement('pre', { 
      textContent: file.content.length > 200 ? file.content.substring(0, 200) + '...' : file.content,
      className: 'content-preview'
    });
    content.appendChild(contentPreview);
    
    card.appendChild(header);
    card.appendChild(content);
    
    return card;
  }

  private showCreateModal(): void {
    this.editingFile = null;
    this.showModal('Add New Well-Known File', this.createFileForm());
  }

  private showEditModal(file: WellKnownFile): void {
    this.editingFile = file;
    this.showModal('Edit Well-Known File', this.createFileForm(file));
  }

  private createFileForm(file?: WellKnownFile): HTMLElement {
    const form = createElement('form', { className: 'well-known-form' });

    // Prevent form submission
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    
    // Filename field (only for create)
    if (!file) {
      const filenameGroup = createElement('div', { className: 'form-group' });
      const filenameLabel = createElement('label', { 
        textContent: 'Filename',
        className: 'form-label'
      });
      const filenameInput = createElement('input', {
        className: 'form-input',
        attributes: {
          type: 'text',
          id: 'filename',
          placeholder: 'e.g., assetlinks.json, apple-app-site-association',
          required: 'true'
        }
      });
      const filenameHelp = createElement('div', {
        textContent: 'The filename for your well-known file. Will be accessible at /.well-known/{filename}',
        className: 'form-help'
      });
      
      filenameGroup.appendChild(filenameLabel);
      filenameGroup.appendChild(filenameInput);
      filenameGroup.appendChild(filenameHelp);
      form.appendChild(filenameGroup);
    }

    // Content Type field
    const contentTypeGroup = createElement('div', { className: 'form-group' });
    const contentTypeLabel = createElement('label', { 
      textContent: 'Content Type',
      className: 'form-label'
    });
    const contentTypeSelect = createElement('select', {
      className: 'form-select',
      attributes: { id: 'contentType' }
    });
    
    const contentTypes = [
      'application/json',
      'text/plain',
      'application/xml',
      'text/xml',
      'text/html',
      'application/octet-stream'
    ];
    
    contentTypes.forEach(type => {
      const option = createElement('option', {
        textContent: type,
        attributes: { value: type }
      });
      if (file && file.contentType === type) {
        option.setAttribute('selected', 'true');
      }
      contentTypeSelect.appendChild(option);
    });
    
    const contentTypeHelp = createElement('div', {
      textContent: 'The MIME type that will be sent in the Content-Type header',
      className: 'form-help'
    });
    
    contentTypeGroup.appendChild(contentTypeLabel);
    contentTypeGroup.appendChild(contentTypeSelect);
    contentTypeGroup.appendChild(contentTypeHelp);
    form.appendChild(contentTypeGroup);

    // Content field
    const contentGroup = createElement('div', { className: 'form-group' });
    const contentLabel = createElement('label', { 
      textContent: 'Content',
      className: 'form-label'
    });
    const contentTextarea = createElement('textarea', {
      className: 'form-textarea',
      attributes: {
        id: 'content',
        placeholder: 'Enter your file content here...',
        required: 'true',
        rows: '10'
      }
    });
    if (file) {
      contentTextarea.textContent = file.content;
    }
    
    const contentHelp = createElement('div', {
      textContent: 'The content of your well-known file. Maximum size: 1MB',
      className: 'form-help'
    });
    
    contentGroup.appendChild(contentLabel);
    contentGroup.appendChild(contentTextarea);
    contentGroup.appendChild(contentHelp);
    form.appendChild(contentGroup);

    // Enabled field
    const enabledGroup = createElement('div', { className: 'form-group' });
    const enabledLabel = createElement('label', { 
      className: 'form-checkbox-label'
    });
    const enabledCheckbox = createElement('input', {
      attributes: {
        type: 'checkbox',
        id: 'enabled'
      }
    });
    if (!file || file.enabled) {
      enabledCheckbox.setAttribute('checked', 'true');
    }
    
    const enabledText = createElement('span', {
      textContent: 'Enable this file',
      className: 'form-label'
    });
    
    const enabledHelp = createElement('div', {
      textContent: 'Only enabled files will be served publicly',
      className: 'form-help'
    });
    
    enabledLabel.appendChild(enabledCheckbox);
    enabledLabel.appendChild(enabledText);
    enabledGroup.appendChild(enabledLabel);
    enabledGroup.appendChild(enabledHelp);
    form.appendChild(enabledGroup);

    // Form actions
    const actions = createElement('div', { className: 'form-actions' });
    
    const cancelBtn = this.createButton('Cancel', 'btn btn-secondary', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.hideModal();
    });

    const saveBtn = this.createButton(file ? 'Update File' : 'Create File', 'btn btn-primary', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleFormSubmit(form, file);
    });
    
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    return form;
  }

  private async handleFormSubmit(form: HTMLElement, file?: WellKnownFile): Promise<void> {
    console.log('🔄 Form submit started', { file: file ? 'update' : 'create' });

    try {
      const formData = this.getFormData(form);
      console.log('📝 Form data collected:', formData);

      if (file) {
        // Update existing file
        console.log('🔄 Updating file:', file.id);
        const updateData: any = {};
        if (formData.content) updateData.content = formData.content;
        if (formData.contentType) updateData.contentType = formData.contentType;
        if (formData.enabled !== undefined) updateData.enabled = formData.enabled;

        await this.apiClient.updateWellKnownFile(file.id, updateData);
        this.showSuccess('Well-known file updated successfully');
      } else {
        // Create new file
        console.log('🔄 Creating new file');
        const result = await this.apiClient.createWellKnownFile(formData);
        console.log('✅ File created successfully:', result);
        this.showSuccess('Well-known file created successfully');
      }

      console.log('🔄 Hiding modal and reloading files');
      this.hideModal();
      await this.loadFiles();
      console.log('✅ Form submit completed successfully');
    } catch (error) {
      console.error('❌ Failed to save well-known file:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to save well-known file');
    }
  }

  private getFormData(form: HTMLElement): CreateWellKnownRequest {
    const filenameInput = querySelector('#filename', form) as HTMLInputElement;
    const contentTypeSelect = querySelector('#contentType', form) as HTMLSelectElement;
    const contentTextarea = querySelector('#content', form) as HTMLTextAreaElement;
    const enabledCheckbox = querySelector('#enabled', form) as HTMLInputElement;

    console.log('🔍 Form elements found:', {
      filename: filenameInput?.value,
      contentType: contentTypeSelect?.value,
      content: contentTextarea?.value,
      enabled: enabledCheckbox?.checked
    });

    return {
      filename: filenameInput?.value || '',
      content: contentTextarea?.value || '',
      contentType: contentTypeSelect?.value || 'application/json',
      enabled: enabledCheckbox?.checked ?? true
    };
  }

  private async deleteFile(file: WellKnownFile): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${file.filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await this.apiClient.deleteWellKnownFile(file.id);
      this.showSuccess('Well-known file deleted successfully');
      await this.loadFiles();
    } catch (error) {
      console.error('Failed to delete well-known file:', error);
      this.showError('Failed to delete well-known file. Please try again.');
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const loadingElement = querySelector('#well-known-loading', this.container);
    const filesContainer = querySelector('#well-known-files-container', this.container);

    if (loadingElement && filesContainer) {
      if (loading) {
        loadingElement.classList.remove('hidden');
        filesContainer.classList.add('hidden');
      } else {
        loadingElement.classList.add('hidden');
        filesContainer.classList.remove('hidden');
      }
    }
  }

  private showModal(title: string, content: HTMLElement): void {
    this.emit('modal:show', { title, content });
  }

  private hideModal(): void {
    this.emit('modal:hide');
  }

  private showSuccess(message: string): void {
    // You can implement a toast notification system here
    console.log('Success:', message);
  }

  private showError(message: string): void {
    // You can implement a toast notification system here
    console.error('Error:', message);
  }
}
