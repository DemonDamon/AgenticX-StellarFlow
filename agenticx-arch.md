# AgenticX 多智能体架构设计文档

## 一、架构概述

**AgenticX** 是一个多智能体协作系统，通过多个专门的 AI 智能体协同工作，实现智能化的动态壁纸效果控制。每个智能体负责不同的视觉模块，通过消息传递和状态共享实现协作。

### 核心设计理念
- **模块化智能体**：每个智能体专注单一职责
- **协作式决策**：智能体之间通过消息总线通信
- **自适应学习**：智能体根据用户行为和系统状态自动调整
- **分布式控制**：支持多设备间的智能体协作

---

## 二、智能体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    AgenticX 智能体系统                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ GestureAgent │───▶│ Message Bus  │◀───│ ParticleFlow │  │
│  │ (手势识别)    │    │ (消息总线)    │    │ Agent       │  │
│  └──────────────┘    └──────────────┘    │ (粒子流动)    │  │
│         │                    │             └──────────────┘  │
│         │                    │                    │          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ ColorAgent   │◀───│ StateManager │───▶│ Starfield   │  │
│  │ (色彩控制)    │    │ (状态管理)    │    │ Agent       │  │
│  └──────────────┘    └──────────────┘    │ (星空控制)    │  │
│         │                    │             └──────────────┘  │
│         │                    │                    │          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Performance  │───▶│ SyncAgent    │◀───│ Behavior    │  │
│  │ Agent        │    │ (跨设备同步)  │    │ Agent       │  │
│  │ (性能优化)    │    └──────────────┘    │ (行为学习)    │  │
│  └──────────────┘                         └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ Three.js     │
                    │ Renderer     │
                    └──────────────┘
```

---

## 三、智能体详细设计

### 3.1 GestureAgent（手势识别智能体）

**职责**：识别用户手势，转换为视觉控制指令

**能力**：
- 实时分析 MediaPipe 手势数据
- 识别滑动、捏合、旋转、停止等手势
- 计算手势强度和方向
- 预测用户意图（基于手势历史）

**输出消息**：
```javascript
{
  type: 'gesture-detected',
  gesture: 'swipe' | 'pinch' | 'rotate' | 'stop' | 'punch',
  intensity: 0.0-1.0,
  direction: [x, y],
  confidence: 0.0-1.0,
  prediction: 'user-wants-expand' // AI 预测的意图
}
```

**AI 增强功能**：
- 学习用户手势习惯，自动调整识别阈值
- 预测用户下一步操作，提前准备视觉效果

---

### 3.2 ParticleFlowAgent（粒子流动智能体）

**职责**：控制粒子系统的流动、收缩、延展效果

**能力**：
- 根据手势指令计算粒子流动方向
- 模拟物理效果（惯性、阻尼、弹性）
- 生成自然的粒子运动轨迹
- 优化粒子密度分布

**输入消息**：
- `gesture-detected`（来自 GestureAgent）
- `color-change`（来自 ColorAgent，影响粒子颜色）

**输出消息**：
```javascript
{
  type: 'particle-update',
  direction: [x, y, z],
  expansion: 1.0,
  focus: 0.0,
  warpSpeed: 0.0,
  momentum: { x, y, z },
  angularVelocity: { x, y, z }
}
```

**AI 增强功能**：
- 学习用户偏好的流动模式
- 自动生成创意粒子效果（如螺旋、波浪、爆炸）

---

### 3.3 ColorAgent（色彩控制智能体）

**职责**：智能控制粒子色彩、光晕、渐变效果

**能力**：
- 根据手势类型自动切换色彩主题
- 生成和谐的配色方案
- 控制色彩过渡动画
- 响应时间、环境光等因素

**输出消息**：
```javascript
{
  type: 'color-update',
  hue: 0.0-1.0,
  saturation: 0.0-1.0,
  lightness: 0.0-1.0,
  theme: 'cosmic' | 'ocean' | 'fire' | 'ice',
  transitionDuration: 1000 // ms
}
```

**AI 增强功能**：
- 学习用户色彩偏好
- 根据时间（白天/夜晚）自动调整色彩
- 生成个性化配色方案

---

### 3.4 StarfieldAgent（星空控制智能体）

**职责**：控制星空背景的旋转、星云流动效果

**能力**：
- 控制星空旋转速度和方向
- 生成星云流动动画
- 响应粒子系统的变化（同步旋转）
- 优化星空渲染性能

**输出消息**：
```javascript
{
  type: 'starfield-update',
  rotation: { x, y, z },
  nebulaFlow: { speed: 0.0-1.0, direction: [x, y] },
  starDensity: 0.5-1.0
}
```

**AI 增强功能**：
- 根据粒子状态智能调整星空旋转
- 生成动态星云效果

---

### 3.5 PerformanceAgent（性能优化智能体）

**职责**：监控系统性能，自动优化渲染效果

**能力**：
- 实时监控 FPS、内存占用
- 检测设备性能等级
- 自动触发性能降级
- 优化粒子数量和着色器复杂度

**输出消息**：
```javascript
{
  type: 'performance-alert',
  fps: 60,
  memoryUsage: 0.5,
  recommendation: 'reduce-particles' | 'simplify-shaders' | 'ok',
  action: {
    particleCount: 50000, // 建议粒子数
    shaderComplexity: 'medium'
  }
}
```

**AI 增强功能**：
- 预测性能瓶颈，提前优化
- 学习设备特性，定制优化策略

---

### 3.6 SyncAgent（跨设备同步智能体）

**职责**：处理多设备间的状态同步和冲突解决

**能力**：
- 管理主从设备角色
- 同步智能体状态到其他设备
- 解决多设备冲突
- 缓存和恢复状态

**消息类型**：
```javascript
// 发送到其他设备
{
  type: 'agent-state-sync',
  agents: {
    particleFlow: { ... },
    color: { ... },
    starfield: { ... }
  },
  timestamp: Date.now()
}
```

**AI 增强功能**：
- 智能合并多设备操作
- 预测网络延迟，提前同步

---

### 3.7 BehaviorAgent（行为学习智能体）

**职责**：学习用户行为模式，提供个性化体验

**能力**：
- 分析用户手势历史
- 识别使用模式（如：用户喜欢快速滑动）
- 预测用户意图
- 生成个性化推荐

**输出消息**：
```javascript
{
  type: 'behavior-insight',
  pattern: 'user-prefers-fast-swipes',
  recommendation: 'increase-particle-speed',
  confidence: 0.85
}
```

**AI 增强功能**：
- 使用机器学习模型学习用户偏好
- 生成个性化视觉效果

---

## 四、消息总线设计

### 4.1 消息格式

```javascript
{
  id: 'msg-12345',           // 消息ID
  from: 'GestureAgent',      // 发送者
  to: 'ParticleFlowAgent',   // 接收者（或 'broadcast'）
  type: 'gesture-detected',  // 消息类型
  payload: { ... },          // 消息内容
  timestamp: Date.now(),     // 时间戳
  priority: 'high' | 'normal' | 'low'
}
```

### 4.2 消息路由规则

- **直接路由**：指定 `to` 字段，消息只发送给特定智能体
- **广播路由**：`to: 'broadcast'`，所有智能体接收
- **订阅路由**：智能体订阅特定消息类型

---

## 五、状态管理器（StateManager）

**职责**：统一管理所有智能体的状态，提供状态快照和恢复

**核心功能**：
```javascript
class StateManager {
  // 保存当前所有智能体状态
  saveState() {
    return {
      particleFlow: particleFlowAgent.getState(),
      color: colorAgent.getState(),
      starfield: starfieldAgent.getState(),
      // ...
    };
  }

