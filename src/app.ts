import { ApiClient } from './services/api-client.js';
import { AuthService } from './services/auth-service.js';
import { LoginComponent } from './components/login-component.js';
import { DashboardComponent } from './components/dashboard-component.js';
import { ProjectManager } from './components/project-manager.js';
import { ConfigurationErrorComponent } from './components/configuration-error-component.js';
import { getElement, show, hide, onDOMReady } from './utils/dom-helpers.js';
import { getConfigurationErrors, isConfigurationValid } from './config/app-config.js';
import type { AppState } from './types/ui.js';

export class App {
  private apiClient: ApiClient;
  private authService: AuthService;
  private state: AppState;

  // Components
  private loginComponent: LoginComponent | null = null;
  private dashboardComponent: DashboardComponent | null = null;
  private projectManager: ProjectManager | null = null;
  private configErrorComponent: ConfigurationErrorComponent | null = null;

  // DOM Elements
  private loadingScreen: HTMLElement | null = null;
  private loginScreen: HTMLElement | null = null;
  private dashboardScreen: HTMLElement | null = null;
  private modalOverlay: HTMLElement | null = null;

  constructor() {
    // Initialize services
    this.apiClient = new ApiClient();
    this.authService = new AuthService(); // Updated constructor

    this.state = {
      isAuthenticated: false,
      user: null,
      currentTab: 'overview',
      isLoading: true,
      error: null
    };

    this.setupEventListeners();
  }

  async init(): Promise<void> {
    onDOMReady(() => {
      this.initializeDOM();
      this.checkConfiguration();
    });
  }

  private initializeDOM(): void {
    this.loadingScreen = getElement('loading');
    this.loginScreen = getElement('login-screen');
    this.dashboardScreen = getElement('dashboard');
    this.modalOverlay = getElement('modal-overlay');

    if (!this.loadingScreen || !this.loginScreen || !this.dashboardScreen) {
      throw new Error('Required DOM elements not found');
    }
  }

  private setupEventListeners(): void {
    // Auth service events
    this.authService.on('auth:login', (user) => {
      this.state.isAuthenticated = true;
      this.state.user = user;
      this.showDashboard();
    });

    this.authService.on('auth:logout', () => {
      this.state.isAuthenticated = false;
      this.state.user = null;
      this.showLogin();
    });

    this.authService.on('auth:restored', (user) => {
      this.state.isAuthenticated = true;
      this.state.user = user;
      this.showDashboard();
    });

    this.authService.on('auth:error', (error) => {
      console.error('Auth error:', error);
      this.state.error = error.message;
    });

    // Modal close events
    if (this.modalOverlay) {
      // Setup modal close handler using event delegation
      this.setupModalCloseHandler();
    }
  }

  private async checkConfiguration(): Promise<void> {
    // Check if configuration is valid
    const isValid = await isConfigurationValid();
    if (!isValid) {
      const configError = await getConfigurationErrors();
      if (configError) {
        this.showConfigurationError(configError);
        return;
      }
    }

    // Configuration is valid, proceed with auth check
    this.checkAuthStatus();
  }

  private showConfigurationError(error: any): void {
    this.hideLoading();

    if (this.loginScreen) hide(this.loginScreen);
    if (this.dashboardScreen) hide(this.dashboardScreen);

    // Create configuration error component
    const errorContainer = document.createElement('div');
    errorContainer.id = 'configuration-error';
    document.body.appendChild(errorContainer);

    this.configErrorComponent = new ConfigurationErrorComponent(errorContainer, {
      error,
      onRetry: () => {
        // Remove error component and retry
        if (this.configErrorComponent) {
          document.body.removeChild(errorContainer);
          this.configErrorComponent = null;
        }
        this.checkConfiguration();
      }
    });
  }

