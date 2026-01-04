/**
 * AgenticX 多智能体系统核心框架
 * 提供消息总线、智能体基类、状态管理
 */

/**
 * 消息总线 - 智能体间通信的核心
 */
class MessageBus {
  constructor() {
    this.subscribers = new Map(); // 消息类型 -> 智能体列表
    this.messageQueue = []; // 消息队列
    this.isProcessing = false;
  }

  /**
   * 订阅消息类型
   * @param {string} messageType - 消息类型
   * @param {Agent} agent - 订阅的智能体
   */
  subscribe(messageType, agent) {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, []);
    }
    this.subscribers.get(messageType).push(agent);
  }

  /**
   * 取消订阅
   */
  unsubscribe(messageType, agent) {
    if (this.subscribers.has(messageType)) {
      const agents = this.subscribers.get(messageType);
      const index = agents.indexOf(agent);
      if (index > -1) {
        agents.splice(index, 1);
      }
    }
  }

  /**
   * 发布消息
   * @param {Object} message - 消息对象
   */
  publish(message) {
    message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    message.timestamp = Date.now();
    
    this.messageQueue.push(message);
    this.processQueue();
  }

  /**
   * 处理消息队列
   */
  async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      await this.dispatch(message);
    }

    this.isProcessing = false;
  }

  /**
   * 分发消息到订阅者
   */
  async dispatch(message) {
    const subscribers = this.subscribers.get(message.type) || [];
    const broadcastSubscribers = this.subscribers.get('broadcast') || [];

    // 发送给特定订阅者
    for (const agent of subscribers) {
      if (message.to === 'broadcast' || message.to === agent.name || !message.to) {
        try {
          await agent.onMessage(message);
        } catch (error) {
          console.error(`[MessageBus] 智能体 ${agent.name} 处理消息失败:`, error);
        }
      }
    }

    // 发送给广播订阅者
    for (const agent of broadcastSubscribers) {
      if (agent.name !== message.from) {
        try {
          await agent.onMessage(message);
        } catch (error) {
          console.error(`[MessageBus] 智能体 ${agent.name} 处理广播消息失败:`, error);
        }
      }
    }
  }
}

/**
 * 智能体基类
 */
class Agent {
  constructor(name, messageBus) {
    this.name = name;
    this.messageBus = messageBus;
    this.state = {};
    this.isActive = false;
  }

  /**
   * 初始化智能体
   */
  async init() {
    this.isActive = true;
    this.setupSubscriptions();
    console.log(`[${this.name}] 智能体已启动`);
  }

  /**
   * 设置消息订阅（子类实现）
   */
  setupSubscriptions() {
    // 子类重写此方法
  }

  /**
   * 处理接收到的消息（子类实现）
   */
  async onMessage(message) {
    // 子类重写此方法
  }

  /**
   * 发布消息
   */
  publish(messageType, payload, to = null) {
    this.messageBus.publish({
      from: this.name,
      to: to,
      type: messageType,
      payload: payload
    });
  }

  /**
   * 获取当前状态
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 设置状态
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  /**
   * 停止智能体
   */
  stop() {
    this.isActive = false;
    console.log(`[${this.name}] 智能体已停止`);
  }
}

/**
 * 状态管理器
 */
class StateManager {
  constructor() {
    this.agents = new Map();
    this.stateHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * 注册智能体
   */
  registerAgent(agent) {
    this.agents.set(agent.name, agent);
  }

  /**
   * 保存当前所有智能体状态
   */
  saveState() {
    const state = {};
    for (const [name, agent] of this.agents) {
      state[name] = agent.getState();
    }

    this.stateHistory.push({
      timestamp: Date.now(),
      state: state
    });

    // 限制历史记录数量
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    return state;
  }

  /**
   * 恢复状态
   */
  restoreState(state) {
    for (const [name, agentState] of Object.entries(state)) {
      const agent = this.agents.get(name);
      if (agent) {
        agent.setState(agentState);
      }
    }
  }

  /**
   * 获取状态快照
   */
  getSnapshot() {
    return this.saveState();
  }
}

/**
 * AgenticX 主类
 */
class AgenticX {
  constructor(options = {}) {
    this.options = {
      enableAI: options.enableAI !== false,
      enableLearning: options.enableLearning !== false,
      ...options
    };

    this.messageBus = new MessageBus();
    this.stateManager = new StateManager();
    this.agents = new Map();
    this.isRunning = false;
  }

  /**
   * 注册智能体
   */
  registerAgent(agent) {
    agent.messageBus = this.messageBus;
    this.agents.set(agent.name, agent);
    this.stateManager.registerAgent(agent);
    console.log(`[AgenticX] 注册智能体: ${agent.name}`);
  }

  /**
   * 启动所有智能体
   */
  async start() {
    if (this.isRunning) {
      console.warn('[AgenticX] 系统已在运行');
      return;
    }

    console.log('[AgenticX] 启动多智能体系统...');

    // 初始化所有智能体
    for (const agent of this.agents.values()) {
      await agent.init();
    }

    this.isRunning = true;
    console.log('[AgenticX] 系统启动完成');
  }

  /**
   * 停止所有智能体
   */
  async stop() {
    for (const agent of this.agents.values()) {
      agent.stop();
    }
    this.isRunning = false;
    console.log('[AgenticX] 系统已停止');
  }

  /**
   * 获取智能体
   */
  getAgent(name) {
    return this.agents.get(name);
  }

  /**
   * 获取状态快照
   */
  getStateSnapshot() {
    return this.stateManager.getSnapshot();
  }

  /**
   * 恢复状态
   */
  restoreState(state) {
    this.stateManager.restoreState(state);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AgenticX, Agent, MessageBus, StateManager };
} else {
  window.AgenticX = AgenticX;
  window.Agent = Agent;
  window.MessageBus = MessageBus;
  window.StateManager = StateManager;
}

