import { BaseComponent } from './base-component.js';
import { LinkManagerComponent } from './link-manager-component.js';
import { AuthService } from '../services/auth-service.js';
import { ApiClient } from '../services/api-client.js';
import { createElement, querySelector, querySelectorAll } from '../utils/dom-helpers.js';
import type { TabName, User } from '../types/ui.js';
import type { DashboardStats } from '../types/api.js';

export class DashboardComponent extends BaseComponent {
  private authService: AuthService;
  private apiClient: ApiClient;
  private currentTab: TabName = 'overview';
  private user: User | null = null;
  private linkManagerComponent: LinkManagerComponent | null = null;

  constructor(
    container: HTMLElement,
    authService: AuthService,
    apiClient: ApiClient
  ) {
    super(container);
    this.authService = authService;
    this.apiClient = apiClient;
    this.user = authService.getCurrentUser();

    // Listen for user updates
    this.authService.on('auth:login', (user: User) => {
      this.user = user;
      this.updateUserDisplay();
    });

    this.authService.on('auth:restored', (user: User) => {
      this.user = user;
      this.updateUserDisplay();
    });
  }

  render(): void {
    this.checkDestroyed();

    // Ensure complete cleanup
    this.container.innerHTML = '';
    this.container.className = 'screen';

    // Create header
    const header = this.createHeader();

    // Create navigation
    const nav = this.createNavigation();

    // Create main content area
    const main = createElement('main', {
      className: 'main-content'
    });

    // Create tab contents
    const tabContents = this.createTabContents();
    main.appendChild(tabContents);

    // Assemble dashboard
    this.container.appendChild(header);
    this.container.appendChild(nav);
    this.container.appendChild(main);

    // Load initial data
    this.loadOverviewData();
  }

  private createHeader(): HTMLElement {
    const header = createElement('header', { className: 'header' });
    
    const headerContent = createElement('div', { className: 'header-content' });
    
    // Left side
    const headerLeft = createElement('div', { className: 'header-left' });
    
    const logo = createElement('img', {
      className: 'header-logo',
      attributes: {
        src: 'public/rowtfavicon.png',
        alt: 'Rowt Logo'
      }
    });
    
    const title = createElement('h1', { textContent: 'Rowt Dashboard' });
    
    headerLeft.appendChild(logo);
    headerLeft.appendChild(title);
    
    // Right side
    const headerRight = createElement('div', { className: 'header-right' });
    
    const userInfo = createElement('span', {
      className: 'user-info',
      textContent: this.user?.email || 'Unknown User'
    });
    
    const logoutBtn = this.createButton('Logout', 'btn btn-secondary', () => {
      this.handleLogout();
    });
    
    headerRight.appendChild(userInfo);
    headerRight.appendChild(logoutBtn);
    
    headerContent.appendChild(headerLeft);
    headerContent.appendChild(headerRight);
    header.appendChild(headerContent);
    
    return header;
  }

  private createNavigation(): HTMLElement {
    const nav = createElement('nav', { className: 'nav-tabs' });
    
    const tabs: { name: TabName; label: string }[] = [
      { name: 'overview', label: 'Overview' },
      { name: 'projects', label: 'Projects' },
      { name: 'links', label: 'Links' },
      { name: 'analytics', label: 'Analytics' }
    ];
    
    tabs.forEach(tab => {
      const button = this.createButton(tab.label, 'nav-tab', () => {
        this.switchTab(tab.name);
      });
      
      if (tab.name === this.currentTab) {
        button.classList.add('active');
      }
      
      button.dataset.tab = tab.name;
      nav.appendChild(button);
    });
    
    return nav;
  }

  private createTabContents(): HTMLElement {
    const container = createElement('div', { className: 'tab-container' });
    
    // Overview tab
    const overviewTab = createElement('div', {
      id: 'overview-tab',
      className: 'tab-content active'
    });
    overviewTab.appendChild(this.createOverviewContent());
    
    // Projects tab
    const projectsTab = createElement('div', {
      id: 'projects-tab',
      className: 'tab-content'
    });
    projectsTab.appendChild(this.createProjectsContent());
    
    // Links tab
    const linksTab = createElement('div', {
      id: 'links-tab',
      className: 'tab-content'
    });
    linksTab.appendChild(this.createLinksContent());
    
    // Analytics tab
    const analyticsTab = createElement('div', {
      id: 'analytics-tab',
      className: 'tab-content'
    });
    analyticsTab.appendChild(this.createAnalyticsContent());
    
    container.appendChild(overviewTab);
    container.appendChild(projectsTab);
    container.appendChild(linksTab);
    container.appendChild(analyticsTab);
    
    return container;
  }

