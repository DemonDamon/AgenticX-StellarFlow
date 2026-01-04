# AgenticX 后端集成方案

## 架构概述

将 Python AgenticX 框架与前端 JavaScript 动态壁纸项目集成：

```
前端 (JavaScript/Three.js)
    │
    │ HTTP/WebSocket
    ▼
Python AgenticX 服务端 (FastAPI)
    │
    ├── GestureAgent (手势识别智能体)
    ├── ParticleFlowAgent (粒子流动智能体)
    ├── ColorAgent (色彩控制智能体)
    └── PerformanceAgent (性能优化智能体)
```

## 集成步骤

### 1. Python 服务端设置

创建 AgenticX 服务端，提供 HTTP API 和 WebSocket 支持。

### 2. 前端适配层

创建 JavaScript 客户端，通过 HTTP/WebSocket 与后端通信。

### 3. 智能体实现

为动态壁纸项目创建专门的智能体。

## 文件结构

```
项目根目录/
├── src/
│   ├── client/          # 前端代码（已有）
│   └── server/          # Node.js WebSocket 服务器（已有）
├── agenticx_server/      # Python AgenticX 服务端（新增）
│   ├── main.py          # FastAPI 服务器入口
│   ├── agents/          # 智能体实现
│   │   ├── gesture_agent.py
│   │   ├── particle_flow_agent.py
│   │   ├── color_agent.py
│   │   └── performance_agent.py
│   ├── tools/           # AgenticX Tools
│   │   └── wallpaper_tools.py
│   └── requirements.txt
└── integration/         # 集成代码
    └── agenticx_client.js  # 前端 AgenticX 客户端
```

## API 设计

### HTTP API 端点

- `POST /api/gesture/analyze` - 分析手势数据
- `POST /api/particle/update` - 更新粒子状态
- `POST /api/color/change` - 改变色彩主题
- `GET /api/performance/report` - 获取性能报告

### WebSocket 端点

- `ws://localhost:8001/ws` - 实时双向通信

## 下一步

1. 创建 Python 服务端代码
2. 创建前端适配层
3. 实现智能体逻辑
4. 测试集成

