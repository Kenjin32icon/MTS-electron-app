// FileName: /error-boundary.js
class ErrorBoundary {
  static init() {
    window.addEventListener('error', (event) => {
      ErrorBoundary.handleError(event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
      ErrorBoundary.handleError(event.reason);
    });
  }

  static handleError(error) {
    console.error('Application error:', error);
    document.body.innerHTML = `
      <div class="error-boundary">
        <h2>Something went wrong</h2>
        <p>${error.message}</p>
        <button onclick="location.reload()">Reload App</button>
      </div>
    `;
  }
}

module.exports = ErrorBoundary;
