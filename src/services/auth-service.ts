import type { LoginRequest, User } from '../types/api.js';
import { getRowtSDK, RowtSDKError } from './rowt-sdk-service.js';
import { EventEmitter } from '../utils/event-emitter.js';

export class AuthService extends EventEmitter {
  private currentUser: User | null = null;
  private sdkService = getRowtSDK();

  constructor() {
    super();
  }

  async login(credentials: LoginRequest): Promise<User> {
    try {
      // Ensure SDK is initialized
      await this.sdkService.initialize();

      // Login returns the user directly
      this.currentUser = await this.sdkService.login(credentials);

      this.emit('auth:login', this.currentUser);
      return this.currentUser;
    } catch (error) {
      if (error instanceof RowtSDKError) {
        this.emit('auth:error', error);
        throw new Error(error.message);
      }
      this.emit('auth:error', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    console.log('🔍 AuthService: Logout called');
    try {
      if (this.sdkService.isReady()) {
        console.log('🔍 AuthService: Calling SDK logout...');
        await this.sdkService.logout();
      }
    } catch (error) {
      console.warn('❌ AuthService: Logout API call failed:', error);
    } finally {
      console.log('🔍 AuthService: Clearing user and emitting logout event');
      this.currentUser = null;
      this.emit('auth:logout');
    }
  }

  async checkAuthStatus(): Promise<boolean> {
    console.log('🔍 AuthService: Starting auth check...');
    try {
      // Initialize SDK if not already done
      console.log('🔍 AuthService: Initializing SDK...');
      await this.sdkService.initialize();

      // Try to get current user to verify authentication with timeout
      console.log('🔍 AuthService: Getting current user...');

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 5000);
      });

      this.currentUser = await Promise.race([
        this.sdkService.getCurrentUser(),
        timeoutPromise
      ]) as any;

      if (this.currentUser) {
        console.log('✅ AuthService: User authenticated:', this.currentUser.email);
      } else {
        console.log('✅ AuthService: User authenticated');
      }
      this.emit('auth:restored', this.currentUser);
      return true;
    } catch (error) {
      console.log('❌ AuthService: Auth check failed:', error);
      console.log('🔍 AuthService: Calling logout...');
      await this.logout();
      console.log('🔍 AuthService: Returning false');
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && this.sdkService.isReady();
  }
}
