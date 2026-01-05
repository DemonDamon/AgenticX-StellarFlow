# AgenticX-StellarFlow

一个基于 AgenticX 框架的智能 3D 手势动态壁纸系统，通过多个 AI 智能体协同工作，实现手势控制的粒子流动效果。

## 📋 目录

- [项目概述](#项目概述)
- [系统架构](#系统架构)
- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [启动服务](#启动服务)
- [使用说明](#使用说明)
- [API 文档](#api-文档)
- [故障排除](#故障排除)

## 🎯 项目概述

AgenticX-StellarFlow 是一个多智能体协作的动态壁纸系统，包含：

- **前端**：基于 Three.js 的 3D 粒子系统，使用 MediaPipe 进行手势识别
- **Node.js 服务器**：WebSocket 服务器，用于多设备状态同步
- **Python AgenticX 服务器**：FastAPI 服务，提供 AI 智能体服务

### 核心功能

- ✨ 实时手势识别（滑动、捏合、旋转、停止等）
- 🌊 智能粒子流动控制
- 🎨 自适应色彩主题切换
- 📊 性能自动优化
- 🔄 多设备状态同步

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端 (浏览器)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Three.js    │  │  MediaPipe   │  │  AgenticX    │ │
│  │  3D 渲染     │  │  手势识别     │  │  客户端      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                      │                    │
         │ HTTP API             │ WebSocket          │ WebSocket
         │ WebSocket            │                    │
         ▼                      ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Python AgenticX  │  │ Node.js WebSocket│  │  静态文件服务器   │
│   服务器         │  │   服务器         │  │  (可选)          │
│  Port: 8001      │  │  Port: 8081      │  │                  │
│                  │  │                  │  │                  │
│ ┌──────────────┐ │  │ 多设备状态同步   │  │                  │
│ │ GestureAgent │ │  │                  │  │                  │
│ │ ParticleFlow │ │  └──────────────────┘  └──────────────────┘
│ │ ColorAgent   │ │
│ │ Performance  │ │
│ └──────────────┘ │
└──────────────────┘
```

### 服务说明

1. **Python AgenticX 服务器** (`agenticx_server/main.py`)
   - 提供 AI 智能体服务
   - HTTP API 和 WebSocket 支持
   - 端口：8001

2. **Node.js WebSocket 服务器** (`src/server/server.js`)
   - 多设备状态同步
   - 主从设备管理
   - 端口：8081

3. **前端应用** (`src/client/`)
   - 静态 HTML/JS 文件
   - 需要静态文件服务器

## 📦 环境要求

### Python 环境

- Python 3.8 或更高版本
- pip 包管理器

### Node.js 环境

- Node.js 14.0 或更高版本
- npm 包管理器

### 浏览器要求

- 支持 WebGL 的现代浏览器（Chrome、Firefox、Edge、Safari）
- 支持 WebSocket
- 支持 MediaPipe（需要摄像头权限）

## 🔧 安装步骤

### 1. 克隆或下载项目

```bash
cd /Users/damon/myWork/AgenticX/examples/AgenticX-StellarFlow
```

### 2. 安装 Python 依赖

```bash
# 进入 Python 服务器目录
cd agenticx_server

# 安装依赖
uv pip install -r requirements.txt
```

**依赖列表**：
- `fastapi>=0.104.0`
- `uvicorn[standard]>=0.24.0`
- `websockets>=12.0`
- `pydantic>=2.0.0`
- `httpx>=0.25.0`

### 3. 安装 Node.js 依赖

```bash
# 进入 Node.js 服务器目录
cd ../src/server

# 安装依赖
npm install
```

**依赖列表**：
- `ws` (WebSocket 库)

### 4. 配置 AgenticX 框架路径

确保 Python 可以找到 AgenticX 框架。在 `agenticx_server/main.py` 中已配置：

```python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../myWork/AgenticX'))
```

如果 AgenticX 框架在其他位置，请修改此路径。

### 5. （可选）配置 LLM 服务

如果需要使用 LLM 功能，需要在 AgenticX 框架中配置 API Key。当前版本使用简化模式（无 LLM），可以直接运行。

## 🚀 启动服务

### 方式一：分别启动（推荐用于开发）

#### 1. 启动 Python AgenticX 服务器

```bash
cd agenticx_server
python main.py
```

**预期输出**：
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**验证**：
```bash
curl http://localhost:8001/health
# 应返回: {"status": "healthy"}
```

#### 2. 启动 Node.js WebSocket 服务器

```bash
cd src/server
node server.js
```

**预期输出**：
```
═══════════════════════════════════════════════════
  Liquid Silk 同步服务已启动
  端口：8081
  等待客户端连接...
═══════════════════════════════════════════════════
```

#### 3. 启动前端静态服务器

**选项 A：使用 Python HTTP 服务器**

```bash
cd src/client
python -m http.server 8080
```

**选项 B：使用 Node.js http-server**

```bash
# 全局安装
npm install -g http-server

# 启动
cd src/client
http-server -p 8080
```

**选项 C：使用 VS Code Live Server**

1. 安装 VS Code Live Server 扩展
2. 右键点击 `src/client/index.html`
3. 选择 "Open with Live Server"

### 方式二：使用脚本启动（推荐用于生产）

可以创建一个启动脚本来自动启动所有服务：

```bash
#!/bin/bash
# start_all.sh

# 启动 Python 服务器（后台）
cd agenticx_server
python main.py &
PYTHON_PID=$!

# 启动 Node.js 服务器（后台）
cd ../src/server
node server.js &
NODE_PID=$!

# 启动前端服务器
cd ../client
python -m http.server 8080 &
HTTP_PID=$!

echo "所有服务已启动"
echo "Python PID: $PYTHON_PID"
echo "Node.js PID: $NODE_PID"
echo "HTTP PID: $HTTP_PID"
echo ""
echo "访问 http://localhost:8080 使用应用"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap "kill $PYTHON_PID $NODE_PID $HTTP_PID; exit" INT
wait
```

## 💻 使用说明

### 1. 访问应用

打开浏览器访问：`http://localhost:8080`

### 2. 允许摄像头权限

应用需要访问摄像头进行手势识别，请允许浏览器权限请求。

### 3. 手势控制

- **滑动**：手掌在摄像头前滑动，控制粒子流动方向
- **捏合**：拇指和食指捏合，收缩粒子
- **张开**：手掌张开，扩展粒子
- **旋转**：手掌旋转，旋转粒子系统
- **停止**：握拳，停止粒子运动

### 4. 多设备同步

1. 在多个设备上打开应用
2. 点击"设为主设备"按钮（其中一个设备）
3. 主设备的手势控制会同步到其他设备

### 5. 查看日志

- **浏览器控制台**：查看前端日志和错误
- **Python 服务器终端**：查看 API 请求和智能体处理日志
- **Node.js 服务器终端**：查看 WebSocket 连接和同步日志

## 📡 API 文档

### Python AgenticX 服务器 API

#### 基础端点

- `GET /` - 服务状态
  ```bash
  curl http://localhost:8001/
  ```

- `GET /health` - 健康检查
  ```bash
  curl http://localhost:8001/health
  ```

#### 手势分析 API

- `POST /api/gesture/analyze` - 分析手势数据

  **请求体**：
  ```json
  {
    "landmarks": [...],
    "palm_center": {"x": 0.5, "y": 0.5},
    "current_pos": {"x": 0.5, "y": 0.5},
    "prev_pos": {"x": 0.4, "y": 0.4}
  }
  ```

  **响应**：
  ```json
  {
    "gesture": "swipe",
    "intensity": 0.8,
    "direction": [0.1, 0.2],
    "confidence": 0.9,
    "prediction": "swipe_right"
  }
  ```

#### 粒子更新 API

- `POST /api/particle/update` - 更新粒子状态

  **请求体**：
  ```json
  {
    "gesture": "swipe",
    "intensity": 0.8,
    "direction": [0.1, 0.2]
  }
  ```

#### 色彩控制 API

- `POST /api/color/change` - 改变色彩主题

  **请求体**：
  ```json
  {
    "theme": "cosmic",
    "hue": 0.6
  }
  ```

#### WebSocket

- `ws://localhost:8001/ws` - 实时双向通信

### Node.js WebSocket 服务器

- `ws://localhost:8081` - 多设备状态同步

**消息类型**：
- `apply-master` - 申请成为主设备
- `state-update` - 状态更新（仅主设备）
- `state-sync` - 状态同步（广播给从设备）
- `init-sync` - 初始同步

## 🔍 故障排除

### Python 服务器无法启动

**问题**：`AgentExecutor.__init__() got an unexpected keyword argument 'agent'`

**解决**：已修复。确保使用最新版本的 `main.py`。

**问题**：`ModuleNotFoundError: No module named 'agenticx'`

**解决**：
1. 检查 AgenticX 框架路径是否正确
2. 确保 AgenticX 框架已正确安装
3. 修改 `main.py` 中的路径配置

**问题**：端口 8001 已被占用

**解决**：
```bash
# 查找占用端口的进程
lsof -i :8001

# 或修改 main.py 中的端口
uvicorn.run("main:app", host="0.0.0.0", port=8002, ...)
```

### Node.js 服务器无法启动

**问题**：`Error: listen EADDRINUSE :::8081`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :8081

# 或修改 server.js 中的端口
const PORT = process.env.PORT || 8082;
```

### 前端无法连接后端

**问题**：浏览器控制台显示连接错误

**解决**：
1. 确认 Python 服务器正在运行：`curl http://localhost:8001/health`
2. 确认 Node.js 服务器正在运行：检查终端输出
3. 检查浏览器控制台的错误信息
4. 确认 CORS 设置（开发环境已允许所有来源）

### WebSocket 连接失败

**问题**：WebSocket 连接失败，但 HTTP API 正常

**解决**：
- 前端会自动降级到 HTTP API，不影响基本功能
- 检查防火墙设置
- 确认 WebSocket 协议支持

### 手势识别不工作

**问题**：摄像头无法访问或手势识别失败

**解决**：
1. 确认浏览器已授予摄像头权限
2. 检查摄像头是否被其他应用占用
3. 查看浏览器控制台的错误信息
4. 确认 MediaPipe CDN 可以正常访问

### 性能问题

**问题**：FPS 过低或页面卡顿

**解决**：
- PerformanceAgent 会自动优化
- 可以手动减少粒子数量（修改 `main.js` 中的 `PARTICLE_COUNT`）
- 关闭其他占用资源的标签页

## 📝 开发说明

### 项目结构

```
AgenticX-StellarFlow/
├── agenticx_server/          # Python AgenticX 服务器
│   ├── main.py               # FastAPI 主文件
│   └── requirements.txt      # Python 依赖
├── src/
│   ├── client/               # 前端应用
│   │   ├── index.html        # 主页面
│   │   ├── css/              # 样式文件
│   │   └── js/               # JavaScript 文件
│   │       ├── main.js       # 主逻辑
│   │       ├── gesture.js    # 手势识别
│   │       ├── agenticx_client.js  # AgenticX 客户端
│   │       └── agenticx/    # AgenticX 前端框架
│   └── server/              # Node.js WebSocket 服务器
│       ├── server.js         # WebSocket 服务器
│       └── package.json      # Node.js 依赖
└── README.md                 # 本文档
```

### 修改端口

如果需要修改端口：

1. **Python 服务器**：修改 `agenticx_server/main.py` 中的 `uvicorn.run()` 参数
2. **Node.js 服务器**：修改 `src/server/server.js` 中的 `PORT` 变量
3. **前端**：修改 `src/client/js/agenticx_client.js` 和 `src/client/js/sync.js` 中的 URL

### 调试模式

**Python 服务器**：
```python
# 在 main.py 中
logging.basicConfig(level=logging.DEBUG)
```

**前端**：
- 打开浏览器开发者工具（F12）
- 查看 Console 标签页的日志

## 📚 相关文档

- [AgenticX 集成设置指南](./AGENTICX_SETUP.md)
- [AgenticX 多智能体系统使用指南](./AGENTICX_README.md)
- [AgenticX 架构文档](./agenticx-arch.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

查看 [LICENSE](./LICENSE) 文件。

---

**享受智能化的动态壁纸体验！** 🚀✨
