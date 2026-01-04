/**
 * AgenticX 前端客户端
 * 通过 HTTP API 和 WebSocket 与 Python AgenticX 后端通信
 */

class AgenticXClient {
  constructor(apiBaseUrl = 'http://localhost:8001', wsUrl = 'ws://localhost:8001/ws') {
    this.apiBaseUrl = apiBaseUrl;
    this.wsUrl = wsUrl;
    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
  }

  /**
   * 初始化 WebSocket 连接
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('[AgenticX] WebSocket 连接已建立');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[AgenticX] 消息解析失败:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('[AgenticX] WebSocket 错误:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('[AgenticX] WebSocket 连接已断开');
          // 自动重连
          setTimeout(() => {
            if (!this.isConnected) {
              this.connectWebSocket();
            }
          }, 3000);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理收到的消息
   */
  handleMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  /**
   * 注册消息处理器
   */
  onMessageType(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 发送 WebSocket 消息
   */
  sendWebSocketMessage(data) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[AgenticX] WebSocket 未连接，无法发送消息');
    }
  }

  /**
   * HTTP API 请求
   */
  async apiRequest(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[AgenticX] API 请求失败 (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * 分析手势
   */
  async analyzeGesture(landmarks, palmCenter, currentPos, prevPos) {
    return await this.apiRequest('/api/gesture/analyze', 'POST', {
      landmarks: landmarks,
      palm_center: palmCenter,
      current_pos: currentPos,
      prev_pos: prevPos
    });
  }

  /**
   * 更新粒子状态
   */
  async updateParticle(gesture, intensity, direction) {
    return await this.apiRequest('/api/particle/update', 'POST', {
      gesture: gesture,
      intensity: intensity,
      direction: direction
    });
  }

  /**
   * 改变色彩主题
   */
  async changeColor(theme = null, hue = null) {
    return await this.apiRequest('/api/color/change', 'POST', {
      theme: theme,
      hue: hue
    });
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport() {
    return await this.apiRequest('/api/performance/report', 'GET');
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

// 创建全局实例
let agenticxClient = null;

/**
 * 初始化 AgenticX 客户端
 */
async function initAgenticXClient(apiBaseUrl = 'http://localhost:8001', wsUrl = 'ws://localhost:8001/ws') {
  if (!agenticxClient) {
    agenticxClient = new AgenticXClient(apiBaseUrl, wsUrl);
    
    // 尝试连接 WebSocket
    try {
      await agenticxClient.connectWebSocket();
    } catch (error) {
      console.warn('[AgenticX] WebSocket 连接失败，将使用 HTTP API:', error);
    }
  }
  
  return agenticxClient;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AgenticXClient, initAgenticXClient };
} else {
  window.AgenticXClient = AgenticXClient;
  window.initAgenticXClient = initAgenticXClient;
}

