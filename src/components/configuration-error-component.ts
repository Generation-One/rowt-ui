/**
 * Configuration Error Component
 * 
 * Displays user-friendly error messages when the required API endpoint
 * configuration is missing or invalid.
 */

import { BaseComponent } from './base-component.js';
import { createElement } from '../utils/dom-helpers.js';
import type { ConfigurationError } from '../config/app-config.js';

export interface ConfigurationErrorComponentConfig {
  error: ConfigurationError;
  onRetry?: () => void;
  onConfigure?: () => void;
}

export class ConfigurationErrorComponent extends BaseComponent {
  private config: ConfigurationErrorComponentConfig;

  constructor(container: HTMLElement, config: ConfigurationErrorComponentConfig) {
    super(container);
    this.config = config;
    this.render();
  }

  render(): void {
    this.container.innerHTML = '';
    this.container.className = 'configuration-error-screen';

    const errorContainer = createElement('div', { className: 'error-container' });

    // Error icon
    const icon = createElement('div', { 
      className: 'error-icon',
      innerHTML: '⚙️'
    });

    // Title
    const title = createElement('h1', {
      textContent: 'Configuration Required',
      className: 'error-title'
    });

    // Main message
    const message = createElement('p', {
      textContent: 'The Rowt Dashboard requires an API endpoint to be configured before it can function.',
      className: 'error-message'
    });

    // Technical details
    const details = createElement('div', { className: 'error-details' });
    const detailsTitle = createElement('h3', {
      textContent: 'Missing Configuration:',
      className: 'details-title'
    });
    
    const missingList = createElement('ul', { className: 'missing-list' });
    this.config.error.missingKeys.forEach(key => {
      const listItem = createElement('li', {
        textContent: key,
        className: 'missing-item'
      });
      missingList.appendChild(listItem);
    });

    details.appendChild(detailsTitle);
    details.appendChild(missingList);

    // Configuration instructions
    const instructions = createElement('div', { className: 'configuration-instructions' });
    const instructionsTitle = createElement('h3', {
      textContent: 'How to Configure:',
      className: 'instructions-title'
    });

    const instructionsList = createElement('div', { className: 'instructions-content' });
    
    // Method 1: Environment Variable
    const method1 = createElement('div', { className: 'config-method' });
    const method1Title = createElement('h4', {
      textContent: '1. Environment Variable (Recommended)',
      className: 'method-title'
    });
    const method1Code = createElement('code', {
      textContent: 'ROWT_API_ENDPOINT=https://your-rowt-server.com',
      className: 'config-code'
    });
    const method1Desc = createElement('p', {
      textContent: 'Set this environment variable before building or starting your application.',
      className: 'method-description'
    });
    
    method1.appendChild(method1Title);
    method1.appendChild(method1Code);
    method1.appendChild(method1Desc);

    // Method 2: Window Global
    const method2 = createElement('div', { className: 'config-method' });
    const method2Title = createElement('h4', {
      textContent: '2. Runtime Configuration',
      className: 'method-title'
    });
    const method2Code = createElement('code', {
      textContent: 'window.ROWT_API_ENDPOINT = "https://your-rowt-server.com";',
      className: 'config-code'
    });
    const method2Desc = createElement('p', {
      textContent: 'Add this to your HTML file before loading the application.',
      className: 'method-description'
    });
    
    method2.appendChild(method2Title);
    method2.appendChild(method2Code);
    method2.appendChild(method2Desc);

    // Method 3: Local Storage (for development)
    const method3 = createElement('div', { className: 'config-method' });
    const method3Title = createElement('h4', {
      textContent: '3. Local Storage (Development Only)',
      className: 'method-title'
    });
    const method3Desc = createElement('p', {
      textContent: 'You can temporarily set the API endpoint in your browser\'s local storage:',
      className: 'method-description'
    });
    const method3Code = createElement('code', {
      textContent: 'localStorage.setItem("rowt_api_endpoint", "https://your-rowt-server.com");',
      className: 'config-code'
    });
    
    method3.appendChild(method3Title);
    method3.appendChild(method3Desc);
    method3.appendChild(method3Code);

    instructionsList.appendChild(method1);
    instructionsList.appendChild(method2);
    instructionsList.appendChild(method3);

    instructions.appendChild(instructionsTitle);
    instructions.appendChild(instructionsList);

    // Action buttons
    const actions = createElement('div', { className: 'error-actions' });
    
    const retryButton = createElement('button', {
      textContent: 'Retry',
      className: 'btn btn-primary'
    });
    retryButton.addEventListener('click', () => {
      if (this.config.onRetry) {
        this.config.onRetry();
      } else {
        window.location.reload();
      }
    });

    const configureButton = createElement('button', {
      textContent: 'Configure Now',
      className: 'btn btn-secondary'
    });
    configureButton.addEventListener('click', () => {
      if (this.config.onConfigure) {
        this.config.onConfigure();
      } else {
        this.showConfigurationModal();
      }
    });

    actions.appendChild(configureButton);
    actions.appendChild(retryButton);

    // Assemble the error container
    errorContainer.appendChild(icon);
    errorContainer.appendChild(title);
    errorContainer.appendChild(message);
    errorContainer.appendChild(details);
    errorContainer.appendChild(instructions);
    errorContainer.appendChild(actions);

    this.container.appendChild(errorContainer);
  }

  private showConfigurationModal(): void {
    const modal = createElement('div', { className: 'config-modal-overlay' });
    const modalContent = createElement('div', { className: 'config-modal' });
    
    const modalTitle = createElement('h2', {
      textContent: 'Configure API Endpoint',
      className: 'modal-title'
    });

    const form = createElement('form', { className: 'config-form' });
    
    const inputGroup = createElement('div', { className: 'input-group' });
    const label = createElement('label', {
      textContent: 'API Endpoint URL:',
      className: 'input-label'
    });
    const input = createElement('input', {
      attributes: {
        type: 'url',
        placeholder: 'https://your-rowt-server.com',
        required: 'true'
      },
      className: 'config-input'
    }) as HTMLInputElement;

    const helpText = createElement('p', {
      textContent: 'Enter the URL of your Rowt server (e.g., https://api.rowt.io)',
      className: 'help-text'
    });

    inputGroup.appendChild(label);
    inputGroup.appendChild(input);
    inputGroup.appendChild(helpText);

    const buttonGroup = createElement('div', { className: 'button-group' });
    const cancelButton = createElement('button', {
      textContent: 'Cancel',
      className: 'btn btn-secondary',
      attributes: { type: 'button' }
    });
    const saveButton = createElement('button', {
      textContent: 'Save & Retry',
      className: 'btn btn-primary',
      attributes: { type: 'submit' }
    });

    buttonGroup.appendChild(cancelButton);
    buttonGroup.appendChild(saveButton);

    form.appendChild(inputGroup);
    form.appendChild(buttonGroup);

    modalContent.appendChild(modalTitle);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    // Event handlers
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const endpoint = input.value.trim();
      if (endpoint) {
        localStorage.setItem('rowt_api_endpoint', endpoint);
        document.body.removeChild(modal);
        window.location.reload();
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    document.body.appendChild(modal);
    input.focus();
  }

  updateError(error: ConfigurationError): void {
    this.config.error = error;
    this.render();
  }
}
