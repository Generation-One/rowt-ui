import { EventEmitter } from '../utils/event-emitter.js';
import { createElement, clearElement } from '../utils/dom-helpers.js';

export abstract class BaseComponent extends EventEmitter {
  protected container: HTMLElement;
  protected isDestroyed: boolean = false;

  constructor(container: HTMLElement) {
    super();
    this.container = container;
  }

  abstract render(): void;

  protected createButton(
    text: string,
    className: string = 'btn',
    onClick?: (event: MouseEvent) => void
  ): HTMLButtonElement {
    const button = createElement('button', {
      textContent: text,
      className
    });

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    return button;
  }

  protected createIconButton(
    icon: string,
    className: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = createElement('button', {
      textContent: icon,
      className: className,
      attributes: { type: 'button' }
    }) as HTMLButtonElement;

    button.addEventListener('click', onClick);
    return button;
  }

  protected createInput(
    type: string,
    placeholder?: string,
    value?: string,
    required: boolean = false
  ): HTMLInputElement {
    const input = createElement('input', {
      className: 'form-control',
      attributes: {
        type,
        ...(placeholder && { placeholder }),
        ...(value && { value }),
        ...(required && { required: 'true' })
      }
    });

    return input;
  }

  protected createLabel(text: string, htmlFor?: string): HTMLLabelElement {
    const label = createElement('label', {
      className: 'form-label',
      textContent: text,
      ...(htmlFor && { attributes: { for: htmlFor } })
    });

    return label;
  }

  protected createHelpIcon(tooltipText: string): HTMLSpanElement {
    const helpIcon = createElement('span', {
      className: 'help-icon',
      textContent: '?'
    });

    const tooltip = createElement('div', {
      className: 'tooltip',
      textContent: tooltipText
    });

    // Add mouse events for dynamic positioning
    helpIcon.addEventListener('mouseenter', (e) => {
      const rect = helpIcon.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      // Position tooltip above the help icon
      let top = rect.top - tooltipRect.height - 8;
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

      // Adjust if tooltip would go off screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      if (top < 8) {
        // Show below if no room above
        top = rect.bottom + 8;
      }

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    });

    helpIcon.appendChild(tooltip);
    return helpIcon;
  }

  protected createFormGroup(
    label: string,
    input: HTMLInputElement,
    id?: string,
    helpText?: string
  ): HTMLDivElement {
    const group = createElement('div', { className: 'form-group' });

    if (id) {
      input.id = id;
    }

    const labelElement = this.createLabel(label, id);

    group.appendChild(labelElement);
    group.appendChild(input);

    // Add help text as description if provided
    if (helpText) {
      const description = createElement('small', {
        className: 'form-description',
        textContent: helpText
      });
      group.appendChild(description);
    }

    return group;
  }

  protected showError(message: string, container?: HTMLElement): void {
    const errorElement = createElement('div', {
      className: 'error',
      textContent: message
    });

    const target = container || this.container;
    
    // Remove existing error messages
    const existingErrors = target.querySelectorAll('.error');
    existingErrors.forEach(error => error.remove());
    
    target.appendChild(errorElement);
    
    // Auto-remove error after 5 seconds
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.remove();
      }
    }, 5000);
  }

  protected showSuccess(message: string, container?: HTMLElement): void {
    const successElement = createElement('div', {
      className: 'success',
      textContent: message
    });

    const target = container || this.container;
    
    // Remove existing success messages
    const existingSuccess = target.querySelectorAll('.success');
    existingSuccess.forEach(success => success.remove());
    
    target.appendChild(successElement);
    
    // Auto-remove success message after 3 seconds
    setTimeout(() => {
      if (successElement.parentNode) {
        successElement.remove();
      }
    }, 3000);
  }

  protected showInfo(message: string, container?: HTMLElement): void {
    const infoElement = createElement('div', {
      className: 'info',
      textContent: message
    });

    const target = container || this.container;

    // Remove existing info messages
    const existingInfo = target.querySelectorAll('.info');
    existingInfo.forEach(info => info.remove());

    target.appendChild(infoElement);

    // Auto-remove info message after 4 seconds
    setTimeout(() => {
      if (infoElement.parentNode) {
        infoElement.remove();
      }
    }, 4000);
  }

  protected clearMessages(): void {
    const messages = this.container.querySelectorAll('.error, .success, .info');
    messages.forEach(message => message.remove());
  }

  protected setLoading(isLoading: boolean, element?: HTMLElement): void {
    const target = element || this.container;
    
    if (isLoading) {
      target.classList.add('loading');
      
      // Disable all buttons and inputs
      const interactiveElements = target.querySelectorAll('button, input, select, textarea');
      interactiveElements.forEach(el => {
        (el as HTMLElement).setAttribute('disabled', 'true');
      });
    } else {
      target.classList.remove('loading');
      
      // Re-enable all buttons and inputs
      const interactiveElements = target.querySelectorAll('button, input, select, textarea');
      interactiveElements.forEach(el => {
        (el as HTMLElement).removeAttribute('disabled');
      });
    }
  }

  protected clear(): void {
    clearElement(this.container);
  }

  destroy(): void {
    if (this.isDestroyed) return;
    
    this.removeAllListeners();
    this.clear();
    this.isDestroyed = true;
  }

  protected checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('Component has been destroyed');
    }
  }
}
