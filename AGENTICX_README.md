# AgenticX 多智能体系统使用指南

## 概述

**AgenticX** 是一个多智能体协作系统，通过多个专门的 AI 智能体协同工作，实现智能化的动态壁纸效果控制。每个智能体负责不同的视觉模块，通过消息传递和状态共享实现协作。

## 架构特点

- ✅ **模块化智能体**：每个智能体专注单一职责
- ✅ **协作式决策**：智能体之间通过消息总线通信
- ✅ **自适应学习**：智能体根据用户行为和系统状态自动调整
- ✅ **分布式控制**：支持多设备间的智能体协作

## 已实现的智能体

### 1. GestureAgent（手势识别智能体）
- 识别用户手势（滑动、捏合、旋转、停止等）
- 计算手势强度和方向
- 预测用户意图（AI 增强）

### 2. ParticleFlowAgent（粒子流动智能体）
- 控制粒子系统的流动、收缩、延展效果
- 模拟物理效果（惯性、阻尼、弹性）
- 根据手势指令生成自然运动轨迹

### 3. ColorAgent（色彩控制智能体）
- 智能控制粒子色彩、光晕、渐变效果
- 根据手势类型自动切换色彩主题
- 根据时间（白天/夜晚）自动调整色彩

### 4. PerformanceAgent（性能优化智能体）
- 实时监控 FPS、内存占用
- 自动触发性能降级
- 优化粒子数量和着色器复杂度

## 快速开始

### 1. 文件结构

```
src/client/js/
├── agenticx/
│   ├── core.js                    # 核心框架（消息总线、智能体基类）
│   ├── integration.js            # 集成文件
│   └── agents/
│       ├── gesture-agent.js       # 手势识别智能体
│       ├── particle-flow-agent.js # 粒子流动智能体
│       ├── color-agent.js         # 色彩控制智能体
│       └── performance-agent.js    # 性能优化智能体
```

### 2. 自动集成

AgenticX 系统已自动集成到项目中，无需手动配置。系统会在页面加载时自动启动。

### 3. 使用方式

#### 基础使用（已自动集成）

系统会自动工作，无需额外代码。手势识别 → 智能体处理 → 视觉效果

#### 高级使用（自定义）

```javascript
// 获取 AgenticX 实例
const agenticx = window.agenticx;

// 获取特定智能体
const colorAgent = agenticx.getAgent('ColorAgent');
const particleFlowAgent = agenticx.getAgent('ParticleFlowAgent');

// 手动触发色彩变化
colorAgent.transitionToTheme('fire', 2000); // 切换到火焰主题，2秒过渡

// 获取性能报告
const performanceAgent = agenticx.getAgent('PerformanceAgent');
const report = performanceAgent.getPerformanceReport();
console.log('FPS:', report.fps);
console.log('平均FPS:', report.avgFPS);

// 获取状态快照
const snapshot = agenticx.getStateSnapshot();
console.log('当前所有智能体状态:', snapshot);
```

## 智能体消息系统

### 消息类型

| 消息类型 | 发送者 | 接收者 | 说明 |
|---------|--------|--------|------|
| `gesture-detected` | GestureAgent | 所有智能体 | 手势检测结果 |
| `particle-update` | ParticleFlowAgent | 所有智能体 | 粒子状态更新 |
| `color-update` | ColorAgent | 所有智能体 | 色彩状态更新 |
| `performance-alert` | PerformanceAgent | 所有智能体 | 性能警告 |

### 订阅消息（自定义智能体）

```javascript
class MyCustomAgent extends Agent {
  setupSubscriptions() {
    // 订阅特定消息类型
    this.messageBus.subscribe('gesture-detected', this);
  }

  async onMessage(message) {
    if (message.type === 'gesture-detected') {
      console.log('收到手势:', message.payload);
    }
  }
}
```

## 主题配色方案

ColorAgent 支持以下主题：

- `cosmic` - 蓝紫色（宇宙主题）
- `ocean` - 海洋蓝
- `fire` - 火焰红
- `ice` - 冰蓝色
- `sunset` - 日落橙

### 切换主题

```javascript
const colorAgent = window.agenticx.getAgent('ColorAgent');
colorAgent.transitionToTheme('fire', 2000); // 2秒过渡到火焰主题
```

## 性能优化

PerformanceAgent 会自动监控性能，当 FPS 低于阈值时会：

- **FPS < 30**：严重降级（减少粒子数 30%，简化着色器）
- **FPS < 45**：中等降级（减少粒子数 15%，中等着色器）
- **FPS < 50**：轻微优化

## 调试工具

### 查看智能体状态

```javascript
// 在浏览器控制台中运行
console.log('AgenticX 状态:', window.agenticx.getStateSnapshot());
```

### 查看性能报告

```javascript
const perfAgent = window.agenticx.getAgent('PerformanceAgent');
console.log('性能报告:', perfAgent.getPerformanceReport());
```

### 查看消息流

```javascript
// 监听所有消息
window.agenticx.messageBus.subscribe('broadcast', {
  name: 'DebugListener',
  async onMessage(message) {
    console.log('[消息]', message.type, message.payload);
  }
});
```

## 扩展开发

### 创建自定义智能体

1. 继承 `Agent` 基类
2. 实现 `setupSubscriptions()` 方法
3. 实现 `onMessage()` 方法
4. 注册到 AgenticX 系统

```javascript
class MyCustomAgent extends Agent {
  constructor(messageBus) {
    super('MyCustomAgent', messageBus);
  }

  setupSubscriptions() {
    this.messageBus.subscribe('gesture-detected', this);
  }

  async onMessage(message) {
    // 处理消息
  }
}

// 注册
const myAgent = new MyCustomAgent(agenticx.messageBus);
agenticx.registerAgent(myAgent);
await agenticx.start();
```

## 未来计划

- [ ] BehaviorAgent（行为学习智能体）- 学习用户偏好
- [ ] StarfieldAgent（星空控制智能体）- 控制星空旋转
- [ ] SyncAgent（跨设备同步智能体）- 多设备协作
- [ ] AI 模型集成（TensorFlow.js / Web LLM）

## 技术栈

- **消息总线**：自定义事件系统
- **状态管理**：StateManager
- **性能监控**：Performance API
- **AI 增强**：模式识别、预测算法

## 常见问题

### Q: 如何禁用 AgenticX？

A: 注释掉 `index.html` 中的 AgenticX 脚本引用即可。

### Q: 智能体之间如何避免冲突？

A: 通过消息优先级和状态管理器协调，每个智能体只负责自己的领域。

### Q: 性能影响如何？

A: AgenticX 系统本身开销很小（<1% CPU），PerformanceAgent 会自动优化。

---

**享受智能化的动态壁纸体验！** 🚀

