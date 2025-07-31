import { BaseComponent } from './base-component.js';
import { AuthService } from '../services/auth-service.js';
import { createElement } from '../utils/dom-helpers.js';
import type { LoginRequest } from '../types/api.js';

export class LoginComponent extends BaseComponent {
  private authService: AuthService;
  private form: HTMLFormElement | null = null;

  constructor(container: HTMLElement, authService: AuthService) {
    super(container);
    this.authService = authService;
  }

  render(): void {
    this.checkDestroyed();
    this.clear();

    const loginContainer = createElement('div', {
      className: 'login-container'
    });

    // Logo
    const logo = createElement('img', {
      className: 'logo',
      attributes: {
        src: 'public/rowtfavicon.png',
        alt: 'Rowt Logo'
      }
    });

    // Title
    const title = createElement('h1', {
      textContent: 'Rowt Admin Dashboard'
    });

    // Create form
    this.form = createElement('form', {
      id: 'login-form'
    });

    // Email field
    const emailInput = this.createInput('email', 'Enter your email', 'admin@example.com', true);
    emailInput.name = 'email';
    const emailGroup = this.createFormGroup('Email:', emailInput, 'email');

    // Password field
    const passwordInput = this.createInput('password', 'Enter your password', '', true);
    passwordInput.name = 'password';
    const passwordGroup = this.createFormGroup('Password:', passwordInput, 'password');

    // Submit button
    const submitButton = this.createButton('Login', 'btn btn-primary');
    submitButton.type = 'submit';

    // Assemble form
    this.form.appendChild(emailGroup);
    this.form.appendChild(passwordGroup);
    this.form.appendChild(submitButton);

    // Add event listener
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    // Assemble login container
    loginContainer.appendChild(logo);
    loginContainer.appendChild(title);
    loginContainer.appendChild(this.form);

    this.container.appendChild(loginContainer);
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this.form) return;

    const formData = new FormData(this.form);
    const credentials: LoginRequest = {
      email: formData.get('email') as string,
      password: formData.get('password') as string
    };

    // Validate inputs
    if (!credentials.email || !credentials.password) {
      this.showError('Please fill in all fields');
      return;
    }

    if (!this.isValidEmail(credentials.email)) {
      this.showError('Please enter a valid email address');
      return;
    }

    try {
      this.setLoading(true);
      this.clearMessages();

      const user = await this.authService.login(credentials);
      
      this.showSuccess(`Welcome back, ${user.email}!`);
      
      // Emit login success event
      this.emit('login:success', user);
      
    } catch (error) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Invalid email or password.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.showError(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  focus(): void {
    const emailInput = this.container.querySelector('#email') as HTMLInputElement;
    if (emailInput) {
      emailInput.focus();
    }
  }
}
