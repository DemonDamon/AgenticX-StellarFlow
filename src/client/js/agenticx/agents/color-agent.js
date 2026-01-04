/**
 * ColorAgent - 色彩控制智能体
 * 负责智能控制粒子色彩、光晕、渐变效果
 */

class ColorAgent extends Agent {
  constructor(messageBus) {
    super('ColorAgent', messageBus);
    this.state = {
      hue: 0.6,
      saturation: 0.8,
      lightness: 0.6,
      theme: 'cosmic',
      transitionDuration: 1000
    };
    
    // 主题配色方案
    this.themes = {
      cosmic: { hue: 0.6, saturation: 0.8, lightness: 0.6 }, // 蓝紫色
      ocean: { hue: 0.55, saturation: 0.9, lightness: 0.5 },   // 海洋蓝
      fire: { hue: 0.05, saturation: 1.0, lightness: 0.6 },    // 火焰红
      ice: { hue: 0.5, saturation: 0.7, lightness: 0.8 },      // 冰蓝色
      sunset: { hue: 0.1, saturation: 0.9, lightness: 0.7 }   // 日落橙
    };
  }

  setupSubscriptions() {
    // 订阅手势检测
    this.messageBus.subscribe('gesture-detected', this);
    // 订阅时间变化（可以用于根据时间调整色彩）
    this.messageBus.subscribe('time-update', this);
  }

  /**
   * 处理消息
   */
  async onMessage(message) {
    if (message.type === 'gesture-detected') {
      await this.handleGesture(message.payload);
    } else if (message.type === 'time-update') {
      await this.handleTimeUpdate(message.payload);
    }
  }

  /**
   * 根据手势调整色彩
   */
  async handleGesture(gestureData) {
    const { gesture, intensity } = gestureData;
    let newTheme = this.state.theme;
    let newHue = this.state.hue;

    switch (gesture) {
      case 'swipe':
        // 滑动：蓝紫色调
        newHue = 0.75;
        newTheme = 'cosmic';
        break;

      case 'pinch':
        // 捏合：收缩时变暗
        newHue = 0.3;
        newTheme = 'cosmic';
        break;

      case 'expand':
        // 张开：延展时变亮
        newHue = 0.55;
        newTheme = 'ocean';
        break;

      case 'fist':
        // 拳头：停止时变红
        newHue = 0.15;
        newTheme = 'fire';
        break;

      default:
        // 默认：根据强度调整
        newHue = 0.6 + intensity * 0.2;
        break;
    }

    // 平滑过渡
    this.transitionToColor(newHue, newTheme, 500);
  }

  /**
   * 根据时间调整色彩（AI 增强）
   */
  async handleTimeUpdate(timeData) {
    const hour = new Date().getHours();
    
    // 根据时间自动调整主题
    if (hour >= 6 && hour < 12) {
      // 早晨：清新色调
      this.transitionToTheme('ocean', 2000);
    } else if (hour >= 12 && hour < 18) {
      // 下午：明亮色调
      this.transitionToTheme('sunset', 2000);
    } else if (hour >= 18 && hour < 22) {
      // 傍晚：温暖色调
      this.transitionToTheme('fire', 2000);
    } else {
      // 夜晚：深色宇宙色调
      this.transitionToTheme('cosmic', 2000);
    }
  }

  /**
   * 过渡到指定颜色
   */
  transitionToColor(hue, theme, duration = 1000) {
    const targetTheme = this.themes[theme] || this.themes.cosmic;
    
    this.state.hue = hue;
    this.state.theme = theme;
    this.state.saturation = targetTheme.saturation;
    this.state.lightness = targetTheme.lightness;
    this.state.transitionDuration = duration;

    this.setState(this.state);

    // 发布色彩更新消息
    this.publish('color-update', {
      ...this.state,
      timestamp: Date.now()
    }, 'broadcast');
  }

  /**
   * 过渡到指定主题
   */
  transitionToTheme(theme, duration = 1000) {
    const targetTheme = this.themes[theme];
    if (!targetTheme) return;

    this.transitionToColor(targetTheme.hue, theme, duration);
  }

  /**
   * 生成随机创意配色（AI 增强）
   */
  generateCreativePalette() {
    const themes = Object.keys(this.themes);
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const variation = (Math.random() - 0.5) * 0.2; // ±0.1 的色相变化
    
    const theme = this.themes[randomTheme];
    this.transitionToColor(theme.hue + variation, randomTheme, 1500);
  }

  /**
   * 获取当前颜色值（HSL）
   */
  getCurrentColor() {
    return {
      h: this.state.hue,
      s: this.state.saturation,
      l: this.state.lightness
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ColorAgent;
} else {
  window.ColorAgent = ColorAgent;
}

