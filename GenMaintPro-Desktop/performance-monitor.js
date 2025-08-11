const { BrowserWindow } = require('electron'); // Added import

class PerformanceMonitor {
  static start() {
    setInterval(() => {
      const metrics = {
        memory: process.memoryUsage(),
        cpu: process.getCPUUsage(),
        uptime: process.uptime(),
        windowCount: BrowserWindow.getAllWindows().length // Now BrowserWindow is defined
      };
      this.saveMetrics(metrics);
    }, 5000);
  }

  static saveMetrics(metrics) {
    // Could send to analytics or save to DB
    console.log('Performance metrics:', metrics);
  }
}

module.exports = PerformanceMonitor;