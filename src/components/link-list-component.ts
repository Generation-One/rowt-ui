import { BaseComponent } from './base-component.js';
import { ApiClient } from '../services/api-client.js';
import { createElement, querySelector, querySelectorAll } from '../utils/dom-helpers.js';
import { generateShortUrl } from '../utils/data-transformers.js';
import type { Link, Project, GetLinksRequest } from '../types/api.js';
import type { LinkSelectionState, LinkSearchState, LinkSortState } from '../types/ui.js';

export interface LinkListConfig {
  projects: Project[];
  onEdit: (link: Link) => void;
  onDelete: (link: Link) => void;
  onBulkDelete: (linkIds: string[]) => void;
  onCreateNew: () => void;
}

export class LinkListComponent extends BaseComponent {
  private apiClient: ApiClient;
  private config: LinkListConfig;
  private links: Link[] = [];
  private filteredLinks: Link[] = [];
  private selection: LinkSelectionState = {
    selectedIds: new Set(),
    isAllSelected: false,
    isIndeterminate: false
  };
  private searchState: LinkSearchState = {
    query: '',
    projectFilter: '',
    dateRange: { from: '', to: '' },
    showAdvanced: false
  };
  private sortState: LinkSortState = {
    field: 'createdAt',
    direction: 'desc'
  };
  private viewMode: 'table' | 'cards' = 'table';
  private isLoading = false;

  constructor(container: HTMLElement, apiClient: ApiClient, config: LinkListConfig) {
    super(container);
    this.apiClient = apiClient;
    this.config = config;
  }

  render(): void {
    this.checkDestroyed();
    this.clear();

    const listContainer = createElement('div', { className: 'link-list-container' });

    // Header with search and controls
    const header = this.createHeader();
    listContainer.appendChild(header);

    // Bulk actions bar (hidden by default)
    const bulkActions = this.createBulkActionsBar();
    listContainer.appendChild(bulkActions);

    // Links content area
    const contentArea = createElement('div', { className: 'links-content' });
    listContainer.appendChild(contentArea);

    this.container.appendChild(listContainer);
    
    // Load initial data
    this.loadLinks();
  }

  private createHeader(): HTMLElement {
    const header = createElement('div', { className: 'link-list-header' });

    // Title and create button
    const titleSection = createElement('div', { className: 'header-title-section' });
    const title = createElement('h2', { textContent: 'Links' });
    const createBtn = this.createButton('Create New Link', 'btn btn-primary', () => {
      this.config.onCreateNew();
    });
    titleSection.appendChild(title);
    titleSection.appendChild(createBtn);

    // Search and filters
    const searchSection = createElement('div', { className: 'header-search-section' });
    
    // Search input
    const searchGroup = createElement('div', { className: 'search-group' });
    const searchInput = createElement('input', {
      attributes: {
        type: 'text',
        placeholder: 'Search by URL, title, or short code...',
        id: 'link-search'
      },
      className: 'search-input'
    }) as HTMLInputElement;
    
    searchInput.addEventListener('input', (e) => {
      this.searchState.query = (e.target as HTMLInputElement).value;
      this.debounceSearch();
    });
    
    searchGroup.appendChild(searchInput);

    // Project filter
    const projectFilter = createElement('select', {
      className: 'project-filter',
      attributes: { id: 'project-filter' }
    }) as HTMLSelectElement;
    
    const allOption = createElement('option', {
      textContent: 'All Projects',
      attributes: { value: '' }
    });
    projectFilter.appendChild(allOption);
    
    this.config.projects.forEach(project => {
      const option = createElement('option', {
        textContent: project.name,
        attributes: { value: project.id }
      });
      projectFilter.appendChild(option);
    });
    
    projectFilter.addEventListener('change', (e) => {
      this.searchState.projectFilter = (e.target as HTMLSelectElement).value;
      this.applyFilters();
    });

    // View mode toggle
    const viewToggle = createElement('div', { className: 'view-toggle' });
    const tableBtn = this.createButton('Table', 'view-btn active', async () => {
      await this.setViewMode('table');
    });
    const cardsBtn = this.createButton('Cards', 'view-btn', async () => {
      await this.setViewMode('cards');
    });
    tableBtn.dataset.mode = 'table';
    cardsBtn.dataset.mode = 'cards';
    viewToggle.appendChild(tableBtn);
    viewToggle.appendChild(cardsBtn);

    searchSection.appendChild(searchGroup);
    searchSection.appendChild(projectFilter);
    searchSection.appendChild(viewToggle);

    header.appendChild(titleSection);
    header.appendChild(searchSection);

    return header;
  }