  private async checkAuthStatus(): Promise<void> {
    console.log('🔍 Checking authentication status...');
    try {
      const isAuthenticated = await this.authService.checkAuthStatus();
      console.log('🔍 Auth check result:', isAuthenticated);

      if (isAuthenticated) {
        console.log('✅ User is authenticated, showing dashboard');
        this.state.isAuthenticated = true;
        this.state.user = this.authService.getCurrentUser();
        this.showDashboard();
      } else {
        console.log('❌ User not authenticated, showing login');
        this.showLogin();
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      this.showLogin();
    } finally {
      console.log('🔍 Auth check complete, hiding loading screen');
      this.state.isLoading = false;
      this.hideLoading();
    }
  }

  private showLogin(): void {
    console.log('🔍 Showing login screen...');
    if (!this.loginScreen || !this.dashboardScreen) {
      console.error('❌ Login or dashboard screen elements not found');
      return;
    }

    this.hideLoading();
    hide(this.dashboardScreen);
    show(this.loginScreen);

    // Create login component if it doesn't exist
    if (!this.loginComponent) {
      console.log('🔍 Creating login component...');
      this.loginComponent = new LoginComponent(this.loginScreen, this.authService);

      this.loginComponent.on('login:success', () => {
        // Auth service will handle the state change
      });
    }

    console.log('🔍 Rendering login component...');
    this.loginComponent.render();
    this.loginComponent.focus();
    console.log('✅ Login screen displayed');
  }

  private showDashboard(): void {
    if (!this.loginScreen || !this.dashboardScreen) return;

    this.hideLoading();
    hide(this.loginScreen);
    show(this.dashboardScreen);

    // Create dashboard component if it doesn't exist
    if (!this.dashboardComponent) {
      this.dashboardComponent = new DashboardComponent(
        this.dashboardScreen, 
        this.authService, 
        this.apiClient
      );

      // Dashboard events
      this.dashboardComponent.on('logout:success', () => {
        // Auth service will handle the state change
      });

      this.dashboardComponent.on('projects:create', () => {
        this.showCreateProjectModal();
      });

      this.dashboardComponent.on('projects:load', () => {
        this.loadProjectsTab();
      });

      // Modal events from dashboard (including link manager)
      this.dashboardComponent.on('modal:show', (config) => {
        this.showModal(config.title, config.content);
      });

      this.dashboardComponent.on('modal:hide', () => {
        this.hideModal();
      });
    }

    this.dashboardComponent.render();
  }

  private loadProjectsTab(): void {
    if (!this.dashboardScreen) return;

    // Create project manager if it doesn't exist
    if (!this.projectManager) {
      this.projectManager = new ProjectManager(this.dashboardScreen, this.apiClient, this.authService);

      // Project manager events
      this.projectManager.on('project:view-links', (project) => {
        console.log('View links for project:', project);
        // Switch to links tab and filter by the selected project
        if (this.dashboardComponent) {
          this.dashboardComponent.setLinksProjectFilter(project.id);
        }
      });



      this.projectManager.on('modal:show', (config) => {
        this.showModal(config.title, config.content);
      });

      this.projectManager.on('modal:hide', () => {
        this.hideModal();
      });
    }

    this.projectManager.render();
  }

  private showCreateProjectModal(): void {
    if (!this.projectManager) {
      this.loadProjectsTab();
    }
    
    this.projectManager?.showCreateProjectModal();
  }

  private showModal(title: string, content: HTMLElement | string): void {
    if (!this.modalOverlay) return;

    const modalTitle = this.modalOverlay.querySelector('#modal-title');
    const modalBody = this.modalOverlay.querySelector('#modal-body');

    if (modalTitle && modalBody) {
      modalTitle.textContent = title;

      if (typeof content === 'string') {
        modalBody.innerHTML = content;
      } else {
        modalBody.innerHTML = '';
        modalBody.appendChild(content);
      }
    }

    // Ensure close button event listener is attached
    this.setupModalCloseHandler();

    // Add keyboard support for closing modal
    this.setupModalKeyboardHandler();

    show(this.modalOverlay);
  }

  private modalMouseDownTarget: EventTarget | null = null;

  private setupModalCloseHandler(): void {
    if (!this.modalOverlay) return;

    // Remove existing event listeners to avoid duplicates
    this.modalOverlay.removeEventListener('mousedown', this.handleModalMouseDown);
    this.modalOverlay.removeEventListener('click', this.handleModalClick);

    // Add event listeners for proper modal closing behavior
    this.modalOverlay.addEventListener('mousedown', this.handleModalMouseDown);
    this.modalOverlay.addEventListener('click', this.handleModalClick);
  }

  private handleModalMouseDown = (event: MouseEvent): void => {
    // Track where the mouse was initially pressed
    this.modalMouseDownTarget = event.target;
  };

  private handleModalClick = (event: Event): void => {
    const target = event.target as HTMLElement;

    // Close on close button click
    if (target.classList.contains('modal-close') || target.closest('.modal-close')) {
      console.log('Modal close button clicked');
      event.preventDefault();
      event.stopPropagation();
      this.hideModal();
      return;
    }

    // Only close on overlay click if both mousedown and mouseup happened on the overlay
    // This prevents accidental closing when dragging from inside the modal to outside
    if (target === this.modalOverlay && this.modalMouseDownTarget === this.modalOverlay) {
      console.log('Modal overlay clicked (mousedown and mouseup both on overlay)');
      this.hideModal();
      return;
    }
  };

  private setupModalKeyboardHandler(): void {
    if (!this.modalOverlay) return;

    // Remove existing keyboard handler to avoid duplicates
    document.removeEventListener('keydown', this.handleModalKeydown);
    document.addEventListener('keydown', this.handleModalKeydown);
  }

  private handleModalKeydown = (event: KeyboardEvent): void => {
    // Close modal on Escape key
    if (event.key === 'Escape' && this.modalOverlay && !this.modalOverlay.classList.contains('hidden')) {
      console.log('Escape key pressed, closing modal');
      event.preventDefault();
      this.hideModal();
    }
  };

  private hideModal(): void {
    console.log('Hiding modal...');
    if (!this.modalOverlay) {
      console.log('No modal overlay found');
      return;
    }

    // Clean up event listeners and state
    document.removeEventListener('keydown', this.handleModalKeydown);
    this.modalMouseDownTarget = null;

    hide(this.modalOverlay);
    console.log('Modal hidden');
  }

  private hideLoading(): void {
    if (!this.loadingScreen) return;
    hide(this.loadingScreen);
  }

  // Public API for external access
  public getApiClient(): ApiClient {
    return this.apiClient;
  }

  public getAuthService(): AuthService {
    return this.authService;
  }

  public getState(): AppState {
    return { ...this.state };
  }
}
