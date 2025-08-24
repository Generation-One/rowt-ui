import { BaseComponent } from './base-component.js';
import { ApiClient } from '../services/api-client.js';
import { AuthService } from '../services/auth-service.js';
import { createElement, querySelector } from '../utils/dom-helpers.js';
import type { Project, CreateProjectRequest, EditProjectRequest } from '../types/api.js';

export class ProjectManager extends BaseComponent {
  private apiClient: ApiClient;
  private authService: AuthService;
  private projects: Project[] = [];

  constructor(container: HTMLElement, apiClient: ApiClient, authService: AuthService) {
    super(container);
    this.apiClient = apiClient;
    this.authService = authService;
  }

  render(): void {
    this.checkDestroyed();
    this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    try {
      this.setLoading(true);
      this.projects = await this.apiClient.getUserProjects();
      this.renderProjectsList();
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.showError('Failed to load projects. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  private renderProjectsList(): void {
    const projectsList = querySelector('#projects-list', this.container);
    if (!projectsList) return;

    projectsList.innerHTML = '';

    if (this.projects.length === 0) {
      const emptyState = createElement('div', {
        className: 'empty-state',
        innerHTML: `
          <div class="empty-icon">📁</div>
          <h3>No Projects Yet</h3>
          <p>Create your first project to start generating short links and managing your URLs.</p>
        `
      });
      projectsList.appendChild(emptyState);
      return;
    }

    // Create project grid container
    const projectGrid = createElement('div', { className: 'project-list' });

    this.projects.forEach(project => {
      const projectCard = this.createProjectCard(project);
      projectGrid.appendChild(projectCard);
    });

    projectsList.appendChild(projectGrid);
  }

  private createProjectCard(project: Project): HTMLElement {
    const card = createElement('div', { className: 'project-card' });

    const header = createElement('div', { className: 'project-header' });
    const title = createElement('h3', { textContent: project.name });
    const createdDate = createElement('span', {
      className: 'project-date',
      textContent: project.createdAt
        ? `Created ${new Date(project.createdAt).toLocaleDateString()}`
        : 'Created recently'
    });

    header.appendChild(title);
    header.appendChild(createdDate);

    const details = createElement('div', { className: 'project-details' });

    const baseUrl = createElement('p', {
      innerHTML: `<strong>Base URL:</strong>`
    });
    const baseUrlValue = createElement('div', {
      className: 'project-url',
      textContent: project.baseUrl
    });
    baseUrl.appendChild(baseUrlValue);

    const fallbackUrl = createElement('p', {
      innerHTML: `<strong>Fallback URL:</strong>`
    });
    const fallbackUrlValue = createElement('div', {
      className: 'project-url',
      textContent: project.fallbackUrl
    });
    fallbackUrl.appendChild(fallbackUrlValue);

    details.appendChild(baseUrl);
    details.appendChild(fallbackUrl);

    // App Store links if available
    if (project.appstoreId || project.playstoreId) {
      const appLinks = createElement('div', { className: 'app-links' });
      
      if (project.appstoreId) {
        const iosLink = createElement('p', {
          innerHTML: `<strong>iOS App ID:</strong> ${project.appstoreId}`
        });
        appLinks.appendChild(iosLink);
      }
      
      if (project.playstoreId) {
        const androidLink = createElement('p', {
          innerHTML: `<strong>Android Package:</strong> ${project.playstoreId}`
        });
        appLinks.appendChild(androidLink);
      }
      
      details.appendChild(appLinks);
    }

    // API Key section
    const apiKeySection = createElement('div', { className: 'project-api-key' });
    const apiKeyLabel = createElement('label', { textContent: 'API Key' });

    const apiKeyContainer = createElement('div', { className: 'api-key-container' });
    const apiKeyInput = createElement('input', {
      attributes: {
        type: 'text',
        value: project.apiKey || 'No API key generated',
        readonly: 'true'
      },
      className: 'api-key-input'
    }) as HTMLInputElement;

    const copyButton = this.createButton('Copy', 'copy-api-key-btn', () => {
      if (project.apiKey) {
        this.copyToClipboard(project.apiKey);
      } else {
        this.showError('No API key available to copy');
      }
    });

    apiKeyContainer.appendChild(apiKeyInput);
    apiKeyContainer.appendChild(copyButton);
    apiKeySection.appendChild(apiKeyLabel);
    apiKeySection.appendChild(apiKeyContainer);

    // Actions
    const actions = createElement('div', { className: 'project-actions' });

    const viewLinksBtn = this.createButton('View Links', 'btn btn-primary', () => {
      this.emit('project:view-links', project);
    });

    const editBtn = this.createButton('Edit Project', 'btn btn-secondary', () => {
      this.showEditProjectModal(project);
    });

    actions.appendChild(viewLinksBtn);
    actions.appendChild(editBtn);

    // Assemble card
    card.appendChild(header);
    card.appendChild(details);
    card.appendChild(apiKeySection);
    card.appendChild(actions);

    return card;
  }

  showCreateProjectModal(): void {
    const modalContent = this.createProjectForm();
    this.emit('modal:show', {
      title: 'Create New Project',
      content: modalContent
    });
  }

  showEditProjectModal(project: Project): void {
    const modalContent = this.createEditProjectForm(project);
    this.emit('modal:show', {
      title: `Edit Project: ${project.name}`,
      content: modalContent
    });
  }

  private createProjectForm(): HTMLElement {
    const container = createElement('div', { className: 'project-form-container' });
    const form = createElement('form', {
      id: 'create-project-form',
      className: 'project-form'
    });

    // Project name
    const nameInput = this.createInput('text', 'Enter project name', '', true);
    nameInput.name = 'name';
    const nameGroup = this.createFormGroup(
      'Project Name:',
      nameInput,
      'project-name',
      'A unique name for your project. This will help you identify it in your dashboard.'
    );

    // Base URL
    const baseUrlInput = this.createInput('url', 'https://example.com', '', true);
    baseUrlInput.name = 'baseUrl';
    const baseUrlGroup = this.createFormGroup(
      'Base URL:',
      baseUrlInput,
      'base-url',
      'The main website URL where users will be redirected. Example: https://mywebsite.com'
    );

    // Fallback URL
    const fallbackUrlInput = this.createInput('url', 'https://example.com/fallback', '', true);
    fallbackUrlInput.name = 'fallbackUrl';
    const fallbackUrlGroup = this.createFormGroup(
      'Fallback URL:',
      fallbackUrlInput,
      'fallback-url',
      'Backup URL used when the main URL is not accessible or for desktop users. Example: https://mywebsite.com/home'
    );

    // iOS App Store ID (optional)
    const appstoreIdInput = this.createInput('text', '123456789', '');
    appstoreIdInput.name = 'appstoreId';
    const appstoreIdGroup = this.createFormGroup(
      'iOS App Store ID (optional):',
      appstoreIdInput,
      'appstore-id',
      'The numeric ID of your iOS app in the App Store. Found in your app\'s App Store URL. Example: 123456789'
    );

    // Android Package Name (optional)
    const playstoreIdInput = this.createInput('text', 'com.example.app', '');
    playstoreIdInput.name = 'playstoreId';
    const playstoreIdGroup = this.createFormGroup(
      'Android Package Name (optional):',
      playstoreIdInput,
      'playstore-id',
      'Your Android app\'s package name from Google Play Store. Example: com.mycompany.myapp'
    );

    // iOS URL Scheme (optional)
    const iosSchemeInput = this.createInput('text', 'myapp://', '');
    iosSchemeInput.name = 'iosScheme';
    const iosSchemeGroup = this.createFormGroup(
      'iOS URL Scheme (optional):',
      iosSchemeInput,
      'ios-scheme',
      'Custom URL scheme for deep linking to your iOS app. Example: myapp:// or myapp://page'
    );

    // Android URL Scheme (optional)
    const androidSchemeInput = this.createInput('text', 'myapp://', '');
    androidSchemeInput.name = 'androidScheme';
    const androidSchemeGroup = this.createFormGroup(
      'Android URL Scheme (optional):',
      androidSchemeInput,
      'android-scheme',
      'Custom URL scheme for deep linking to your Android app. Example: myapp:// or myapp://page'
    );

    // Submit button
    const submitButton = createElement('button', {
      textContent: 'Create Project',
      className: 'btn btn-primary',
      attributes: { type: 'submit' }
    }) as HTMLButtonElement;

    // Assemble form
    form.appendChild(nameGroup);
    form.appendChild(baseUrlGroup);
    form.appendChild(fallbackUrlGroup);
    form.appendChild(appstoreIdGroup);
    form.appendChild(playstoreIdGroup);
    form.appendChild(iosSchemeGroup);
    form.appendChild(androidSchemeGroup);
    form.appendChild(submitButton);

    // Add form submit handler
    form.addEventListener('submit', (event) => {
      console.log('Create form submit event triggered');
      this.handleCreateProject(event);
    });

    container.appendChild(form);
    return container;
  }

  private createEditProjectForm(project: Project): HTMLElement {
    const container = createElement('div', { className: 'project-form-container' });
    const form = createElement('form', {
      id: 'edit-project-form',
      className: 'project-form'
    });

    // Project name
    const nameInput = this.createInput('text', 'Enter project name', project.name, true);
    nameInput.name = 'name';
    const nameGroup = this.createFormGroup(
      'Project Name:',
      nameInput,
      'project-name',
      'A unique name for your project. This will help you identify it in your dashboard.'
    );

    // Base URL
    const baseUrlInput = this.createInput('url', 'https://example.com', project.baseUrl, false);
    baseUrlInput.name = 'baseUrl';
    const baseUrlGroup = this.createFormGroup(
      'Base URL:',
      baseUrlInput,
      'base-url',
      'The main website URL where users will be redirected. Example: https://mywebsite.com'
    );

    // Fallback URL
    const fallbackUrlInput = this.createInput('url', 'https://example.com/fallback', project.fallbackUrl, false);
    fallbackUrlInput.name = 'fallbackUrl';
    const fallbackUrlGroup = this.createFormGroup(
      'Fallback URL:',
      fallbackUrlInput,
      'fallback-url',
      'Backup URL used when the main URL is not accessible or for desktop users. Example: https://mywebsite.com/home'
    );

    // iOS App Store ID (optional)
    const appstoreIdInput = this.createInput('text', '123456789', project.appstoreId || '');
    appstoreIdInput.name = 'appstoreId';
    const appstoreIdGroup = this.createFormGroup(
      'iOS App Store ID (optional):',
      appstoreIdInput,
      'appstore-id',
      'The numeric ID of your iOS app in the App Store. Found in your app\'s App Store URL. Example: 123456789'
    );

    // Android Package Name (optional)
    const playstoreIdInput = this.createInput('text', 'com.example.app', project.playstoreId || '');
    playstoreIdInput.name = 'playstoreId';
    const playstoreIdGroup = this.createFormGroup(
      'Android Package Name (optional):',
      playstoreIdInput,
      'playstore-id',
      'Your Android app\'s package name from Google Play Store. Example: com.mycompany.myapp'
    );

    // iOS URL Scheme (optional)
    const iosSchemeInput = this.createInput('text', 'myapp://', project.iosScheme || '');
    iosSchemeInput.name = 'iosScheme';
    const iosSchemeGroup = this.createFormGroup(
      'iOS URL Scheme (optional):',
      iosSchemeInput,
      'ios-scheme',
      'Custom URL scheme for deep linking to your iOS app. Example: myapp:// or myapp://page'
    );

    // Android URL Scheme (optional)
    const androidSchemeInput = this.createInput('text', 'myapp://', project.androidScheme || '');
    androidSchemeInput.name = 'androidScheme';
    const androidSchemeGroup = this.createFormGroup(
      'Android URL Scheme (optional):',
      androidSchemeInput,
      'android-scheme',
      'Custom URL scheme for deep linking to your Android app. Example: myapp:// or myapp://page'
    );

    // Submit button
    const submitButton = createElement('button', {
      textContent: 'Update Project',
      className: 'btn btn-primary',
      attributes: { type: 'submit' }
    }) as HTMLButtonElement;

    // Cancel button
    const cancelButton = this.createButton('Cancel', 'btn btn-secondary', () => {
      this.emit('modal:hide');
    });

    const buttonGroup = createElement('div', { className: 'button-group' });
    buttonGroup.appendChild(cancelButton);
    buttonGroup.appendChild(submitButton);

    // Assemble form
    form.appendChild(nameGroup);
    form.appendChild(baseUrlGroup);
    form.appendChild(fallbackUrlGroup);
    form.appendChild(appstoreIdGroup);
    form.appendChild(playstoreIdGroup);
    form.appendChild(iosSchemeGroup);
    form.appendChild(androidSchemeGroup);
    form.appendChild(buttonGroup);

    // Add form submit handler
    form.addEventListener('submit', (event) => {
      console.log('Form submit event triggered');
      this.handleEditProject(event, project);
    });

    container.appendChild(form);
    return container;
  }

  private async handleCreateProject(event: Event): Promise<void> {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.showError('User not authenticated');
      return;
    }

    const projectData: CreateProjectRequest = {
      userId: currentUser.id,
      name: formData.get('name') as string,
      baseUrl: formData.get('baseUrl') as string,
      fallbackUrl: formData.get('fallbackUrl') as string,
      ...(formData.get('appstoreId') && { appstoreId: formData.get('appstoreId') as string }),
      ...(formData.get('playstoreId') && { playstoreId: formData.get('playstoreId') as string }),
      ...(formData.get('iosScheme') && { iosScheme: formData.get('iosScheme') as string }),
      ...(formData.get('androidScheme') && { androidScheme: formData.get('androidScheme') as string })
    };

    // Validate required fields
    if (!projectData.name || !projectData.baseUrl || !projectData.fallbackUrl) {
      this.showError('Please fill in all required fields');
      return;
    }

    try {
      this.setLoading(true, form);
      
      const newProject = await this.apiClient.createProject(projectData);
      
      this.projects.push(newProject);
      this.renderProjectsList();
      
      this.emit('modal:hide');
      this.showSuccess('Project created successfully!');
      
    } catch (error) {
      console.error('Failed to create project:', error);
      this.showError('Failed to create project. Please try again.');
    } finally {
      this.setLoading(false, form);
    }
  }

  private async handleEditProject(event: Event, project: Project): Promise<void> {
    event.preventDefault();
    console.log('Edit project form submitted for project:', project.id);

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Log form data for debugging
    console.log('Form data:', Object.fromEntries(formData.entries()));

    const editData: EditProjectRequest = {};

    // Validate required fields first
    const name = formData.get('name') as string;
    const baseUrl = formData.get('baseUrl') as string;
    const fallbackUrl = formData.get('fallbackUrl') as string;

    if (!name || !baseUrl || !fallbackUrl) {
      this.showError('Please fill in all required fields (Name, Base URL, Fallback URL).');
      return;
    }

    // Only include fields that have values and are different from current values
    if (name !== project.name) {
      editData.name = name;
    }

    if (baseUrl !== project.baseUrl) {
      editData.baseUrl = baseUrl;
    }

    if (fallbackUrl !== project.fallbackUrl) {
      editData.fallbackUrl = fallbackUrl;
    }

    const appstoreId = formData.get('appstoreId') as string;
    if (appstoreId !== (project.appstoreId || '')) {
      if (appstoreId) { editData.appstoreId = appstoreId; }
    }

    const playstoreId = formData.get('playstoreId') as string;
    if (playstoreId !== (project.playstoreId || '')) {
      if (playstoreId) { editData.playstoreId = playstoreId; }
    }

    const iosScheme = formData.get('iosScheme') as string;
    if (iosScheme !== (project.iosScheme || '')) {
      if (iosScheme) { editData.iosScheme = iosScheme; }
    }

    const androidScheme = formData.get('androidScheme') as string;
    if (androidScheme !== (project.androidScheme || '')) {
      if (androidScheme) { editData.androidScheme = androidScheme; }
    }

    console.log('Edit data to send:', editData);

    // Check if any changes were made
    if (Object.keys(editData).length === 0) {
      this.showInfo('No changes detected.');
      this.emit('modal:hide');
      return;
    }

    try {
      this.setLoading(true, form);
      console.log('Sending edit request...');

      const updatedProject = await this.apiClient.editProject(project.id, editData);
      console.log('Project updated successfully:', updatedProject);

      // Update the project in the local array
      const projectIndex = this.projects.findIndex(p => p.id === project.id);
      if (projectIndex !== -1) {
        this.projects[projectIndex] = updatedProject;
        this.renderProjectsList();
      }

      this.emit('modal:hide');
      this.showSuccess('Project updated successfully!');

    } catch (error) {
      console.error('Failed to edit project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project. Please try again.';
      this.showError(errorMessage);
    } finally {
      this.setLoading(false, form);
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('API key copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError('Failed to copy API key');
    }
  }
}