  private createBulkActionsBar(): HTMLElement {
    const bar = createElement('div', { className: 'bulk-actions-bar' });
    
    const info = createElement('span', { className: 'bulk-info' });
    const deleteBtn = this.createButton('Delete Selected', 'btn btn-danger btn-sm', () => {
      this.handleBulkDelete();
    });
    deleteBtn.setAttribute('title', 'Delete selected links');
    const clearBtn = this.createButton('Clear Selection', 'btn btn-secondary btn-sm', () => {
      this.clearSelection();
    });
    
    bar.appendChild(info);
    bar.appendChild(deleteBtn);
    bar.appendChild(clearBtn);
    
    return bar;
  }

  private async loadLinks(): Promise<void> {
    this.setLoading(true);
    
    try {
      const params: GetLinksRequest = {
        includeInteractions: true,
        sort: {
          field: this.sortState.field as any,
          direction: this.sortState.direction
        }
      };
      
      if (this.searchState.projectFilter) {
        params.projectId = this.searchState.projectFilter;
      }
      
      if (this.searchState.query) {
        params.filter = {
          search: this.searchState.query
        };
      }

      const response = await this.apiClient.getLinks(params);
      this.links = response.links;
      await this.applyFilters();
    } catch (error) {
      console.error('Failed to load links:', error);
      this.showError('Failed to load links');
    } finally {
      this.setLoading(false);
    }
  }

  private async applyFilters(): Promise<void> {
    let filtered = [...this.links];

    // Apply search filter
    if (this.searchState.query) {
      const query = this.searchState.query.toLowerCase();
      filtered = filtered.filter(link =>
        link.url.toLowerCase().includes(query) ||
        link.title?.toLowerCase().includes(query) ||
        link.description?.toLowerCase().includes(query) ||
        (link.shortCode || link.id).toLowerCase().includes(query)
      );
    }

    // Apply project filter
    if (this.searchState.projectFilter) {
      filtered = filtered.filter(link => link.projectId === this.searchState.projectFilter);
    }

    this.filteredLinks = filtered;
    await this.renderLinks();
    this.updateBulkActionsBar();
  }

  private async renderLinks(): Promise<void> {
    const contentArea = querySelector('.links-content', this.container) as HTMLElement;
    if (!contentArea) return;
    
    contentArea.innerHTML = '';
    
    if (this.isLoading) {
      const loading = createElement('div', { 
        className: 'loading-state',
        textContent: 'Loading links...'
      });
      contentArea.appendChild(loading);
      return;
    }
    
    if (this.filteredLinks.length === 0) {
      const empty = createElement('div', { className: 'empty-state' });
      const message = this.links.length === 0 
        ? 'No links created yet. Create your first link to get started!'
        : 'No links match your current filters.';
      
      empty.innerHTML = `
        <div class="empty-icon">🔗</div>
        <h3>No Links Found</h3>
        <p>${message}</p>
      `;
      
      if (this.links.length === 0) {
        const createBtn = this.createButton('Create First Link', 'btn btn-primary', () => {
          this.config.onCreateNew();
        });
        empty.appendChild(createBtn);
      }
      
      contentArea.appendChild(empty);
      return;
    }
    
    if (this.viewMode === 'table') {
      await this.renderTable(contentArea);
    } else {
      await this.renderCards(contentArea);
    }
  }

