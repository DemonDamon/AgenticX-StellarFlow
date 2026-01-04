# AgenticX 集成设置指南

## 概述

本项目现在集成了 Python AgenticX 框架，通过 Python 后端提供智能体服务，前端通过 HTTP API 和 WebSocket 与后端通信。

## 架构

```
前端 (JavaScript/Three.js)
    │
    │ HTTP API + WebSocket
    ▼
Python AgenticX 服务端 (FastAPI)
    │
    ├── GestureAgent (手势识别智能体)
    ├── ParticleFlowAgent (粒子流动智能体)
    ├── ColorAgent (色彩控制智能体)
    └── PerformanceAgent (性能优化智能体)
```

## 设置步骤

### 1. 安装 Python 依赖

```bash
cd agenticx_server
pip install -r requirements.txt
```

### 2. 配置 AgenticX 路径

确保 Python 可以找到 AgenticX 框架。在 `agenticx_server/main.py` 中，已配置了路径：

```python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../myWork/AgenticX'))
```

如果 AgenticX 框架在其他位置，请修改此路径。

### 3. 启动 Python 服务端

```bash
cd agenticx_server
python main.py
```

服务将在 `http://localhost:8001` 启动。

### 4. 启动前端

使用静态服务器启动前端（如 VS Code Live Server），或使用 Node.js：

```bash
cd src/server
npm install
node server.js
```

### 5. 访问应用

打开浏览器访问前端地址（通常是 `http://localhost:8080` 或 Live Server 的地址）。

## API 端点

### HTTP API

- `GET /` - 服务状态
- `GET /health` - 健康检查
- `POST /api/gesture/analyze` - 分析手势
- `POST /api/particle/update` - 更新粒子状态
- `POST /api/color/change` - 改变色彩主题

### WebSocket

- `ws://localhost:8001/ws` - 实时双向通信

## 工作流程

1. **手势识别**：前端 MediaPipe 捕获手势 → 发送到 Python 后端
2. **智能分析**：Python GestureAgent 分析手势 → 返回结果
3. **粒子控制**：ParticleFlowAgent 计算粒子状态 → 返回控制参数
4. **色彩管理**：ColorAgent 选择色彩主题 → 返回色彩值
5. **实时更新**：通过 WebSocket 实时同步状态

## 故障排除

### Python 服务端无法启动

- 检查 Python 版本（需要 Python 3.8+）
- 确认所有依赖已安装：`pip install -r requirements.txt`
- 检查 AgenticX 框架路径是否正确

### 前端无法连接后端

- 确认 Python 服务端正在运行
- 检查端口 8001 是否被占用
- 查看浏览器控制台的错误信息
- 检查 CORS 设置（开发环境已允许所有来源）

### WebSocket 连接失败

- 前端会自动降级到 HTTP API
- 检查防火墙设置
- 确认 WebSocket 协议支持

## 开发模式

### 启用详细日志

在 `agenticx_server/main.py` 中：

```python
logging.basicConfig(level=logging.DEBUG)  # 改为 DEBUG
```

### 测试 API

使用 curl 或 Postman：

```bash
# 健康检查
curl http://localhost:8001/health

# 分析手势
curl -X POST http://localhost:8001/api/gesture/analyze \
  -H "Content-Type: application/json" \
  -d '{"landmarks": [...], "palm_center": {...}, ...}'
```

## 下一步

1. 实现完整的智能体逻辑（当前为简化版本）
2. 添加 LLM 集成（需要配置 API Key）
3. 实现更多智能体功能
4. 添加性能监控和优化

## 注意事项

- 当前实现为简化版本，智能体逻辑需要进一步完善
- LLM 功能需要配置 API Key（在 AgenticX 框架中配置）
- 生产环境需要配置 CORS 和安全设置

