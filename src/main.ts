import { App } from './app.js';

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Initialize and start the application
const app = new App();

// Make app available globally for debugging
(window as any).rowtApp = app;

// Start the application
app.init().catch(error => {
  console.error('Failed to initialize app:', error);
  
  // Show a basic error message if the app fails to start
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 400px;
      ">
        <h1 style="color: #dc3545; margin-bottom: 20px;">Application Error</h1>
        <p style="color: #666; margin-bottom: 20px;">
          Failed to initialize the Rowt Dashboard. Please check the console for more details.
        </p>
        <button onclick="window.location.reload()" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
        ">
          Reload Page
        </button>
      </div>
    </div>
  `;
});

export { App };
