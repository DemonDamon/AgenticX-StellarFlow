/**
 * PerformanceAgent - 性能优化智能体
 * 监控系统性能，自动优化渲染效果
 */

class PerformanceAgent extends Agent {
  constructor(messageBus) {
    super('PerformanceAgent', messageBus);
    this.state = {
      fps: 60,
      memoryUsage: 0,
      particleCount: 10000,
      shaderComplexity: 'high',
      lastCheckTime: Date.now()
    };

    this.fpsHistory = [];
    this.maxFpsHistory = 60; // 保存最近60帧的FPS
    this.checkInterval = 1000; // 每秒检查一次
    this.lastCheck = Date.now();
  }

  async init() {
    await super.init();
    this.startMonitoring();
  }

  /**
   * 开始性能监控
   */
  startMonitoring() {
    let lastTime = performance.now();
    let frameCount = 0;

    const checkPerformance = () => {
      if (!this.isActive) return;

      const now = performance.now();
      const delta = now - lastTime;
      frameCount++;

      // 每秒计算一次FPS
      if (delta >= 1000) {
        const fps = Math.round((frameCount * 1000) / delta);
        this.updateFPS(fps);
        
        // 检查内存使用（如果可用）
        if (performance.memory) {
          const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
          this.state.memoryUsage = memoryMB;
        }

        frameCount = 0;
        lastTime = now;
        this.checkAndOptimize();
      }

      requestAnimationFrame(checkPerformance);
    };

    requestAnimationFrame(checkPerformance);
  }

  /**
   * 更新FPS
   */
  updateFPS(fps) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }

    // 计算平均FPS
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    this.state.fps = Math.round(avgFPS);
    this.setState(this.state);
  }

  /**
   * 检查并优化性能
   */
  checkAndOptimize() {
    const fps = this.state.fps;
    let recommendation = 'ok';
    let action = {};

    if (fps < 30) {
      // 严重性能问题
      recommendation = 'reduce-particles';
      action = {
        particleCount: Math.max(5000, this.state.particleCount * 0.7),
        shaderComplexity: 'low'
      };
    } else if (fps < 45) {
      // 中等性能问题
      recommendation = 'simplify-shaders';
      action = {
        particleCount: Math.max(7000, this.state.particleCount * 0.85),
        shaderComplexity: 'medium'
      };
    } else if (fps < 50) {
      // 轻微性能问题
      recommendation = 'optimize';
      action = {
        particleCount: this.state.particleCount,
        shaderComplexity: 'medium'
      };
    } else {
      // 性能良好，可以尝试恢复
      if (this.state.particleCount < 10000) {
        recommendation = 'can-increase';
        action = {
          particleCount: Math.min(10000, this.state.particleCount * 1.1),
          shaderComplexity: 'high'
        };
      }
    }

    // 如果性能状态发生变化，发布警告
    if (recommendation !== 'ok' && recommendation !== 'can-increase') {
      this.publish('performance-alert', {
        fps: fps,
        memoryUsage: this.state.memoryUsage,
        recommendation: recommendation,
        action: action,
        timestamp: Date.now()
      }, 'broadcast');

      // 更新状态
      if (action.particleCount) {
        this.state.particleCount = action.particleCount;
      }
      if (action.shaderComplexity) {
        this.state.shaderComplexity = action.shaderComplexity;
      }
      this.setState(this.state);
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    return {
      fps: this.state.fps,
      avgFPS: this.fpsHistory.length > 0 
        ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
        : 60,
      minFPS: this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 60,
      maxFPS: this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 60,
      memoryUsage: this.state.memoryUsage,
      particleCount: this.state.particleCount,
      shaderComplexity: this.state.shaderComplexity
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceAgent;
} else {
  window.PerformanceAgent = PerformanceAgent;
}