  private async renderTable(container: HTMLElement): Promise<void> {
    const table = createElement('table', { className: 'links-table' });
    
    // Table header
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    
    // Checkbox column
    const checkboxTh = createElement('th', { className: 'checkbox-column' });
    const masterCheckbox = createElement('input', {
      attributes: { type: 'checkbox', id: 'select-all' }
    }) as HTMLInputElement;
    
    masterCheckbox.addEventListener('change', () => {
      this.toggleSelectAll(masterCheckbox.checked);
    });
    
    checkboxTh.appendChild(masterCheckbox);
    headerRow.appendChild(checkboxTh);
    
    // Data columns
    const columns = [
      { key: 'shortCode', label: 'Short Code', sortable: true },
      { key: 'url', label: 'URL', sortable: false },
      { key: 'title', label: 'Title', sortable: true },
      { key: 'project', label: 'Project', sortable: false },
      { key: 'clickCount', label: 'Clicks', sortable: true },
      { key: 'createdAt', label: 'Created', sortable: true },
      { key: 'actions', label: 'Actions', sortable: false }
    ];
    
    columns.forEach(col => {
      const th = createElement('th', { 
        textContent: col.label,
        className: col.sortable ? 'sortable' : ''
      });
      
      if (col.sortable) {
        th.addEventListener('click', () => {
          this.handleSort(col.key);
        });
        
        if (this.sortState.field === col.key) {
          th.classList.add('sorted', this.sortState.direction);
        }
      }
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = createElement('tbody');
    
    // Create rows asynchronously to handle short URL generation
    for (const link of this.filteredLinks) {
      const row = await this.createTableRow(link);
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
  }

  private async createTableRow(link: Link): Promise<HTMLElement> {
    const row = createElement('tr', { 
      className: this.selection.selectedIds.has(link.id) ? 'selected' : ''
    });
    
    // Checkbox
    const checkboxTd = createElement('td', { className: 'checkbox-column' });
    const checkbox = createElement('input', {
      attributes: { type: 'checkbox', value: link.id }
    }) as HTMLInputElement;
    
    checkbox.checked = this.selection.selectedIds.has(link.id);
    checkbox.addEventListener('change', () => {
      this.toggleLinkSelection(link.id, checkbox.checked);
    });
    
    checkboxTd.appendChild(checkbox);
    row.appendChild(checkboxTd);
    
    // Short code
    const shortCodeTd = createElement('td', { className: 'short-code-cell' });
    const shortUrl = await generateShortUrl(link.shortCode || link.id);
    const shortCodeLink = createElement('a', {
      textContent: link.shortCode || link.id,
      attributes: {
        href: shortUrl,
        target: '_blank',
        title: 'Open short link'
      },
      className: 'short-code-link'
    });
    shortCodeTd.appendChild(shortCodeLink);
    row.appendChild(shortCodeTd);
    
    // URL
    const urlTd = createElement('td', { className: 'url-cell' });
    const urlText = createElement('span', {
      textContent: this.truncateText(link.url, 50),
      className: 'url-text',
      attributes: { title: link.url }
    });
    urlTd.appendChild(urlText);
    row.appendChild(urlTd);
    
    // Title
    const titleTd = createElement('td', { className: 'title-cell' });
    titleTd.textContent = link.title || '-';
    row.appendChild(titleTd);

    // Project
    const projectTd = createElement('td', { className: 'project-cell' });
    const project = this.config.projects.find(p => p.id === link.projectId);
    projectTd.textContent = project?.name || 'Unknown';
    row.appendChild(projectTd);
    
    // Click count
    const clicksTd = createElement('td', { className: 'clicks-cell' });
    clicksTd.textContent = (link.clickCount || 0).toString();
    row.appendChild(clicksTd);
    
    // Created date
    const dateTd = createElement('td');
    dateTd.textContent = new Date(link.createdAt).toLocaleDateString();
    row.appendChild(dateTd);
    
    // Actions
    const actionsTd = createElement('td', { className: 'actions-cell' });
    const actionsContainer = createElement('div', { className: 'table-actions' });
    
    // Edit button
    const editBtn = this.createButton('Edit', 'btn btn-sm btn-primary', () => {
      this.config.onEdit(link);
    });
    editBtn.setAttribute('title', 'Edit link');

    // Delete button
    const deleteBtn = this.createButton('Delete', 'btn btn-sm btn-danger', () => {
      this.config.onDelete(link);
    });
    deleteBtn.setAttribute('title', 'Delete link');

    // Copy button (functional)
    const copyBtn = this.createButton('Copy', 'btn btn-sm btn-secondary', async () => {
      const shortUrl = await generateShortUrl(link.shortCode || link.id);
      this.copyToClipboard(shortUrl);
    });
    copyBtn.setAttribute('title', 'Copy short link to clipboard');

    // Analytics button (placeholder for future functionality)
    const analyticsBtn = this.createButton('Analytics', 'btn btn-sm btn-outline-primary', () => {
      this.showInfo('Analytics feature coming soon! Track clicks, referrers, and more.');
    });
    analyticsBtn.setAttribute('title', 'View link analytics (coming soon)');

    actionsContainer.appendChild(editBtn);
    actionsContainer.appendChild(deleteBtn);
    actionsContainer.appendChild(copyBtn);
    actionsContainer.appendChild(analyticsBtn);
    actionsTd.appendChild(actionsContainer);
    row.appendChild(actionsTd);
    
    return row;
  }

  private async renderCards(container: HTMLElement): Promise<void> {
    const cardsGrid = createElement('div', { className: 'links-cards-grid' });

    // Create cards asynchronously to handle short URL generation
    for (const link of this.filteredLinks) {
      const card = await this.createLinkCard(link);
      cardsGrid.appendChild(card);
    }

    container.appendChild(cardsGrid);
  }

  private async createLinkCard(link: Link): Promise<HTMLElement> {
    const card = createElement('div', { 
      className: `link-card ${this.selection.selectedIds.has(link.id) ? 'selected' : ''}`
    });
    
    // Card header with checkbox and actions
    const cardHeader = createElement('div', { className: 'card-header' });
    
    const checkbox = createElement('input', {
      attributes: { type: 'checkbox', value: link.id }
    }) as HTMLInputElement;
    
    checkbox.checked = this.selection.selectedIds.has(link.id);
    checkbox.addEventListener('change', () => {
      this.toggleLinkSelection(link.id, checkbox.checked);
    });
    
    const actions = createElement('div', { className: 'card-actions' });

    // Edit button
    const editBtn = this.createButton('Edit', 'btn btn-sm btn-primary', () => {
      this.config.onEdit(link);
    });
    editBtn.setAttribute('title', 'Edit link');

    // Delete button
    const deleteBtn = this.createButton('Delete', 'btn btn-sm btn-danger', () => {
      this.config.onDelete(link);
    });
    deleteBtn.setAttribute('title', 'Delete link');

    // Copy button (functional)
    const copyBtn = this.createButton('Copy', 'btn btn-sm btn-secondary', async () => {
      const shortUrl = await generateShortUrl(link.shortCode || link.id);
      this.copyToClipboard(shortUrl);
    });
    copyBtn.setAttribute('title', 'Copy short link to clipboard');

    // Analytics button (placeholder for future functionality)
    const analyticsBtn = this.createButton('Analytics', 'btn btn-sm btn-outline-primary', () => {
      this.showInfo('Analytics feature coming soon! Track clicks, referrers, and more.');
    });
    analyticsBtn.setAttribute('title', 'View link analytics (coming soon)');

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(analyticsBtn);
    
    cardHeader.appendChild(checkbox);
    cardHeader.appendChild(actions);
    
    // Card content
    const cardContent = createElement('div', { className: 'card-content' });
    
    // Short code
    const shortCode = createElement('div', { className: 'card-short-code' });
    const shortUrl = await generateShortUrl(link.shortCode || link.id);
    const shortCodeLink = createElement('a', {
      textContent: link.shortCode || link.id,
      attributes: {
        href: shortUrl,
        target: '_blank'
      },
      className: 'short-link'
    });
    shortCode.appendChild(shortCodeLink);
    
    // Title
    const title = createElement('h4', { 
      textContent: link.title || 'Untitled Link',
      className: 'card-title'
    });
    
    // URL
    const url = createElement('p', { 
      textContent: this.truncateText(link.url, 60),
      className: 'card-url',
      attributes: { title: link.url }
    });
    
    // Meta info
    const meta = createElement('div', { className: 'card-meta' });
    const project = this.config.projects.find(p => p.id === link.projectId);
    const projectSpan = createElement('span', { 
      textContent: project?.name || 'Unknown Project',
      className: 'card-project'
    });
    const clicksSpan = createElement('span', { 
      textContent: `${link.clickCount || 0} clicks`,
      className: 'card-clicks'
    });
    const dateSpan = createElement('span', { 
      textContent: new Date(link.createdAt).toLocaleDateString(),
      className: 'card-date'
    });
    
    meta.appendChild(projectSpan);
    meta.appendChild(clicksSpan);
    meta.appendChild(dateSpan);
    
    cardContent.appendChild(shortCode);
    cardContent.appendChild(title);
    cardContent.appendChild(url);
    cardContent.appendChild(meta);
    
    card.appendChild(cardHeader);
    card.appendChild(cardContent);
    
    return card;
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  private async setViewMode(mode: 'table' | 'cards'): Promise<void> {
    this.viewMode = mode;

    // Update button states
    const buttons = querySelectorAll('.view-btn', this.container);
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if ((btn as HTMLElement).dataset.mode === mode) {
        btn.classList.add('active');
      }
    });

    await this.renderLinks();
  }

  private handleSort(field: string): void {
    if (this.sortState.field === field) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState.field = field;
      this.sortState.direction = 'desc';
    }
    
    this.loadLinks();
  }

  private toggleLinkSelection(linkId: string, selected: boolean): void {
    if (selected) {
      this.selection.selectedIds.add(linkId);
    } else {
      this.selection.selectedIds.delete(linkId);
    }
    
    this.updateSelectionState();
    this.updateBulkActionsBar();
    this.updateRowSelection();
  }

  private toggleSelectAll(selectAll: boolean): void {
    this.selection.selectedIds.clear();
    
    if (selectAll) {
      this.filteredLinks.forEach(link => {
        this.selection.selectedIds.add(link.id);
      });
    }
    
    this.updateSelectionState();
    this.updateBulkActionsBar();
    this.updateRowSelection();
  }

  private updateSelectionState(): void {
    const totalVisible = this.filteredLinks.length;
    const selectedCount = this.selection.selectedIds.size;
    
    this.selection.isAllSelected = selectedCount > 0 && selectedCount === totalVisible;
    this.selection.isIndeterminate = selectedCount > 0 && selectedCount < totalVisible;
    
    // Update master checkbox
    const masterCheckbox = querySelector('#select-all', this.container) as HTMLInputElement;
    if (masterCheckbox) {
      masterCheckbox.checked = this.selection.isAllSelected;
      masterCheckbox.indeterminate = this.selection.isIndeterminate;
    }
  }

  private updateBulkActionsBar(): void {
    const bar = querySelector('.bulk-actions-bar', this.container);
    const info = querySelector('.bulk-info', this.container);
    
    if (!bar || !info) return;
    
    const selectedCount = this.selection.selectedIds.size;
    
    if (selectedCount > 0) {
      bar.classList.remove('hidden');
      info.textContent = `${selectedCount} link${selectedCount === 1 ? '' : 's'} selected`;
    } else {
      bar.classList.add('hidden');
    }
  }

  private updateRowSelection(): void {
    // Update table rows
    const rows = querySelectorAll('tbody tr', this.container);
    rows.forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox) {
        const linkId = checkbox.value;
        const isSelected = this.selection.selectedIds.has(linkId);
        checkbox.checked = isSelected;
        row.classList.toggle('selected', isSelected);
      }
    });
    
    // Update cards
    const cards = querySelectorAll('.link-card', this.container);
    cards.forEach(card => {
      const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox) {
        const linkId = checkbox.value;
        const isSelected = this.selection.selectedIds.has(linkId);
        checkbox.checked = isSelected;
        card.classList.toggle('selected', isSelected);
      }
    });
  }

  private clearSelection(): void {
    this.selection.selectedIds.clear();
    this.updateSelectionState();
    this.updateBulkActionsBar();
    this.updateRowSelection();
  }

  private handleBulkDelete(): void {
    const selectedIds = Array.from(this.selection.selectedIds);
    if (selectedIds.length > 0) {
      this.config.onBulkDelete(selectedIds);
    }
  }

  private debounceSearch = this.debounce(() => {
    this.applyFilters();
  }, 300);

  private debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  protected showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('Link copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        this.showSuccess('Link copied to clipboard!');
      } catch (err) {
        this.showError('Failed to copy link to clipboard');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }

  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = createElement('div', {
      textContent: message,
      className: `notification ${type}`
    });

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // Public methods for external control
  public refresh(): void {
    this.loadLinks();
  }

  public getSelectedLinks(): string[] {
    return Array.from(this.selection.selectedIds);
  }

  public clearSelectionPublic(): void {
    this.clearSelection();
  }
}