  // 恢复状态
  restoreState(state) {
    particleFlowAgent.setState(state.particleFlow);
    colorAgent.setState(state.color);
    // ...
  }

  // 状态变更通知
  onStateChange(callback) { ... }
}
```

---

## 六、AI 模型集成方案

### 6.1 本地 AI 模型（推荐）

使用 **Web LLM** 或 **TensorFlow.js** 在浏览器中运行轻量级模型：

```javascript
// 示例：使用 TensorFlow.js 进行手势预测
import * as tf from '@tensorflow/tfjs';

class GesturePredictor {
  async loadModel() {
    this.model = await tf.loadLayersModel('/models/gesture-predictor.json');
  }

  async predict(gestureHistory) {
    const input = tf.tensor2d([gestureHistory]);
    const prediction = await this.model.predict(input);
    return prediction.dataSync();
  }
}
```

### 6.2 云端 AI API（可选）

对于复杂任务，可以调用云端 API：

```javascript
// 示例：调用 OpenAI API 生成创意效果
async function generateCreativeEffect(context) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: '你是一个创意视觉效果设计师...'
      }, {
        role: 'user',
        content: `根据以下上下文生成视觉效果：${JSON.stringify(context)}`
      }]
    })
  });
  return response.json();
}
```

---

## 七、实现优先级

### Phase 1：基础智能体框架
1. ✅ 消息总线实现
2. ✅ StateManager 实现
3. ✅ GestureAgent 基础版本
4. ✅ ParticleFlowAgent 基础版本

### Phase 2：AI 增强
1. ⏳ BehaviorAgent 实现
2. ⏳ ColorAgent AI 配色
3. ⏳ 本地 AI 模型集成

### Phase 3：高级功能
1. ⏳ 多设备智能体协作
2. ⏳ 云端 AI API 集成
3. ⏳ 个性化学习系统

---

## 八、技术栈补充

| 技术 | 用途 |
|------|------|
| **TensorFlow.js** | 本地 AI 模型推理 |
| **Web LLM** | 浏览器内 LLM 运行 |
| **LangChain.js** | AI Agent 框架（可选） |
| **RxJS** | 消息总线响应式编程 |
| **IndexedDB** | 存储用户行为数据 |

---

## 九、使用示例

```javascript
// 初始化 AgenticX 系统
import { AgenticX } from './agenticx/core.js';

const agenticx = new AgenticX({
  enableAI: true,
  aiProvider: 'local', // 'local' | 'openai' | 'anthropic'
  enableLearning: true
});

// 启动所有智能体
await agenticx.start();

// 智能体自动协作，无需手动调用
// 用户手势 → GestureAgent → ParticleFlowAgent → 视觉效果
```

---

## 十、优势总结

1. **智能化**：AI 驱动的视觉效果，而非简单规则
2. **可扩展**：轻松添加新智能体
3. **自适应**：学习用户偏好，个性化体验
4. **协作性**：多智能体协同产生复杂效果
5. **分布式**：支持多设备智能体协作

---

**下一步**：是否需要我实现 AgenticX 核心框架代码？