  private createOverviewContent(): HTMLElement {
    const content = createElement('div');
    
    // Stats grid
    const statsGrid = createElement('div', { className: 'stats-grid' });
    
    const stats = [
      { id: 'total-projects', label: 'Total Projects', value: '-' },
      { id: 'total-links', label: 'Total Links', value: '-' },
      { id: 'total-clicks', label: 'Total Clicks', value: '-' },
      { id: 'server-status', label: 'Server Status', value: '-' }
    ];
    
    stats.forEach(stat => {
      const card = createElement('div', { className: 'stat-card' });
      
      const label = createElement('h3', { textContent: stat.label });
      const value = createElement('div', {
        className: 'stat-number',
        id: stat.id,
        textContent: stat.value
      });
      
      card.appendChild(label);
      card.appendChild(value);
      statsGrid.appendChild(card);
    });
    
    // Welcome section
    const welcomeSection = createElement('div', { className: 'welcome-section' });
    
    const welcomeTitle = createElement('h2', { textContent: 'Welcome to Rowt Dashboard' });
    const welcomeText = createElement('p', {
      textContent: 'Manage your URL shortening and deep linking projects from this dashboard.'
    });
    
    const quickActions = createElement('div', { className: 'quick-actions' });
    
    const createProjectBtn = this.createButton('Create Project', 'btn btn-primary', () => {
      this.switchTab('projects');
    });
    
    const createLinkBtn = this.createButton('Create Link', 'btn btn-primary', () => {
      this.switchTab('links');
    });
    
    quickActions.appendChild(createProjectBtn);
    quickActions.appendChild(createLinkBtn);
    
    welcomeSection.appendChild(welcomeTitle);
    welcomeSection.appendChild(welcomeText);
    welcomeSection.appendChild(quickActions);
    
    content.appendChild(statsGrid);
    content.appendChild(welcomeSection);
    
    return content;
  }

  private createProjectsContent(): HTMLElement {
    const content = createElement('div');
    
    const sectionHeader = createElement('div', { className: 'section-header' });
    const title = createElement('h2', { textContent: 'Projects' });
    const createBtn = this.createButton('Create New Project', 'btn btn-primary', () => {
      this.emit('projects:create');
    });
    
    sectionHeader.appendChild(title);
    sectionHeader.appendChild(createBtn);
    
    const projectsList = createElement('div', {
      id: 'projects-list',
      className: 'projects-list'
    });
    
    content.appendChild(sectionHeader);
    content.appendChild(projectsList);
    
    return content;
  }

  private createLinksContent(): HTMLElement {
    const content = createElement('div', { className: 'links-tab-content' });

    // Initialize the LinkManagerComponent
    this.linkManagerComponent = new LinkManagerComponent(content, this.apiClient);

    // Listen for events from the link manager
    this.linkManagerComponent.on('projects:create', () => {
      this.emit('projects:create');
    });

    return content;
  }

  private createAnalyticsContent(): HTMLElement {
    const content = createElement('div');
    
    const sectionHeader = createElement('div', { className: 'section-header' });
    const title = createElement('h2', { textContent: 'Analytics' });
    
    sectionHeader.appendChild(title);
    
    const analyticsContent = createElement('div', { className: 'analytics-content' });
    const placeholder = createElement('p', { textContent: 'Analytics features coming soon...' });
    
    analyticsContent.appendChild(placeholder);
    
    content.appendChild(sectionHeader);
    content.appendChild(analyticsContent);
    
    return content;
  }

  private switchTab(tabName: TabName): void {
    this.currentTab = tabName;
    
    // Update nav buttons
    const navButtons = querySelectorAll<HTMLButtonElement>('.nav-tab', this.container);
    navButtons.forEach(button => {
      button.classList.remove('active');
      if (button.dataset.tab === tabName) {
        button.classList.add('active');
      }
    });
    
    // Update tab content
    const tabContents = querySelectorAll('.tab-content', this.container);
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tabName}-tab`) {
        content.classList.add('active');
      }
    });
    
    // Load tab-specific data
    this.loadTabData(tabName);
  }

  private async loadOverviewData(): Promise<void> {
    try {
      const health = await this.apiClient.getHealth();
      const serverStatusElement = querySelector('#server-status', this.container);
      if (serverStatusElement) {
        serverStatusElement.textContent = health.status;
      }
    } catch (error) {
      console.error('Failed to load overview data:', error);
    }
  }

  private loadTabData(tabName: TabName): void {
    switch (tabName) {
      case 'overview':
        this.loadOverviewData();
        break;
      case 'projects':
        this.emit('projects:load');
        break;
      case 'links':
        this.loadLinksData();
        break;
      case 'analytics':
        // Analytics loading logic
        break;
    }
  }

  private async loadLinksData(): Promise<void> {
    if (this.linkManagerComponent) {
      try {
        await this.linkManagerComponent.render();
      } catch (error) {
        console.error('Failed to load links:', error);
      }
    }
  }

  private updateUserDisplay(): void {
    const userInfoElement = querySelector('.user-info', this.container);
    if (userInfoElement) {
      userInfoElement.textContent = this.user?.email || 'Unknown User';
    }
  }

  private async handleLogout(): Promise<void> {
    try {
      await this.authService.logout();
      this.emit('logout:success');
    } catch (error) {
      console.error('Logout failed:', error);
      this.showError('Logout failed. Please try again.');
    }
  }
}
