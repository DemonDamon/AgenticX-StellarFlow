/**
 * ParticleFlowAgent - 粒子流动智能体
 * 负责控制粒子系统的流动、收缩、延展效果
 */

class ParticleFlowAgent extends Agent {
  constructor(messageBus) {
    super('ParticleFlowAgent', messageBus);
    this.state = {
      direction: [0, 0, 0],
      expansion: 1.0,
      focus: 0.0,
      warpSpeed: 0.0,
      momentum: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      targetPosition: { x: 0, y: 0, z: 0 },
      currentPosition: { x: 0, y: 0, z: 0 }
    };
  }

  setupSubscriptions() {
    // 订阅手势检测消息
    this.messageBus.subscribe('gesture-detected', this);
    // 订阅性能警告
    this.messageBus.subscribe('performance-alert', this);
  }

  /**
   * 处理消息
   */
  async onMessage(message) {
    if (message.type === 'gesture-detected') {
      await this.handleGesture(message.payload);
    } else if (message.type === 'performance-alert') {
      await this.handlePerformanceAlert(message.payload);
    }
  }

  /**
   * 处理手势指令
   */
  async handleGesture(gestureData) {
    const { gesture, intensity, direction, prediction } = gestureData;

    switch (gesture) {
      case 'swipe':
        // 滑动：设置流动方向
        this.state.momentum.x = direction[0] * intensity * 0.5;
        this.state.momentum.y = direction[1] * intensity * 0.5;
        this.state.angularVelocity.y = direction[0] * intensity * 0.3;
        this.state.angularVelocity.x = -direction[1] * intensity * 0.3;
        break;

      case 'pinch':
        // 捏合：收缩粒子
        this.state.expansion = Math.max(0.5, this.state.expansion - 0.1);
        this.state.focus = Math.min(1.0, this.state.focus + 0.1);
        break;

      case 'expand':
        // 张开：延展粒子
        this.state.expansion = Math.min(3.0, this.state.expansion + 0.1);
        this.state.focus = Math.max(0, this.state.focus - 0.1);
        break;

      case 'fist':
        // 拳头：停止运动
        this.state.momentum = { x: 0, y: 0, z: 0 };
        this.state.angularVelocity = { x: 0, y: 0, z: 0 };
        break;

      case 'idle':
      default:
        // 空闲：逐渐衰减
        this.state.momentum.x *= 0.98;
        this.state.momentum.y *= 0.98;
        this.state.momentum.z *= 0.98;
        this.state.angularVelocity.x *= 0.97;
        this.state.angularVelocity.y *= 0.97;
        this.state.angularVelocity.z *= 0.97;
        break;
    }

    // AI 预测增强
    if (prediction === 'user-wants-continuous-flow') {
      // 用户想要连续流动，增强动量
      this.state.momentum.x *= 1.2;
      this.state.momentum.y *= 1.2;
    } else if (prediction === 'user-wants-resize') {
      // 用户想要调整大小，平滑过渡
      this.state.expansion = lerp(this.state.expansion, 1.5, 0.1);
    }

    // 更新状态
    this.setState(this.state);

    // 发布粒子更新消息
    this.publish('particle-update', {
      ...this.state,
      timestamp: Date.now()
    }, 'broadcast');
  }

  /**
   * 处理性能警告
   */
  async handlePerformanceAlert(alertData) {
    if (alertData.recommendation === 'reduce-particles') {
      // 性能不足时，降低粒子运动复杂度
      this.state.momentum.x *= 0.8;
      this.state.momentum.y *= 0.8;
      this.state.warpSpeed *= 0.5;
    }
  }

  /**
   * 更新动画帧
   */
  update(deltaTime = 0.016) {
    // 应用阻尼
    this.state.momentum.x *= 0.98;
    this.state.momentum.y *= 0.98;
    this.state.momentum.z *= 0.98;
    this.state.angularVelocity.x *= 0.97;
    this.state.angularVelocity.y *= 0.97;
    this.state.angularVelocity.z *= 0.97;

    // 平滑位置过渡
    this.state.currentPosition.x = lerp(
      this.state.currentPosition.x,
      this.state.targetPosition.x,
      0.05
    );
    this.state.currentPosition.y = lerp(
      this.state.currentPosition.y,
      this.state.targetPosition.y,
      0.05
    );

    // 平滑扩展过渡
    this.state.expansion = lerp(this.state.expansion, 1.0, 0.02);
    this.state.focus = lerp(this.state.focus, 0, 0.02);
    this.state.warpSpeed = lerp(this.state.warpSpeed, 0, 0.01);

    // 更新状态
    this.setState(this.state);
  }
}

// 辅助函数
function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParticleFlowAgent;
} else {
  window.ParticleFlowAgent = ParticleFlowAgent;
}

