/**
 * GestureAgent - 手势识别智能体
 * 负责识别用户手势并转换为视觉控制指令
 */

class GestureAgent extends Agent {
  constructor(messageBus, gestureHandler) {
    super('GestureAgent', messageBus);
    this.gestureHandler = gestureHandler; // 外部手势识别器（MediaPipe）
    this.gestureHistory = [];
    this.maxHistorySize = 30;
    this.lastGestureTime = 0;
    this.gestureDebounceMs = 100; // 防抖时间
  }

  async init() {
    await super.init();
    
    // 订阅手势识别结果
    if (this.gestureHandler) {
      this.gestureHandler.onGestureDetected = (gestureData) => {
        this.processGesture(gestureData);
      };
    }
  }

  setupSubscriptions() {
    // 可以订阅其他智能体的消息来调整手势识别策略
    this.messageBus.subscribe('performance-alert', this);
  }

  /**
   * 处理手势数据
   */
  processGesture(gestureData) {
    const now = Date.now();
    
    // 防抖处理
    if (now - this.lastGestureTime < this.gestureDebounceMs) {
      return;
    }
    this.lastGestureTime = now;

    // 识别手势类型
    const gesture = this.identifyGesture(gestureData);
    
    // 计算手势强度
    const intensity = this.calculateIntensity(gestureData);
    
    // 计算方向
    const direction = this.calculateDirection(gestureData);
    
    // 预测用户意图（AI 增强）
    const prediction = this.predictIntent(gestureData);

    // 保存到历史记录
    this.gestureHistory.push({
      gesture,
      intensity,
      direction,
      timestamp: now
    });
    if (this.gestureHistory.length > this.maxHistorySize) {
      this.gestureHistory.shift();
    }

    // 更新状态
    this.setState({
      lastGesture: gesture,
      lastIntensity: intensity,
      lastDirection: direction,
      prediction: prediction
    });

    // 发布手势检测消息
    this.publish('gesture-detected', {
      gesture: gesture,
      intensity: intensity,
      direction: direction,
      confidence: this.calculateConfidence(gestureData),
      prediction: prediction,
      rawData: gestureData
    }, 'broadcast'); // 广播给所有智能体
  }

  /**
   * 识别手势类型
   */
  identifyGesture(gestureData) {
    if (!gestureData || !gestureData.landmarks) {
      return 'idle';
    }

    const landmarks = gestureData.landmarks;
    
    // 拇指和食指距离（捏合检测）
    const thumb = landmarks[4];
    const index = landmarks[8];
    const pinchDistance = Math.hypot(
      thumb.x - index.x,
      thumb.y - index.y,
      thumb.z - index.z
    );

    // 手部张开度
    const handOpenness = this.calculateHandOpenness(landmarks);

    // 手势识别逻辑
    if (pinchDistance < 0.05) {
      return 'pinch';
    } else if (handOpenness > 0.8) {
      return 'expand';
    } else if (handOpenness < 0.3) {
      return 'fist';
    } else {
      // 检测滑动
      const speed = this.calculateHandSpeed(landmarks);
      if (speed > 0.1) {
        return 'swipe';
      }
      return 'idle';
    }
  }

  /**
   * 计算手部张开度
   */
  calculateHandOpenness(landmarks) {
    // 使用多个关键点计算手部张开度
    const distances = [
      Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y),
      Math.hypot(landmarks[8].x - landmarks[12].x, landmarks[8].y - landmarks[12].y),
      Math.hypot(landmarks[12].x - landmarks[16].x, landmarks[12].y - landmarks[16].y),
      Math.hypot(landmarks[16].x - landmarks[20].x, landmarks[16].y - landmarks[20].y)
    ];
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    return Math.min(avgDistance * 10, 1.0);
  }

  /**
   * 计算手势强度
   */
  calculateIntensity(gestureData) {
    if (!gestureData.landmarks) return 0.5;
    
    const handOpenness = this.calculateHandOpenness(gestureData.landmarks);
    const speed = this.calculateHandSpeed(gestureData.landmarks);
    
    return Math.min((handOpenness + speed * 2) / 2, 1.0);
  }

  /**
   * 计算手部速度
   */
  calculateHandSpeed(landmarks) {
    if (this.gestureHistory.length < 2) return 0;
    
    const last = this.gestureHistory[this.gestureHistory.length - 1];
    const prev = this.gestureHistory[this.gestureHistory.length - 2];
    
    const dx = landmarks[0].x - (prev.rawData?.landmarks?.[0]?.x || landmarks[0].x);
    const dy = landmarks[0].y - (prev.rawData?.landmarks?.[0]?.y || landmarks[0].y);
    const dt = (Date.now() - prev.timestamp) / 1000;
    
    return Math.hypot(dx, dy) / (dt || 0.016);
  }

  /**
   * 计算方向
   */
  calculateDirection(gestureData) {
    if (!gestureData.landmarks) return [0, 0];
    
    const index = gestureData.landmarks[8];
    const wrist = gestureData.landmarks[0];
    
    return [
      (index.x - wrist.x) * 2,
      -(index.y - wrist.y) * 2 // Y轴翻转
    ];
  }

  /**
   * 预测用户意图（AI 增强）
   */
  predictIntent(gestureData) {
    // 基于历史记录预测
    if (this.gestureHistory.length < 3) {
      return 'unknown';
    }

    const recentGestures = this.gestureHistory.slice(-3).map(g => g.gesture);
    
    // 简单模式识别
    if (recentGestures.every(g => g === 'swipe')) {
      return 'user-wants-continuous-flow';
    } else if (recentGestures.includes('pinch') && recentGestures.includes('expand')) {
      return 'user-wants-resize';
    } else if (recentGestures.includes('fist')) {
      return 'user-wants-stop';
    }

    return 'unknown';
  }

  /**
   * 计算置信度
   */
  calculateConfidence(gestureData) {
    if (!gestureData.landmarks) return 0.5;
    
    // 基于关键点可见性计算置信度
    const visiblePoints = gestureData.landmarks.filter(p => p.visibility > 0.5).length;
    return visiblePoints / gestureData.landmarks.length;
  }

  /**
   * 处理其他智能体的消息
   */
  async onMessage(message) {
    if (message.type === 'performance-alert') {
      // 性能警告时，降低手势识别频率
      if (message.payload.fps < 30) {
        this.gestureDebounceMs = 200;
      } else {
        this.gestureDebounceMs = 100;
      }
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GestureAgent;
} else {
  window.GestureAgent = GestureAgent;
}

